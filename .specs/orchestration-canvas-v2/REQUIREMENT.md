# REQUIREMENT: 编排画布 v2 — 双向同步 + 富连线配置

- **Change ID**: orchestration-canvas-v2
- **关联**: `@.specs/orchestration-canvas-v2/CHANGE.md`、`@.specs/CONTEXT.md`

---

## 用户故事

- **US-1**: 作为开发者，我想在列表页浏览所有已部署的编排实例，以便快速找到并管理它们。
- **US-2**: 作为开发者，我想在画布上拖拽连线来编排 Agent 拓扑，以便直观地设计复杂工作流。
- **US-3**: 作为开发者，我想为每条连线配置策略/触发条件/IO 结构/安全栅栏/token 限制，以便每次 Agent 调用都是明确定义且安全的。
- **US-4**: 作为开发者，我想在 YAML 和 Markdown 两种格式之间切换查看编排配置，以便在代码 review 和文档编写两种场景下各自使用最合适的格式。
- **US-5**: 作为开发者，我想画布和 YAML/MD 保持实时双向同步，以便在任一视图中编辑都不会丢失成果。
- **US-6**: 作为开发者，我想从画布上直接添加已有 Agent 到拓扑中，以便不离开画布就能完成编排。

---

## 验收准则（AC）

### AC-A1 · 编排列表页

- **Given** 系统中存在 ≥ 0 个已部署的编排实例
- **When** 用户访问编排列表页
- **Then** 页面展示所有编排实例，每条包含：名称、Agent 数量、运行状态（running/degraded/failed/stopped + 颜色标识）、更新时间、操作按钮（查看 MD / 查看 YAML / 编辑画布 / 删除）
- **验证方式**: `curl -s http://127.0.0.1:5173/api/orchestration -H "X-User-Id: admin"` 返回列表；前端页面渲染卡片

### AC-A2 · 从列表进入画布编辑

- **Given** 编排列表页展示了至少 1 个实例
- **When** 用户点击某个实例的「编辑画布」按钮
- **Then** 跳转到画布编辑页，画布上正确渲染该实例的 Agent 节点和连线（从 YAML/meta 解析），YAML 编辑器显示当前配置
- **验证方式**: UAT — 点击「编辑画布」→ 画布出现节点和连线，YAML 面板内容匹配

### AC-A3 · 新建编排

- **Given** 用户在编排列表页
- **When** 用户点击「新建编排」按钮
- **Then** 跳转到画布编辑页，展示空白画布 + 默认 YAML/MD 模板（含占位 agent 名称），左侧 Agent 节点池显示所有已创建的 Agent 可供拖入
- **验证方式**: UAT — 点击新建 → 空白画布 + 默认模板 + Agent 列表可见

### AC-B1 · 画布拖拽连线创建

- **Given** 画布上存在 ≥ 2 个 Agent 节点
- **When** 用户从节点 A 的 output handle 拖拽到节点 B 的 input handle
- **Then** 创建一条新连线（默认 sequential 类型），右侧弹出连线配置面板
- **验证方式**: UAT — 拖拽连线 → 连线出现在画布上 + 配置面板弹出

### AC-B2 · 连线配置面板

- **Given** 用户刚创建一条连线（或点击已有连线）
- **When** 连线配置面板打开
- **Then** 面板展示以下可编辑字段：type（策略选择下拉框）、trigger_condition、trigger_type、input_schema（JSON 编辑器）、output_schema（JSON 编辑器）、gate_pre、gate_post、token_soft_limit、token_hard_limit、description、retry_policy（max_retries/backoff/fallback_node）、io_filter。填写后点击保存，配置持久化。
- **验证方式**: UAT — 点击连线 → 面板显示全部字段 → 修改 type 为 fork → 保存 → 再次点击连线，type 显示为 fork

### AC-B3 · 连线样式按类型区分

- **Given** 画布上存在不同类型的连线
- **When** 渲染拓扑画布
- **Then** 连线按类型显示不同样式：
  - sequential → 实线 + 单箭头 + 标签「顺序」
  - parallel → 双线 + 双箭头 + 标签「并发」
  - fork → 分叉线 + 条件标签 + 标签「分叉」
  - master-slave → 粗线 + M→S 标记 + 标签「主从」
  - event-trigger → 虚线 + 时钟图标 + 标签「事件」
  - retry-fallback → 虚线 + 循环图标 + 标签「重试」
