# DESIGN: 编排画布 v2 — 双向同步 + 富连线配置

- **Change ID**: orchestration-canvas-v2
- **关联**: `@.specs/orchestration-canvas-v2/REQUIREMENT.md`、`@.specs/CONTEXT.md`
- **作者**: AI（Architect 角色）+ 人工 review

---

## 0. 技术栈选定

> 全项沿用 CONTEXT.md 已锁技术栈。本次无新栈引入。

- **选定**: 沿用既有栈（CONTEXT.md 已锁）
- **前端**: React 18.3 + TypeScript 5.5 + Vite 5.4 + Tailwind CSS 3.4
- **后端**: FastAPI 0.110+ + Python 3.10+
- **数据库**: SQLAlchemy 2.0 ORM — SQLite（开发）/ MySQL（生产）
- **部署**: 本地 localhost
- **关键依赖**:
  - **React Flow** (`@xyflow/react` · 拓扑画布 + `onConnect` + 自定义 Edge 类型) — 已安装，复用
  - **CodeMirror 6** (`@codemirror/lang-yaml` + `@codemirror/theme-one-dark`) — 已安装，复用
  - **js-yaml** (前端 YAML ↔ JSON 互转) — 已安装，复用
  - **PyYAML** (后端 YAML 解析) — 已安装，复用
  - **zustand** (状态管理) — 已安装，复用
- **理由**: 本次为纯增强，在既有 OrchestrationPage + React Flow 基础上增加交互深度，不需要换栈
- **明确排除**: 不引入新 UI 库、不换状态管理方案、不引入新图表库

---

## 0.5 既有架构对齐（brownfield）

### 0.5.1 本次 change 触碰的既有模块

```
触碰模块（grep 实际清单）：
- frontend/src/pages/OrchestrationPage.tsx（❌ 重写 · 三栏布局 + 双向同步）
- frontend/src/components/OrchestrationCanvas.tsx（❌ 大幅扩展 · onConnect + 自定义 Edge）
- frontend/src/stores/orchestration.ts（扩展 · 新增 edges 配置 + 节点池状态）
- frontend/src/App.tsx（扩展 · 新增 OrchestrationListPage 路由）
- frontend/src/pages/AgentDetail.tsx（只读引用 · 节点「详情」跳转目标）
- frontend/src/pages/AgentBuilder.tsx（只读引用 · 「添加 Agent」跳转目标）
- backend/routes/orchestration_api.py（扩展 · 新增 edges CRUD + MD 端点）
- backend/models/orchestration.py（扩展 · OrchestrationInstance 新增 edges_json 字段）
- backend/engine/yaml_schema.py（扩展 · 连线配置字段 schema 校验）

新增模块：
- frontend/src/pages/OrchestrationListPage.tsx（编排列表页）
- frontend/src/components/EdgeEditor.tsx（连线配置面板）
- frontend/src/components/AgentNodePool.tsx（Agent 节点池侧边栏）
- frontend/src/components/edges/*.tsx（6 种自定义 Edge 组件）
- frontend/src/lib/orchestration-sync.ts（YAML ↔ 画布双向同步工具函数）

禁动清单（与本次无关，AI 不许"顺手"碰）：
- backend/auth.py（用户认证 · 禁动清单已有）
- backend/database.py（数据库引擎 · 禁动清单已有）
- frontend/src/main.tsx（全局 fetch 拦截器 · 禁动清单已有）
- backend/engine/reconcile_loop.py（控制循环 · 不属本次范围）
- backend/engine/scheduler.py（调度器 · 不属本次范围）
- frontend/src/pages/ToolMarket.tsx（工具库 · 与编排无关）
```

### 0.5.2 既有抽象沿用对照表

| 本次需要 | 既有有没有？路径 | 决定 |
|---|---|---|
| HTTP 客户端 | `frontend/src/main.tsx` 全局 fetch 拦截器 | 沿用（自动注入 X-User-Id）|
| 状态管理 | zustand 4.5（`frontend/src/stores/`）| 沿用，扩展 `orchestration.ts` |
| ORM 数据访问 | SQLAlchemy `DeclarativeBase` + `Depends(get_db)` | 沿用 |
| API 路由组织 | `backend/routes/<entity>_api.py` | 沿用，不改组织结构 |
| 认证鉴权 | `backend/auth.py` `require_permission` | 沿用 |
| 审计日志 | `backend/services/audit_service.py` | 沿用，新增编排画布操作动作类型 |
| 拓扑画布 | React Flow（`@xyflow/react`）已集成 | 沿用，增加 `onConnect` + 自定义 Edge |
| YAML 编辑 | CodeMirror 6 + `@codemirror/lang-yaml` 已集成 | 沿用 |
| MD 编辑 | CodeMirror 6（通用）| **引入新模式** → 用 CodeMirror markdown 模式（同库不同 lang） |
| Design Tokens | `frontend/src/styles/tokens.css`（179 行）| 沿用，新增 edge 动画 token |

