# 语音克隆平台 — 架构设计文档

> 日期: 2026-01-31

---

## 一、系统全景

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户 (浏览器)                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ 上传语音  │  │ 管理声纹  │  │ 文本合成  │  │ 试听/下载/分享 │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────────────┐
│                      API Gateway / BFF                          │
│            认证 · 限流 · 请求路由 · 文件上传                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Voice 服务   │ │  User 服务   │ │  Task 服务   │
│  克隆/合成    │ │  用户/配额   │ │  异步任务    │
└──────┬───────┘ └──────────────┘ └──────┬───────┘
       │                                  │
       ▼                                  ▼
┌──────────────────────────────────────────────────┐
│              Provider Adapter Layer               │
│  ┌───────────┐ ┌───────────┐ ┌────────────────┐  │
│  │ElevenLabs │ │Fish Audio │ │Azure Custom    │  │
│  │ Adapter   │ │ Adapter   │ │Voice Adapter   │  │
│  └───────────┘ └───────────┘ └────────────────┘  │
└──────────────────────────────────────────────────┘
       │                │               │
       ▼                ▼               ▼
   ElevenLabs API   Fish Audio API   Azure API
```

---

## 二、核心业务流程

### 流程 1：声纹创建（语音克隆）

```
用户上传音频 (多个文件)
       │
       ▼
┌─────────────────┐
│   音频预处理     │  ← 服务端执行
│  · 格式校验      │     支持 mp3/wav/m4a/flac
│  · 时长检测      │     单文件 3~30s, 总计 1~30min
│  · 降噪 (可选)   │     可用 ffmpeg 或跳过交给服务商
│  · 元数据提取    │     采样率、声道、比特率
└────────┬────────┘
         ▼
┌─────────────────┐
│  创建异步任务    │  → 写入任务队列
│  状态: pending   │
└────────┬────────┘
         ▼
┌─────────────────┐
│  调用 Provider   │  ← 根据用户配置/系统策略选择
│  上传音频样本    │
│  创建声纹模型    │
└────────┬────────┘
         ▼
┌─────────────────┐
│  轮询/Webhook   │  ← 等待服务商训练完成
│  更新任务状态    │     ElevenLabs: 秒级
└────────┬────────┘     Azure: 分钟~小时级
         ▼
┌─────────────────┐
│  声纹就绪       │  → 通知用户 (WebSocket/邮件)
│  存储声纹 ID    │     关联到 provider_voice_id
└─────────────────┘
```

### 流程 2：语音合成（TTS）

```
用户输入文本 + 选择声纹
       │
       ▼
┌─────────────────┐
│  参数校验        │  · 文本长度限制 (各服务商不同)
│                  │  · 声纹是否就绪
│                  │  · 用户配额检查
└────────┬────────┘
         ▼
┌─────────────────┐
│  调用 Provider   │  · 传入文本 + provider_voice_id
│  合成语音        │  · 可选参数: 语速/语调/情感
└────────┬────────┘
         ▼
┌─────────────────┐
│  音频后处理      │  · 统一输出格式 (mp3)
│                  │  · 存储到 OSS/S3
│                  │  · 生成访问 URL
└────────┬────────┘
         ▼
┌─────────────────┐
│  返回音频        │  · Streaming 返回 (大文件)
│                  │  · 或返回 CDN URL
└─────────────────┘
```

---

## 三、Provider Adapter 层设计（核心）

这是整个架构最关键的抽象层，屏蔽不同服务商的差异。

### 统一接口定义

```
IVoiceProvider
│
├── 声纹管理
│   ├── createVoice(name, audioFiles[], options)  → VoiceProfile
│   ├── getVoice(voiceId)                         → VoiceProfile
│   ├── listVoices()                              → VoiceProfile[]
│   ├── deleteVoice(voiceId)                      → void
│   └── getVoiceStatus(voiceId)                   → Status
│
├── 语音合成
│   ├── synthesize(voiceId, text, options)         → AudioBuffer
│   └── synthesizeStream(voiceId, text, options)   → ReadableStream
│
└── 能力查询
    ├── getCapabilities()    → ProviderCapabilities
    └── getQuota()           → QuotaInfo

---

ProviderCapabilities:
  maxAudioFiles:       number    // 最多上传几个样本
  maxAudioDuration:    number    // 单个样本最大秒数
  minTotalDuration:    number    // 总计最少秒数
  supportedLanguages:  string[]  // 支持的语言
  supportedFormats:    string[]  // 支持的音频格式
  maxTextLength:       number    // 单次合成最大字符数
  supportsStreaming:   boolean   // 是否支持流式合成
  supportsSSML:        boolean   // 是否支持 SSML
  trainingRequired:    boolean   // 是否需要训练等待
  estimatedTrainTime:  string    // 预估训练时间
