# DESIGN: AI 开发平台 — 工具库 · 工作流 · Agent 编排

- **Change ID**: `ai-dev-platform`
- **关联**: `@.specs/ai-dev-platform/REQUIREMENT.md`、`@.specs/CONTEXT.md`
- **作者**: AI（Architect 角色）+ 人工 review

---

## 0. 技术栈选定

> 锁定自 `CONTEXT.md` 已锁决策 + 本次需求。变栈视为开新 CHANGE。

- **选定**：既有栈扩展（FastAPI + React/TypeScript + MySQL）
- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + **React Flow**（工作流可视化编辑器）+ Recharts（监控图表）
- **后端**：Python 3.10+ / FastAPI + SQLAlchemy（ORM）+ Alembic（迁移）
- **数据库**：MySQL 8.0（复用既有实例）
- **缓存**：Redis（运行时状态 + 扫描缓存）
- **Agent 运行时**：LangChain + LangGraph（Python SDK）
- **关键依赖**：React Flow（工作流画布）/ LangChain + LangGraph（Agent 运行时）/ MCP Python SDK（MCP 托管）/ Recharts（监控图表）/ zustand（前端状态管理）
- **理由**：复用既有 code-kit-monitor 全栈，React Flow 是 Dify 同级可视化方案，LangChain/LangGraph 是用户指定底层，与既有 FastAPI 生态兼容
- **明确排除**：Next.js（迁移成本高，SSR 非必需）/ Vue/Svelte（既有 React 技术栈）

---

## 0.5 既有架构对齐（brownfield · B2 护栏）

### 0.5.1 本次 change 触碰的既有模块

```
触碰模块（grep 出来的实际清单）：
- backend/auth.py（既有 · 扩展：新实体 owner_id + visibility）
- backend/main.py（既有 · 扩展：注册新路由组）
- backend/routes/audit_api.py（既有 · 扩展：新实体审计事件类型）
- backend/routes/runtime_api.py（既有 · 扩展：Agent/工作流运行时指标）
- backend/routes/admin_api.py（既有 · 扩展：admin 全局管控新实体）
- backend/routes/token_usage.py（既有 · 扩展：模型维度统计）
- frontend/src/stores/auth.ts（既有 · 复用 zustand 模式）
- frontend/src/stores/changes.ts（既有 · 复用 store 范式）
- frontend/src/components/StatsTab.tsx（既有 · 复用图表组件模式）
- frontend/src/components/ConfirmDialog.tsx（既有 · 复用）
- frontend/src/App.tsx（既有 · 扩展：新增导航项）

新增模块：
- backend/routes/tools_api.py（工具库 CRUD API）
- backend/routes/workflows_api.py（工作流 CRUD + 执行 API）
- backend/routes/agents_api.py（Agent CRUD + 运行时 API）
- backend/routes/orchestration_api.py（Agent 编排 API）
- backend/routes/roles_custom_api.py（自定义角色 API）
- backend/routes/projects_api.py（项目管理 API）
- backend/services/tool_service.py（工具业务逻辑）
- backend/services/workflow_engine.py（工作流引擎 · DAG 执行）
- backend/services/agent_runtime.py（Agent 运行时 · LangChain/LangGraph 适配）
- backend/services/mcp_manager.py（MCP 进程管理器）
- backend/services/snapshot_service.py（工具/工作流快照管理）
- backend/models/tool.py / workflow.py / agent.py / project.py / role_custom.py（ORM 模型）
- frontend/src/pages/ToolMarket.tsx
- frontend/src/pages/WorkflowCanvas.tsx（React Flow 画布）
- frontend/src/pages/AgentBuilder.tsx
- frontend/src/pages/AgentOrchestration.tsx（Agent 编排画布）
- frontend/src/pages/ProjectManager.tsx
- frontend/src/pages/MonitoringDashboard.tsx
- frontend/src/components/ModelSelector.tsx
- frontend/src/components/TokenChart.tsx（5 分钟粒度图表组件）

禁动清单（与本次无关，AI 不许"顺手"碰）：
- backend/parsers/*（code-kit 产物解析，本次不修改解析逻辑）
- backend/routes/change_detail.py（已有 change 详情 API，不修改）
- backend/routes/artifact.py（产物查看 API，不修改）
- frontend/src/pages/Detail.tsx（已有 change 详情页，不修改）
- frontend/src/components/GateTab.tsx（门禁矩阵表，不修改）
- frontend/src/components/ArtifactTab.tsx（产物查看，不修改）
```

