# DESIGN: 渠道 QR 码扫码接入

- **Change ID**: channel-qr-onboarding
- **关联**: `@.specs/channel-qr-onboarding/REQUIREMENT.md`、`@.specs/CONTEXT.md`
- **作者**: AI（Architect 角色）+ 人工 review

---

## 0. 技术栈选定

> 本 change 不引入新技术栈，沿用项目既有栈。

- **选定**：项目既有技术栈（React 18 + FastAPI + SQLAlchemy + SQLite）
- **前端**：React 18.3 + TypeScript 5.5 + Vite 5.4 + Tailwind CSS 3.4
- **后端**：FastAPI 0.110+ / Python 3.10+ / SQLAlchemy 2.0
- **数据库**：SQLite（`channel_configs` 表，复用）
- **关键依赖**：无新增 npm/PyPI 依赖（二维码用 `<img>` 渲染后端返回的 URL；如需前端生成二维码用 `qrcode` 轻量库）
- **明确排除**：不做新的第三方 OAuth SDK（飞书/钉钉直接调 HTTP API）；不做 WebSocket 轮询（用前端定时 fetch）

---

## 0.5 既有架构对齐（brownfield）

### 0.5.1 触碰模块

```
触碰模块：
- frontend/src/components/ChannelConfig.tsx（修改：加「扫码接入」按钮）
- frontend/src/pages/AgentDetail.tsx（修改：传 saveError prop 已有）
- backend/routes/channel_api.py（新增：OAuth 端点）
- backend/models/channel_config.py（复用，无 schema 变更）

新增模块：
- backend/services/oauth_provider.py（OAuthProvider 抽象基类）
- backend/services/oauth_feishu.py（飞书 Device Code 实现）
- backend/services/oauth_dingtalk.py（钉钉扫码 OAuth 实现）
- frontend/src/components/QrScanModal.tsx（扫码弹窗通用组件）
- frontend/src/components/QrCode.tsx（二维码展示组件，含倒计时）

禁动清单（与本次无关）：
- backend/auth.py, backend/database.py, frontend/src/main.tsx（全局 fetch 拦截器）
```

### 0.5.2 既有抽象沿用对照表

| 本次需要 | 既有 | 决定 |
|---|---|---|
| HTTP 客户端（前端） | 全局 `fetch()` 拦截器 `main.tsx:9-21` | 沿用 |
| HTTP 客户端（后端调平台 API） | `httpx` 或 `requests` (requirements.txt) | 沿用 `httpx`（FastAPI 推荐） |
| 加密存储 | `services/encryption_service.py` | 沿用 `encrypt()/decrypt()` |
| 审计日志 | `services/audit_service.py` | 沿用 `log_audit()` |
| 渠道模型 | `models/channel_config.py` | 复用 `ChannelConfig`，不迁移 |
| 二维码渲染 | 无 | 新建，用 `<img>` 直接渲染 URL |

---

## 1. 决策清单

| # | 决策 | 备选 | 选择理由 | 取舍代价 |
|---|---|---|---|---|
| D1 | OAuthProvider 抽象基类（Python Protocol） | 飞书/钉钉各写各的函数 | 复用 ChannelAdapter 的设计模式，未来加 Slack 只需新增类 | 增加一个抽象层文件 |
| D2 | 前端轮询：`setInterval` 每 3 秒 fetch 后端 | WebSocket | 简单可靠，复用既有 fetch 拦截器 | 多一次 HTTP 往返，本场景可接受 |
| D3 | 二维码渲染：后端返回 `qr_url`（飞书平台生成），前端直接 `<img src={qr_url}>` | 前端用 `qrcode` 库自己画 | 飞书平台已返回二维码图片 URL，无需前端再生成 | 钉钉如不返回图片 URL，需要前端用 `qrcode` 库生成 |
| D4 | Mock 模式：环境变量 `CHANNEL_OAUTH_MOCK=true` 注入 Mock Provider | 前端单独 mock | 后端统一控制，前后端一致，CI 可自动化 | 需服务重启切换模式 |
| D5 | OAuth state 存储：内存 dict（`{device_code: state_obj}`）| Redis / DB | 单实例本地部署，无需持久化 | 重启丢失未完成的 OAuth 流程（5 分钟窗口，可接受） |

---

## 2. 数据流 / 架构图

