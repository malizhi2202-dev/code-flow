# CHANGE: 渠道 QR 码扫码接入

- **Change ID**: channel-qr-onboarding
- **创建日期**: 2026-07-05
- **路径建议**: 完整
- **状态**: active

---

> **🛡️ G1 需求门**: 全票通过 4/4（2026-07-05）
> 高级产品经理 ✅ | 资深用户评测员 ✅ | 架构师 ✅ | 安全审计师 ✅（条件：CSRF state 参数 + access_token 加密存储 DESIGN 阶段明确）

---

## Why（为什么做）

当前 Agent 接入飞书/钉钉渠道需要**手动填写** App ID、App Secret、Webhook URL 等凭证才能激活，与 Hermes Agent `gateway setup` 的「选渠道 → 弹二维码 → 扫码 → 自动完成」体验差距明显。用户往往不记得去哪里找这些凭证，填错一个字段就连接失败，需要反复试错。

期望：像 Hermes 一样，点「扫码接入」→ 弹二维码 → 飞书/钉钉 App 扫一下 → 渠道自动激活。

## What（做什么）

为飞书（🐦）和钉钉（📌）两个渠道新增 **QR 码 OAuth 扫码接入**方式：

- **飞书**：设备授权码（Device Code）OAuth 流程 — 后端调开放平台 API 获取 device_code + QR URL → 前端展示二维码 → 用户飞书 App 扫码授权 → 后端轮询拿到 access_token → 自动创建机器人 → 渠道标记 active
- **钉钉**：扫码登录 OAuth 流程 — 类似飞书，适配钉钉开放平台 API
- **共存模式**：手动填表入口保留（已经输入过的用户不受影响），新增「扫码接入」按钮作为快捷方式
- **Mock 模式**：本地开发时无需真实平台账号，模拟完整 OAuth 流程用于调试

## 视觉调性（前端项目 · 继承已有锁定）

- **选定**：工业（Industrial）— 继承自 CONTEXT.md，本 change 不做风格调整
- **理由**：code-kit-monitor 整体调性已锁定，本功能属增量，沿用暗色默认 + 等宽字体 + 冷色温

## 影响面

- [x] 影响 `REQUIREMENT.md`（新增需求）
- [x] 影响 `DESIGN.md` / 引入新 ADR（OAuth 流程设计、token 安全存储策略）
- [ ] 影响现有 AC
- [ ] 影响数据模型 / 迁移（复用 `channel_configs` 表，无 schema 变更）
- [ ] 影响外部 API 兼容性
- [ ] 仅修复 bug，无范围变化

## 范围排除（这次不做）

- Slack / Telegram / SMTP 扫码接入（Slack 走 OAuth 重定向不是二维码，技术方案不同；本次只做飞书 + 钉钉）
- 微信/企微接入（iLink Bot API 审批门槛高，流程差异大，留后续 change）
- 渠道消息模板（卡片/按钮等富文本）— 已有，本次不改
- 扫码后机器人配置的高级选项（权限范围/回调地址自定义等）— 用平台默认值

## 验收线（粗粒度，不是 AC）

- 用户在 Agent 详情页点击「扫码接入飞书」→ 弹窗展示二维码 → 飞书 App 扫码确认 → 渠道自动创建且状态为 active → Agent 可立即在飞书中对话
- 用户在 Agent 详情页点击「扫码接入钉钉」→ 弹窗展示二维码 → 钉钉 App 扫码确认 → 渠道自动创建且状态为 active
- 原有手动填表添加渠道的路径完整保留，不受影响
- Mock 模式下可跑通整个 OAuth 流程，不依赖真实平台账号

## 风险与未知

- 飞书/钉钉开放平台 API 可能存在不兼容更新（需关注官方 changelog）
- OAuth token 过期/刷新策略需在 DESIGN 阶段明确（access_token 通常 2 小时有效）
- 用户可能没有对应平台的管理员权限（扫码时需要是应用管理员）
- 二维码过期时间（飞书 device_code 有效期 5 分钟）需前端倒计时提示

---
> 后续 AC 与设计细节进入 `REQUIREMENT.md` / `DESIGN.md`，本文件不再扩展。
