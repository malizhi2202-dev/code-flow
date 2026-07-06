# CHANGE: Agent 管控面 — K8s 架构思想融入 Agent 编排

- **Change ID**: `agent-control-plane`
- **创建日期**: 2026-07-05
- **路径建议**: 完整
- **状态**: active

---

## Why（为什么做）

当前 Agent 编排画布在用户 Apply 之后，缺乏运行时管控能力。用户不知道 Agent 是否活着、是否在跑任务、是否卡住了。多 Agent 并发时没有优先级分配，任务分发靠手动指定。现有 `engine/reconcile_loop.py` 有骨架但缺实际 diff 和修复逻辑。

K8s 的控制面（API Server / Scheduler / Controller Manager）提供了一套成熟的管控范式。将其核心思想——探针、调度、Reconcile Loop——融入 Agent 编排，可以填补"Apply 之后"的管控空白。

## What（做什么）

新增独立模块 **Agent 管控面**（左侧栏新增入口），不修改现有编排模块代码。v1 范围：

1. **Agent 探针状态面板**：Heartbeat（心跳）/ Capability（能力）/ Dependency（依赖）/ Load（负载）四种探针，实时展示每个 Agent 的 IDLE / RUNNING / BLOCKED / DEAD 状态
2. **Agent 能力注册**：按能力标签自动发现同语义 Agent，支持路由匹配
3. **调度器**：Filter（标签匹配）+ Score（最少连接）的负载均衡策略，多 Agent 按空闲度自动分发任务
4. **Reconcile Loop 增强**：补齐 diff 逻辑 + 修复动作分级（safe/caution/dangerous），自动修复漂移

## 视觉调性（前端项目）

- **选定**：工业（Industrial）— 暗色默认、等宽字体、冷色温
- **理由**：延续项目现有调性，状态指示灯（绿/黄/红/灰）与暗色背景形成高对比，适合运维监控场景
- **明确排除**：有机/柔和风格（运维面板需要数据密度优先，不适合留白大的设计）

## 影响面

- [x] 影响 `REQUIREMENT.md`（需定义 Agent 状态机 + 探针协议）
- [x] 影响 `DESIGN.md` / 引入新 ADR（新模块架构、Agent Registry 数据模型、路由策略）
- [ ] 影响现有 AC
- [x] 影响数据模型 / 迁移（新增 `agent_probes`、`scheduler_queue` 表）
- [ ] 影响外部 API 兼容性
- [ ] 仅修复 bug，无范围变化

## 范围排除（这次不做）

- 不做语义匹配（embedding + 向量搜索自动匹配 Agent 能力），v1 只用标签精确匹配
- 不做 Startup Probe，v1 只做 Heartbeat / Capability / Dependency / Load
- 不做 Pod↔Node 绑定概念的映射（Agent 运行时绑定逻辑）
- 不修改现有编排画布代码，新模块完全独立

## 验收线（粗粒度，不是 AC）

- 用户能在侧边栏进入「Agent 管控面」，看到所有 Agent 的实时状态（空闲/运行/阻塞/死亡），状态面板支持按状态排序，挂了的排最上面
- 同语义的多个 Agent 之间，任务自动分配给负载最低的那个
- 管控面检测到 Agent 状态偏移时，能自动修复（safe 级别）或报警（caution/dangerous 级别）
- 用户能手动触发单个 Agent 的重新调度或强制重启
- 探针数据按项目/用户隔离，非 admin 只能看自己项目的 Agent 状态

## 风险与未知

- Agent 探针的数据采集需要各运行时适配器（Claude Code/Codex/Hermes/小龙虾）提供统一的健康检查协议，跨适配器的一致性需要验证
- 调度器的 Filter/Score 依赖 Agent 能力标签的准确性，标签由用户手动打还是从 Workflow 自动派生需要 DESIGN 阶段确定
- 自动修复（Reconcile Loop）的 danger 级别操作可能误杀正常 Agent，需要退避机制和人工确认流程

---

> 后续 AC 与设计细节进入 `REQUIREMENT.md` / `DESIGN.md`，本文件不再扩展。