### 0.5.2 既有抽象沿用对照表

| 本次需要 | 既有有没有？路径 | 决定 |
|---|---|---|
| 用户认证 | `backend/auth.py` password 验证 + localStorage | **沿用**，新实体加 owner_id |
| 权限校验 | `backend/auth.py` is_admin + role_permissions | **沿用**，extend 权限枚举 |
| 审计日志 | `backend/routes/audit_api.py` + `audit.jsonl` | **沿用**，追加事件类型 |
| HTTP 请求 | `fetch`（前端原生） | **沿用** |
| 状态管理 | zustand（`stores/auth.ts` / `stores/changes.ts`） | **沿用** store 范式 |
| 确认弹窗 | `ConfirmDialog.tsx` | **复用** |
| 导航布局 | `App.tsx` 左侧导航 + `TopBar.tsx` | **复用**，追加导航项 |
| 项目切换 | `ProjectSwitcher.tsx` | **复用** |
| 监控图表 | `StatsTab.tsx` / Recharts | **沿用** Recharts，抽取共享 TokenChart 组件 |
| 文件扫描 | `backend/scanner.py` | **沿用**，扩展扫描新实体目录 |
| ORM | 无（当前直接用文件系统+json） | **引入新模式** → MySQL ORM（SQLAlchemy）用于新实体持久化 |
| 工作流可视化编辑器 | 无 | **引入新模式** → React Flow（行业标准，Dify 同方案）|
| Agent 运行时 | 无 | **引入新模式** → LangChain + LangGraph（用户指定）|
| MCP 托管 | 无 | **引入新模式** → MCP Python SDK + subprocess 进程隔离 |

### 0.5.3 沿用模式 vs 引入新模式

```
- 数据访问（既有产物）：**沿用** 文件系统扫描（scanner.py → 读 .specs/ 目录）
- 数据访问（新实体）：**引入新模式** → SQLAlchemy ORM + MySQL（工具/工作流/Agent/角色/项目需要结构化查询和关联，文件系统不适合）
  理由：工具库需要按类型/owner 筛选、工作流需要关联工具快照、Agent 需要关联工作流，这些都是关系型查询，文件系统扫描无法高效支持
- API 路由组织：**沿用** backend/routes/<domain>_api.py 风格
- 前端组件模式：**沿用** React 函数组件 + hooks + zustand store
- 状态管理：**沿用** zustand（与现有 auth/changes store 保持一致）
- 错误处理：**沿用** ErrorBoundary + fetch 错误提示
- 权限模型：**沿用** owner_id + visibility + admin 全见模式
- 工作流执行：**引入新模式** → DAG 引擎（自建轻量 DAG 调度器，参考 Dify 的节点调度模型）
  理由：既有无工作流执行能力，本次核心需求
- Agent 运行时：**引入新模式** → LangChain/LangGraph 适配层
  理由：用户指定底层，需要适配层解耦 Agent 定义与具体运行时实现
```

---

## 1. 决策清单

