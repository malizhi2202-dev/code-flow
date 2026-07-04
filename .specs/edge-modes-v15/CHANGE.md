# CHANGE: 连线模式升级 6→15 + 补全配置字段

- **Change ID**: edge-modes-v15
- **创建日期**: 2026-07-04
- **路径建议**: 最短
- **状态**: draft

---

## Why

`orchestration-canvas-v2` 落地了 6 种连线模式（sequential/parallel/fork/master-slave/event-trigger/retry-fallback）+ 12 个 EdgeConfig 字段。三轮专家讨论（Dify/LangFlow/n8n/Airflow/Prefect/Temporal/Step Functions/LangGraph/CrewAI/AutoGen/Swarm 竞品分析）产出 **15 种模式 + 27 个字段**的完整规格。需将讨论结论落地到代码。

## What

1. **EdgeConfig 类型扩展**：6→15 种模式 + 新增 5 个字段（wait_strategy / merge_strategy / data_scope / transform_expr / max_invocations）
2. **EdgeEditor 表单补全**：新增字段的 UI 控件
3. **Edge 组件扩展**：6→15 种视觉样式
4. **后端模型同步**：`orchestration.py` edges_json 字段校验更新

## 影响面

- [x] 仅代码增强，无新需求/新架构
- [x] 不影响既有 API 兼容性（新增字段为 optional）

## 范围排除

- 不做后端运行时执行等待策略/合并策略/动态路由（仅存储配置）
- 不做 sub-orch 和 dynamic-router 实现（v2）

## 验收线

1. EdgeEditor 下拉框可选 15 种模式（v1 实现 13 种，sub-orch/dynamic-router 标 v2）
2. 新增 5 个字段在 EdgeEditor 中可编辑保存
3. 15 种 Edge 组件视觉样式可区分
4. TypeScript 编译通过 + 后端 API apply 接受新字段
