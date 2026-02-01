# n8n + Claude 工作流完整教程

## 一、环境准备

### 1. 部署 n8n

```bash
# Docker 一键部署（推荐自建）
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

访问 `http://localhost:5678` 进入面板。

### 2. 获取 Anthropic API Key

- 前往 [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- 点击 **+ Create Key**，复制保存

### 3. 在 n8n 中配置 Anthropic 凭据

- n8n 面板 → **Settings → Credentials → Add Credential**
- 搜索 **Anthropic**，粘贴 API Key，保存

---

## 二、基础工作流：AI Agent + Claude 对话

这是最核心的搭建模式，所有复杂工作流都基于此扩展。

```
[Chat Trigger] → [AI Agent] → 输出
                     ↑
              [Anthropic Chat Model]（子节点）
              [Memory]（可选子节点）
              [Tools]（可选子节点）
```

### 步骤

1. **添加触发器** — 拖入 `When Chat Message Received` 节点
2. **添加 AI Agent 节点** — 连接到触发器
3. **挂载 Chat Model** — 点击 AI Agent 的 `+` 号，选择 `Anthropic Chat Model`
   - Model: 选择 `claude-sonnet-4-20250514` 或 `claude-opus-4-20250514`
   - Temperature: 0.7（创意任务调高，精确任务调低）
4. **挂载 Memory（可选）** — 让对话有上下文记忆
   - 选择 `Window Buffer Memory`（简单）或 `Postgres Chat Memory`（持久化）
5. **配置 System Prompt** — 在 AI Agent 节点的 Prompt 区域写入角色指令

点击 **Chat** 按钮测试对话。

---

## 三、实用工作流模板

### 模板1：智能客服（Telegram + Claude）

```
[Telegram Trigger] → [AI Agent] → [Telegram Send Message]
                         ↑
                  [Anthropic Chat Model]
                  [Window Buffer Memory]
                  [HTTP Request Tool]（查知识库）
```

### 模板2：内容批量生成

```
[Google Sheets Trigger] → [Loop Over Items] → [AI Agent] → [Google Sheets Update]
                                                  ↑
                                           [Anthropic Chat Model]
```

读取表格每行关键词 → Claude 生成文案 → 写回表格

### 模板3：智能路由（复杂任务用 Opus，简单任务用 Sonnet）

```
[Chat Trigger] → [AI Agent (Router)]
                      ↓
            ┌─────────┴─────────┐
     [AI Agent + Opus 4]   [AI Agent + Sonnet 4]
     （复杂推理任务）         （日常对话任务）
```

用第一个 Agent 判断任务复杂度，再分发给对应模型，**平衡成本和质量**。

---

## 四、进阶：Claude Code + n8n MCP 集成

这是 2026 年最新玩法 — 让 Claude Code 直接帮你创建 n8n 工作流。

### 1. 安装 n8n MCP Server

```bash
# 在 n8n 中生成 API Key
# Settings → n8n API → Create API Key
```

### 2. 配置 Claude Code 的 MCP

在项目根目录创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "@anthropic/n8n-mcp"],
      "env": {
        "N8N_API_URL": "http://localhost:5678",
        "N8N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### 3. 用自然语言创建工作流

在 Claude Code 中直接描述：

```
"帮我创建一个n8n工作流：当收到Telegram消息时，用Claude分析消息内容，
如果是投诉就转发给客服邮箱，如果是咨询就自动回复"
```

Claude Code 会自动生成工作流 JSON 并部署到你的 n8n 实例。

---

## 五、n8n 作为 MCP Server 暴露给 Claude

反过来，让 Claude Desktop 调用 n8n 的能力：

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": [
        "-y", "supergateway",
        "--streamableHttp", "https://your-n8n-domain/mcp-server/http",
        "--header", "authorization:Bearer YOUR_TOKEN"
      ]
    }
  }
}
```

这样 Claude 就能触发 n8n 中的任何工作流作为工具使用。

---

## 六、赚钱落地建议

| 方向 | 做法 | 收费模式 |
|------|------|----------|
| 帮企业搭自动化 | 用 n8n+Claude 做客服/数据处理流 | 项目制 5k-50k/个 |
| 做垂直 SaaS | n8n 做后端编排，前端接小程序 | 月费制 |
| 卖模板 | n8n workflow 模板 + 教程 | 单次付费/社群 |
| 代运维 | 帮客户维护 n8n 实例和工作流 | 月费制 |

---

## 学习资源

- [n8n 官方 Anthropic 节点文档](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatanthropic/)
- [n8n + Claude 集成页面](https://n8n.io/integrations/claude/)
- [n8n MCP Server GitHub](https://github.com/czlonkowski/n8n-mcp)
- [Claude Code + n8n 自动化指南](https://www.buspa.it/en/news/153/claude-code-n8n-ai-automations-prompts)
- [2025 中文实战教程（知乎）](https://zhuanlan.zhihu.com/p/1901422392972141443)
- [2026 完整英文指南（Strapi）](https://strapi.io/blog/build-ai-agents-n8n)
- [n8n AI Agent 工作流模板库](https://n8n.io/workflows/?categories=25)
- [Udemy 繁中课程：企业级 AI 自动化](https://www.udemy.com/course/aiai-agent-n8n-mcp/)

---

> 核心思路：**n8n 负责连接和编排，Claude 负责理解和生成**。两者结合就是"低代码 + AI"的完整自动化方案。