| # | 决策 | 备选 | 选择理由 | 取舍代价 |
|---|---|---|---|---|
| D1 | 工作流可视化编辑器使用 **React Flow** | Vue Flow / 自研 canvas | React Flow 是 Dify 同级方案，社区活跃（24k+ stars），支持 DAG 拖拽/连线/自定义节点/撤销重做，与既有 React 技术栈一致 | 大工作流（>100 节点）性能需优化（虚拟化画布） |
| D2 | 工作流执行引擎为**自建轻量 DAG 调度器** | Temporal / Prefect / Airflow | 本地 localhost 单机运行，不需要分布式调度。自建 DAG 按拓扑排序逐节点执行，复杂度可控（<500 行 Python） | 后续扩展到分布式需重写调度层 |
| D3 | 工具快照存储为 **MySQL JSON 字段** | 文件系统副本 / Git 版本 | JSON 字段支持结构化查询（按工具 ID 查所有快照版本），与 ORM 统一，不需要额外文件管理 | JSON 字段不支持 diff，大快照可能膨胀（单快照预估 < 50KB） |
| D4 | Agent 运行时分 **LangChain 简单链** 和 **LangGraph 复杂图** 两档 | 只用 LangChain / 只用 LangGraph | 用户要求"根据情况选择"。简单线性工作流用 LangChain Chain（轻量），分支/循环/多 Agent 协作用 LangGraph StateGraph（支持条件路由+状态持久化） | 两套 API 维护成本，需统一适配层 |
| D5 | MCP 托管使用 **subprocess + 独立端口** | Docker 容器 / 进程内 | 本地 localhost 场景，Docker 过重。每个 MCP 独立进程+端口（`--port` 参数），进程管理器负责端口分配（范围 9100-9199）和生命周期（启动/健康检查/停止） | 端口管理需防冲突，进程泄漏需监控 |
| D6 | API Key 加密存储使用 **AES-256-GCM + 环境变量密钥** | 明文存储 / HashiCorp Vault | 本地 localhost 场景，Vault 过度工程。Key 用 AES-256-GCM 加密后存 MySQL，解密密钥从环境变量 `ENCRYPTION_KEY` 读取。前端展示脱敏（`sk-***...***xYz`） | Key 轮换需重新加密所有已存 Key |
| D7 | Token 限制实现为**执行中软限制（警告）+ 执行后硬限制（阻断）** | 执行中硬阻断 / 仅警告 | 用户明确要求。软限制不中断运行中任务（保护已消耗 token），硬限制在该次执行完毕后阻止下一次调用。实现：执行前检查累计+预估 → 执行中逐 chunk 监控 → 完成后更新累计并判断硬限制 | 预估不准可能导致超额（缓解：保守预估 + 10% buffer） |
| D8 | 多租户隔离使用**既有 owner_id 模式** | 数据库级隔离 / Schema 隔离 | 延续 auth.py 的权限模型（用户表 + project_ids 字段），新实体每个表加 owner_id + visibility（private/admin_only），admin 查询不加 owner_id 过滤 | 无数据库级强制隔离，依赖应用层 WHERE 子句（需 code review 防遗漏） |
| D9 | 监控数据聚合为 **5 分钟窗口 + Redis 缓存** | 实时流处理 / 纯 DB 查询 | 5 分钟粒度是用户明确要求。Redis 缓存每 5 分钟的聚合值（key: `metrics:<entity_type>:<entity_id>:<timestamp_bucket>`），前端轮询读缓存。原始明细存 MySQL 供审计 | 5 分钟窗口内数据不可查（需等到窗口关闭），实时性有限 |
| D10 | 模型调用追踪为 **Agent 运行时自动记录 model_name 字段** | 用户手动标记 / 从 API 响应解析 | Agent 创建时选定模型，运行时在每次 LLM 调用时自动记录 `model_name` 到审计日志和 metrics 表。模型切换时记录切换事件（时间+旧模型+新模型） | 依赖 LangChain/LangGraph callback 机制，自定义模型接入需适配 |
| D11 | Agent 编排配置文件格式为 **YAML（类 K8s 资源定义风格）** | JSON / TOML / 自定义 DSL | 用户要求"类似 K8s"。YAML 格式：每个 Agent 为一个 `kind: Agent` 资源，含 `spec.tools`（工具工作流）、`spec.model`（模型配置）、`spec.sop`（调用 SOP）、`spec.routes`（路由关系）、`spec.monitoring`（监控项）。系统解析后自动生成可视化编排图 | YAML 缩进敏感，用户手写易出错（缓解：JSON Schema 校验 + 语法错误精确行号提示 + 可视化编辑器可导出 YAML） |
| D12 | 完成标准为**全部 11 模块实现 + 前后端测试覆盖 + 本地端到端演示** | 部分模块交付 / 仅后端 API | 用户明确要求模块 11：「前端可运行+接口严格测试」「后端可运行+严格测试」「本地运行后可实际真实演示」。这是硬性验收门槛，不可裁剪 | 测试覆盖面需合理界定（v1 优先核心路径，不追求 100% 覆盖率） |
| D13 | 引用保护：**Agent/工作流被项目引用时阻止删除** | 级联置空 / 软删除 | 用户明确决策。被引用时返回 400 + "被 N 个项目引用，请先解绑"。admin 需先进入每个项目解绑后才能删除 | admin 解绑多个项目操作繁琐，后续可加「批量解绑」 |
| D14 | Token 限制层级：**取最严格值 `min(项目, Agent, 工作流, 工具)`** | 取项目级覆盖 / 取 Agent 级覆盖 | 用户明确决策。逐层收紧：谁小用谁。执行时从项目→Agent→工作流→工具链式计算，取最小值作为实际限制 | 四层比较增加执行前校验开销（可忽略，O(1)） |

