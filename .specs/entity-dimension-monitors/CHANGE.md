# CHANGE: 各实体维度监控面板

- **Change ID**: entity-dimension-monitors
- **状态**: active

## Why
项目 Agent tab 的监控维度（自身消耗→工作流→工具 三层折叠柱状图）已得到用户认可。编排组、Agent、工作流、工具各自需要同风格的监控面板。

## What
- 提取 EntityBreakdownPanel 可复用组件
- 编排组详情: 自身消耗 + 每个 Agent 消耗(含工作流+工具) 
- Agent monitor tab: 自身消耗 + 工作流消耗 + 工具命中/Token
- 工作流 monitor tab: 自身消耗 + 工具命中/Token 柱状图
- 工具详情: 调用次数 + Token 柱状图

风格统一: 折叠柱状图, 绿/蓝/琥珀/紫配色。
