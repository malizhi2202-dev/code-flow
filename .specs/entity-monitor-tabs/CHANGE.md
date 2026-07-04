# CHANGE: 各实体维度监控 Tab

- **Change ID**: entity-monitor-tabs
- **创建日期**: 2026-07-05
- **路径建议**: 完整
- **状态**: draft

---

## Why（为什么做）

当前项目级监控（Agent tab）已完成，但编排组、Agent、工作流、工具库各自没有独立的监控维度。用户查看某个编排组/Agent/工作流时，看不到它在全局范围内的消耗统计。各实体详情页应包含自己的「监控」tab，展示该实体的 token 消耗、调用次数、成功率等。

## What（做什么）

为以下 4 个实体维度添加监控统计：

| 实体 | 页面 | 监控内容 |
|---|---|---|
| 🔀 编排组 | OrchestrationListPage → 点进详情 | token 消耗、成功率、Agent 状态分布、调度队列深度、调用链追踪 |
| 🤖 Agent | AgentDetail（已有 monitor tab） | 增强：全量 token、工具命中、工作流分布、模型分布 |
| 🔀 工作流 | WorkflowDetail | token 消耗、工具命中排行、执行时长 |
| 🔧 工具/Skill | 工具库详情 | 调用次数、token 消耗、成功率 |

**技术方案**：复用已有 `EntityMonitor.tsx` 通用监控组件，后端复用 `GET /api/metrics/{entity_type}/{entity_id}` + `GET /api/metrics/entity-breakdown` API。

## 视觉调性

工业（Industrial）— 继承。复用 EntityMonitor 现有的蓝/绿/橙/红/紫配色。

## 影响面

- [x] 影响前端（4 个实体页面各加监控 tab）
- [ ] 影响数据模型（无变更，复用 SessionMetric）
- [ ] 新增 API（复用已有 metrics API）
- [ ] 影响外部 API 兼容性

## 范围排除

- 不新建独立监控页面（嵌入已有详情页）
- 不新增 metrics API（复用已有）
- 不做实时推送（按需刷新）

## 验收线

- 编排组详情页有「📊 监控」tab，展示 token 消耗 + 成功率 + Agent 分布
- Agent 详情页 monitor tab 展示完整统计数据
- 工作流详情页有监控 tab
- 工具库实体有消耗统计

## 风险

- EntityMonitor 组件需适配各实体类型的数据格式差异
- 部分实体可能无 metrics 数据，需空状态提示

---
> 后续 AC 与设计细节进入 `REQUIREMENT.md` / `DESIGN.md`。