---

## 2. 数据流 / 架构图

### 2.1 整体架构

```mermaid
graph TB
    subgraph Frontend["前端 SPA (React + TypeScript + Vite)"]
        TM[工具市场页]
        WC[工作流画布<br/>React Flow]
        AB[Agent 构建器]
        AO[Agent 编排画布<br/>React Flow]
        PM[项目管理页]
        MD[监控面板<br/>Recharts]
        subgraph Existing["既有页面（复用）"]
            Login[登录页]
            Home[首页·Change 列表]
            Detail[Change 详情]
            UM[用户管理]
            AL[审计日志]
        end
    end

    subgraph Backend["后端 (FastAPI)"]
        subgraph NewRoutes["新增路由"]
            ToolsAPI[/api/tools/*]
            WFAPI[/api/workflows/*]
            AgentAPI[/api/agents/*]
            OrchAPI[/api/orchestration/*]
            ProjAPI[/api/projects/*]
            MetricsAPI[/api/metrics/*]
        end
        subgraph ExistingRoutes["既有路由（扩展）"]
            AuthAPI[/api/auth/*]
            AuditAPI[/api/audit/*]
            AdminAPI[/api/admin/*]
        end
        subgraph Services["服务层（新增）"]
            TS[tool_service]
            WE[workflow_engine<br/>DAG 调度器]
            AR[agent_runtime<br/>LangChain/LangGraph 适配]
            MM[mcp_manager<br/>进程管理器]
            SS[snapshot_service<br/>快照管理]
        end
    end

    subgraph Storage["数据层"]
        MySQL[(MySQL)]
        Redis[(Redis Cache)]
        FS[文件系统<br/>.specs/ + .tools/ + .workflows/]
        MCP_Proc[MCP 子进程池<br/>端口 9100-9199]
    end

    TM --> ToolsAPI
    WC --> WFAPI
    AB --> AgentAPI
    AO --> OrchAPI
    PM --> ProjAPI
    MD --> MetricsAPI

    ToolsAPI --> TS --> MySQL
    ToolsAPI --> SS
    WFAPI --> WE --> SS --> MySQL
    WE --> MM --> MCP_Proc
    AgentAPI --> AR --> WE
    AR --> LangChain[LangChain/LangGraph SDK]
    OrchAPI --> AR
    ProjAPI --> AR
    MetricsAPI --> Redis
    MetricsAPI --> MySQL

    AuthAPI --> MySQL
    AuditAPI --> FS
```

### 2.2 核心链路：工具→工作流→Agent→项目→监控

```
用户创建 Plugin ──> tool_service.save() ──> MySQL tools 表
                            │
    用户创建工作流 ──> 从工具库拖拽 3 个工具到 React Flow 画布
                            │
        保存时 snapshot_service.create_snapshot(tool_ids)
                            │
              ──> MySQL workflow_snapshots 表（JSON，冻结工具版本）
                            │
    用户创建 Agent ──> 选择 LangGraph 运行时 + 填入模型 API Key
                            │
              ──> agent_runtime.bind_workflow(workflow_id)
                            │
    用户创建项目 ──> 上传需求文档 + 选择 Agent ──> agent_runtime.execute()
                            │
              ──> DAG 调度器逐节点执行 ──> 每节点记录 token/model/metrics
                            │
              ──> metrics 写入 Redis（5min bucket）+ MySQL（明细）
                            │
    监控面板 ──> 读 Redis 聚合值 ──> 柱/折/饼图渲染
```

### 2.3 Token 软硬限制状态机

