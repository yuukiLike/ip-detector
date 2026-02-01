# Docker 分层镜像：联合文件系统

## 核心设计

```
┌────────────────────────────────────────────────────────┐
│ 镜像分层：共享基础层，节省空间                           │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Layer 4: COPY app.js        (你的代码，几 KB)         │
│  Layer 3: RUN npm install    (依赖，可缓存)            │
│  Layer 2: RUN apt-get...     (系统包)                  │
│  Layer 1: Ubuntu base        (所有容器共享)            │
│                                                        │
│  写时复制(CoW)：只有修改时才复制该层                     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## 联合文件系统

```
┌────────────────────────────────────────────────────────┐
│ Union File System = 多层合并成一个视图                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│        容器看到的文件系统（合并视图）                     │
│  ┌─────────────────────────────────────┐              │
│  │  /app/index.js    (Layer 4)         │              │
│  │  /node_modules/   (Layer 3)         │              │
│  │  /usr/bin/node    (Layer 2)         │              │
│  │  /bin/bash        (Layer 1)         │              │
│  └─────────────────────────────────────┘              │
│                                                        │
│  实际存储：每层独立存储，读取时合并                      │
│                                                        │
│  Layer 4 (只读) ─┐                                    │
│  Layer 3 (只读) ─┼──► 合并 ──► 统一视图               │
│  Layer 2 (只读) ─┤                                    │
│  Layer 1 (只读) ─┘                                    │
│                  ↑                                     │
│           Container Layer (可写)                       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## 写时复制（Copy-on-Write）

```
┌────────────────────────────────────────────────────────┐
│ 写时复制：修改文件时才复制到容器层                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  读操作：从上往下查找，找到即返回                        │
│                                                        │
│  写操作：                                               │
│  1. 复制文件到容器层                                    │
│  2. 在容器层修改                                        │
│  3. 下层文件不受影响                                    │
│                                                        │
│  删除操作：                                             │
│  1. 在容器层创建 whiteout 文件                         │
│  2. 标记该文件已删除                                    │
│  3. 下层文件仍存在，但不可见                            │
│                                                        │
└────────────────────────────────────────────────────────┘
```

```bash
# 查看镜像层
docker history nginx

# 输出示例：
# IMAGE          CREATED       CREATED BY                                      SIZE
# a1b2c3d4       2 weeks ago   CMD ["nginx" "-g" "daemon off;"]                0B
# <missing>      2 weeks ago   EXPOSE 80                                       0B
# <missing>      2 weeks ago   COPY nginx.conf /etc/nginx/nginx.conf           1.5kB
# <missing>      2 weeks ago   RUN apt-get update && apt-get install...        85MB
# <missing>      2 weeks ago   /bin/sh -c #(nop) ADD file:... in /             72MB

# 查看层的详细信息
docker inspect nginx --format '{{json .RootFS.Layers}}' | jq
```

## Dockerfile 优化

```dockerfile
# ❌ 不好的写法：每次代码变更都重新安装依赖
FROM node:18
COPY . /app
RUN npm install
CMD ["node", "app.js"]

# ✅ 优化：利用缓存，依赖层不变就复用
FROM node:18
WORKDIR /app

# 先复制依赖文件（变化少）
COPY package*.json ./
RUN npm ci --only=production

# 再复制代码（变化多）
COPY . .

CMD ["node", "app.js"]
```

## 多阶段构建

```dockerfile
# 阶段 1：构建
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 阶段 2：运行（最终镜像只包含这一阶段）
FROM node:18-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]

# 结果：最终镜像不包含构建工具，体积大幅减小
```

## 镜像大小优化

```dockerfile
# 使用更小的基础镜像
FROM node:18          # ~900MB
FROM node:18-slim     # ~200MB
FROM node:18-alpine   # ~110MB

# 清理缓存
RUN apt-get update && apt-get install -y \
    package1 \
    package2 \
    && rm -rf /var/lib/apt/lists/*

# 合并 RUN 命令（减少层数）
RUN apt-get update \
    && apt-get install -y curl \
    && curl -o file.tar.gz https://... \
    && tar -xzf file.tar.gz \
    && rm file.tar.gz \
    && apt-get purge -y curl \
    && apt-get autoremove -y
```

## 存储驱动

```
┌────────────────────────────────────────────────────────┐
│ 存储驱动对比                                            │
├────────────────────────────────────────────────────────┤
│                                                        │
│  OverlayFS (overlay2):                                │
│  • 现代 Linux 默认                                     │
│  • 性能好，稳定                                        │
│  • 推荐使用                                            │
│                                                        │
│  AUFS:                                                │
│  • 早期 Docker 默认                                    │
│  • 需要内核支持                                        │
│                                                        │
│  Btrfs / ZFS:                                         │
│  • 需要特定文件系统                                    │
│  • 支持快照等高级功能                                   │
│                                                        │
│  DeviceMapper:                                        │
│  • 块级别存储                                          │
│  • 适合无 OverlayFS 支持的系统                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

```bash
# 查看当前存储驱动
docker info | grep "Storage Driver"

# OverlayFS 层存储位置
ls /var/lib/docker/overlay2/
```

## 镜像内容寻址

```bash
# 镜像 ID = 配置的 SHA256
# 层 ID = 层内容的 SHA256

# 查看镜像 manifest
docker manifest inspect nginx

# 镜像存储结构
/var/lib/docker/
├── image/
│   └── overlay2/
│       ├── imagedb/          # 镜像元数据
│       └── layerdb/          # 层元数据
└── overlay2/                  # 层实际内容
    ├── l/                     # 短 ID 符号链接
    └── <layer-id>/
        ├── diff/             # 层内容
        └── link              # 短 ID
```

## 容器文件系统

```
┌────────────────────────────────────────────────────────┐
│ 容器 = 镜像层 + 可写容器层                              │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────────────────────────────┐              │
│  │     Container Layer (可写)          │              │
│  │     - 容器运行时的修改              │              │
│  │     - 容器删除时消失                │              │
│  └─────────────────────────────────────┘              │
│  ┌─────────────────────────────────────┐              │
│  │     Image Layer 3 (只读)            │              │
│  ├─────────────────────────────────────┤              │
│  │     Image Layer 2 (只读)            │              │
│  ├─────────────────────────────────────┤              │
│  │     Image Layer 1 (只读)            │              │
│  └─────────────────────────────────────┘              │
│                                                        │
│  Volume：绑定宿主机目录，绕过 CoW，性能更好              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

```bash
# 查看容器层变更
docker diff <container-id>
# A = 添加
# C = 修改
# D = 删除

# 将容器层提交为新镜像
docker commit <container-id> my-image:tag
```

## 设计启示

1. **分层复用** - 公共层只存一份
2. **写时复制** - 延迟复制，节省资源
3. **不可变层** - 镜像层只读，保证一致性
4. **内容寻址** - 相同内容相同哈希，自动去重
5. **增量更新** - 只传输变化的层
