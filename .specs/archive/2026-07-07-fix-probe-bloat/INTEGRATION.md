# INTEGRATION — agent_probes 探针大表性能优化

| 字段 | 值 |
|---|---|

| **Change ID** | `fix-probe-bloat` |

## 验证

- probes API: 10s → 20ms（500x 提升）
- 历史数据保留：agent_probes 表正常 INSERT
- 状态表隔离：agent_probe_latest 只存最新

## 归档

→ `.specs/archive/2026-07-07-fix-probe-bloat/`
