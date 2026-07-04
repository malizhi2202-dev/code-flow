# TEST: 项目详情 Agent 消耗监控 Tab

- **Change ID**: project-agent-metrics

---

## 测试覆盖

| AC | 场景 | 状态 |
|---|---|---|
| AC-1.1 | Agent 信息卡片展示 | ✅ |
| AC-1.2 | 跳转 Agent 详情 | ✅ |
| AC-1.3 | 未绑定 Agent 提示 | ✅ |
| AC-2.1 | 消耗总览数据显示 | ✅ |
| AC-2.2 | 柱状图折叠/展开 | ✅ |
| AC-3.1 | 工作流消耗行 | ✅ |
| AC-3.2 | 子 Agent 消耗 | ✅ |
| AC-4.1 | 会话列表 | ✅ |
| AC-4.2 | 分页加载更多 | ✅ |

## 后端 API

- `GET /api/metrics/project/{id}/breakdown?minutes=60` → 返回 agents + workflows 分拆数据 ✅
- `GET /api/metrics/sessions?entity_type=agent&limit=50` → 返回会话列表 ✅

---
> AC 全部来源于 REQUIREMENT.md，未引入新 AC。
