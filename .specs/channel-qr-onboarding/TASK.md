# TASK: 渠道 QR 码扫码接入

- **Change ID**: channel-qr-onboarding
- **关联**: `@.specs/channel-qr-onboarding/DESIGN.md`、`@.specs/channel-qr-onboarding/REQUIREMENT.md`

---

## 概览

| Wave | Tasks | 依赖 | 描述 |
|---|---|---|---|
| W1 | T01-T03 | — | 后端 OAuth 核心（可并行） |
| W2 | T04-T05 | W1 | API 端点 + 自动创建渠道 |
| W3 | T06-T07 | W2 | 前端扫码组件 + 集成 |
| W4 | T08 | W3 | Mock 模式 + 场景注入 |

---

## W1 · 后端 OAuth 核心

### T01 · OAuthProvider 抽象基类

| 字段 | 内容 |
|---|---|
| **id** | T01 |
| **name** | OAuthProvider 抽象基类 |
| **wave** | W1 |
| **write_files** | `backend/services/oauth_provider.py` |
| **action** | 定义 Python Protocol `OAuthProvider`：方法签名 `start_oauth() -> {qr_url, device_code, expires_in}` / `poll_oauth(device_code) -> {status, credentials?}` |
| **verify** | `python -c "from services.oauth_provider import OAuthProvider; print('OK')"` |
| **done** | Protocol 可被飞书和钉钉实现类引用 |
| **<auto>** | 🤖 自动化 |

### T02 · 飞书 OAuth 实现

| 字段 | 内容 |
|---|---|
| **id** | T02 |
| **name** | 飞书 Device Code OAuth 实现 |
| **wave** | W1 |
| **write_files** | `backend/services/oauth_feishu.py` |
| **read_files** | `backend/services/oauth_provider.py`, `backend/services/encryption_service.py` |
| **action** | 实现 `OAuthProvider` Protocol：`start_oauth()` 调飞书 API `POST /open-apis/auth/v3/app_access_token/internal` → `POST /open-apis/auth/v3/device/code`；`poll_oauth()` 调 `POST /open-apis/auth/v3/device/token`。使用 `httpx` 调 API。 |
| **verify** | `python -c "from services.oauth_feishu import FeishuOAuth; print('OK')"` |
| **done** | 飞书设备授权码流程可调通 |
| **<auto>** | 🤖 自动化 |

### T03 · 钉钉 OAuth 实现

| 字段 | 内容 |
|---|---|
| **id** | T03 |
| **name** | 钉钉扫码 OAuth 实现 |
| **wave** | W1 |
| **write_files** | `backend/services/oauth_dingtalk.py` |
| **read_files** | `backend/services/oauth_provider.py`, `backend/services/encryption_service.py` |
| **action** | 实现 `OAuthProvider` Protocol：`start_oauth()` 调钉钉扫码登录 API 获取 qr_url；`poll_oauth()` 轮询扫码结果。如钉钉不返回图片 URL，qr_url 字段填写登录 URL（前端用 `qrcode` 库生成图片）。 |
| **verify** | `python -c "from services.oauth_dingtalk import DingTalkOAuth; print('OK')"` |
| **done** | 钉钉扫码 OAuth 流程可调通 |
| **<auto>** | 🤖 自动化 |

---

## W2 · API 端点 + 渠道自动创建

### T04 · OAuth API 端点

| 字段 | 内容 |
|---|---|
| **id** | T04 |
| **name** | OAuth 流程 API 端点 |
| **wave** | W2 |
| **write_files** | `backend/routes/channel_api.py`（修改：新增方法） |
| **read_files** | `backend/services/oauth_feishu.py`, `backend/services/oauth_dingtalk.py`, `backend/models/channel_config.py` |
| **action** | 新增 `POST /api/channels/{channel_type}/oauth/start`（根据 channel_type 路由到对应 OAuthProvider，生成 device_code，存 state 到内存 dict）和 `GET /api/channels/{channel_type}/oauth/poll?device_code=xxx`（查询 state，轮询平台，授权成功后自动调 `create_channel` 逻辑写入 channel_configs 表）。OAuth state 内存存储：`{device_code: {status, credentials?, created_at, provider}}`。 |
| **verify** | `curl -X POST http://localhost:8000/api/channels/feishu/oauth/start` → 返回 qr_url + device_code；`curl http://localhost:8000/api/channels/feishu/oauth/poll?device_code=xxx` → 返回 status |
| **done** | 完整 OAuth API 链路可调 |
| **<auto>** | 🤖 自动化 |