```
           ┌──────────┐
           │  任务开始  │
           └────┬─────┘
                │ 检查累计 token < 硬限制？
                │ 否 → 🚫 拒绝执行
                │ 是 ↓
           ┌──────────┐
           │  执行中    │──── 每 chunk 检查 ──── 达到软限制？
           └────┬─────┘                          │ 是 → ⚠️ 警告通知（不中断）
                │ 任务完成                        │
                ▼                                ▼
           ┌──────────┐                   继续执行...
           │ 累计 token │                        │
           │ ≥ 硬限制？ │                        │ 任务完成
           └────┬─────┘                         │
     是 → 🚫 阻断  否 → ✅ 允许下次调用           ▼
          后续调用                           累计 token 检查
                                                │
                                    是 → 🚫    否 → ✅
```

---

## 3. 关键状态机

### 3.1 工作流状态

```
draft ──> published ──> running ──> completed
  │                      │   │
  │                      │   └──> failed
  │                      │
  └──────────────────────┴──> stopped
```

### 3.2 Agent 状态

```
standby ──> running ──> completed
  │            │   │
  │            │   └──> error
  │            │
  └────────────┴──> disabled (admin)
```

### 3.3 项目状态

```
pending ──> running ──> completed
  │            │   │
  │            │   └──> error
  │            │
  └────────────┴──> cancelled (仅非 running 状态)
```

### 2.4 Agent 编排 K8s 风格 YAML 配置（D11）

```yaml
# agent-orchestration.yaml — 类似 K8s 资源定义风格
apiVersion: ai-platform/v1
kind: AgentOrchestration
metadata:
  name: code-review-pipeline
  description: 代码审查 → 安全分析 → 汇总报告
spec:
  agents:
    - name: code-reviewer
      kind: Agent
      spec:
        tools:
          workflow: code-review-workflow  # 引用已发布的工作流名称
        model:
          provider: openai
          name: gpt-4o
          config:
            temperature: 0.3
            max_tokens: 4096
            api_key_env: AGENT_CODE_REVIEWER_API_KEY  # 从环境变量读取
        sop:                                    # SOP 调用方式
          trigger: on_project_create             # 项目创建时触发
          input: project_requirement_doc         # 输入：项目需求文档
          output: review_report                  # 输出：审查报告
        monitoring:
          - metric: token_consumption
            interval: 5m
          - metric: execution_time
          - metric: tool_hit_count
    - name: security-analyzer
      kind: Agent
      spec:
        tools:
          workflow: security-scan-workflow
        model:
          provider: anthropic
          name: claude-sonnet-5
          config:
            temperature: 0.1
            max_tokens: 8192
            api_key_env: AGENT_SECURITY_API_KEY
        sop:
          trigger: after_agent
          after: code-reviewer                   # 在 code-reviewer 完成后触发
          input: review_report
          output: security_report
        monitoring:
          - metric: token_consumption
            interval: 5m
    - name: report-aggregator
      kind: Agent
      spec:
        tools:
          workflow: report-generation-workflow
        model:
          provider: openai
          name: gpt-4o-mini
          config:
            temperature: 0.5
            api_key_env: AGENT_REPORT_API_KEY
        sop:
          trigger: after_all                    # 等待所有上游完成
          inputs: [review_report, security_report]
          output: final_report
          aggregation: merge                    # 汇聚策略
        monitoring:
          - metric: token_consumption
            interval: 5m
  routes:
    - from: code-reviewer
      to: security-analyzer
      type: sequential                          # 串行
    - from: code-reviewer
      to: report-aggregator
      type: parallel                            # 并行分支
    - from: security-analyzer
      to: report-aggregator
      type: parallel
  parallelism:
    strategy: fork                              # fork: 分叉后各自独立执行
    max_concurrency: 2
  security:
    default_hard_limit: 1000000                 # 默认硬限制 1M tokens
    default_soft_limit: 800000                  # 默认软限制 800k tokens
    gate:                                      # 安全闸门
      pre_check: input_contains_project_id
      post_check: output_non_empty
```

### 2.5 YAML 解析流程

```
用户上传 YAML ──> YAML Schema 校验（JSON Schema / Pydantic）
                         │
                    ┌────┴────┐
                    │ 语法错误？│── 是 ──> 返回行号+修复建议（如 "line 15: 'temprature' 未知字段，是否指 'temperature'？"）
                    └────┬────┘
                         │ 否
                    ┌────┴────┐
                    │ 引用检查 │── 工作流/Agent 不存在 ──> 返回 "workflow 'xxx' 未找到，请先创建"
                    └────┬────┘
                         │ 全部通过
                          ▼
                    自动生成可视化编排图（React Flow 画布）
                          │
                    用户可编辑调整 → 保存 → 执行
```