```

### 各服务商适配差异

| 对比项 | ElevenLabs | Fish Audio | Azure Custom Voice |
|--------|-----------|-----------|-------------------|
| 创建声纹方式 | Instant Clone / API upload | 上传参考音频 / API upload | 训练 Custom Model，需 consent 录音 |
| 训练时间 | 即时 | 即时 | 数小时~天 |
| 最少音频 | 1分钟 | 几十秒 | 30分钟+ |
| 合成调用 | /text-to-speech | /v1/tts | /cognitiveservices |
| 流式支持 | WebSocket | SSE | WebSocket |
| 计费方式 | 字符数 | 字符数 | 字符数+训练费 |
| 中文效果 | 好 | 很好 | 很好 |

### Adapter 选择策略

```
VoiceProviderFactory
│
├── 用户指定     → 直接使用用户选择的 provider
├── 自动选择     → 根据策略:
│   ├── 语言偏好  → 中文优先选 Fish Audio
│   ├── 速度优先  → 选 ElevenLabs (即时克隆)
│   ├── 成本优先  → 选有免费额度的
│   └── 质量优先  → 根据 benchmark 评分
└── 降级策略     → Provider A 失败 → 自动切换 Provider B
```

---

## 四、数据模型

```
User
├── id
├── email
├── plan                    // free / pro / enterprise
└── quota_remaining         // 剩余合成字符数

VoiceProfile (声纹)
├── id
├── user_id
├── name                    // 用户给声纹起的名字
├── provider                // elevenlabs / fish_audio / azure
├── provider_voice_id       // 服务商侧的声纹 ID
├── status                  // uploading / training / ready / failed
├── sample_count            // 上传了几条音频
├── total_duration          // 总时长 (秒)
├── language                // 主要语言
├── created_at
└── metadata                // provider 特有的额外信息 (JSON)

AudioSample (上传的原始音频)
├── id
├── voice_profile_id
├── storage_url             // OSS/S3 地址
├── duration                // 秒
├── format                  // mp3/wav
├── file_size
└── uploaded_at

SynthesisTask (合成任务)
├── id
├── user_id
├── voice_profile_id
├── input_text
├── input_text_length
├── provider
├── status                  // pending / processing / completed / failed
├── output_url              // 合成结果音频地址
├── output_duration         // 合成音频时长
├── cost_characters         // 消耗字符数
├── error_message
├── created_at
└── completed_at
```

---

## 五、API 设计

### 声纹管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/voices | 创建声纹 (上传音频) |
| GET | /api/voices | 列出我的声纹 |
| GET | /api/voices/:id | 声纹详情 + 状态 |
| DELETE | /api/voices/:id | 删除声纹 |
| POST | /api/voices/:id/samples | 追加音频样本 |

### 语音合成

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/synthesis | 提交合成任务 |
| POST | /api/synthesis/stream | 流式合成 (SSE) |
| GET | /api/synthesis/:id | 查询合成结果 |
| GET | /api/synthesis/:id/audio | 下载音频文件 |

### 服务能力

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/providers | 可用服务商列表 |
| GET | /api/providers/:name/caps | 服务商能力详情 |

### 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/me/quota | 查询配额 |
| GET | /api/me/usage | 使用统计 |

---

## 六、关键技术决策

### 1. 音频文件存储

```
浏览器 → 后端 (Multipart Upload) → 对象存储 (S3/OSS/R2)
                                          │
                                    生成签名 URL
                                          │
                                    传给 Provider API
```

不将大文件存在数据库，后端只做中转或直接用预签名上传。

### 2. 异步任务处理

```
短任务 (即时克隆/合成):
  同步等待 → 直接返回结果

长任务 (Azure 训练):
  创建任务 → 入队列 → Worker 轮询状态 → WebSocket 通知前端

  前端:
  ┌────────────────────────────────┐
  │  声纹训练中... ████████░░ 80%   │  ← WebSocket 实时更新
  └────────────────────────────────┘