- **验证方式**: UAT — 分别创建 6 种连线 → 每种样式不同，肉眼可区分

### AC-B4 · 删除节点/连线

- **Given** 画布上存在节点和连线
- **When** 用户选中一个元素并按 Delete 键（或右键菜单→删除）
- **Then** 该元素从画布移除，YAML/MD 同步更新（移除对应 agent/route 配置项）
- **验证方式**: UAT — 选中节点 → Delete → 节点消失 + YAML 中对应 agent 被移除

### AC-B5 · 画布 → YAML 回写

- **Given** 画布上有节点和连线
- **When** 用户在画布上做任何修改（移动节点、创建/删除连线、修改连线配置）
- **Then** YAML 编辑器内容在 300ms 内自动更新，反映画布的当前状态
- **验证方式**: UAT — 拖拽创建新连线 → 观察 YAML 面板，routes 段出现新条目

### AC-B6 · YAML → 画布刷新

- **Given** 画布和 YAML 编辑器同时可见
- **When** 用户在 YAML 编辑器中修改 agents 或 routes（增/删/改）
- **Then** 画布在 300ms 内自动刷新节点和连线，匹配 YAML 内容
- **验证方式**: UAT — 在 YAML 中新增一个 agent → 画布出现新节点

### AC-B7 · 节点拖拽移动

- **Given** 画布上存在节点
- **When** 用户拖拽节点到新位置
- **Then** 节点位置更新，YAML 中该 agent 的位置信息同步更新（如果 YAML schema 支持 position 字段）
- **验证方式**: UAT — 拖拽节点 → YAML 面板中 position 字段变化

### AC-C1 · 编排策略完整列表

- **Given** 连线配置面板打开
- **When** 用户点击 type 下拉框
- **Then** 展示 6 种策略：sequential（顺序）、parallel（并发）、fork（分叉）、master-slave（主从）、event-trigger（时机触发）、retry-fallback（重试降级），每种附带一行中文说明
- **验证方式**: UAT — 下拉框出现 6 个选项 + 说明文字

### AC-C2 · 触发条件表达式

- **Given** 连线配置面板打开
- **When** 用户在 trigger_condition 字段输入 `$.output.score < 0.7`
- **Then** 保存后该条件关联到连线，apply 部署后端能解析此表达式（用于 fork 路由判断）
- **验证方式**: curl — `POST /api/orchestration/apply` 带有 trigger_condition 的 YAML → 返回成功，后端存储该字段

### AC-C3 · IO Schema 定义

- **Given** 连线配置面板打开
- **When** 用户填写 input_schema 和 output_schema（JSON Schema 格式）
- **Then** 保存后，连线详情中展示 IO 结构，apply 部署后端能读取并关联到 Agent 调用
- **验证方式**: curl — apply YAML 含 input_schema/output_schema → 返回成功，数据持久化

### AC-C4 · 安全栅栏字段

- **Given** 连线配置面板打开
- **When** 用户填写 gate_pre（如 `validate_sql_injection`）和 gate_post（如 `mask_pii`）
- **Then** 保存后关联到连线，apply 部署后端存储并在 Agent 调用前后执行对应校验（如果后端已注册该规则）
- **验证方式**: curl — apply YAML 含 gate_pre/gate_post → 返回成功

### AC-C5 · Token 限制

- **Given** 连线配置面板打开
- **When** 用户设置 token_soft_limit=80000、token_hard_limit=100000
- **Then** 保存后关联到连线，apply 部署后端存储并在该段调用时按阈值处理（软限制警告、硬限制阻断）
- **验证方式**: curl — apply YAML 含 token 限制 → 返回成功

### AC-D1 · 节点详情跳转

- **Given** 画布上存在 Agent 节点
- **When** 用户点击节点上的「详情」按钮
- **Then** 跳转到 AgentDetail 页面（路由 `/agents/{id}`），展示该 Agent 的完整信息
- **验证方式**: UAT — 点击详情 → URL 变为 `/agents/{id}` → 页面显示 Agent 详情

### AC-D2 · 添加 Agent 跳转

- **Given** 画布编辑页
- **When** 用户点击「添加 Agent」按钮
- **Then** 跳转到 AgentBuilder 页面（路由 `/agents/new`），创建完成后自动返回画布，新 Agent 出现在左侧节点池中
- **验证方式**: UAT — 点击添加 → 跳转 Builder → 创建 → 返回画布 → 节点池出现新 Agent