### 0.5.3 沿用模式 vs 引入新模式

```
- 数据访问：**沿用** SQLAlchemy ORM + Depends(get_db) 依赖注入
- 状态管理：**沿用** zustand store 范式（create<XxxState>((set, get) => {...})）
- API 路由：**沿用** backend/routes/<entity>_api.py 风格 + FastAPI router
- 错误处理：**沿用** HTTPException + ErrorBoundary
- 画布组件：**沿用** React Flow 节点/边模型，**引入新模式** → 自定义 Edge 组件（@xyflow/react 原生支持，非外部库）
- 双向同步：**引入新模式**（既有无此抽象）→ useOrchestrationSync hook + debounce
```

---

## 1. 决策清单

| # | 决策 | 备选 | 选择理由 | 取舍代价 |
|---|---|---|---|---|
| **D1** | YAML 为规范格式，MD 为展示格式 | ① MD 为规范 ② 双格式独立存储 ③ YAML 为规范 | 选③。YAML 可机器解析、可 apply、可 git diff。MD 适合人读但不适合做规范存储。MD 从 YAML 实时渲染生成 | MD 中的手写注释/格式在 YAML→MD 往返中可能丢失。解决：注释写在 YAML `#` 中，MD 渲染时保留 |
| **D2** | 双向同步用防抖+脏标记防无限循环 | ① 单向 YAML→画布 ② 事件触发全量刷新 ③ 脏标记+debounce 300ms | 选③。①是现状（本次要改的）。②无防抖会性能炸裂。③是标准 React 双向编辑器模式（VSCode/Notion 都用） | 需要维护两个 dirty flag（canvasDirty/yamlDirty），状态逻辑复杂度 +20 行；但避免了无限循环的死锁调试成本 |
| **D3** | 连线配置存储为 OrchestrationInstance.edges_json（JSON 列） | ① 独立 edges 表 ② JSON 字段 | 选②。v1 连线数量少（< 100 条/实例），JSON 字段足够。独立表在无 JOIN 查询需求时是过度工程 | 未来如需跨实例查询"哪些连线用了 event-trigger 策略"，需全量扫 JSON 字段。v2 可迁移到独立表 |
| **D4** | 画布组件拆分：Page(布局) → Canvas(画布) + EdgeEditor(面板) + NodePool(侧栏) | ① 单文件全塞 OrchestrationPage ② 拆分 | 选②。AC-B1~B4 对应 4 个独立交互域，单文件会重复 T15 的巨石组件错误（REVIEW 记录：R1 Cognitive Overload） | 拆分后需定义组件间接口（props 传 8+ 字段），但每个组件职责清晰 |
| **D5** | 自定义 Edge 类型用 React Flow `edgeTypes` + 独立组件文件 | ① CSS 伪类区分 ② 自定义 Edge 组件 | 选②。AC-B3 要求 6 种连线有不同样式（线型+箭头+图标+标签），CSS 伪类无法加图标/SVG 元素。React Flow 原生支持 `edgeTypes` 注册自定义渲染器 | 6 个文件 × ~40 行/个 = ~240 行样板，但每种边独立测试、独立迭代 |
| **D6** | 安全栅栏用规则名注册表（后端函数映射）| ① 存可执行代码（eval）② 规则名+注册表 | 选②。安全审计师已在 G1 门禁提出：可执行代码有注入风险。规则名映射到后端预注册的校验函数 | 新增规则需后端部署（改代码+重启），灵活性低于①。缓解：v1 预注册 5 个常用规则（validate_sql_injection / mask_pii / validate_output_schema / check_param_type / noop） |
| **D7** | MD↔YAML 转换统一以 YAML 为中间表示 | ① 直接 MD→画布 ② MD→YAML→画布（YAML 为 pivot） | 选②。架构师在 G1 门禁建议：避免维护两套 parser。统一以 YAML 为中间 AST | MD 需额外 parse→YAML 步骤，但两端（画布+YAML 编辑）共享同一数据源 |

