# TASK: Agent 多渠道 IM/邮箱对话接入

- **Change ID**: agent-channel-dialogue
- **关联**: `@.specs/agent-channel-dialogue/REQUIREMENT.md`、`@.specs/agent-channel-dialogue/DESIGN.md`

---

## 波次划分

```
Wave 1 (parallel): T01[P], T02[P]                              ← 数据层 + 前端组件
Wave 2 (parallel): T03[P], T04[P], T05[P]                      ← 后端核心 + 前端页面 (depends on T01)
Wave 3 (parallel): T06[P], T07[P], T08[P], T09[P], T10[P], T11[P]  ← 渠道适配器 + 渠道UI (depends on T01)
Wave 4:            T12, T13                                    ← 集成 + 联调 (depends on W2, W3)
```

---

## 任务清单

```xml
<task id="T01" parallel="true" status="pending">
  <name>ORM 模型：channel_configs + conversations + messages 三张表</name>
  <read_files>
    backend/models/__init__.py
    backend/models/agent.py
    backend/services/encryption_service.py
  </read_files>
  <write_files>
    backend/models/channel_config.py
    backend/models/conversation.py
    backend/models/message.py
    backend/models/__init__.py
  </write_files>
  <action>
    按 DESIGN §3 表结构创建三个 SQLAlchemy 模型：
    - ChannelConfig: agent_id, channel_type, credentials_encrypted(JSON), status, webhook_uuid
    - Conversation: agent_id, owner_id, channel_type, channel_conversation_id, title
    - Message: conversation_id, role(user/agent/system), content, status(pending/processing/done/error), channel_message_id
    在 models/__init__.py 注册三个模型
  </action>
  <verify>cd code-kit-monitor/backend && python3 -c "from models import ChannelConfig, Conversation, Message; print('OK')"</verify>
  <done>三张表可通过 SQLAlchemy 创建，模型导入无报错</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T02" parallel="true" status="pending">
  <name>ChatWindow 可复用聊天组件</name>
  <read_files>
    frontend/src/pages/AgentDetail.tsx
  </read_files>
  <write_files>
    frontend/src/components/ChatWindow.tsx
  </write_files>
  <action>
    创建 ChatWindow 组件，props: agentId, agentName, messages[], onSend(content), loading, error。
    包含：消息历史列表（user/agent 左右对齐、时间戳）、底部输入框（Enter 发送、Shift+Enter 换行）、发送按钮、加载中状态、错误提示+重试按钮。
    复用 AgentDetail.tsx 的 CSS 变量（--bg-card, --border, --color-primary 等），暗色工业风。
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/components/ChatWindow.tsx</verify>
  <done>ChatWindow 组件可在 AgentDetail 和 ConversationCenter 中复用</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T03" parallel="true" status="pending">
  <name>chat_service 核心：消息路由 + Agent LLM 调用</name>
  <read_files>
    backend/models/agent.py
    backend/models/channel_config.py
    backend/models/conversation.py
    backend/models/message.py
    backend/services/encryption_service.py
    backend/database.py
  </read_files>
  <write_files>
    backend/services/chat_service.py
  </write_files>
  <action>
    实现 chat_service：
    1. send_message(agent_id, content, owner_id, conversation_id?, channel_type?) → Message
       - 查/建 conversation
       - 写 user message (status=done)
       - 读 Agent 配置 → 解密 API Key
       - 构造 messages=[{role:"system", content:system_prompt}, {role:"user", content}]
       - 调用 LLM (OpenAI-compatible HTTP API, timeout=60s)
       - 写 agent message (status=done/error)
       - 返回
    2. get_messages(conversation_id, since_id?, limit=100)
    3. list_conversations(owner_id)
    4. create_conversation(agent_id, owner_id, channel_type?)
    消息输入校验：长度截断 4000 字符 + 攻击前缀检测 + 角色标记隔离
  </action>
  <verify>cd code-kit-monitor/backend && python3 -c "from services.chat_service import ChatService; print('OK')"</verify>
  <done>send_message 可接收文本并返回 Agent 回复</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T04" parallel="true" status="pending">
  <name>chat_api + channel_api 路由</name>
  <read_files>
    backend/routes/agents_api.py
    backend/main.py
    backend/services/chat_service.py
    backend/services/encryption_service.py
    backend/services/audit_service.py
  </read_files>
  <write_files>
    backend/routes/chat_api.py
    backend/routes/channel_api.py
    backend/main.py
  </write_files>
  <action>
    chat_api.py (prefix=/api):
    - POST /api/agents/{id}/chat — Web 端发消息
    - GET /api/chat/{conversation_id}/messages?since={msg_id}&limit=100 — 轮询消息历史
    - GET /api/chat/conversations — 列出当前用户的会话列表
    - POST /api/chat/conversations — 创建新会话

    channel_api.py (prefix=/api/channels):
    - POST /api/channels/{type}/callback/{uuid} — 渠道 webhook 统一入口
      1. 查 channel_config (by uuid)
      2. 解密凭证
      3. 动态 import 适配器 → validate_request → parse_message → chat_service.send_message → adapter.send_message
    - GET/POST/PUT/DELETE /api/agents/{id}/channels — 渠道配置 CRUD
    - POST /api/agents/{id}/channels/{ch_id}/test — 测试渠道连接

    在 main.py 注册两个路由（加 2 行 import + 2 行 include_router）
  </action>
  <verify>cd code-kit-monitor/backend && python3 -c "from routes.chat_api import router; from routes.channel_api import router; print('OK')"</verify>
  <done>API 路由可正常导入并注册</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T05" parallel="true" status="pending">
  <name>Zustand chat store + ConversationCenter 对话中心页面</name>
  <read_files>
    frontend/src/stores/agents.ts
    frontend/src/App.tsx
    frontend/src/components/Sidebar.tsx
  </read_files>
  <write_files>
    frontend/src/stores/chat.ts
    frontend/src/pages/ConversationCenter.tsx
  </write_files>
  <action>
    1. chat.ts Zustand store：activeAgentId, conversations[], currentMessages[], sendMessage(), loadConversations(), loadMessages(), pollMessages()
    2. ConversationCenter.tsx：左侧 Agent 列表（名称+最近消息预览+时间） + 右侧 ChatWindow 组件。
       - 复用 ChatWindow（T02）
       - 首次空状态引导（无对话历史时显示提示）
       - 按产品经理要求：Agent 列表含消息预览、对话历史分页「加载更多」
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/pages/ConversationCenter.tsx</verify>
  <done>对话中心页面可编译通过，左侧 Agent 列表 + 右侧聊天窗</done>
  <depends_on>T02</depends_on>
  <auto>true</auto>
</task>

<task id="T06" parallel="true" status="pending">
  <name>ChannelAdapter Protocol 基类定义</name>
  <read_files>
    backend/services/encryption_service.py
  </read_files>
  <write_files>
    backend/services/channel_adapter.py
  </write_files>
  <action>
    定义 ChannelAdapter Protocol（5 个方法）：
    - validate_request(headers, body, credentials) → bool
    - parse_message(raw) → UniversalMessage
    - send_message(msg, credentials, conversation_id) → str (返回 channel_message_id)
    - update_message(channel_message_id, new_content, credentials) → bool (默认 False)
    - get_channel_info() → ChannelMeta

    定义 UniversalMessage dataclass：content, attachments, sender_id, conversation_id
    定义 ChannelMeta dataclass：channel_type, display_name, icon

    nonce LRU 缓存工具：collections.OrderedDict，容量 10000，5 分钟 TTL
  </action>
  <verify>cd code-kit-monitor/backend && python3 -c "from services.channel_adapter import ChannelAdapter, UniversalMessage; print('OK')"</verify>
  <done>ChannelAdapter Protocol 定义完成，后续适配器均实现此接口</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T07" parallel="true" status="pending">
  <name>Telegram 适配器（第一个样板）</name>
  <read_files>
    backend/services/channel_adapter.py
    backend/services/encryption_service.py
    backend/services/chat_service.py
    backend/models/channel_config.py
  </read_files>
  <write_files>
    backend/services/adapters/__init__.py
    backend/services/adapters/telegram.py
  </write_files>
  <action>
    实现 TelegramAdapter（满足 ChannelAdapter Protocol）：
    - Bot API 最简单，HTTP 调用即可
    - validate_request: Telegram 无签名机制，直接返回 True
    - parse_message: 解析 Telegram Update JSON → UniversalMessage
    - send_message: POST sendMessage API
    - update_message: POST editMessageText API → 返回 True
    作为后续适配器的样板实现
  </action>
  <verify>cd code-kit-monitor/backend && python3 -c "from services.adapters.telegram import TelegramAdapter; print('OK')"</verify>
  <done>Telegram 适配器可导入，4+1 个方法全部实现</done>
  <depends_on>T06</depends_on>
  <auto>true</auto>
</task>

<task id="T08" parallel="true" status="pending">
  <name>Slack 适配器</name>
  <read_files>
    backend/services/channel_adapter.py
    backend/services/adapters/telegram.py
    backend/services/encryption_service.py
  </read_files>
  <write_files>
    backend/services/adapters/slack.py
  </write_files>
  <action>
    实现 SlackAdapter（参照 Telegram 样板，增加签名校验）：
    - validate_request: Slack signing secret 校验 (x-slack-signature + x-slack-request-timestamp)
    - parse_message: 解析 Slack Event JSON → UniversalMessage
    - send_message: chat.postMessage API
    - update_message: chat.update API → 返回 True
  </action>
  <verify>cd code-kit-monitor/backend && python3 -c "from services.adapters.slack import SlackAdapter; print('OK')"</verify>
  <done>Slack 适配器可导入，含签名校验</done>
  <depends_on>T06</depends_on>
  <auto>true</auto>
</task>

<task id="T09" parallel="true" status="pending">
  <name>飞书适配器</name>
  <read_files>
    backend/services/channel_adapter.py
    backend/services/adapters/telegram.py
    backend/services/encryption_service.py
  </read_files>
  <write_files>
    backend/services/adapters/feishu.py
  </write_files>
  <action>
    实现 FeishuAdapter：
    - validate_request: 飞书签名校验 (timestamp + nonce + body 做 SHA1)
    - parse_message: 解析飞书事件 JSON → UniversalMessage
    - send_message: 飞书发送消息 API；>3s 先回「思考中...」占位，再调 update_message
    - update_message: 飞书修改消息 API → 返回 True
  </action>
  <verify>cd code-kit-monitor/backend && python3 -c "from services.adapters.feishu import FeishuAdapter; print('OK')"</verify>
  <done>飞书适配器可导入，含签名校验+占位消息逻辑</done>
  <depends_on>T06</depends_on>
  <auto>true</auto>
</task>

<task id="T10" parallel="true" status="pending">
  <name>钉钉适配器（Stream 模式）</name>
  <read_files>
    backend/services/channel_adapter.py
    backend/services/adapters/telegram.py
    backend/services/encryption_service.py
  </read_files>
  <write_files>
    backend/services/adapters/dingtalk.py
  </write_files>
  <action>
    实现 DingTalkAdapter（Stream 模式，不需要公网 webhook URL）：
    - validate_request: 钉钉 Stream 模式由 SDK 内部处理签名，返回 True
    - parse_message: 解析钉钉消息 JSON → UniversalMessage
    - send_message: 钉钉发送消息 API
    - update_message: 钉钉不支持修改已发送消息 → 返回 False
  </action>
  <verify>cd code-kit-monitor/backend && python3 -c "from services.adapters.dingtalk import DingTalkAdapter; print('OK')"</verify>
  <done>钉钉适配器可导入，Stream 模式</done>
  <depends_on>T06</depends_on>
  <auto>true</auto>
</task>

<task id="T11" parallel="true" status="pending">
  <name>SMTP 邮件适配器 + ChannelConfig 渠道配置组件</name>
  <read_files>
    backend/services/channel_adapter.py
    backend/services/adapters/telegram.py
    frontend/src/pages/AgentDetail.tsx
    frontend/src/components/ChatWindow.tsx
  </read_files>
  <write_files>
    backend/services/adapters/smtp_email.py
    frontend/src/components/ChannelConfig.tsx
  </write_files>
  <action>
    后端 SMTPAdapter：
    - validate_request: SMTP 无 webhook，返回 True
    - parse_message: 不适用（无收件能力），抛 NotImplementedError
    - send_message: smtplib 发送邮件（credentials 含 smtp_host/port/user/password），发送后立即 del credentials["password"]
    - update_message: 不支持 → 返回 False

    前端 ChannelConfig 组件：
    - props: agentId, onSave
    - 5 种渠道类型选择（飞书/钉钉/Slack/Telegram/SMTP），每种对应不同表单字段
    - 渠道列表展示（图标+名称+状态标签，状态颜色：active=绿/error=红/draft=灰/disabled=灰）
    - 测试连接按钮 + 删除按钮
    - SMTP 仅展示 SMTP 配置项（无 IMAP 选项）→ AC-19
  </action>
  <verify>cd code-kit-monitor/backend && python3 -c "from services.adapters.smtp_email import SMTPAdapter; print('OK')" && cd ../frontend && npx tsc --noEmit src/components/ChannelConfig.tsx</verify>
  <done>SMTP 适配器可导入；ChannelConfig 组件可编译，5 种渠道表单+状态展示</done>
  <depends_on>T02,T06</depends_on>
  <auto>true</auto>
</task>

<task id="T12" parallel="false" status="pending">
  <name>AgentDetail 集成：对话 Tab + 渠道配置嵌入 + 「发布到渠道」按钮</name>
  <read_files>
    frontend/src/pages/AgentDetail.tsx
    frontend/src/components/ChatWindow.tsx
    frontend/src/components/ChannelConfig.tsx
  </read_files>
  <write_files>
    frontend/src/pages/AgentDetail.tsx
  </write_files>
  <action>
    在 AgentDetail.tsx 中：
    1. Tab 栏新增「💬 对话」Tab → 嵌入 ChatWindow 组件，传入 agentId + agent.name
    2. 对话 Tab 顶部加「发布到渠道」按钮 → 点击跳转到编辑 Tab 的渠道配置区（自动展开）
    3. 编辑 Tab 底部嵌入 ChannelConfig 组件
    4. ChatWindow 的 onSend 调用 POST /api/agents/{id}/chat
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/pages/AgentDetail.tsx</verify>
  <done>AgentDetail 页面含对话 Tab + 渠道配置区 + 发布到渠道按钮</done>
  <depends_on>T05,T11</depends_on>
  <auto>true</auto>
</task>

<task id="T13" parallel="false" status="pending">
  <name>App.tsx 集成：侧边栏入口 + ConversationCenter 路由 + 端到端联调</name>
  <read_files>
    frontend/src/App.tsx
    frontend/src/pages/ConversationCenter.tsx
    frontend/src/pages/AgentDetail.tsx
  </read_files>
  <write_files>
    frontend/src/App.tsx
  </write_files>
  <action>
    1. App.tsx：
       - import ConversationCenter
       - NAV 数组加 { id: 'chat', label: '💬 对话中心' }
       - renderContent() 加 nav === 'chat' 分支 → 渲染 ConversationCenter
    2. 启动前后端 → 验证完整链路：
       - 侧边栏点击对话中心 → 进入
       - 选择 Agent → 发消息 → 收到回复
       - AgentDetail 对话 Tab → 发消息 → 收到回复
       - 配置渠道 → 保存 → 状态展示
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/App.tsx</verify>
  <done>侧边栏对话中心入口可用，全链路打通</done>
  <depends_on>T12</depends_on>
  <auto>true</auto>
</task>
```

---

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
|  |  |  |  |

---

## Fix 任务（来自 REVIEW / INTEGRATION）

> 此区域由 review/integration 阶段自动追加。
