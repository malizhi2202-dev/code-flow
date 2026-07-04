# DESIGN: Agent 编排模块 k8s 化改造

- **Change ID**: `agent-k8s-orchestration`
- **关联**: `@.specs/agent-k8s-orchestration/REQUIREMENT.md`、`@.specs/CONTEXT.md`、`@code-kit/reference/tech-stacks.md`
- **作者**: AI（Architect 角色）+ 人工 review

---

## 0. 技术栈选定

> 由 2-design 步骤 0 锁定。变栈视为开新 CHANGE（R7.1）。

- **选定**：沿用既有栈（CONTEXT.md 已锁）
- **前端**：React 18.3 + TypeScript 5.5 + Vite 5.4
- **后端**：FastAPI 0.110+ + Python 3.10+
- **数据库**：SQLAlchemy 2.0 ORM — SQLite（开发）/ MySQL（生产）
- **部署**：本地 localhost，无 Docker/CI
- **关键依赖**：
  - **React Flow**（`@xyflow/react` · 拓扑画布渲染 + 拖拽交互）— 新增
  - **CodeMirror 6**（YAML 编辑器，语法高亮 + lint）— 新增
  - **js-yaml**（前端 YAML ↔ JSON 互转）— 新增
  - **PyYAML**（后端 YAML 解析 + 校验）— 新增
  - **asyncio**（Python 标准库 · reconcile loop 定时任务）— 沿用
- **理由**：所有 AC 为本地单进程场景设计，无需引入分布式组件；React Flow 是编排可视化的成熟方案
- **明确排除**：
  - ❌ 不选 Dify 的 amis 渲染引擎（太重，与项目 Tremor + Tailwind 体系冲突）
  - ❌ 不选 LangFlow 后端（它用 Node.js，本项目 Python 后端）

---

## 0.5 既有架构对齐（brownfield 必填 · 来自 2-design 步骤 0.5 / B2 老项目护栏）

### 0.5.1 本次 change 触碰的既有模块

```
触碰模块（grep 出来的实际清单）：
- frontend/src/App.tsx（导航路由 · 新增 orchestration 相关路由 + YAML 编辑器面板）
- frontend/src/pages/OrchestrationPage.tsx（❌ 重写 · 现有拖拽编排页 → 双栏 YAML+画布）
- frontend/src/pages/MonitoringDashboard.tsx（扩展 · 新增编排拓扑状态面板 + 调用链追踪 Tab）
- frontend/src/pages/WorkflowDetail.tsx（扩展 · 节点详情增加 reconcile 状态展示）
- frontend/src/stores/workflows.ts（扩展 · 新增编排实例 + 模板 store）
- backend/routes/orchestration_api.py（❌ 重写 · 新增 apply/validate/queue/templates 端点）
- backend/routes/metrics_api.py（扩展 · 新增编排拓扑级 metrics 端点）
- backend/routes/audit_api.py（扩展 · 新增编排操作审计动作类型）
- backend/models/agent.py（扩展 · 新增编排状态字段）
- backend/services/orchestration_parser.py（❌ 重写 · 扩展为完整 YAML schema 解析+校验）

新增模块：
- backend/engine/reconcile_loop.py（reconcile 引擎）
- backend/engine/scheduler.py（调度器）
- backend/engine/yaml_schema.py（YAML schema 定义 + 校验）
- backend/models/orchestration.py（编排实例 + 模板 + 调度队列 ORM）
- backend/services/template_service.py（模板渲染引擎）
- frontend/src/components/OrchestrationCanvas.tsx（React Flow 拓扑画布）
- frontend/src/components/YamlEditor.tsx（CodeMirror YAML 编辑器）
- frontend/src/components/TopologyMonitor.tsx（实时状态面板）
- frontend/src/components/TraceViewer.tsx（调用链瀑布图）
- frontend/src/pages/TemplateMarket.tsx（模板市场页）
- frontend/src/stores/orchestration.ts（编排状态管理 · zustand）

禁动清单（与本次无关，AI 不许"顺手"碰）：
- backend/auth.py（用户认证 · 禁动清单已有）
- backend/database.py（数据库引擎 · 禁动清单已有）
- frontend/src/main.tsx（全局 fetch 拦截器 · 禁动清单已有）
- backend/routes/tools_api.py（工具库 API · 与编排无关）
- backend/routes/roles_api.py（角色 API · 与编排无关）
- frontend/src/pages/LoginPage.tsx（登录页 · 与编排无关）
```

