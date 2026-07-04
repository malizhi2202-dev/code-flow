# CHANGE: 编排画布 v2 — 双向同步 + 富连线配置

- **Change ID**: orchestration-canvas-v2
- **创建日期**: 2026-07-04
- **路径建议**: 完整
- **状态**: draft

---

## Why（为什么做）

上一版 `agent-k8s-orchestration` 的拓扑画布只做到了**YAML→画布单向展示**，缺失以下核心能力：

1. **画布不可编辑连线** — 无法从节点拖拽创建新连线、无法删除连线、无法编辑连线属性
2. **连线无配置** — 连线只是「箭头」，没有触发条件、IO 数据结构、安全栅栏、token 限制、用途描述
3. **无编排列表页** — 已部署的编排实例散落在 API 中，没有统一浏览入口
4. **画布→YAML 不回写** — 在画布上做的修改不会同步回 YAML/MD
5. **MD 格式缺失** — 编排配置仅支持 YAML，不支持 Markdown 格式查看/编辑

## What（做什么）

### A · 编排列表页（新增）

- 展示所有已部署的编排实例（名称、Agent 数、状态、更新时间、运行状态颜色）
- 每个实例三个操作入口：**查看 MD** / **查看 YAML** / **编辑画布**
- 支持从列表新建编排（跳转画布编辑页，空白画布）
- 支持删除/归档编排实例

### B · 画布编辑页（重写 OrchestrationPage）

- **双向同步**：YAML/MD 编辑器 ↔ 拓扑画布实时双向同步
  - 编辑 YAML/MD → 画布自动刷新节点+连线
  - 画布拖拽/连线/删除 → YAML/MD 自动更新
- **三栏布局**：左侧 YAML/MD 编辑器 | 中间拓扑画布 | 右侧属性面板（点击连线/节点时展开）
- **MD 格式支持**：编排配置同时支持 YAML 和 Markdown 两种格式，切换 tab 实时转换

### C · 画布连线编辑（OrchestrationCanvas 增强）

- **拖拽创建连线**：从节点 A 的 output handle 拖到节点 B 的 input handle，弹出连线配置面板
- **连线配置字段**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | enum | 编排策略：sequential / parallel / fork / master-slave / event-trigger / retry-fallback |
| `trigger_condition` | string | 触发条件表达式（如 `$.output.score < 0.7`、`on:webhook.github_push`）|
| `trigger_type` | enum | 触发方式：auto（上节点完成自动）/ event（等待外部事件）/ schedule（定时）/ manual（人工确认）|
| `input_schema` | JSON Schema | 入口数据结构定义 |
| `output_schema` | JSON Schema | 出口数据结构定义 |
| `gate_pre` | string | 前置安全栅栏规则（如 `validate_sql_injection` / `check_param_type`）|
| `gate_post` | string | 后置安全栅栏规则（如 `mask_pii` / `validate_output_schema`）|
| `token_soft_limit` | number | token 软限制（警告阈值）|
| `token_hard_limit` | number | token 硬限制（阻断阈值）|
| `description` | string | 这条连线做什么（一句话）|
| `retry_policy` | object | 重试策略：max_retries / backoff / fallback_node |
| `io_filter` | enum | 数据过滤：none / mask_pii / schema_only |

- **连线可视化区分**：
  - sequential → 实线 + 单箭头
  - parallel → 双线 + 双箭头
  - fork → 分叉线 + 条件标签
  - master-slave → 粗线 + M→S 标记
  - event-trigger → 虚线 + 时钟图标
  - retry-fallback → 虚线 + 循环图标

### D · Agent 节点交互

- 每个节点右下角「详情」按钮 → 跳转 `AgentDetail` 页
- 「添加 Agent」按钮 → 跳转 `AgentBuilder` 页 → 创建完成后返回画布，新 Agent 出现在节点列表
- 节点列表（侧边栏）：可拖拽到画布放置新节点
- 删除节点：选中按 Delete 或右键菜单

### E · MD/YAML 配置互转

- 编排实例支持两种格式查看/编辑：
  - **Markdown 格式**：人可读的表格+列表形式，适合 review/文档
  - **YAML 格式**：机器可解析，适合 apply/git 版本管理
- 两种格式实时互转，画布始终同步
- 列表页「查看 MD」「查看 YAML」按钮 → 只读模式查看

---

## 影响面

| 模块 | 影响 | 说明 |
|---|---|---|
| **前端** | 🔴 重写 | `OrchestrationPage.tsx` 重写、`OrchestrationCanvas.tsx` 大幅增强、新增 `OrchestrationListPage.tsx`、`EdgeEditor.tsx`、`AgentNodePool.tsx` |
| **后端** | 🟡 扩展 | 新增连线配置 CRUD API、MD↔YAML 互转端点、编排实例列表查询增强 |
| **数据库** | 🟡 扩展 | `OrchestrationInstance` 表增加连线配置字段、`edges` 表或 JSON 字段 |
| **既有数据** | 🟡 兼容 | 旧编排实例（仅有 YAML）自动迁移，连线使用默认配置 |

---

## 范围排除（这次不做）

- ❌ 不重写 reconcile loop / scheduler（属于上一版 agent-k8s-orchestration 的范围，本次只改画布交互）
- ❌ 不做实时协作（多人同时编辑画布）
- ❌ 不做画布版本历史/Diff 对比
- ❌ 不引入新的模型 provider
- ❌ 不碰 Agent 内部执行引擎

---

## 验收线

1. 编排列表页展示所有已部署实例，可点击「编辑」进入画布
2. 画布上从节点 A 拖到节点 B 可创建连线，弹出配置面板填写策略/触发条件/IO schema/安全栅栏/token 限制
3. 修改 YAML/MD → 画布实时更新；画布编辑 → YAML/MD 实时更新
4. 连线按策略类型（sequential/fork/master-slave 等）显示不同样式
5. 点击节点「详情」跳转 AgentDetail，「添加 Agent」跳转 AgentBuilder，返回后新 Agent 出现在列表
6. 编排实例可切换 YAML/Markdown 两种格式查看

---

## 风险与未知

- React Flow `onConnect` + 自定义 Edge 样式在 50+ 节点场景下的性能待验证
- MD↔YAML 双向转换可能丢失部分格式细节（如注释）