```
  前端                                    后端                               飞书/钉钉平台
  ────                                    ────                               ────
  ChannelConfig.tsx
    │ 点击「扫码接入」选飞书
    │ POST /api/channels/feishu/oauth/start
    └──────────────────────────────────→  oauth_feishu.py
                                              │ 调 platform API
                                              │ POST /open-apis/auth/v3/...
                                              └─────────────────────────→  返回 device_code + qr_url
                                              ←────────────────────────── 
                                          返回 { qr_url, device_code, expires_in }
    ←────────────────────────────────── 
  QrScanModal 展示二维码
    │ setInterval 3s 轮询
    │ GET /api/channels/feishu/oauth/poll?device_code=xxx
    └──────────────────────────────────→  轮询平台 API
                                              └─────────────────────────→  用户已扫码？未/已/拒绝
                                              ←────────────────────────── 
                                          状态: pending / authorized / rejected / expired
    ←────────────────────────────────── 
    状态变化 → 更新 UI（倒计时/成功/失败）
    
    授权成功 → POST /api/agents/{id}/channels（自动创建渠道配置）
    ←──────────────────────────────────  渠道创建，状态 active
    QrScanModal 关闭，ChannelConfig 刷新列表
```

---

## 3. 关键状态机

```
OAuth 流程状态 (QrScanModal UI):
  
  [idle] ──点击「扫码接入」──→ [loading] ──获取 qr_url 成功──→ [scanning]
                                                                      │
                                    ┌─────────────────────────────────┤
                                    │                                 │
                                    v                                 v
                              [authorized]                      [expired]
                              弹窗关闭                           显示「已过期」
                              渠道 active                        可重新获取
                                    │
                                    │ 用户拒绝
                                    v
                              [rejected]
                              显示「已取消」
                              可选「重试」或「手动填写」

轮询后端状态:
  pending ──用户扫码──→ scanned ──用户确认──→ authorized
     │                      │
     │ 5min 超时             │ 用户拒绝
     v                      v
  expired               rejected
```

---

## 4. ADR 索引

- **ADR-001**: OAuthProvider 抽象采用 Python Protocol（而非 ABC 继承），与既有 ChannelAdapter 设计一致。文件：`@.specs/adr/001-oauth-provider-protocol.md`

---

## 5. 风险

| # | 风险 | 影响 | 概率 | 缓解 |
|---|---|---|---|---|
| R1 | 飞书/钉钉开放平台 API 变更 | OAuth 流程不通 | 低 | Mock 模式保底测试；关注官方 changelog |
| R2 | OAuth state 内存存储重启丢失 | 用户需重新扫码 | 中 | 5 分钟窗口，可接受；未来可迁移到 Redis |
| R3 | 钉钉平台不返回 QR 图片 URL | 需要前端自行生成二维码 | 中 | 前端引入 `qrcode` npm 包（~30KB）作为 fallback |
| R4 | 前端轮询频率过高导致后端压力 | 性能下降 | 低 | 3s 间隔 × 单用户 1 个 device_code，量小；加 rate limiting |

---

## 6. 不在范围

- Slack OAuth 重定向接入（方案不同，留 v2）
- 二维码自动刷新（需用户手动点「重新获取」）
- OAuth state 持久化到 Redis（当前内存存储足够）
- 扫码接入历史记录/统计面板

---

## 9. 架构沉淀建议

### 9.1 新增的可复用抽象

| 路径 | 能力 | 触发场景 | 复用建议 |
|---|---|---|---|
| `backend/services/oauth_provider.py` | OAuth 设备授权码流程抽象（Protocol） | 飞书/钉钉扫码接入 | 未来 Slack/其他 OAuth 渠道复用此接口 |
| `frontend/src/components/QrScanModal.tsx` | 通用扫码弹窗（二维码+倒计时+状态） | 飞书/钉钉扫码 | 未来任何渠道扫码接入复用 |

### 9.2 新增/改变的项目级技术决策

| 决策 | 取值 | 影响范围 | 推翻代价 |
|---|---|---|---|
| OAuth Provider 抽象模式 | Python Protocol（同 ChannelAdapter） | 所有渠道 OAuth 接入 | 低，替换实现即可 |

### 9.3 新增/修改的跨模块契约

```
- 新增 POST /api/channels/{channel_type}/oauth/start → { qr_url, device_code, expires_in }
- 新增 GET /api/channels/{channel_type}/oauth/poll?device_code=xxx → { status, channel? }
```

---
> 本文件不包含完整代码实现。函数签名、伪代码、接口定义可以；函数体不行。