### 0.5.2 既有抽象沿用对照表

| 本次需要 | 既有有没有？路径 | 决定 |
|---|---|---|
| HTTP 客户端 | `frontend/src/main.tsx` 全局 fetch 拦截器 | 沿用（自动注入 X-User-Id） |
| 状态管理 | zustand 4.5（`frontend/src/stores/`）| 沿用，新增 `orchestration.ts` store |
| ORM 数据访问 | SQLAlchemy `DeclarativeBase` + `Depends(get_db)` | 沿用，新增 `orchestration.py` 模型 |
| API 路由组织 | `backend/routes/<entity>_api.py` | 沿用，重写 `orchestration_api.py` |
| 认证鉴权 | `backend/auth.py` `require_permission` | 沿用 |
| 审计日志 | `backend/services/audit_service.py` | 沿用，新增编排操作动作类型 |
| 指标采集 | `backend/services/metrics_service.py` | 沿用，新增拓扑级聚合查询 |
| UI 组件库 | Tremor 3.18 + Tailwind CSS 3.4 | 沿用 |
| 图表 | Recharts 2.15 | 沿用（拓扑监控柱状图/饼图） |
| 图标 | Lucide React 1.23 | 沿用 |
| YAML 解析（后端）| 无 | **新建** PyYAML（理由：第一次有 YAML 解析需求） |
| 拓扑画布 | 无 | **新建** React Flow（理由：第一次有 DAG 可视化编辑需求） |
| YAML 编辑器（前端）| 无 | **新建** CodeMirror 6（理由：第一次有 YAML 编辑需求） |
| 模板渲染 | 无 | **新建** 自实现（Go template 兼容语法 `{{ .Values.xxx }}`，轻量） |

### 0.5.3 沿用模式 vs 引入新模式

```
- 数据访问：**沿用** SQLAlchemy ORM + Depends(get_db) 依赖注入（既有 models/*.py 模式）
- 错误处理：**沿用** FastAPI HTTPException（后端）+ ErrorBoundary（前端）
- API 路由：**沿用** <entity>_api.py + FastAPI APIRouter 模式
- 前端页面：**沿用** pages/ 目录 + inline styles + CSS 变量（工业风）
- 状态管理：**沿用** zustand create<XxxState>((set, get) => {...}) 范式
- 文件命名：**沿用** PascalCase 组件.tsx / snake_case 后端.py
- 编排引擎：**引入新模式** → 理由：既有无 reconcile loop + 调度器抽象，这是全新能力层
- 编排模板：**引入新模式** → 理由：既有无参数化模板系统
```

---

## 1. 决策清单