---

## 2. 数据流 / 架构图

```
┌─────────────────────────────────────────────────────────┐
│                   OrchestrationListPage                   │
│  GET /api/orchestration → 列表卡片                        │
│  [查看MD] [查看YAML] [编辑画布] [删除]                      │
└──────────┬────────────────────────────────┬──────────────┘
           │                                │
    只读查看                          点击「编辑画布」
           │                                │
           v                                v
┌──────────────────┐          ┌──────────────────────────────┐
│  MDViewer /       │          │     OrchestrationPage          │
│  YamlViewer       │          │  ┌────────┬────────┬────────┐ │
│  (readOnly)       │          │  │ YAML/  │ 画布    │ 属性    │ │
│                   │          │  │ MD编辑 │        │ 面板    │ │
└──────────────────┘          │  │ (40%)  │ (40%)  │ (20%)  │ │
                              │  └───────┴────────┴────────┘ │
                              │          ↑↓ 双向同步          │
                              └──────────────────────────────┘

双向同步数据流：

  ┌──────────┐  onChange(debounce 300ms)  ┌──────────────┐
  │ YAML/MD  │ ─────────────────────────→ │ 画布 Canvas   │
  │ 编辑器    │ ←───────────────────────── │              │
  └──────────┘  onNodesChange/onEdgesChange│              │
                  /onConnect (debounce)    └──────────────┘
        │                        │                │
        │ GET/PUT                 │                │ 点击连线/节点
        v                        v                v
  ┌─────────────┐    ┌───────────────────┐   ┌─────────────┐
  │ 后端 API     │    │ orchestration.ts  │   │ EdgeEditor  │
  │ /orchestration│←──│ (zustand store)   │   │ / 节点详情   │
  │ /{id}        │    │ yamlContent       │   └─────────────┘
  │ /{id}/yaml   │    │ topologyState     │
  │ /{id}/md     │    │ edgesConfig[]     │
  └─────────────┘    │ nodePool[]        │
        │            └───────────────────┘
        v
  ┌─────────────┐
  │ SQLite       │
  │ Orchestration│
  │ Instance     │
  │ .yaml_raw    │
  │ .edges_json  │
  └─────────────┘
```

**关键数据流路径**:

1. **加载编排**: `GET /api/orchestration/{id}` → `yamlContent` → YAML parse → `topologyState.nodes/edges` → Canvas 渲染
2. **画布编辑**: 拖拽连线 → `onConnect` → `addEdge()` → set `canvasDirty=true` → debounce 300ms → `topologyToYaml()` → set `yamlContent`
3. **YAML 编辑**: 改 YAML → onChange → set `yamlDirty=true` → debounce 300ms → `yamlToTopology()` → set `topologyState`
4. **保存**: 点击 Apply → `POST /api/orchestration/apply` (body: yamlContent + edgesConfig)
5. **连线配置**: 点击连线 → EdgeEditor 打开 → 修改字段 → 更新 `edgesConfig[id]` → 触发 YAML 重生成（routes 段补全配置）

---

## 3. 关键状态机

### 3.1 编辑页模式状态

```
         ┌──────────────┐
         │   viewing    │  (默认：画布+编辑器只读)
         └──────┬───────┘
                │ 点击「编辑画布」
                v
         ┌──────────────┐
         │   editing    │  (画布可编辑、连线可创建)
         └──────┬───────┘
                │ 点击「Apply」
                v
         ┌──────────────┐
         │   deploying  │  (loading 状态)
         └──────┬───────┘
                │ API 返回
           ┌────┴────┐
           v         v
    ┌──────────┐  ┌──────────┐
    │ success  │  │  failed   │
    │ (绿色提示)│  │ (红色提示) │
    └──────────┘  └──────────┘
```

### 3.2 双向同步脏标记

```
  canvasDirty (bool)    yamlDirty (bool)      行为
  ─────────────────────────────────────────────────
  false                 false                  空闲，不更新
  true                  false                  画布→YAML 方向同步
  false                 true                   YAML→画布方向同步
  true                  true                   异常（不应出现，重置两个 flag）
```

防抖逻辑伪代码：