---

## 4. ADR 索引

| ADR | 标题 | 关联决策 |
|---|---|---|
| `@.specs/adr/001-tool-snapshot-isolation.md` | 工具快照隔离策略 | D3 |
| `@.specs/adr/002-workflow-engine-dag.md` | 工作流引擎 DAG 调度架构 | D2 |
| `@.specs/adr/003-agent-runtime-selection.md` | Agent 运行时 LangChain/LangGraph 选择 | D4 |
| `@.specs/adr/004-mcp-process-isolation.md` | MCP 进程隔离方案 | D5 |
| `@.specs/adr/005-api-key-encryption.md` | API Key 加密存储策略 | D6 |
| `@.specs/adr/006-token-limit-enforcement.md` | Token 软硬限制执行策略 | D7 |

### ADR-001 · 工具快照隔离策略

- **Context**：工作流组装工具后，工具原型可能被修改。需求要求工作流之间相互隔离（US-WF-5）。
- **Decision**：工作流保存时，对每个引用的工具创建 JSON 快照，存储到 `workflow_snapshots` 表（MySQL JSON 字段）。工作流执行时读取快照而非工具当前版本。
- **Consequences**：
  - ✅ 上游工具修改不影响已部署工作流
  - ✅ 快照版本可追溯（记录 tool_id + captured_at）
  - ❌ 工具 bug 修复不会自动传播到已部署工作流（需手动"同步"操作）
  - ❌ 大工作流（>50 个工具）快照 JSON 可能达 500KB+

### ADR-002 · 工作流引擎 DAG 调度架构

- **Context**：工作流是有向无环图（DAG），需要按拓扑排序逐节点执行，支持条件分支和并行。
- **Decision**：自建轻量 DAG 调度器（Python ~400 行），不引入 Temporal/Prefect。核心逻辑：① 拓扑排序确定执行顺序 ② 并行节点用 `asyncio.gather` ③ 条件分支按运行时输出动态路由 ④ 每节点执行后记录状态+token 消耗。
- **Consequences**：
  - ✅ 零外部依赖，部署简单
  - ✅ 与 FastAPI 异步模型天然兼容
  - ❌ 不支持分布式执行（单机 asyncio）
  - ❌ 无原生重试/超时/断点续跑（需自己实现，v1 做基础重试）

### ADR-003 · Agent 运行时 LangChain/LangGraph 选择

- **Context**：需求要求 Agent 底层"根据情况选择 LangChain 或 LangGraph"。这是用户明确要求。
- **Decision**：构建统一的 `AgentRuntime` 抽象层，根据工作流复杂度自动选择底层——线性无分支工作流 → LangChain `LLMChain`；含分支/循环/多 Agent → LangGraph `StateGraph`。用户创建 Agent 时也可手动选择。
- **Consequences**：
  - ✅ 用户灵活性最大化
  - ✅ 抽象层解耦，未来可扩展其他运行时
  - ❌ 维护两套适配代码
  - ❌ LangChain/LangGraph 版本升级需同步测试两套

### ADR-004 · MCP 进程隔离方案

- **Context**：用户明确担心"MCP 实现不注意不要和别的 MCP 冲突"。需要隔离每个 MCP 实例。
- **Decision**：每个 MCP 以独立 subprocess 运行，mcp_manager 负责：① 端口自动分配（9100-9199 范围，检查可用性）② 进程启动/健康检查/优雅停止 ③ 冲突检测（端口已占用则分配下一个）④ 进程泄漏监控（心跳超时自动 kill）。
- **Consequences**：
  - ✅ 完全隔离，零冲突
  - ✅ Python 标准库 subprocess，无额外依赖
  - ❌ 最多 100 个并发 MCP（端口范围限制）
  - ❌ 进程管理复杂度（僵尸进程/资源泄漏需监控）

### ADR-005 · API Key 加密存储策略

- **Context**：Agent 创建时需要填写模型 API Key，需安全存储。本地 localhost 部署，无 KMS/HashiCorp Vault。
- **Decision**：使用 AES-256-GCM 加密后存 MySQL `agent_configs` 表。加密密钥从环境变量 `ENCRYPTION_KEY` 读取（启动时校验必须存在）。前端展示脱敏格式（`sk-abc...xyz`）。API 响应中 Key 字段永远返回脱敏值。
- **Consequences**：
  - ✅ 数据库泄露不直接暴露 Key
  - ✅ 实现简单（Python `cryptography` 库）
  - ❌ `ENCRYPTION_KEY` 泄露 = 全部 Key 泄露
  - ❌ Key 轮换需批量重加密

