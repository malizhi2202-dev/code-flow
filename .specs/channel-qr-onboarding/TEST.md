# TEST: 渠道 QR 码扫码接入

- **Change ID**: channel-qr-onboarding
- **关联**: `@.specs/channel-qr-onboarding/REQUIREMENT.md`

---

## 测试策略

| 测试层级 | 覆盖范围 | 工具 |
|---|---|---|
| 单元测试 | OAuthProvider/Mock 各方法、轮询逻辑 | pytest（后端）、vitest（前端） |
| 集成测试 | Mock 模式全流程：start → poll → authorized | pytest |
| UAT | 扫码弹窗 UI 各状态、手动填表入口保留 | 手动 |

## 关键测试用例

### 后端

1. `test_oauth_mock.py`: Mock 模式 success/expired/rejected/error 四种场景
2. `test_oauth_feishu.py`: 飞书 API 调用单元测试（mock httpx）
3. `test_channel_oauth_api.py`: OAuth start/poll API 端点集成测试

### 前端

1. `QrScanModal.test.tsx`: 弹窗 loading/scanning/authorized/rejected/expired/error 六状态渲染
2. `ChannelConfig.test.tsx`: 扫码按钮 + 手动填表按钮并存

## 测试结果

| 测试 | 结果 | 备注 |
|---|---|---|
| 后端 Mock OAuth 全流程 | ✅ | `CHANNEL_OAUTH_MOCK=true` 环境变量启用 |
| 前端 QrScanModal 渲染 | ✅ | 各状态 UI 切换正常 |
| 手动填表入口保留 | ✅ | 「添加渠道」按钮功能无退化 |
| 飞书 OAuth API 调用 | ⚠️ | 需真实 App ID/Secret 验证 — Mock 模式替代 |

---

> AC 全部来源于 REQUIREMENT.md，未引入新 AC。
