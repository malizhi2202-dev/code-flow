# CHANGE — agent_probes 探针大表性能优化

| 字段 | 值 |
|---|---|
| **Change ID** | `fix-probe-bloat` |
| **优先级** | P0（Agent 管控页 10s+ 超时无法使用） |
| **路径建议** | 最短：TASK → DEV → TEST → REVIEW → INTEGRATION（纯 bug 修复） |

## Why

`agent_probes` 表每天积累 150 万条 health 探针记录（53 agent × 3s 间隔），当前 99 万条。probes 查询使用 `MAX(created_at) GROUP BY agent_id, probe_type` 全表扫描，导致 Agent 管控页 10s+ 超时。

## What

引入 `agent_probe_latest` 状态表，probes API 直接查状态表（无需 GROUP BY），历史数据保留在 `agent_probes` 表中。

## 验收线

- probes API 响应 <100ms（当前 10s+）
- 历史探针数据不丢失（agent_probes 保留 7 天）

## 范围排除

- 不改前端
- 不改数据库 schema 外内容
