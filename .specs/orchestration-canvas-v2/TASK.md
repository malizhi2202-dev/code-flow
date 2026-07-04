# TASK: 编排画布 v2 — 双向同步 + 富连线配置

- **Change ID**: orchestration-canvas-v2
- **关联**: `@.specs/orchestration-canvas-v2/REQUIREMENT.md`、`@.specs/orchestration-canvas-v2/DESIGN.md`、`@.specs/orchestration-canvas-v2/UI-DESIGN.md`

---

## 波次划分

```
Wave 1 (parallel): T01[P], T02[P], T03[P], T04[P]
Wave 2 (parallel): T05[P], T06[P], T07[P], T08[P]  (depends on T03, T04)
Wave 3:            T09 (depends on T03, T06)
                   T10 (depends on T05, T07, T09)
Wave 4:            T11 (depends on T08, T10)
                   T12 (depends on T11)
```

> Wave 1: 后端+基础层并行 | Wave 2: UI 组件并行 | Wave 3: 集成串行 | Wave 4: 收尾

---

## 任务清单

```xml
<task id="T01" parallel="true" status="pending">
  <name>后端 OrchestrationInstance 模型扩展 + DB 迁移</name>
  <read_files>
    backend/models/orchestration.py
    backend/database.py
  </read_files>
  <write_files>
    backend/models/orchestration.py
  </write_files>
  <action>
    在 OrchestrationInstance 模型中新增 edges_json 字段（JSON 列），
    存储连线配置数组。每个元素为 EdgeConfig 结构：
    {id, source, target, type, trigger_condition, trigger_type,
     input_schema, output_schema, gate_pre, gate_post,
     token_soft_limit, token_hard_limit, description,
     retry_policy: {max_retries, backoff, fallback_node}, io_filter}
    默认值为空列表 []。
    添加数据库迁移逻辑（create_all 自动处理新列）。
  </action>
  <verify>cd code-kit-monitor/backend && python -c "from models.orchestration import OrchestrationInstance; print('edges_json' in [c.name for c in OrchestrationInstance.__table__.columns])"</verify>
  <done>OrchestrationInstance 模型含 edges_json 列，默认空列表，可读写</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T02" parallel="true" status="pending">
  <name>后端 API 扩展：edges CRUD + MD/YAML 端点 + 安全栅栏注册表</name>
  <read_files>
    backend/routes/orchestration_api.py
    backend/engine/yaml_schema.py
  </read_files>
  <write_files>
    backend/routes/orchestration_api.py
    backend/engine/yaml_schema.py
    backend/engine/gate_registry.py
  </write_files>
  <action>
    1. 扩展 POST /api/orchestration/apply：body 新增 edges_config 字段，存储到 edges_json
    2. 扩展 GET /api/orchestration：返回列表增加 status_color、agent_count、updated_at
    3. 扩展 GET /api/orchestration/{id}：返回详情含 edges_json
    4. 新增 GET /api/orchestration/{id}/yaml：返回原始 yaml_raw（Content-Type: text/yaml）
    5. 新增 GET /api/orchestration/{id}/md：将 yaml_raw 渲染为 Markdown 表格返回
    6. 新增 backend/engine/gate_registry.py：5 个预注册规则函数
    7. 扩展 yaml_schema.py：校验 routes 中新增的连线配置字段
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/orchestration -H "X-User-Id: admin" | python -c "import sys,json; d=json.load(sys.stdin); assert 'status_color' in d['items'][0] if d['items'] else True; print('OK')"</verify>
  <done>GET /orchestration 列表含 status_color；POST apply 接受 edges_config；GET /{id}/yaml 和 /{id}/md 可用</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T03" parallel="true" status="pending">
  <name>前端类型定义 + sync 工具函数</name>
  <read_files>
    frontend/src/stores/orchestration.ts
  </read_files>
  <write_files>
    frontend/src/lib/orchestration-sync.ts
  </write_files>
  <action>
    1. 定义 EdgeConfig TypeScript 接口（12 字段，按 DESIGN §4 定义）
    2. 实现 yamlToTopology(yaml: string) → {nodes, edges, edgeConfigs}：
       js-yaml parse → agents[] → Node[]；routes[] → Edge[] + EdgeConfig Map
    3. 实现 topologyToYaml(nodes, edges, edgeConfigs) → string：
       反向：Node[] → agents[]；Edge[] + EdgeConfig[] → routes[]；js-yaml dump
    4. 实现 yamlToMd(yaml: string) → string：Markdown 表格渲染
    5. 实现 mdToYaml(md: string) → string：解析 MD 表格 → YAML（基础实现，用于双向同步）
    6. 实现 useDebouncedSync hook：脏标记 + 300ms debounce 逻辑（按 DESIGN §3.2 伪代码）
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/lib/orchestration-sync.ts 2>&1 | head -5</verify>
  <done>4 个转换函数 + 1 个 hook 可正常 import；TypeScript 通过</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T04" parallel="true" status="pending">
  <name>zustand orchestration store 扩展</name>
  <read_files>
    frontend/src/stores/orchestration.ts
  </read_files>
  <write_files>
    frontend/src/stores/orchestration.ts
  </write_files>
  <action>
    扩展现有 orchestration store（useOrchestration）：
    1. 新增 state 字段：
       - topologyState: { nodes: Node[]; edges: Edge[] }
       - edgeConfigs: Map<string, EdgeConfig>
       - nodePool: Agent[] (可用 Agent 列表)
       - canvasDirty: boolean
       - yamlDirty: boolean
       - selectedEdgeId: string | null
    2. 新增 actions：setTopologyState, setEdgeConfig, removeEdgeConfig,
       setNodePool, fetchNodePool, setSelectedEdge, clearSelection
    3. yamlContent 已有（来自现有 store），保留
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/stores/orchestration.ts 2>&1 | head -5</verify>
  <done>store 含全部新增字段和 actions，TypeScript 编译通过</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T05" parallel="true" status="pending">
  <name>EdgeEditor 连线配置面板组件</name>
  <read_files>
    frontend/src/stores/orchestration.ts
    frontend/src/lib/orchestration-sync.ts
    frontend/src/styles/tokens.css
  </read_files>
  <write_files>
    frontend/src/components/EdgeEditor.tsx
  </write_files>
  <action>
    实现连线配置侧面板组件，按 UI-DESIGN §2.5 ASCII 布局：
    1. Props: edgeId, config, onSave, onDelete, onClose
    2. 策略类型下拉框（6 个选项 + 中文说明）
    3. 触发方式下拉框（auto/event/schedule/manual）
    4. 触发条件输入框（JSON path 表达式）
    5. 描述 textarea
    6. 安全栅栏：gate_pre/gate_post 下拉框（5 个预注册规则）+ io_filter
    7. Token 限制：soft/hard number input
    8. IO Schema：两个 mini CodeMirror（JSON 模式，5 行高）
    9. 重试策略：max_retries/backoff/fallback_node
    10. 底部按钮：[删除连线]（btn-ghost）+ [保存]（btn-primary）
    11. 面板从右侧滑入/滑出动画（CSS transition transform 200ms）
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/components/EdgeEditor.tsx 2>&1 | head -5</verify>
  <done>EdgeEditor 面板含 12 个字段全部可编辑保存；TypeScript 通过</done>
  <depends_on>T03, T04</depends_on>
  <auto>true</auto>
</task>

<task id="T06" parallel="true" status="pending">
  <name>6 种自定义 Edge 组件</name>
  <read_files>
    frontend/src/styles/tokens.css
  </read_files>
  <write_files>
    frontend/src/components/edges/SequentialEdge.tsx
    frontend/src/components/edges/ParallelEdge.tsx
    frontend/src/components/edges/ForkEdge.tsx
    frontend/src/components/edges/MasterSlaveEdge.tsx
    frontend/src/components/edges/EventTriggerEdge.tsx
    frontend/src/components/edges/RetryFallbackEdge.tsx
    frontend/src/components/edges/index.ts
  </write_files>
  <action>
    按 UI-DESIGN §3.2 表格实现 6 种自定义 Edge：
    1. 每种 Edge 继承 React Flow BaseEdge + getBezierPath
    2. 渲染差异化：线型(实线/虚线/双线/粗线)、颜色、箭头、标签、图标
    3. 标签：Mono 9px，背景 bg-card，防遮挡连线
    4. hover → stroke 变 var(--blue)；选中 → strokeWidth 2px
    5. edges/index.ts 导出 edgeTypes map 供 ReactFlow 注册
    参考 DESIGN §5 表格中的具体规格。
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/components/edges/index.ts 2>&1 | head -5</verify>
  <done>6 种 Edge 组件可正常 import，每种视觉样式与 UI-DESIGN §3.2 一致</done>
  <depends_on>T03</depends_on>
  <auto>true</auto>
</task>

<task id="T07" parallel="true" status="pending">
  <name>NodePool 侧边栏组件</name>
  <read_files>
    frontend/src/stores/orchestration.ts
    frontend/src/styles/tokens.css
  </read_files>
  <write_files>
    frontend/src/components/AgentNodePool.tsx
  </write_files>
  <action>
    按 UI-DESIGN §3.4 实现 Agent 节点池侧边栏：
    1. 展示所有可用的 Agent（从 GET /api/agents 获取）
    2. 过滤已在画布上的 Agent（避免重复添加）
    3. 每个 Agent 项：名称（Mono 12px）+ runtime badge + 模型名（Supporting 11px）
    4. 拖拽 Agent 到画布 = 在释放位置创建新节点
    5. 「添加 Agent」按钮 → 跳转 /agents/new
    6. 可折叠：收起 32px 图标条，展开 220px
    7. 样式：bg-card + border，列表项 hover → bg-card-hover + blue 左边框
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/components/AgentNodePool.tsx 2>&1 | head -5</verify>
  <done>NodePool 展示可用 Agent，支持拖拽到画布和跳转 Builder</done>
  <depends_on>T04</depends_on>
  <auto>true</auto>
</task>

<task id="T08" parallel="true" status="pending">
  <name>OrchestrationListPage 编排列表页</name>
  <read_files>
    frontend/src/App.tsx
    frontend/src/stores/orchestration.ts
    frontend/src/styles/tokens.css
  </read_files>
  <write_files>
    frontend/src/pages/OrchestrationListPage.tsx
  </write_files>
  <action>
    按 UI-DESIGN §3.1 实现编排列表页：
    1. GET /api/orchestration → 卡片列表
    2. 每张卡片：状态色点(8px) + 名称(Headline 16px) + Agent 数量 + 运行时间(Supporting 11px)
    3. 四个操作按钮：[查看 MD] [查看 YAML] [编辑画布] [删除]
    4. 「查看 MD」→ 弹窗展示 GET /{id}/md 返回的 Markdown（CodeMirror readOnly）
    5. 「查看 YAML」→ 弹窗展示 GET /{id}/yaml 返回的 YAML
    6. 「编辑画布」→ 跳转 /orchestration/{id}/edit
    7. 「新建编排」按钮 → 跳转 /orchestration/new
    8. 删除 → ConfirmDialog → DELETE /api/orchestration/{id}
    9. 空态：无实例时显示引导文案 + 「新建编排」按钮
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/pages/OrchestrationListPage.tsx 2>&1 | head -5</verify>
  <done>列表页展示所有编排实例；按钮功能全部可用</done>
  <depends_on>T02</depends_on>
  <auto>true</auto>
</task>

<task id="T09" parallel="false" status="pending">
  <name>OrchestrationCanvas 增强：onConnect + 自定义 Edge + handle 交互</name>
  <read_files>
    frontend/src/components/OrchestrationCanvas.tsx
    frontend/src/components/edges/index.ts
    frontend/src/lib/orchestration-sync.ts
  </read_files>
  <write_files>
    frontend/src/components/OrchestrationCanvas.tsx
  </write_files>
  <action>
    在现有 OrchestrationCanvas 基础上增强：
    1. 新增 onConnect prop：从节点 output handle 拖到 input handle → 回调创建新 Edge
    2. 注册自定义 edgeTypes（从 edges/index.ts import）
    3. 节点增加 Handle 组件（左侧 input + 右侧 output，未连线 opacity 0.3，连线后 opacity 1）
    4. 新增 onEdgeClick prop：点击连线 → 回调打开 EdgeEditor
    5. 节点新增「详情」按钮（btn-ghost + ExternalLink icon，hover 显示）
    6. 保留现有：nodesDraggable、deleteKeyCode、状态颜色、MiniMap、Background、Controls
    7. 连线按 EdgeConfig.type 使用对应自定义 Edge 组件渲染
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/components/OrchestrationCanvas.tsx 2>&1 | head -5</verify>
  <done>画布支持拖拽连线创建；6 种 Edge 按类型渲染；节点有 handle 和详情按钮</done>
  <depends_on>T03, T06</depends_on>
  <auto>true</auto>
</task>

<task id="T10" parallel="false" status="pending">
  <name>OrchestrationPage 重写：三栏布局 + 双向同步集成</name>
  <read_files>
    frontend/src/pages/OrchestrationPage.tsx
    frontend/src/components/OrchestrationCanvas.tsx
    frontend/src/components/EdgeEditor.tsx
    frontend/src/components/AgentNodePool.tsx
    frontend/src/lib/orchestration-sync.ts
    frontend/src/stores/orchestration.ts
  </read_files>
  <write_files>
    frontend/src/pages/OrchestrationPage.tsx
  </write_files>
  <action>
    完全重写 OrchestrationPage（替换现有 228 行）：
    1. 三栏布局：YAML/MD 编辑器(40%) | 画布(40%) | 属性面板(20%)
    2. 分栏可拖拽调整（保留现有 resize 逻辑）
    3. YAML/MD Tab 切换：CodeMirror lang-yaml vs lang-markdown
    4. 双向同步集成：
       - YAML onChange → debounce 300ms → yamlToTopology → 画布刷新
       - 画布 onNodesChange/onEdgesChange/onConnect → debounce 300ms → topologyToYaml → YAML 刷新
       - 脏标记防无限循环（useDebouncedSync hook）
    5. EdgeEditor 集成：onEdgeClick → setSelectedEdgeId → 面板滑入
    6. NodePool 集成：左侧边栏可折叠
    7. TopologyMonitor 保留（底部可折叠）
    8. 工具栏保留：编排名称 + Validate + Apply 按钮
    9. Apply 时提交 yamlContent + edgeConfigs
    10. 加载已有编排：GET /{id} → yaml_raw + edges_json → 恢复状态
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/pages/OrchestrationPage.tsx 2>&1 | head -10</verify>
  <done>三栏布局正常工作；YAML 编辑器↔画布 双向同步；连线创建后弹出配置面板</done>
  <depends_on>T05, T07, T09</depends_on>
  <auto>true</auto>
</task>

<task id="T11" parallel="false" status="pending">
  <name>App.tsx 路由更新 + 导航集成</name>
  <read_files>
    frontend/src/App.tsx
  </read_files>
  <write_files>
    frontend/src/App.tsx
  </write_files>
  <action>
    1. 新增路由：
       - /orchestration → OrchestrationListPage（列表）
       - /orchestration/new → OrchestrationPage（新建，空白画布）
       - /orchestration/{id}/edit → OrchestrationPage（编辑模式，加载已有数据）
    2. 侧边栏导航更新：现有「编排」菜单项 → 跳转 /orchestration（列表页）
    3. 保留现有 AgentBuilder/AgentDetail 路由不变
    4. OrchestrationListPage 的「编辑画布」→ 跳转 /orchestration/{id}/edit
    5. NodePool 的「添加 Agent」→ 跳转 /agents/new
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit src/App.tsx 2>&1 | head -5</verify>
  <done>新路由可访问；侧边栏导航正确跳转列表页</done>
  <depends_on>T08, T10</depends_on>
  <auto>true</auto>
</task>

<task id="T12" parallel="false" status="pending">
  <name>端到端验证：全流程 + AC 覆盖检查</name>
  <read_files>
    .specs/orchestration-canvas-v2/REQUIREMENT.md
    .specs/orchestration-canvas-v2/DESIGN.md
    .specs/orchestration-canvas-v2/UI-DESIGN.md
  </read_files>
  <write_files>
    .specs/orchestration-canvas-v2/T12-SUMMARY.md
  </write_files>
  <action>
    逐条验证 REQUIREMENT.md 的 17 条 AC：
    1. AC-A1~A3: 列表页 → curl + UAT
    2. AC-B1~B7: 画布交互 → UAT（拖拽连线、配置面板、双向同步、删除、拖拽移动）
    3. AC-C1~C5: 连线配置 → curl apply + UAT（策略下拉框、IO schema、安全栅栏、token 限制）
    4. AC-D1~D3: 节点交互 → UAT（详情跳转、添加 Agent 跳转、节点池拖入）
    5. AC-E1~E3: MD/YAML → curl + UAT（查看、Tab 切换）
    记录通过/失败状态，失败项创建 fix task 或记录到 TASK.md 阻塞日志。
  </action>
  <verify>python -c "ac = ['A1','A2','A3','B1','B2','B3','B4','B5','B6','B7','C1','C2','C3','C4','C5','D1','D2','D3','E1','E2','E3']; print(f'{len(ac)} ACs to verify')"</verify>
  <done>全部 17 条 AC 已验证，结果记录在 T12-SUMMARY.md</done>
  <depends_on>T11</depends_on>
  <auto>false</auto>
</task>
```

---

## 状态字段说明

- `status="pending"` — 未开始
- `status="in_progress"` — 进行中
- `status="done"` — 已完成（verify 通过）
- `status="blocked"` — 阻塞

---

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
|  |  |  |  |

---

## Fix 任务（来自 REVIEW / INTEGRATION）

> 此区域由 review/integration 阶段自动追加。