```
onCanvasChange():
  if yamlDirty: return  // YAML 发起的变更，不反向传播
  canvasDirty = true
  debounce(300ms, () => {
    newYaml = topologyToYaml(nodes, edges)
    setYamlContent(newYaml)
    canvasDirty = false
  })

onYamlChange():
  if canvasDirty: return  // 画布发起的变更，不反向传播
  yamlDirty = true
  debounce(300ms, () => {
    newTopology = yamlToTopology(yamlContent)
    setTopologyState(newTopology)
    yamlDirty = false
  })
```

---

## 4. 组件接口定义

### OrchestrationCanvas（扩展后）

```typescript
interface Props {
  nodes: Node[];
  edges: Edge[];
  edgeConfigs: Map<string, EdgeConfig>;  // 新增
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onConnect: (connection: Connection) => void;  // 新增 ← 关键
  onEdgeClick: (edgeId: string) => void;  // 新增
  onNodeDetailClick: (nodeId: string) => void;  // 新增
  nodePool?: AgentNode[];  // 新增
  readOnly?: boolean;
}
```

### EdgeConfig（连线配置数据结构）

```typescript
interface EdgeConfig {
  id: string;
  source: string;       // from agent name
  target: string;       // to agent name
  type: 'sequential' | 'parallel' | 'fork' | 'master-slave' | 'event-trigger' | 'retry-fallback';
  trigger_condition: string;   // e.g., "$.output.score < 0.7" | "on:webhook.github_push"
  trigger_type: 'auto' | 'event' | 'schedule' | 'manual';
  input_schema: object;        // JSON Schema
  output_schema: object;       // JSON Schema
  gate_pre: string;            // rule name
  gate_post: string;           // rule name
  token_soft_limit: number;
  token_hard_limit: number;
  description: string;
  retry_policy: {
    max_retries: number;
    backoff: 'fixed' | 'exponential';
    fallback_node: string | null;
  };
  io_filter: 'none' | 'mask_pii' | 'schema_only';
}
```

### EdgeEditor 面板

```typescript
interface Props {
  edgeId: string | null;       // null → 关闭面板
  config: EdgeConfig | null;
  onSave: (config: EdgeConfig) => void;
  onDelete: (edgeId: string) => void;
  onClose: () => void;
  agentNames: string[];        // 用于 fallback_node 选择
}
```

---

## 5. 自定义 Edge 组件映射

| 文件 | type | 线型 | 箭头 | 图标 | 标签颜色 |
|---|---|---|---|---|---|
| `SequentialEdge.tsx` | sequential | 实线 1.5px | 单箭头 ▶ | — | #548cf0 蓝 |
| `ParallelEdge.tsx` | parallel | 双线 1px | 双箭头 ▶▶ | — | #5cb878 绿 |
| `ForkEdge.tsx` | fork | 分叉线 | 单箭头 ▶ | ◆ 菱形 | #e8a450 橙 |
| `MasterSlaveEdge.tsx` | master-slave | 粗线 2.5px | 单箭头 ▶ | M→S 标记 | #9699a0 灰 |
| `EventTriggerEdge.tsx` | event-trigger | 虚线 1.5px | 单箭头 ▶ | 🕐 时钟 | #9699a0 灰 |
| `RetryFallbackEdge.tsx` | retry-fallback | 虚线 1.5px | 单箭头 ▶ | ↻ 循环 | #e05555 红 |

> 都使用 React Flow 的 `BaseEdge` + `getBezierPath`/`getSmoothStepPath` 作为基础路径，叠加自定义 SVG 元素。

---

## 6. 后端 API 扩展

| 端点 | 方法 | 说明 | 变更类型 |
|---|---|---|---|
| `/api/orchestration` | GET | 列表（含状态颜色、Agent 数） | 扩展返回字段 |
| `/api/orchestration/{id}` | GET | 详情（含 edges_json） | 扩展返回字段 |
| `/api/orchestration/{id}/yaml` | GET | 返回原始 YAML 字符串 | **新增** |
| `/api/orchestration/{id}/md` | GET | 返回渲染后 Markdown 字符串 | **新增** |
| `/api/orchestration/apply` | POST | apply YAML（body 含 edges_config） | 扩展 body schema |
| `/api/orchestration/{id}` | PUT | 更新 yaml_raw + edges_json | 扩展 body schema |
| `/api/orchestration/{id}` | DELETE | 删除编排实例 | 已有，不改 |

### 安全栅栏注册表（后端预注册）