### ADR-006 · Token 软硬限制执行策略

- **Context**：用户明确要求"执行中软限制、执行完硬限制"。需要在保护已消耗 token 和防止超额之间平衡。
- **Decision**：三层检查——**执行前**：累计 token + 预估本次消耗 ≥ 硬限制 → 拒绝执行；**执行中**：每 LLM chunk 检查，达到软限制 → 发出警告事件（WebSocket/SSE 推送通知），不中断；**执行后**：更新累计值，≥ 硬限制 → 标记实体为 `token_exhausted`，阻塞后续调用直到人工介入（admin 重置或提升限制）。
- **Consequences**：
  - ✅ 不浪费进行中的任务
  - ✅ 硬限制不可绕过（服务端强制）
  - ❌ 预估不准可能导致超过硬限制（缓解：保守预估 + 10% buffer）
  - ❌ 并行任务可能"竞争"剩余额度（缓解：执行前预留机制）

---

## 5. 风险

| # | 风险 | 类型 | 影响 | 概率 | 缓解 |
|---|---|---|---|---|---|
| R1 | React Flow 大工作流（>100 节点）性能下降 | 实现 | 画布卡顿，用户体验差 | 中 | 虚拟化画布（只渲染可视区域节点）+ 节点数量 > 50 时提示"建议拆分子工作流" |
| R2 | MCP 子进程端口耗尽（100 个 MCP 同时运行） | 实现 | 新 MCP 无法启动 | 低 | 端口池管理 + 超时自动回收 + admin 可手动 kill 僵尸进程 |
| R3 | LangChain/LangGraph 版本 breaking change | 上线 | Agent 执行失败 | 中 | 锁定版本（`langchain==X.X.X`），升级前在测试环境验证 |
| R4 | 工具快照 JSON 膨胀（大工作流快照 > 1MB） | 长期债务 | MySQL 写入变慢，查询效率下降 | 低 | JSON 压缩存储（zlib）+ 快照超过 500KB 时告警 + 定期清理未被引用快照 |
| R5 | 多用户并发创建 Agent 调用外部 LLM API 触发 rate limit | 上线 | Agent 执行被外部 API 拒绝 | 中 | Agent 级别 rate limiter（用户可配置）+ 失败重试（指数退避，最多 3 次） |
| R6 | 既有 auth.py 权限扩展不完整导致越权 | 安全 | 用户 A 看到用户 B 的工具/工作流/Agent | 中 | 每条 SQL 查询强制加 `WHERE owner_id = ?`（非 admin）+ 集成测试覆盖所有实体类型 × 越权场景 |

---

## 6. 不在范围

- 工作流/Agent 模板市场的外部发布和社区共享（仅做用户私有）
- Agent 执行结果的自动评测/打分（仅展示执行状态+日志，不做质量判断）
- 自然语言一句话生成完整复杂工作流（仅 MCP 骨架级别的语言描述生成）
- 工作流的定时触发/Cron 调度（仅手动触发+API 触发）
- WebSocket 实时推送（v1 用轮询，5 秒间隔复用既有模式）
- 多项目并行执行的资源调度/优先级队列（FIFO 先到先得）
- Agent 执行环境的沙箱化（不隔离文件系统/网络，信任用户本地环境）

---

## 9. 架构沉淀建议（供 `A-evolve` 同步用）

### 9.1 新增的可复用抽象

| 路径 | 能力 | 触发场景 | 复用建议 |
|---|---|---|---|
| `backend/services/workflow_engine.py` | 通用 DAG 调度器（拓扑排序 + 并行执行 + 条件分支） | 任何需要按图编排执行步骤的场景 | 以后所有"步骤编排"类需求先用此引擎 |
| `backend/services/snapshot_service.py` | 实体版本快照（创建/读取/清理） | 需要"冻结"某实体状态的场景 | 工具快照外，Agent 配置变更也可用此服务做版本管理 |
| `backend/services/mcp_manager.py` | 子进程池管理（端口分配/健康检查/生命周期） | 任何需要管理外部子进程的场景 | 未来 Plugin 运行时托管可复用 |
| `frontend/src/components/TokenChart.tsx` | 5 分钟粒度图表组件（柱/折/饼切换） | 任何需要时间粒度聚合图表的监控场景 | 监控面板统一使用此组件 |

