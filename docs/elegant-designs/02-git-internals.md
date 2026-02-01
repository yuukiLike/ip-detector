# Git 内部原理：内容寻址存储

## 核心设计

```
┌────────────────────────────────────────────────────────┐
│ Git 的核心：SHA-1 哈希 = 内容的"指纹"                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Blob   → 文件内容的哈希                                │
│  Tree   → 目录结构的哈希（包含 blob 引用）               │
│  Commit → 快照的哈希（包含 tree + parent + metadata）   │
│  Tag    → 标签对象的哈希                                │
│                                                        │
│  相同内容 = 相同哈希 = 只存一份（自动去重）               │
│  任何篡改 = 哈希改变 = 立即发现（完整性校验）             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## 对象模型

```
commit 3a4b5c6d...
   │
   ├── tree 7d8e9f0a...
   │      ├── blob a1b2c3d4... → README.md
   │      ├── blob d4e5f6a7... → main.rs
   │      └── tree 8f9a0b1c... → src/
   │             ├── blob e2f3a4b5... → lib.rs
   │             └── blob c6d7e8f9... → utils.rs
   │
   ├── parent 1a2b3c4d... → 上一个 commit
   │
   ├── author: Alice <alice@example.com>
   ├── committer: Alice <alice@example.com>
   └── message: "Add new feature"
```

## 探索 .git 目录

```bash
# Git 对象存储位置
.git/
├── objects/           # 所有对象存储
│   ├── pack/         # 打包的对象（压缩）
│   ├── info/
│   └── a1/b2c3...    # 松散对象（前2位为目录名）
├── refs/             # 引用（分支、标签）
│   ├── heads/        # 本地分支
│   └── tags/         # 标签
├── HEAD              # 当前分支指针
├── config            # 仓库配置
└── index             # 暂存区

# 查看对象类型
git cat-file -t <hash>

# 查看对象内容
git cat-file -p <hash>

# 查看所有对象
find .git/objects -type f
```

## 内容寻址的精妙

```bash
# 相同内容 = 相同哈希
echo "hello" | git hash-object --stdin
# 每次都返回相同的 hash: ce013625030ba8dba906f756967f9e9ca394464a

# 创建 blob 对象
echo "hello world" | git hash-object -w --stdin

# 查看 blob 内容
git cat-file -p <blob-hash>
```

## 分支只是指针

```
┌────────────────────────────────────────────────────────┐
│ 分支 = 指向 commit 的可变指针                           │
├────────────────────────────────────────────────────────┤
│                                                        │
│  main ──────► commit C ──► commit B ──► commit A      │
│                  ▲                                     │
│  feature ────────┘                                     │
│                                                        │
│  HEAD ──► main（当前所在分支）                          │
│                                                        │
│  创建分支 = 创建一个 41 字节的文件                       │
│  切换分支 = 修改 HEAD 文件内容                          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

```bash
# 分支就是文件
cat .git/refs/heads/main
# 输出: 3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b

# HEAD 指向当前分支
cat .git/HEAD
# 输出: ref: refs/heads/main
```

## 暂存区（Index）

```
┌────────────────────────────────────────────────────────┐
│ 暂存区 = 下一次 commit 的快照草稿                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  工作目录 ──git add──► 暂存区 ──git commit──► 仓库      │
│                                                        │
│  .git/index 是二进制文件，包含：                        │
│  • 文件路径                                            │
│  • blob hash                                           │
│  • 文件权限                                            │
│  • 时间戳                                              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

```bash
# 查看暂存区内容
git ls-files --stage

# 输出示例:
# 100644 a1b2c3d4... 0    README.md
# 100644 e5f6a7b8... 0    src/main.rs
```

## Packfile 压缩

```
┌────────────────────────────────────────────────────────┐
│ 松散对象 vs Packfile                                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  松散对象：每个对象一个文件（zlib 压缩）                 │
│  Packfile：多个对象打包 + Delta 压缩                   │
│                                                        │
│  Delta 压缩：只存储与基础对象的差异                     │
│  相似文件（如不同版本）可以极大压缩                      │
│                                                        │
│  触发打包：                                            │
│  • git gc                                              │
│  • git push / fetch                                    │
│  • 松散对象过多时自动触发                               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

```bash
# 手动打包
git gc

# 查看 packfile
ls .git/objects/pack/

# 验证 packfile
git verify-pack -v .git/objects/pack/*.idx
```

## Reflog：后悔药

```bash
# 查看 HEAD 移动历史
git reflog

# 输出示例:
# 3a4b5c6 HEAD@{0}: commit: Add feature
# 1a2b3c4 HEAD@{1}: checkout: moving from feature to main
# 9e8f7d6 HEAD@{2}: commit: WIP

# 恢复误删的 commit
git checkout HEAD@{2}
git branch recovered-branch

# reflog 默认保留 90 天
```

## 实用底层命令

```bash
# 创建对象
echo "content" | git hash-object -w --stdin      # 创建 blob
git write-tree                                   # 从暂存区创建 tree
git commit-tree <tree> -m "message"              # 创建 commit

# 查看对象
git cat-file -t <hash>                           # 类型
git cat-file -p <hash>                           # 内容
git cat-file -s <hash>                           # 大小

# 比较
git diff-tree -p <commit>                        # commit 的变更
git diff-index HEAD                              # 工作区 vs HEAD

# 打包
git pack-objects                                 # 创建 packfile
git unpack-objects                               # 解包

# 引用
git update-ref refs/heads/new-branch <hash>      # 创建分支
git symbolic-ref HEAD refs/heads/main            # 设置 HEAD
```

## 设计启示

1. **内容寻址** - 相同内容自动去重
2. **不可变性** - 对象一旦创建永不改变
3. **有向无环图** - commit 链形成 DAG
4. **指针而非复制** - 分支只是指针，代价极低
5. **增量存储** - Delta 压缩相似对象