| # | 决策 | 备选 | 选择理由 | 取舍代价 |
|---|---|---|---|---|
| **D1** | reconcile loop 用 asyncio 后台任务 | Celery + Redis / 独立进程 | 项目部署仅本地 localhost，Celery 需要额外 Redis broker 进程，过度工程。asyncio.create_task 在 FastAPI startup 事件中注册即可 | 非持久化：服务重启时 reconcile 任务中断，需在 startup 重新注册；无分布式能力 |
| **D2** | YAML schema 自定义（兼容 k8s apiVersion/kind 风格） | 直接用 k8s CRD 格式 / 自定义 JSON Schema | k8s 风格让用户熟悉感强（`apiVersion: ai-platform/v1`、`kind: AgentOrchestration`），但 schema 字段完全针对 Agent 编排定制，不照搬 k8s Pod spec | 需自行实现 schema 校验器（用 PyYAML + jsonschema 库），不与 k8s API Server 兼容 |
| **D3** | 调度算法：优先级队列 + 轮询配额 | 公平队列（CFS）/ 简单 FIFO | 优先级是用户显式需求（AC-C1），CFS 的虚拟时间概念对用户不可见；轮询配额简单直观 | 低优先级任务可能饥饿——加 max_wait_time 防饥饿（排队超过 5 分钟自动提升优先级） |
| **D4** | 模板引擎：Go template 语法 `{{ .Values.xxx }}` | Jinja2 / 自定义语法 | Go template 是 Helm/ArgoCD 生态标准，用户学习成本低；Python 自实现解析器轻量（regex 替换） | 不支持 Jinja2 的控制流（if/range），模板仅做变量替换 |
| **D5** | 拓扑状态快照：SQLite 表 + JSON 字段 | etcd / 文件系统 | 项目无外部存储，SQLite 就地可用；JSON 字段存完整 topology YAML 快照，查询方便 | 无乐观锁/多写冲突保护——单用户本地场景，无并发写入需求 |
| **D6** | React Flow 作为拓扑画布引擎 | 自绘 Canvas / D3.js | React Flow 原生支持 DAG 节点拖拽+连线+自定义节点渲染，社区活跃，与 React 18 兼容；D3 需手写交互层 | bundle 增加约 80KB（gzipped ~25KB）；节点数 > 100 时需虚拟化 |
| **D7** | CodeMirror 6 作为 YAML 编辑器 | Monaco / Ace | CodeMirror 6 bundle 更小（~40KB gzipped），支持 YAML 语法高亮 + lint 插件；Monaco 更适合 TypeScript/JSON 场景 | CodeMirror 6 的 YAML lint 需自行对接 js-yaml 错误格式 |
| **D8** | 编排实例与 Agent 的关系：1:N 外键 | 事件总线解耦 / GraphQL federation | 外键最直接，与既有 ORM 模式一致；编排实例 owner_id 隔离与 auth 体系一致 | Agent 被删除时编排实例引用的 Agent 失效——校验层在 apply 时检查引用完整性 |

---

## 2. 数据流 / 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        前端 (React 18)                                │
│                                                                       │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │YAML 编辑器│  │ 拓扑画布     │  │ 实时状态面板  │  │ 模板市场      │ │
│  │CodeMirror│  │ React Flow  │  │ Recharts     │  │ 选择+填参数   │ │
│  └────┬─────┘  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘ │
│       │              │               │                 │          │
│       ▼              ▼               ▼                 ▼          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              zustand orchestration store                      │  │
│  │   (YAML content / topology state / reconcile status / queue)  │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │ fetch(X-User-Id)                      │
└─────────────────────────────┼──────────────────────────────────────┘
                              │
┌─────────────────────────────┼──────────────────────────────────────┐
│                    后端 (FastAPI)                                    │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              orchestration_api.py                              │  │
│  │  POST /apply  GET /validate  GET /queue  POST /templates      │  │
│  │  GET /{id}    GET /{id}/trace  GET /{id}/metrics              │  │
│  └──────────┬──────────────────┬───────────────────┬────────────┘  │
│             ▼                  ▼                   ▼                │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │ YAML Parser  │  │ Reconcile Loop   │  │ Scheduler        │     │
│  │ yaml_schema  │  │ reconcile_loop   │  │ scheduler.py     │     │
│  │ + PyYAML     │  │ .py(asyncio)     │  │ (PriorityQueue)  │     │
│  │ + jsonschema │  │                  │  │                  │     │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬─────────┘     │
│         │                   │                     │                │
│         ▼                   ▼                     ▼                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  SQLAlchemy ORM (SQLite)                       │  │
│  │  orchestration_instances │ orchestration_templates             │  │
│  │  orchestration_topology_snapshots │ scheduling_queue            │  │
│  │  orchestration_trace_spans                                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                Reconcile Loop (asyncio task)                    │  │
│  │                                                                │  │
│  │  while running:                                                │  │
│  │    for each orchestration_instance:                            │  │
│  │      desired ← topology_snapshot                               │  │
│  │      actual   ← query_agent_status(agent_ids)                  │  │
│  │      diff     ← compare(desired, actual)                       │  │
│  │      if diff:                                                   │  │
│  │        reconcile(diff)  # restart / retry / degrade / alert    │  │
│  │        write_audit(reconcile_action)                           │  │
│  │    await asyncio.sleep(5)                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Agent 执行层（不改动）                             │
│                                                                       │
│  Agent A ──调用──▶ Agent B ──调用──▶ Agent C                         │
│  (LangGraph)      (LangChain)      (LangGraph)                       │
│                                                                       │
│  状态回调: POST /api/agents/{id}/heartbeat  ← reconcile loop 读取    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 关键状态机