### AC-D3 · 节点池拖入

- **Given** 左侧 Agent 节点池展示了可用 Agent 列表
- **When** 用户从节点池拖拽一个 Agent 到画布上
- **Then** 画布上新增一个节点（位置为释放位置），YAML 中 agents 段新增一条记录
- **验证方式**: UAT — 拖拽 Agent → 画布出现新节点 + YAML 同步

### AC-E1 · YAML 格式查看

- **Given** 编排列表页
- **When** 用户点击某个实例的「查看 YAML」按钮
- **Then** 打开只读 YAML 查看器（CodeMirror readOnly 模式），显示该实例的完整 YAML 配置
- **验证方式**: curl — `GET /api/orchestration/{id}/yaml` → 返回 YAML 字符串

### AC-E2 · Markdown 格式查看

- **Given** 编排列表页
- **When** 用户点击某个实例的「查看 MD」按钮
- **Then** 打开 Markdown 查看器，以人可读方式展示：编排名称、Agent 列表（表格）、路由表（表格）、每条连线的配置详情
- **验证方式**: curl — `GET /api/orchestration/{id}/md` → 返回 Markdown 字符串

### AC-E3 · 画布编辑页 MD/YAML Tab 切换

- **Given** 画布编辑页左侧编辑器面板
- **When** 用户点击 MD Tab 或 YAML Tab 切换
- **Then** 编辑器内容切换为对应格式，画布保持不变（因为画布始终从统一中间态渲染）。修改 MD → 画布更新，修改 YAML → 画布更新。
- **验证方式**: UAT — 切换 Tab → 编辑器内容变化 → 修改内容 → 画布同步

---

## 范围切分

### v1（本次必做）

- 编排列表页（AC-A1/A2/A3）
- 画布拖拽连线 + 配置面板（AC-B1/B2/B3/B4）
- 画布 ↔ YAML 双向同步（AC-B5/B6/B7）
- 6 种编排策略类型（AC-C1）
- 连线配置字段：trigger_condition、IO schema、安全栅栏、token 限制（AC-C2/C3/C4/C5）
- 节点详情跳转 + 添加 Agent 跳转（AC-D1/D2）
- 节点池拖入（AC-D3）
- YAML/MD 格式查看 + Tab 切换（AC-E1/E2/E3）

### v2（下一轮考虑，不本次）

- 连线配置的 retry_policy 后端执行引擎（本次只存配置，不实际执行重试逻辑）
- 画布自动布局（force-directed layout）
- 编排模板保存（从当前拓扑另存为模板）
- 右键菜单（复制节点、批量选择）
- 画布操作撤销/重做（Undo/Redo）

### out（永远不做）

- 多人实时协作编辑画布（Operational Transform / CRDT）
- 画布版本历史 / Diff 对比
- 画布导出为图片/PDF

---

## 非功能性需求

- **性能**: 画布 50 节点 + 100 连线场景下，拖拽操作 ≤ 200ms 响应；YAML↔画布同步延迟 ≤ 300ms（debounce）；首屏加载 ≤ 3s
- **可访问性**: 连线类型不仅靠颜色区分（不同线型 + 图标标签）；节点状态颜色 + 文字双重表达；Delete 键删除支持键盘操作
- **安全**: 连线配置中的 gate_pre/gate_post 使用**规则名**（非可执行代码），后端维护注册表映射；io_filter 在 Agent 调用后执行；敏感字段（api_key）不在 MD/YAML 查看时明文展示
- **兼容性**: Chrome 90+ / Firefox 90+ / Edge 90+；React Flow v12+；CodeMirror 6
- **可观测性**: 画布操作（连线创建/删除/配置修改）写入审计日志；YAML apply 结果记录到运行时埋点

---

## 依赖与假设

- **依赖**: React Flow (`@xyflow/react`) 已安装（来自 agent-k8s-orchestration）；CodeMirror 6 已安装；zustand orchestration store 已存在
- **假设**: AgentBuilder/AgentDetail 页面路由已存在且功能正常；后端 `/api/orchestration` CRUD API 已存在（T06），本次只需扩展连线配置字段；OrchestrationInstance 表可新增 JSON 字段存储 edges 配置
- **假设**: 旧编排实例数据（仅有 spec_json 或基础 YAML）可通过迁移脚本自动补全连线默认配置
