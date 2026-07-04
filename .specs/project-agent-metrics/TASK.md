# TASK: 项目详情 Agent 消耗监控 Tab

- **Change ID**: project-agent-metrics
- **关联**: `@.specs/project-agent-metrics/DESIGN.md`

---

## 概览

| Wave | Tasks | 描述 |
|---|---|---|
| W1 | T01 | 后端 API |
| W2 | T02-T03 | 前端 Agent tab UI + 图表 |

---

## W1 · 后端

### T01 · 项目 breakdown API + 会话列表

| 字段 | 内容 |
|---|---|
| **id** | T01 |
| **name** | 项目级消耗分拆 API |
| **write_files** | `backend/routes/metrics_api.py`（修改） |
| **action** | 新增 `GET /api/metrics/project/{project_id}/breakdown?minutes=60`：按 owner_id 查 SessionMetric，GROUP BY entity_type + entity_id + 1min bucket，返回 agents[] + workflows[] + totals。复用已有 `GET /api/metrics/sessions?entity_type=agent&entity_id=X&limit=50` 获取会话列表 |
| **verify** | `curl http://localhost:8000/api/metrics/project/1/breakdown` → 返回分拆数据 |
| **<auto>** | 🤖 自动化 |

---

## W2 · 前端

### T02 · Agent 基本信息卡片

| 字段 | 内容 |
|---|---|
| **id** | T02 |
| **name** | Agent 基本信息卡片组件 |
| **write_files** | `frontend/src/pages/ProjectDetail.tsx`（修改） |
| **action** | 新增「🤖 Agent」tab。Agent 信息卡片：名称、模型、runtime、token 上限、简介、工作流/角色/工具标签（只读）、「查看详情 →」按钮（跳 AgentDetail）。未绑定 Agent 时显示提示 |
| **verify** | tab 切换正常，信息展示正确，跳转正常 |
| **<auto>** | 🤖 自动化 |

### T03 · 消耗监控面板 + 会话列表

| 字段 | 内容 |
|---|---|
| **id** | T03 |
| **name** | 消耗柱状图 + 会话记录列表 |
| **write_files** | `frontend/src/pages/ProjectDetail.tsx`（修改） |
| **action** | 1) 调用 breakdown API 获取数据 2) 消耗总览（总量 + 平均/min + 折叠柱状图 `#5cb878`）3) 工作流消耗行（`#3b82f6`）+ 折叠柱状图 4) 子 Agent 消耗行（`#f59e0b`，无数据不显示）+ 折叠柱状图 5) 会话列表（时间/模型/token/状态，倒序 50 条，分页）。柱状图用 Recharts `<BarChart>`，自定义 Tooltip 暗色背景。折叠用 `Set<string>` state 管理 |
| **verify** | 各维度柱状图颜色正确，折叠/展开正常，会话列表分页正常 |
| **<auto>** | 🤖 自动化 |

---

**预计**: 3 task · ~150 行 Python + ~250 行 TypeScript