### 3.1 编排实例状态

```
              apply
  ┌────────┐ ────→ ┌─────────┐
  │ draft  │       │ pending │
  └────────┘       └────┬────┘
                        │ scheduler 分配
                        ▼
                   ┌─────────┐
                   │ running │ ←────────────────┐
                   └────┬────┘                  │
                        │                       │
              ┌─────────┼──────────┐            │
              ▼         ▼          ▼            │
        ┌─────────┐ ┌────────┐ ┌──────────┐    │
        │ success │ │failed  │ │degraded  │────┘
        └─────────┘ └────────┘ │(部分异常) │  reconcile
                               └──────────┘  自愈后恢复

  过渡状态:
  - converging: 正在渐进式收敛（新增/移除节点中）
  - draining:   节点排空中
```

### 3.2 单个 Agent 节点状态（拓扑画布颜色）

```
  pending ──→ starting ──→ healthy (🟢 绿色)
                │
                ├──→ failed (🔴 红色) ──→ recovering (🟡 黄色) ──→ healthy
                │
                └──→ degraded (🟡 黄色 · 部分功能异常)

  not_started: ⚪ 灰色
  draining:    🟠 橙色
```

### 3.3 调度队列任务状态

```
  queued ──→ scheduled ──→ executing ──→ completed
    │                                     │
    └──→ evicted (被高优先级抢占)          └──→ failed
```

---

## 4. ADR 索引

以下决策不可逆性较高，写入独立 ADR：

- **ADR-001**: `@.specs/adr/001-reconcile-loop-design.md` — asyncio 单进程 reconcile loop 模型
- **ADR-002**: `@.specs/adr/002-yaml-schema-spec.md` — Agent 编排 YAML schema 规范

> 其余决策（调度算法、模板引擎、React Flow 选型）在 DESIGN.md § 1 决策清单中已充分论证，无需独立 ADR。

---

## 5. 风险

| # | 风险 | 影响 | 概率 | 缓解 |
|---|---|---|---|---|
| **R1** | reconcile loop 5 秒周期在大规模编排（>20 实例）时 CPU 打满 | 后端响应变慢，reconcile 延迟 | 中 | 每次 reconcile 批量查询（一次 SQL 拉所有实例状态）；超过 20 实例时周期自动扩大为 10 秒；监控 reconcile 耗时并暴露为 metrics |
| **R2** | YAML schema 与用户实际需求不匹配（字段太多/太复杂） | 用户上手成本高，YAML 编写体验差 | 中 | YAML 编辑器内置 schema 自动补全 + 模板市场提供开箱即用样例；AC-A3 要求错误提示友好 |
| **R3** | 旧 `spec_json` 迁移到 YAML 时数据丢失（边界 case） | 用户已有编排数据损坏 | 低 | 迁移脚本在 apply 前做 dry-run 校验；迁移前自动备份旧数据到 `.specs/backup/orchestration/`；支持手动回滚 |
| **R4** | React Flow 在大拓扑（>50 节点）时渲染性能下降 | 拓扑画布卡顿，拖拽延迟 | 低 | 默认展示折叠的拓扑概览（只显示 Agent 节点类型图标），展开详情时才显示完整连线；50 节点以内不做优化（AC 范围） |
| **R5** | 长期债务：调度器无抢占能力（v1 仅 FIFO+优先级） | 高优先级任务到达时需等待当前执行完成 | 高 | v1 明确接受此限制（单 worker 本地场景）；v2 引入抢占式调度 + 多 worker 池 |

---

## 6. 不在范围

