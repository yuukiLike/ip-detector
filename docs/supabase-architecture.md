# Supabase 架构与本质

## 核心理念

> **Supabase = PostgreSQL + 自动生成的 API + 开发者体验**
>
> 不是重新发明数据库，而是让 PostgreSQL 更易用

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase 架构                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Auth     │  │ Database │  │ Storage  │  │ Realtime │        │
│  │ (GoTrue) │  │(PostgREST)│ │ (S3兼容) │  │(Phoenix) │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │                │
│       └─────────────┴─────────────┴─────────────┘                │
│                          │                                       │
│                    ┌─────▼─────┐                                │
│                    │ PostgreSQL │                                │
│                    │  (核心)    │                                │
│                    └───────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 组件职责

| 组件 | 技术栈 | 职责 |
|------|--------|------|
| **PostgREST** | Haskell | 自动把 PostgreSQL 表变成 RESTful API |
| **GoTrue** | Go | 用户认证、JWT 管理、OAuth 集成 |
| **Realtime** | Elixir/Phoenix | WebSocket 实时数据订阅 |
| **Storage** | - | S3 兼容的文件存储 |
| **Edge Functions** | Deno | Serverless 函数运行时 |
| **pg_graphql** | PostgreSQL 扩展 | 自动生成 GraphQL API |
| **pgvector** | PostgreSQL 扩展 | 向量存储与相似度搜索 |

## SDK 的 RPC 风格

```typescript
// 链式调用，底层转换为 REST 请求
const { data } = await supabase
  .from('posts')
  .select('id, title, author:users(name)')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .range(0, 9)

// 真正的 RPC：调用 PostgreSQL 函数
const { data } = await supabase.rpc('search_posts', { query: 'rust' })
```

## 安全模型：Row Level Security

```sql
-- 数据库层面强制访问控制
alter table posts enable row level security;

create policy "Users can view own posts"
  on posts for select
  using (auth.uid() = author_id);
```

## 为什么选择 Supabase

1. **PostgreSQL 的全部能力** - 不是阉割版，是完整的 PG
2. **开源可自托管** - 不被供应商锁定
3. **一站式解决方案** - Auth + DB + Storage + Realtime
4. **类型安全** - 从数据库 schema 生成 TypeScript 类型
5. **渐进式采用** - 可以只用其中一部分功能