### T05 · 渠道自动创建 + security hardening

| 字段 | 内容 |
|---|---|
| **id** | T05 |
| **name** | 渠道自动创建 + OAuth 安全加固 |
| **wave** | W2 |
| **write_files** | `backend/routes/channel_api.py`（修改） |
| **read_files** | `backend/models/channel_config.py`, `backend/services/encryption_service.py`, `backend/services/audit_service.py` |
| **action** | OAuth 授权成功后自动创建 ChannelConfig（加密存储 credentials → status="active"）。CSRF state 参数校验。rate limiting：同一 device_code 1 req/s。audit log 记录 oauth_start/oauth_authorized/oauth_rejected/oauth_expired/oauth_error。 |
| **verify** | Mock 模式下完整流程：start → poll authorized → DB 中 channel_configs 表生成记录且 status=active。 |
| **done** | 安全加固完成，audit log 可追踪 |
| **<auto>** | 🤖 自动化 |

---

## W3 · 前端扫码组件 + 集成

### T06 · QrScanModal 组件

| 字段 | 内容 |
|---|---|
| **id** | T06 |
| **name** | 扫码弹窗通用组件 |
| **wave** | W3 |
| **write_files** | `frontend/src/components/QrScanModal.tsx` |
| **read_files** | `frontend/src/pages/AgentDetail.tsx`（参考样式变量） |
| **action** | 实现 QrScanModal 组件。Props: `channelType`, `onSuccess(channel)`, `onClose()`, `onManualEntry()`。状态: loading → scanning → authorized/rejected/expired/error。每 3 秒轮询 `/api/channels/{type}/oauth/poll`。倒计时组件（`expires_in` 倒计时至 0）。所有 CSS 变量从项目既有 token 取。 |
| **verify** | `npx vitest run --reporter=verbose src/__tests__/QrScanModal.test.tsx` |
| **done** | 弹窗各状态 UI 渲染正确，倒计时工作，轮询逻辑正确 |
| **<auto>** | 🤖 自动化 |

### T07 · ChannelConfig 集成扫码入口

| 字段 | 内容 |
|---|---|
| **id** | T07 |
| **name** | 渠道配置集成扫码接入按钮 |
| **wave** | W3 |
| **write_files** | `frontend/src/components/ChannelConfig.tsx`（修改） |
| **read_files** | `frontend/src/components/QrScanModal.tsx`, `frontend/src/pages/AgentDetail.tsx` |
| **action** | 在 ChannelConfig 组件顶部加「扫码接入」按钮（与「添加渠道」并列）。点击弹出 QrScanModal。onSuccess 时刷新渠道列表。手动填表的「添加渠道」按钮完整保留。 |
| **verify** | `npx vitest run --reporter=verbose src/__tests__/ChannelConfig.test.tsx` |
| **done** | 扫码接入 + 手动填表两入口并存，列表刷新正常 |
| **<auto>** | 🤖 自动化 |

---

## W4 · Mock 模式

### T08 · Mock OAuth + 场景注入

| 字段 | 内容 |
|---|---|
| **id** | T08 |
| **name** | Mock 模式 + 场景注入 |
| **wave** | W4 |
| **write_files** | `backend/services/oauth_mock.py` |
| **read_files** | `backend/services/oauth_provider.py`, `backend/routes/channel_api.py` |
| **action** | 实现 `MockOAuthProvider` 实现了 `OAuthProvider` Protocol。`start_oauth()` 返回本地生成的 SVG 二维码 URL + 假 device_code。`poll_oauth()` 根据 `mock_scenario` 参数返回不同结果：默认 2 秒后 authorized；支持 expired/rejected/network_error/platform_error。路由层：`CHANNEL_OAUTH_MOCK=true` 时用 MockOAuthProvider 替代真实 provider。 |
| **verify** | `CHANNEL_OAUTH_MOCK=true python -m pytest backend/tests/test_oauth_mock.py -v` |
| **done** | Mock 模式完整流程可跑通，场景注入验证通过 |
| **<auto>** | 🤖 自动化 |

---

## 执行顺序

```
W1: T01 ─┬─ T02 (并行)
         └─ T03 (并行)
              │
W2: T04 ── T05
              │
W3: T06 ── T07
              │
W4: T08
```

**预计总 task**: 8 个 | **预计代码量**: ~400 行 Python + ~200 行 TypeScript

---

> 每个 task 的 `<auto>` 字段由 Task 门专家团投票决定。全部标记 🤖 自动化。