- 不设计分布式 reconcile（多实例选主 / etcd lease）——本地单进程足够
- 不设计多 worker 调度池——v1 单 worker 符合 ≤ 20 并发假设
- 不设计 YAML diff 引擎（`kubectl diff -f` 等价物）——v2 范围
- 不设计模板版本管理——v2 范围
- 不设计编排定时触发（CronJob 等价物）——v2 范围
- 不设计 Agent 内部工作流执行引擎——那是 AgentBuilder/WorkflowDetail 的职责

---

## 9. 架构沉淀建议（本 change 完成后供 `A-evolve` 同步用 · 软约束）

### 9.1 新增的可复用抽象

| 路径 | 能力 | 触发场景 | 复用建议 |
|---|---|---|---|
| `backend/engine/reconcile_loop.py` | 通用 reconcile 框架（observe→diff→reconcile） | 任何需要状态自愈的场景 | 后续其他模块需要状态监控+自动修复时复用此框架 |
| `backend/engine/yaml_schema.py` | YAML schema 校验+解析 | 任何需要声明式配置的模块 | 工具库/工作流/角色如需 YAML 导入导出，复用此校验器 |
| `backend/engine/scheduler.py` | 优先级队列调度器 | 任何需要排队+资源分配的场景 | 后续任务队列（如批量 token 统计）可复用 |

### 9.2 新增项目级技术决策

| 决策 | 取值 | 影响范围 | 推翻代价 |
|---|---|---|---|
| Agent 编排配置格式 | YAML（`apiVersion: ai-platform/v1`） | 所有编排相关的创建/导入/导出 | 改格式需迁移所有已有编排+模板，成本中 |
| 调度策略 | 优先级队列 + 防饥饿（max_wait_time=5min） | 所有编排任务执行顺序 | 改策略仅影响调度器代码，不涉及数据迁移 |
| 模板语法 | Go template `{{ .Values.xxx }}` | 所有编排模板 | 改语法需迁移所有模板内容 |

### 9.3 新增跨模块契约

```
API:
- POST /api/orchestration/apply — 提交/更新编排 YAML
- POST /api/orchestration/validate — YAML 校验（dry-run）
- GET  /api/orchestration/{id} — 编排实例详情+状态
- GET  /api/orchestration/{id}/trace — 调用链追踪
- GET  /api/orchestration/{id}/metrics — 拓扑级监控聚合
- GET  /api/orchestration/queue — 调度队列状态
- POST /api/orchestration/templates — 保存模板
- GET  /api/orchestration/templates — 模板列表（含市场过滤）
- POST /api/orchestration/templates/{id}/deploy — 从模板部署

Schema:
- 表 orchestration_instances: id, owner_id, name, yaml_raw, status, transition_status, created_at, updated_at
- 表 orchestration_topology_snapshots: id, instance_id, yaml_raw, node_count, edge_count, created_at
- 表 orchestration_templates: id, owner_id, name, description, yaml_raw, params_schema, published, created_at
- 表 scheduling_queue: id, instance_id, priority, status, enqueued_at, scheduled_at, max_wait_until
- 表 orchestration_trace_spans: id, instance_id, from_agent_id, to_agent_id, duration_ms, tokens, input_hash, output_hash, timestamp
```

### 9.4 新增依赖

| 包 | 版本 | 用途 | 是否替换既有 |
|---|---|---|---|
| `@xyflow/react` | ^12.x | React Flow 拓扑画布 | 否（新增） |
| `codemirror` + `@codemirror/lang-yaml` | ^6.x | YAML 编辑器 | 否（新增） |
| `js-yaml` | ^4.x | 前端 YAML ↔ JSON 互转 | 否（新增） |
| `PyYAML` | ^6.x | 后端 YAML 解析 | 否（新增） |
| `jsonschema` | ^4.x | 后端 YAML schema 校验 | 否（新增） |

### 9.5 禁动清单变化

```
- 新增禁动：backend/engine/reconcile_loop.py（reconcile 框架核心 · 改了影响所有编排实例自愈行为）
- 新增禁动：backend/engine/yaml_schema.py（YAML schema 定义 · 改了会导致已有编排解析失败）
- 新增禁动：frontend/src/components/OrchestrationCanvas.tsx（拓扑画布核心 · 改了影响所有编排可视化）
```