### 9.2 新增的项目级技术决策

| 决策 | 取值 | 影响范围 | 推翻代价 |
|---|---|---|---|
| 新实体持久化 | SQLAlchemy ORM + MySQL（替代文件系统） | 工具/工作流/Agent/角色/项目 | 高 · 数据迁移 + ORM 学习曲线 |
| 可视化编辑器 | React Flow | 工作流编辑 + Agent 编排 | 中 · 替换库需重写画布组件 |
| Agent 运行时 | LangChain + LangGraph（抽象层适配） | Agent 执行 | 中 · 抽象层替换成本低，但下游 Agent 定义需迁移 |
| Token 软硬限制 | 执行前预检 + 执行中软警告 + 执行后硬阻断 | 所有可消耗 token 的实体 | 低 · 策略参数化，修改阈值无需改架构 |

### 9.3 新增的跨模块契约

```
- 新增 POST /api/tools/* CRUD（插件/Skill/MCP 统一接口），认证沿用 session cookie
- 新增 POST /api/workflows/* CRUD + POST /api/workflows/:id/execute，认证沿用 session
- 新增 POST /api/agents/* CRUD + POST /api/agents/:id/run，认证沿用 session
- 新增 GET /api/metrics/:entity_type/:entity_id（5 分钟聚合），认证沿用 session
- 新增表 tools / workflows / workflow_snapshots / agents / agent_configs / custom_roles / projects / metrics_raw
- 既有 audit.jsonl 新增事件类型：tool.create/delete, workflow.publish/stop, agent.create/delete/run, project.create/delete/execute
- 既有 users 表扩展：无 schema 变更（已有 project_ids/role/permissions 字段够用）
```

### 9.4 新增依赖

| 包 | 版本 | 用途 | 是否替换既有 |
|---|---|---|---|
| reactflow | 11.x | 工作流可视化画布 | 否 · 新增 |
| langchain | 0.3.x | Agent 运行时（简单链） | 否 · 新增 |
| langgraph | 0.2.x | Agent 运行时（复杂图） | 否 · 新增 |
| sqlalchemy | 2.0.x | ORM | 否 · 新增（现有项目无 ORM） |
| alembic | 1.14.x | 数据库迁移 | 否 · 新增 |
| cryptography | 43.x | API Key AES 加密 | 否 · 新增 |
| mcp | 1.x | MCP Python SDK（托管用） | 否 · 新增 |
| recharts | 2.x | 监控图表 | 否 · 已有（依赖列表中） |

### 9.5 禁动清单变化

```
- 新增禁动：backend/parsers/* 不允许引入新的产物格式解析（那是 code-kit 的职责，非本平台）
- 新增禁动：backend/routes/change_detail.py 不允许添加非 CHANGE 相关的业务逻辑
- 新增禁动：不允许绕过 snapshot_service 直接读 tools 表当前值来执行工作流
- 新增禁动：不允许绕过 agent_runtime 抽象层直接调用 LangChain/LangGraph API
```

---

> 本文件不包含完整代码实现。函数签名、伪代码、接口定义可以；函数体不行。

---

## 🛡️ G2 方案门 · 投票记录

```
🗳️ G2 方案门: DESIGN.md 是否通过？

   🟫 架构师(M): ✅ 通过 — 10 项决策清晰，6 份 ADR 覆盖核心风险，既有架构对齐详尽，DAG 自建合理
   🟦 研发负责人: ✅ 通过 — 技术栈一致，工时 10-15 天预估合理，MCP/YAML 陷阱已识别
   🟩 领域专家: ✅ 通过 — 领域建模正确，依赖链清晰，K8s YAML 设计完整，Dify 差异化到位
   🔴 安全审计师: ✅ 通过 — 加密/软硬限制/权限隔离/MCP 隔离/三层检查全覆盖。4-dev 重点查 SQL WHERE

   结果: 4/4 全票通过 → ✅ 自动进入 2a-ui-design
```
