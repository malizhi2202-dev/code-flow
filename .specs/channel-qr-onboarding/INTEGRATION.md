# INTEGRATION: 渠道 QR 码扫码接入

- **Change ID**: channel-qr-onboarding
- **状态**: ✅ 归档
- **日期**: 2026-07-05

---

## 交付清单

| 工件 | 状态 |
|---|---|
| CHANGE.md | ✅ |
| REQUIREMENT.md | ✅ |
| DESIGN.md | ✅ |
| UI-DESIGN.md | ✅ |
| TASK.md (4 Wave × 8 Tasks) | ✅ |
| 后端代码 (4 文件) | ✅ |
| 前端代码 (2 文件) | ✅ |
| TEST.md | ✅ |
| REVIEW.md | ✅ |

## 新增文件

```
backend/services/oauth_provider.py   — OAuthProvider Protocol 抽象
backend/services/oauth_feishu.py     — 飞书 Device Code OAuth
backend/services/oauth_dingtalk.py   — 钉钉扫码 OAuth
backend/services/oauth_mock.py       — Mock 模式 + 场景注入
frontend/src/components/QrScanModal.tsx — 扫码弹窗组件
```

## 修改文件

```
backend/routes/channel_api.py            — +OAuth API 端点 (start/poll)
frontend/src/components/ChannelConfig.tsx — +扫码接入按钮 + QrScanModal 集成
.specs/CONTEXT.md                        — +域语言 + 已锁决策
```

## 使用方式

1. **真实模式**: 设环境变量 `FEISHU_APP_ID` / `FEISHU_APP_SECRET` / `DINGTALK_APP_KEY` / `DINGTALK_APP_SECRET`
2. **Mock 模式**: `CHANNEL_OAUTH_MOCK=true` 启动后端 → 扫码弹窗模拟 2s 授权成功
3. Agent 详情页 → 渠道接入区域 → 点击「扫码接入飞书」或「扫码接入钉钉」

---

> 🤖 Generated with [Claude Code](https://claude.com/claude-code)
