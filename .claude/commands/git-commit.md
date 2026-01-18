---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
description: 智能 Git Commit - 自动分析变更生成规范提交
---

## 原则

不需要 AI 署名。

## 执行步骤

1. **分析变更**：
   git status --porcelain
   git diff HEAD --name-only
   git diff HEAD --stat

2. **生成 Commit Message**（Conventional Commits + Emoji）：
   ✨ feat(范围): 描述
   🐛 fix(范围): 描述
   📚 docs(范围): 描述
   🎨 style(范围): 描述
   🔄 refactor(范围): 描述
   ✅ test(范围): 描述
   ⚡ perf(范围): 描述
   🔧 chore(范围): 描述

3. **执行提交**：
   git add .
   git commit -m "生成的规范消息"

4. **验证结果**：
   git log -1 --oneline

## 输出格式

📊 变更分析：2个文件 (+156/-23行)
✨ feat(orders): 新增订单列表页面，支持筛选分页
✅ git add . && git commit -m "..."
🎉 提交成功：abc1234 ✨ feat(orders)...

## Vue3 项目范围示例

- `orders`：订单模块
- `components`：组件
- `ui`：Element Plus
- `store`：Pinia
- `build`：Vite配置