```

### 3. 流式合成

```
前端                    后端                    Provider
  │  POST /synthesis     │                        │
  │  Accept: text/       │                        │
  │  event-stream        │                        │
  │ ──────────────────►  │  调用 stream API        │
  │                      │ ──────────────────────► │
  │  data: chunk1        │  ◄── audio chunk 1      │
  │ ◄──────────────────  │                        │
  │  data: chunk2        │  ◄── audio chunk 2      │
  │ ◄──────────────────  │                        │
  │  边接收边播放         │                        │
```

### 4. 降级与容错

```
合成请求
    │
    ▼
主 Provider (ElevenLabs)
    │
    ├── 成功 → 返回
    │
    └── 失败 (超时/500/额度用尽)
         │
         ▼
    备用 Provider (Fish Audio)
         │
         ├── 成功 → 返回 (标记 fallback)
         │
         └── 失败 → 返回错误给用户
```

### 5. 安全与合规

```
必须实现:
├── 声纹归属验证    只能使用自己创建的声纹
├── 音频内容审核    检测是否包含违规内容 (可选, 接审核 API)
├── 知情同意声明    用户上传时确认拥有该声音的使用权
├── 速率限制        防止滥用 (按用户/IP 限流)
├── 音频水印        合成音频中嵌入不可闻水印 (可选)
└── 操作审计日志    谁在什么时候用了谁的声音合成了什么
```

---

## 七、前端页面结构

| 路径 | 说明 |
|------|------|
| / | 首页/产品介绍 |
| /dashboard | 控制台总览 |
| /voices | 我的声纹列表 |
| /voices/new | 创建新声纹 (上传音频引导流程) |
| /voices/:id | 声纹详情/管理 |
| /synthesis | 语音合成工作台 |
| /synthesis/history | 合成历史 |
| /settings | 账户设置/API Key/配额 |

### 合成工作台核心交互

```
┌──────────────────────────────────────────────────┐
│  语音合成工作台                                    │
│                                                   │
│  选择声纹: [▼ 我的声音-小明 ]    服务商: [自动]     │
│                                                   │
│  ┌───────────────────────────────────────────┐    │
│  │                                           │    │
│  │  在此输入要合成的文本...                     │    │
│  │                                           │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  语速: [1.0x]  语调: [正常]  情感: [自然]          │
│                                                   │
│  [合成并播放]     [下载 MP3]                       │
│                                                   │
│  ┌───────────────────────────────────────────┐    │
│  │  ▶ ═══════════════════░░░░  02:15 / 03:20 │    │
│  └───────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

---

## 八、推荐技术选型

| 层 | 推荐方案 |
|----|---------|
| 后端 | Node.js + TypeScript + NestJS (或 Python + FastAPI) |
| 前端 | React / Next.js + TailwindCSS |
| 数据库 | PostgreSQL (主数据) + Redis (缓存/队列) |
| 存储 | S3 / Cloudflare R2 / 阿里云 OSS |
| 队列 | BullMQ (Node) 或 Celery (Python) |
| 部署 | Docker + 任意云平台 |

---

## 九、成本分析

### API 调用费

| 服务商 | 语音克隆 | 合成费用 | 免费额度 |
|--------|---------|---------|---------|
| ElevenLabs | 包含在套餐 | ~$0.24/1K字符 | 10K字符/月(免费) |
| Fish Audio | 免费 | ~$0.015/1K字符 | 10K字符/月(免费) |
| Azure | 训练费~$20/小时 | ~$0.016/1K字符 | $200初始额度 |
| OpenAI TTS | 不支持克隆 | $0.015/1K字符 | 无 |

> 合成一篇 1000 字文章: ElevenLabs ~$0.24, Fish Audio ~$0.015

### 基础设施费（月）

| 组件 | 费用 | 说明 |
|------|------|------|
| 服务器 | $5~20 | VPS 1台, Vercel 免费亦可 |
| 数据库 | $0~15 | Supabase/Neon 有免费额度 |
| 对象存储 | $0~5 | Cloudflare R2 免费 10GB |
| Redis | $0~10 | Upstash 有免费额度 |
| 域名+CDN | $1~10 | - |
| **合计** | **$6~60** | - |

### 分阶段成本控制

| 阶段 | 月成本 | 策略 |
|------|--------|------|
| MVP 验证 | ~$0 | 只接 Fish Audio, 全用免费 tier (Vercel + Supabase + R2) |
| 有用户 | $50~200 | 加 ElevenLabs 做高端选项, 按量付费 |
| 规模化 | 按量增长 | 多 Provider 适配, 缓存层, 批量合同谈价 |

> 核心结论: 固定成本可做到接近 $0, 真正花钱的只有 API 调用费 — 直接转嫁给用户即可。