```python
# backend/engine/gate_registry.py（新增）

GATE_REGISTRY: dict[str, callable] = {
    "validate_sql_injection": _validate_sql_injection,
    "mask_pii": _mask_pii,
    "validate_output_schema": _validate_output_schema,
    "check_param_type": _check_param_type,
    "noop": lambda x: x,  # 空操作，默认
}
```

---

## 7. 风险

| # | 风险 | 类型 | 影响 | 概率 | 缓解 |
|---|---|---|---|---|---|
| **R1** | 双向同步防抖逻辑在极端操作下（快速连续拖拽+同时改 YAML）出现竞态，导致 YAML 和画布不一致 | 实现风险 | 用户看到的 YAML 和画布不同步，apply 部署的不是画布上的内容 | 中 | 用 `useRef` 存储最新的 nodes/edges/yaml 引用，debounce 回调始终读 ref 最新值（非闭包旧值）；AC-B5/B6 包含手动验证 |
| **R2** | React Flow `onConnect` + 6 种自定义 Edge 在 50+ 节点场景下拖拽卡顿 | 实现风险 | 画布操作延迟 > 500ms，违反非功能需求 200ms | 低 | React Flow v12 内置虚拟化；如果卡顿，关闭 `<MiniMap>` 的实时更新、Edge 动画降级为 CSS transition |
| **R3** | 旧编排实例（agent-k8s-orchestration 产出）的 YAML 不含 edges 配置 → 迁移脚本补全的默认值不合理 | 上线风险 | 旧实例编辑时默认配置与用户预期不符 | 中 | 迁移脚本生成默认 EdgeConfig（sequential + auto trigger + noop gate + 合理 token 默认值）；旧实例首次编辑时提示「连线配置已自动填充默认值，请检查」 |
| **R4** | MD↔YAML 转换丢失格式细节（注释、空行、字段顺序） | 长期债务 | 用户从 MD 切回 YAML 发现布局变了 | 中 | D1 规定 YAML 为规范格式，MD 仅展示。MD 编辑器模式下标注「只读查看」或「编辑后以 YAML 为准」 |
| **R5** | 6 个自定义 Edge 组件 + EdgeEditor 面板 + NodePool 侧栏 → 组件数量膨胀，维护成本上升 | 长期债务 | 新增第 7 种连线策略需改 5+ 处 | 低 | EdgeConfig type 定义在单一 `types.ts`；自定义 Edge 注册表用 map 统一管理；v1 6 种策略已覆盖当前需求 |

---

## 8. 不在范围（设计层面）

- 不设计连线配置的**运行时执行**（reconcile loop 不读 edges_json，本次纯粹存储+展示）
- 不设计画布版本历史 / Diff（属于 CHANGE.md out 范围）
- 不设计实时协作编辑
- 不设计 YAML schema 版本演进策略（如 `apiVersion: v2`）
- 不改变 Agent 执行引擎的调度方式

---

## 9. 架构沉淀建议

### 9.1 新增的可复用抽象

| 路径 | 能力 | 触发场景 | 复用建议 |
|---|---|---|---|
| `frontend/src/lib/orchestration-sync.ts` | YAML ↔ 画布双向同步工具函数（`yamlToTopology` / `topologyToYaml` / `mdToYaml` / `yamlToMd`）| 任何需要 YAML↔可视化 双向同步的场景 | 将来如有其他 YAML 驱动的可视化编辑器可复用 |
| `frontend/src/components/edges/` | React Flow 自定义 Edge 组件集 | 任何需要不同线型表达不同语义的画布 | 新增连线类型只需加一个文件 + 注册到 `edgeTypes` map |

### 9.2 新增的项目级技术决策

| 决策 | 取值 | 影响范围 | 推翻代价 |
|---|---|---|---|
| 编排配置规范格式 | YAML（非 MD、非 JSON）| 所有编排相关 API/存储/前端 | 低——数据量小，迁移脚本易写 |
| 安全栅栏注册表模式 | 规则名 → 后端函数映射（非可执行代码）| 所有安全校验场景 | 中——如果改为 DSL/脚本，需重写注册表架构 |

### 9.3 依赖变动

无新增外部依赖。本次全部复用已有依赖。

### 9.4 禁动清单变化

```
- 新增禁动：frontend/src/lib/orchestration-sync.ts 不允许绕过直接 import js-yaml 做 parse（统一通过 sync 工具函数）
```
