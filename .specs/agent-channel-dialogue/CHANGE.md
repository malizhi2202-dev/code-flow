# CHANGE: Agent 多渠道 IM/邮箱对话接入

- **Change ID**: agent-channel-dialogue
- **创建日期**: 2026-07-04
- **路径建议**: 完整
- **状态**: draft

---

## Why（为什么做）

当前 Agent 系统只有「配置」没有「对话」——用户建好 Agent、绑了工作流、配了模型，但没有地方实际和 Agent 聊天。Agent 只能通过编排拓扑被其他 Agent 调用，无法直接服务人类用户。

同时，Agent 已有的 `agent_memory` 跨渠道记忆表（web/feishu/dingtalk/wechat_work/slack/telegram）已经是现成底座，但渠道接入层缺失——记忆能存，但消息进不来也出不去。

竞品对标：Dify 有 Chatflow、Coze 有跨渠道 Bot 同步、n8n 有 Chat Hub。我们需要补上「对话」这块拼图。

## What（做什么）

**两件事**：

1. **Agent 内嵌对话页**：在 Agent 详情页新增「💬 对话」Tab，提供 ChatGPT 风格的聊天窗口，用户可在 Web 端直接与 Agent 对话测试
2. **多渠道 IM/邮箱 Bot 接入**：构建通用 Bot 适配框架，v1 接入 **6 个渠道**（国内 ×2 + 国际 ×2 + 邮箱 ×2），平台作为消息中继网关（渠道消息 → Agent → 回复 → 推回渠道）

**v1 渠道清单**：

| 类别 | 渠道 | 理由 |
|------|------|------|
| 🇨🇳 国内 IM | 飞书 (Feishu) | 国内企业协同 Top1，Bot API 完善 |
| 🇨🇳 国内 IM | 钉钉 (DingTalk) | 中小企业覆盖面广，已有机遇表占位 |
| 🌍 国际 IM | Slack | 全球技术团队首选，Bot API 最成熟 |
| 🌍 国际 IM | Telegram | C 端用户量最大，Bot API 极简 |
| 📧 国内邮箱 | 网易邮箱 | 国内个人/企业邮箱首选 |
| 📧 国际邮箱 | 通用 SMTP/IMAP | 覆盖 Gmail/Outlook/QQ 邮箱等 |

## 视觉调性（前端项目）

- **选定**：工业（Industrial）— 已锁定于 CONTEXT.md
- **理由**：延续现有 code-kit-monitor 暗色面板风格，数据密度优先，冷色温
- **明确排除**：无需重选，已有项目延续

## 影响面

- [x] 影响 `REQUIREMENT.md`（新功能，需定义用户故事、AC、渠道协议细节）
- [x] 影响 `DESIGN.md` / 引入新 ADR（通用 Bot 适配框架架构决策、消息网关设计）
- [ ] 影响现有 AC（不破坏现有功能）
- [x] 影响数据模型 / 迁移（新增 ChannelConfig、Message、Conversation 表；复用 agent_memories 表做跨渠道记忆）
- [ ] 影响外部 API 兼容性（新增 `/api/agents/{id}/chat`、`/api/channels/*` 路由，不改变已有 API）

## 范围排除（这次不做）

- 微信（公众号/企业微信）/ QQ（Bot 审核流程复杂，API 限制多，下个 phase）
- Bot 全生命周期托管（本平台不管 Bot 的创建/审核/上线，只管**接入已有 Bot**）
- 渠道维度的独立分析/统计 dashboard（复用现有 metrics 管道即可）
- 多轮对话的持久化存储（AgentMemory 已具备，本次只接入，不做记忆策略升级）
- 消息队列/异步重试机制（v1 同步处理，后续引入）

## 验收线（粗粒度，不是 AC）

1. 用户能在 Agent 详情页「💬 对话」Tab 中直接与 Agent 文字对话，消息即时返回
2. 用户创建/编辑 Agent 时能配置飞书/钉钉/Slack/Telegram/邮箱渠道的连接参数，保存后 Agent 接入该渠道
3. 在已接入的 IM 工具（如飞书）中向 Bot 发消息 → Agent 收到并回复 → 用户在飞书中收到回复（打通级，平台作为消息网关）

## 风险与未知

- **Webhook 可达性**：飞书/钉钉/Slack 的 Bot 回调需要公网可达 URL。本地开发环境需 ngrok/frp 等隧道工具，生产部署需有公网域名。这是渠道接入的硬前置条件
- **消息格式异构**：各渠道消息格式差异大（飞书用 JSON 卡片、Slack 用 Block Kit、Telegram 用 Markdown/HTML），通用抽象层设计是关键决策点——过度抽象会丢失渠道特性，抽象不足会重复代码
- **邮箱轮询 vs 实时推送**：SMTP/IMAP 没有原生的消息推送，v1 用 IMAP IDLE 或定时轮询，延迟会比 IM 高
- **Agent 响应时长**：Agent 调用 LLM 可能需要 3-30 秒，IM 渠道有超时限制（飞书 3s、Slack 3s），需要先返回"思考中..."占位再异步更新（v1 同步占位 + 轮询更新）

---

> 后续 AC 与设计细节进入 `REQUIREMENT.md` / `DESIGN.md`，本文件不再扩展。
