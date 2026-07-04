# CHANGE: 项目详情 Agent 消耗监控 Tab

- **Change ID**: project-agent-metrics
- **创建日期**: 2026-07-05
- **路径建议**: 完整
- **状态**: draft

---

## Why（为什么做）

当前项目详情页的「监控」tab 只有 4 个数字卡片 + 模型分布，无法回答"这个项目花了多少 token？哪个 Agent/工作流最烧钱？"。用户需要项目维度的消耗可视化，对标 LangSmith 的 project-level cost tracking。同时 Agent 的基本信息（工作流/角色/工具）分散在多个 tab 里只读展示，应整合到一个 Agent tab 中。

## What（做什么）

项目详情页新增 **🤖 Agent tab**，整合两部分内容：

1. **Agent 基本信息**（只读）：名称、简介、跳转详情按钮、工作流列表、角色列表、工具列表
2. **消耗监控面板**（项目维度）：
   - 主 Agent 在项目中的消耗：总量、平均/min、1min 桶柱状图（折叠默认）
   - 子 Agent 在项目中的消耗：各自总量 + 柱状图（折叠，有数据才显示）
   - 工作流在项目中的消耗：各自总量 + 柱状图（折叠，点击展开）
   - 柱状图颜色：主 Agent 绿 `#5cb878` / 子 Agent 琥珀 `#f59e0b` / 工作流蓝 `#3b82f6`
3. **Agent 在项目中的任务/会话记录列表**：
   - 本项目中该 Agent 的每次会话记录（时间、模型、token 消耗、状态）
   - 分页列表、按时间倒序、最新 50 条

## 视觉调性（前端项目 · 继承已有锁定）

- **选定**：工业（Industrial）— 继承自 CONTEXT.md
- **柱状图颜色**：亮绿色 `#5cb878`，暗色面板可见，hover 显示数值

## 影响面

- [x] 影响 `REQUIREMENT.md`（新增需求）
- [x] 影响 `DESIGN.md`（新增 API 设计）
- [ ] 影响现有 AC
- [ ] 影响数据模型 / 迁移（复用 `SessionMetric` 表，无变更）
- [ ] 影响外部 API 兼容性
- [ ] 仅修复 bug，无范围变化

## 范围排除（这次不做）

- 子 Agent 父子关系模型（不引入 `parent_agent_id` 字段，子 Agent = 同项目下参与消耗的其他 Agent）
- 实时 WebSocket 推送消耗（使用前端轮询 `setInterval 60s`）
- 导出消耗报告（PDF/CSV）
- 项目间消耗对比

## 验收线（粗粒度，不是 AC）

- 打开项目详情 → 看到「🤖 Agent」tab → Agent 基本信息 + 工作流/角色标签只读展示 → 可点击跳转 Agent 详情
- 消耗面板默认折叠，点击「▸ 查看消耗趋势」展开 1min 桶柱状图（主 Agent 绿/子 Agent 琥珀/工作流蓝）
- 工作流消耗行可展开各自的柱状图
- 子 Agent 仅在有数据时显示，各自可展开柱状图
- 会话记录列表展示最近 50 条（时间、模型、token、状态），按时间倒序
- Tab 栏：概览 | 对话 | Agent | 监控 | 历史（5 个 tab）

## 风险与未知

- `SessionMetric` 表中 entity_type='agent' 的记录是否与项目 owner_id 关联准确（需验证数据）
- 子 Agent 数据取决于编排场景中 Agent 间调用是否记录了 SessionMetric（如果没记录则列表为空）
- Recharts 在暗色背景下的默认 tooltip 样式可能需要自定义

---
> 后续 AC 与设计细节进入 `REQUIREMENT.md` / `DESIGN.md`，本文件不再扩展。
