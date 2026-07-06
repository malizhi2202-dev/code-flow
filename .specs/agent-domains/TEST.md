# capability-groups 测试报告

> 2026-07-06 | agent-domains 扩展

## 后端

| # | 测试项 | 结果 |
|---|--------|------|
| 1 | `?capability=code-review` 过滤 | ✅ 3 agents |
| 2 | `?domain_id=1&capability=code-review` 组合过滤 | ✅ 2 agents |
| 3 | `?capability=nonexist` 空结果 | ✅ 0 agents |
| 4 | 跨模块兼容 | ✅ 200 |

## 前端

| # | 测试项 | 结果 |
|---|--------|------|
| 5 | TS 编译 | ✅ 32 baseline, 0 new errors |
| 6 | CapabilityGroupRow 存在 | ✅ 10 references |
| 7 | isAgentHealthy 存在 | ✅ |
| 8 | fetchAgentsByDomain 存在 | ✅ |

## 改动

| 文件 | 改动 |
|---|---|
| `routes/agents_api.py` | +2 行 capability 过滤 |
| `AgentControlPlane.tsx` | +`CapabilityGroupRow` + capability 分组逻辑 |
