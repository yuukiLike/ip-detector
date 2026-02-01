# 计算机领域精妙设计合集

> 这些设计体现了计算机科学的核心智慧：简单、组合、抽象

## 目录

| 编号 | 主题 | 文件 | 核心思想 |
|------|------|------|----------|
| 01 | Unix 哲学 | [01-unix-philosophy.md](./01-unix-philosophy.md) | 一切皆文件，管道组合 |
| 02 | Git 内部原理 | [02-git-internals.md](./02-git-internals.md) | 内容寻址，不可变快照 |
| 03 | React 设计 | [03-react-design.md](./03-react-design.md) | UI = f(State)，虚拟 DOM |
| 04 | Rust 所有权 | [04-rust-ownership.md](./04-rust-ownership.md) | 编译时内存安全 |
| 05 | Docker 分层 | [05-docker-layers.md](./05-docker-layers.md) | 镜像分层，写时复制 |
| 06 | B+ 树索引 | [06-bplus-tree.md](./06-bplus-tree.md) | 磁盘优化的数据结构 |
| 07 | Bloom Filter | [07-bloom-filter.md](./07-bloom-filter.md) | 概率型数据结构 |
| 08 | 并行计算模型 | [08-parallel-models.md](./08-parallel-models.md) | MapReduce, Actor Model |
| 09 | CRDT | [09-crdt.md](./09-crdt.md) | 无冲突复制数据类型 |
| 10 | LSM Tree | [10-lsm-tree.md](./10-lsm-tree.md) | 写优化存储引擎 |
| 11 | 现代桌面应用 | [11-modern-desktop-apps.md](./11-modern-desktop-apps.md) | Warp & Raycast 架构 |
| 12 | 跨平台开发策略 | [12-cross-platform-strategy.md](./12-cross-platform-strategy.md) | 语言与框架选择指南 |

## 设计哲学

```
┌────────────────────────────────────────────────────────┐
│                    设计原则金字塔                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│                    ┌─────────┐                         │
│                    │  简单   │                         │
│                   ┌┴─────────┴┐                        │
│                   │   组合    │                        │
│                  ┌┴───────────┴┐                       │
│                  │    抽象     │                       │
│                 ┌┴─────────────┴┐                      │
│                 │   不可变性    │                      │
│                ┌┴───────────────┴┐                     │
│                │    分层解耦     │                     │
│               ┌┴─────────────────┴┐                    │
│               │   空间换时间      │                    │
│              ┌┴───────────────────┴┐                   │
│              │    最终一致性       │                   │
│             └─────────────────────┘                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## 快速参考

| 原则 | 案例 |
|------|------|
| **简单组合** | Unix 管道、React 组件、函数式编程 |
| **内容寻址** | Git、IPFS、Docker 镜像层、CAS 存储 |
| **不可变性** | Git commit、LSM SSTable、Event Sourcing |
| **分层抽象** | OSI 七层、TCP/IP、虚拟内存、容器 |
| **空间换时间** | 索引、缓存、Bloom Filter、CDN |
| **最终一致** | CRDT、DNS、分布式数据库 |
| **消息传递** | Actor Model、消息队列、IPC、CSP |
