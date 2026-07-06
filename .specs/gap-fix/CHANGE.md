# CHANGE: 执行可观测性补全

- **Change ID**: `gap-fix`
- **创建日期**: 2026-07-06
- **路径建议**: 完整
- **状态**: draft

---

## Why

AgentFlow 在管控运维层面世界领先，但执行可观测性是最大短板——Runtime.tsx 已有会话列表但无状态过滤、无实时监控、无告警。补全后可对标 Dify/n8n。

## What（按 OOP 最小改造）

| 优先级 | 项目 | 成本 | 改造方式 |
|---|---|---|---|
| 🔴 P0-1 | 状态过滤 | 2h | API 加 `?status=` 参数，前端加下拉 |
| 🟠 P1-3 | 告警通知 | 10h | 新 `alert_service.py`，不碰旧代码 |
| 🟠 P1-2 | 重试 | 5h | 新端点 + 前端按钮 |
| 🟠 P1-1 | 延迟分位数 | 6h | API 返回加 P50/P95/P99 字段 |
| 🟡 P0-2 | SSE 实时 | 20h | 新 SSE endpoint + 前端 toggle |
| 🟡 P2-3 | 执行导出 | 3h | 新端点 |
| 🟢 P3-1 | Webhook | 4h | 新 route |
| 🟢 P3-2 | 知识库 v1 | 15h | knowledge_sources 表扩展 |

## 范围排除

- 多集群联邦、AI 调度策略（P4+）

## 影响面

- [x] 影响 runtime_api.py（加参数，不改接口）
- [x] 影响 Runtime.tsx（加组件，不改现有逻辑）
- [ ] 不影响现有 AC
