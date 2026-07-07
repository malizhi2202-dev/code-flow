# TEST — agent_probes 探针大表性能优化

| 字段 | 值 |
|---|---|
| **Change ID** | `fix-probe-bloat` |

## 测试范围

纯后端性能修复，跳过前端/UI/安全/兼容轮次。

## 功能验证

| 用例 | 方法 | 结果 |
|---|---|---|
| probes 响应 <100ms | curl 3次 | ✅ 89ms→20ms→19ms |
| 53 agents 正常返回 | 计数 | ✅ 53 |
| 历史数据不丢失 | agent_probes 表保留 INSERT | ✅ _save_probe 仍 INSERT 历史表 |
| 状态表 upsert | agent_probe_latest 53行验证 | ✅ 同 agent+type 只留最新 |

## 回归

| 测试 | 结果 |
|---|---|
| queue API | ✅ 200 |
| reconcile API | ✅ 200 |
| approvals API | ✅ 200 |
