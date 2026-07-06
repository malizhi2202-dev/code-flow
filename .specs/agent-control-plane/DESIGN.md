# DESIGN: Agent 管控面

- **Change ID**: `agent-control-plane`
- **关联**: `@.specs/agent-control-plane/REQUIREMENT.md`、`@.specs/CONTEXT.md`
- **作者**: AI（Architect 角色）+ 人工 review

---

## 0. 技术栈选定

> 复用项目既有技术栈（来自 CONTEXT.md 已锁决策），无新增依赖。

- **选定**：React 18 + FastAPI + SQLAlchemy（项目既有栈）
- **前端**：React 18.3 / TypeScript 5.5 / Tailwind 3.4 / Zustand 4.5 / Lucide React
- **后端**：FastAPI 0.110+ / SQLAlchemy 2.0 / SQLite
- **数据库**：SQLite（默认，零配置）
- **部署**：本地 localhost
- **关键依赖**：复用现有 Zustand（store 范式）、Recharts（探针时间线图表）、Lucide（状态图标）
- **理由**：新模块是既有项目的追加，不是独立部署。全栈复用现有技术栈，零新依赖引入。
- **明确排除**：不引入 Redis（v1 单实例部署，SQLite + 内存缓存够用）；不引入 WebSocket（探针刷新用短轮询 3 秒 GET 即可）

---

## 0.5 既有架构对齐（brownfield）

### 0.5.1 本次 change 触碰的既有模块

```
触碰模块（读/增强，不破坏接口）：
- backend/models/agent.py（Agent ORM 模型 · 只读 Agent 列表）
- backend/services/runtime_watcher.py（文件系统扫描 · 读取 runtime.jsonl）
- backend/engine/reconcile_loop.py（增强 diff/修复逻辑 · 不换接口）
- backend/engine/scheduler.py（PriorityQueue · 扩展用于 Agent 调度）
- frontend/src/App.tsx（NAV 数组 · 新增一个入口）
- backend/routes/metrics_api.py（复用指标查询模式）

新增模块：
- backend/routes/control_plane_api.py（管控面 API）
- backend/services/agent_probe_service.py（探针服务）
- backend/services/scheduler_service.py（调度服务）
- frontend/src/pages/AgentControlPlane.tsx（管控面主页）
- frontend/src/components/AgentProbePanel.tsx（探针面板）
- frontend/src/components/SchedulerConfig.tsx（调度配置）
- frontend/src/components/ReconcileConsole.tsx（Reconcile 控制台）
- frontend/src/stores/controlPlane.ts（管控面 Zustand store）

禁动清单（和本次无关，AI 不许碰）：
- backend/routes/orchestration_api.py（编排 API）
- frontend/src/pages/OrchestrationPage.tsx（编排画布）
- frontend/src/components/OrchestrationCanvas.tsx（拓扑画布）
- frontend/src/lib/orchestration-sync.ts（YAML↔画布同步）
- backend/auth.py（认证系统）
- frontend/src/stores/*.ts（现有 9 个 store，不修改任何一个）
```

### 0.5.2 既有抽象沿用对照表

| 本次需要 | 既有有没有？路径 | 决定 |
|---|---|---|
| HTTP 客户端（前端） | `window.fetch` 全局拦截器（`main.tsx:9`） | 沿用 |
| HTTP 路由（后端） | FastAPI `APIRouter` 模式（`routes/*.py`） | 沿用 |
| 状态管理 | Zustand `create<State>`（`stores/*.ts`） | 沿用，新建 `controlPlane.ts` |
| 数据库访问 | SQLAlchemy `DeclarativeBase` + `get_db()` 依赖注入 | 沿用 |
| 认证注入 | `X-User-Id` header 自动注入 | 沿用 |
| 审计日志 | `backend/routes/audit_api.py` 格式 | 沿用，新事件追加 |
| 权限控制 | RBAC（`rolePermissions` + `isAdmin`） | 沿用，新增 `agent:control` 权限位 |
| 探针时间线图表 | Recharts 2.15（`package.json`） | 沿用 |
| Agent 状态刷新 | 没有长连接/WebSocket | 新建 3 秒短轮询（理由：项目无 WebSocket 基础设施，v1 轮询够用） |

### 0.5.3 沿用模式 vs 引入新模式

```
- API 路由组织：**沿用** backend/routes/<entity>_api.py 模式
- Store 范式：**沿用** Zustand `create<State>((set, get) => ({...}))` 模式
- 组件结构：**沿用** pages/ 放页面 + components/ 放可复用组件
- 错误处理：**沿用** FastAPI HTTPException + React ErrorBoundary
- 探针采集：**引入新模式** → 后台异步任务（`asyncio.create_task`），独立于请求线程，理由：探针需要定时循环拉取，不阻塞 API 响应
```

---

## 1. 决策清单

| # | 决策 | 备选 | 选择理由 | 取舍代价 |
|---|---|---|---|---|
| D1 | 探针 Pull 模式（管控面主动 GET `/health`） | Push 模式（Agent 主动上报） | 管控面控制节奏；Agent 无需知道管控面地址；安全性更可控 | 管控面是探针采集瓶颈（v1 Agent < 100 够用） |
| D2 | 探针刷新 3 秒短轮询 | WebSocket 长连接 | 项目无 WebSocket 基础设施；3 秒延迟可接受；实现简单 | 100 个 Agent × 3 秒 = ~33 req/s，后端能扛 |
| D3 | 负载均衡 Least Connection（选 current_load / max_concurrency 最小） | Round Robin / Random | 任务耗时差异大时 Least Connection 最优；和 K8s 默认一致 | O(n) 扫描所有候选 Agent（n < 100 无影响） |
| D4 | Agent 能力标签由 admin 手动配置（不可自报） | Agent 启动时自报 / Workflow 自动派生 | 安全考量：Agent 自报能力可能谎报；admin 配置可审计 | 需要 admin 额外操作，自动化程度降低 |
| D5 | Reconcile 修复分三级 safe/caution/dangerous | 全自动 / 全手动 | safe 自动减少人工介入；dangerous 强制人工防止误删 | 分级逻辑增加代码复杂度 |
| D6 | 新模块独立 store `controlPlane.ts`，不修改现有 stores | 扩展现有 `agents.ts` store | 符合"不动旧代码"约束；管控面状态模型独立（探针+调度+reconcile） | store 总数从 9 → 10，但隔离性好 |
| D7 | Reconcile Loop 事件驱动（监听探针变化 + runtime.jsonl 写入） | 定时全量扫描 | 事件驱动性能好；只在状态变化时触发 reconcile | 需要建立事件监听管道 |
| D8 | agent_probes 数据保留 7 天自动清理 | 永久保留 / 不保留 | 平衡存储成本和历史回溯需求；7 天覆盖大多数排障场景 | 超过 7 天的历史趋势分析需要额外归档方案 |

---

## 2. 数据流 / 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     Agent 管控面 (前端)                          │
│                                                                 │
│  ┌────────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ AgentProbePanel │  │SchedulerConfig│  │ ReconcileConsole  │  │
│  │ (探针状态列表)   │  │ (调度策略配置) │  │ (漂移修复日志)     │  │
│  └───────┬────────┘  └──────┬───────┘  └────────┬──────────┘  │
│          │                  │                    │              │
│          └──────────────────┼────────────────────┘              │
│                             │                                    │
│               controlPlane.ts (Zustand store)                    │
│                             │                                    │
│                  fetch() × X-User-Id                             │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                GET /api/control-plane/*
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                  FastAPI (:8000)                                 │
│                                                                 │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │  control_plane_api.py                                    │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ GET /probes  │  │ PUT /schedule │  │ GET /reconcile │  │   │
│  │  │ (Agent状态)  │  │ (调度配置)     │  │ (修复日志)      │  │   │
│  │  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │   │
│  └─────────┼────────────────┼──────────────────┼───────────┘   │
│            │                │                  │                │
│  ┌─────────┼────────────────┼──────────────────┼───────────┐   │
│  │         ▼                ▼                  ▼            │   │
│  │  agent_probe_service  scheduler_service  reconcile_loop │   │
│  │  ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐ │   │
│  │  │ Pull /health     │ │ Least Conn   │ │ observe→diff  │ │   │
│  │  │ 每 3 秒循环        │ │ 标签匹配      │ │ →reconcile   │ │   │
│  │  │ 超时 5s/失败阈值3  │ │ 满负载排队    │ │ 三级修复      │ │   │
│  │  └────────┬────────┘ └──────┬───────┘ └──────┬───────┘ │   │
│  └───────────┼─────────────────┼─────────────────┼─────────┘   │
│              │                 │                 │              │
│     ┌────────┴────────┐ ┌──────┴──────┐ ┌───────┴───────┐      │
│     │ agent_probes     │ │scheduler_q  │ │  audit log    │      │
│     │ (SQLite 表)      │ │ (SQLite表)  │ │ (现有)         │      │
│     └─────────────────┘ └─────────────┘ └───────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### 探针数据流细节

```
agent_probe_service (后台 asyncio task)
  │
  │ 每 3 秒循环
  ▼
  ├─→ 从 Agent 表取所有 active Agent 列表
  │
  ├─→ 逐个 HTTP GET <agent_host>/health（超时 5s）
  │     Agent 返回: { "status": "healthy", "capabilities": ["code-review"],
  │                   "load": {"current": 2, "max": 5}, "dependencies": [...] }
  │
  ├─→ 对比上次状态：
  │     - 状态相同 → 仅更新 last_heartbeat
  │     - 状态变化 → 写入 agent_probes 表 + 触发 Reconcile 检查
  │
  ├─→ 连续失败 ≥ 3 次 → 标记 DEAD → 触发 Reconcile
  │
  └─→ 每晚清理 7 天前数据
```

---

## 3. 关键状态机

### Agent 状态机

```
                    ┌─────────┐
         任务完成    │  IDLE   │◄───────────────┐
        ┌─────────► │ (空闲)   │                  │
        │            └────┬────┘                  │
        │                 │ 收到任务               │
        │                 ▼                        │
        │            ┌─────────┐    依赖恢复       │
        │            │ RUNNING │◄──────────┐       │
        │            │ (运行中)  │           │       │
        │            └──┬───┬──┘           │       │
        │               │   │              │       │
        │    任务完成    │   │ 依赖等不到    │       │
        │               │   ▼              │       │
        │               │ ┌─────────┐      │       │
        │               │ │ BLOCKED │──────┘       │
        │               │ │ (阻塞)   │              │
        │               │ └────┬────┘              │
        │               │      │ 超时               │
        │               │      ▼                    │
        │               │ ┌─────────┐               │
        │               │ │ FAILED  │               │
        │               │ │ (失败)   │               │
        │               │ └─────────┘               │
        │               │                           │
        │    心跳丢失    │                           │
        └───────────────┼───────────────────────────┘
                        ▼
                   ┌─────────┐
                   │  DEAD   │───(重建)──→ IDLE
                   │ (死亡)   │
                   └─────────┘
```

### Reconcile 修复分级

| 级别 | 触发条件 | 动作 | 人工确认 |
|---|---|---|---|
| **safe** | Agent 心跳连续失败 3 次 | 尝试重启 Agent 进程 | 自动 |
| **caution** | Agent 负载持续 > 90% 超 5 分钟 | 重新调度该 Agent 上的等待任务 | 通知后自动 |
| **dangerous** | Agent 连续 3 次 `caution` 修复失败 | 删除 Agent 实例 + 创建新实例 | **必须人工确认** |

---

## 4. ADR 索引

本 change 引入的技术决策均为局部决策，不改变项目级架构方向。以下为关键决策记录：

- `@.specs/agent-control-plane/adr/agent-probe-pull.md`：探针 Pull 模式决策
- `@.specs/agent-control-plane/adr/reconcile-tiered-repair.md`：Reconcile 三级修复分级决策

---

## 5. 风险

| # | 风险 | 影响 | 概率 | 缓解 |
|---|---|---|---|---|
| R1 | 探针 Pull 3 秒 × 100 Agent = 33 req/s，后端性能瓶颈 | 探针数据延迟 | 中 | 探针采集走独立 asyncio task，不阻塞 API 线程；100 Agent 以上切批量拉取 |
| R2 | Reconcile Loop 误判漂移→自动 safe 修复→修复失败→再修复的死循环 | Agent 反复重启 | 中 | 连续失败 3 次自动暂停 + 报警；修复动作带指数退避（1s/2s/4s/8s） |
| R3 | Agent `/health` 端点未标准化，各适配器返回格式不一致 | 探针采集失败 | 高 | DESIGN 阶段定义标准 `/health` 响应 JSON schema；各适配器必须实现 |
| R4 | 探针失败原因写入 agent_probes 表时含 API key 明文（如 401 错误响应体含 sk-xxx） | 凭据泄露 | 中 | 写入前强制正则脱敏 `sk-[a-zA-Z0-9]+` → `sk-***`；单元测试覆盖脱敏逻辑 |
| R5 | 级联效应：Agent A 依赖 Agent B，B 被标记 DEAD → Reconcile 重建 B → 期间 A 超时 BLOCKED → A 也被标记 | 级联故障 | 低 | Reconcile 拓扑感知：修复 B 前先暂停依赖 B 的 Agent 等待，B 恢复后通知 |
| R6 | 管控面 UI 和现有编排画布风格不一致 | 用户体验割裂 | 低 | 复用现有 Tailwind + Tremor 组件库 + CSS variables，走 2a-ui-design 统一视觉 |

---

## 6. 不在范围

- 语义匹配路由（embedding + 向量搜索），v2 考虑
- Startup Probe（Agent 初始化检测）
- 多后端实例的 Agent Registry 一致性（当前单实例够用）
- 跨网络部署的 Agent token 认证（当前内网 IP 白名单）
- WebSocket 长连接推送（v1 用轮询）

---

## 9. 架构沉淀建议

### 9.1 新增的可复用抽象

| 路径 | 能力 | 触发场景 | 复用建议 |
|---|---|---|---|
| `backend/services/agent_probe_service.py` | Agent 健康检查 Pull 采集器 | 任何需要 Agent 状态监控的场景 | 后续 M-health 巡检可直接复用探针数据 |
| `backend/services/scheduler_service.py` | 标签匹配 + 负载均衡分发器 | 多 Agent 任务分配 | 现有编排引擎执行任务时可替代手动指定 |

### 9.2 新增的项目级技术决策

| 决策 | 取值 | 影响范围 | 推翻代价 |
|---|---|---|---|
| Agent 探针统一协议 | HTTP GET `/health` → `{status, capabilities, load, dependencies}` | 所有 Agent 适配器 | 中：需同步修改各适配器 |
| 调度负载均衡算法 | Least Connection | 多 Agent 任务分发 | 低：可切换为 Round Robin |
| Reconcile 修复分级 | safe/caution/dangerous 三级 | Reconcile Loop | 低：可调整阈值 |

### 9.3 新增的跨模块契约

```
- 新增 GET /api/control-plane/probes → {agents: [{id, status, load, ...}]}
- 新增 PUT /api/control-plane/schedule → {agent_id, tags, priority, concurrency}
- 新增 POST /api/control-plane/agent/:id/restart → 手动重启 Agent
- 新增 GET /api/control-plane/reconcile → [{timestamp, drift_type, action, result}]
- Agent /health 端点标准格式：{status: "healthy"|"degraded"|"unhealthy", capabilities: string[], load: {current: int, max: int}, dependencies: [{agent_id, status}]}
- 新增 agent_probes 表：(id, agent_id, probe_type, status, detail, created_at)
- 新增 scheduler_queue 表：(id, task_id, agent_id, priority, score, status, created_at)
```

### 9.4 新增的依赖

本 change 无新增外部依赖，全部复用既有技术栈。

### 9.5 禁动清单变化

```
- 新增禁动：backend/engine/reconcile_loop.py（修改需开新 CHANGE，本 change 只增强内部逻辑不换接口）
- 新增禁动：backend/engine/scheduler.py（PriorityQueue 接口不改，只新增调用方）
```

---

## 10. 探针数据采集架构（五轮专家共识 · 2026-07-06）

> v1 设计中探针采用 HTTP Pull 模式（主动 GET `/health`），但实际部署中所有 Agent 均未配置 health_url，
> 导致 17 个 Agent 全部显示 skipped。经五轮专家讨论，确定以下被动收集方案。

### 10.1 核心思路：双插入点，全模块覆盖

当前项目包含 7 个业务模块（Agent/Workflow/Tool/Orchestration/Chat/Project + code-kit），
112 个 API 端点。RuntimeTracer 仅覆盖 3 条 LLM 调用路径，70+ CRUD 路径未覆盖。

**发现**：所有 70+ CRUD 操作都经过 `log_audit()`（`services/audit_service.py`），
所有 LLM 执行都经过 `trace_model_call()`（`services/runtime_tracer.py`）。
这两个函数是天然的插入点。

```
log_audit()         → CRUD 事件（创建/更新/删除/状态变更）→ agent_probes 表
trace_model_call()  → 执行事件（LLM 调用/性能/Token）    → metrics_raw + agent_probes 表
```

### 10.2 插入点设计

| 插入点 | 文件 | 改动 |
|---|---|---|
| `_notify_activity()` | `services/agent_probe_service.py` | 新增函数，接收事件写入探针表 |
| hook 调用 (CRUD) | `services/audit_service.py` — `log_audit()` 末尾 | 加 2 行 |
| hook 调用 (执行) | `services/runtime_tracer.py` — `trace_model_call()` db.commit() 前 | 加 2 行 |
| API 过滤 | `routes/control_plane_api.py` | 支持 `?entity_type=agent\|workflow\|tool\|project` |

### 10.3 各模块健康模型

| 模块 | 健康判定 | 降级 | 异常 |
|---|---|---|---|
| Agent | 最近 5min 有成功调用 | 成功率 < 80% | 连续 10 次失败 |
| Workflow | 所有节点最近有成功 | 某节点失败率 > 20% | 某节点连续失败 |
| Tool | 最近被成功调用 | 失败率升高 | 连续 3 次失败 |
| Orchestration | 期望 Agent = 实际健康 | 1 个 Agent 漂移 | 多个漂移 |
| Chat | 消息有回复 | 响应超时频繁 | 连续无回复 |
| Project | 关联 Agent 全部健康 | 部分降级 | 关联 Agent 挂 |
| code-kit | runtime.jsonl 有活动 | — | 文件损坏/中断 |

### 10.4 被动收集 vs 主动探测

```
优先级 1（默认，零配置）：从 log_audit + trace_model_call 被动收集
  → Agent 有运行记录 → 标记健康
  → 无记录 → 标记未知

优先级 2（可选，用户主动配）：Agent 配置 health_url → HTTP Pull 主动探测
  → 更精确的心跳数据
```

### 10.5 实现约束

- 写入异步化（内存队列），不阻塞 log_audit/tracer 主流程
- entity_type 白名单校验（agent/workflow/tool/project/chat）
- owner_id 从调用方传入（已鉴权），不新增权限风险
- 初始化从全量表加载（覆盖从未运行的实体）
- 不修改 Agent 表结构、不修改用户配置流程

### 10.6 改动清单

| 文件 | 行数 | 说明 |
|---|---|---|
| `services/agent_probe_service.py` | +30 | `_notify_activity()` + 内存队列 |
| `services/audit_service.py` | +2 | `log_audit()` 末尾调 hook |
| `services/runtime_tracer.py` | +2 | `trace_model_call()` db.commit() 前调 hook |
| `routes/control_plane_api.py` | +10 | `?entity_type=` 过滤参数 |

**总计：3 个文件，约 40 行新增，不动任何现有接口。**


---

## 11. K8s 架构思想映射 · Agent 管控平台演进（四轮专家共识 · 2026-07-06）

> 本段记录 K8s 六个核心设计范式在 Agent 世界中的等价映射方案。
> 不是照搬 K8s 部署架构，而是借鉴其**分层管控、声明式状态、自动修复、弹性伸缩**思想。

### 11.1 K8s → Agent 概念映射

| K8s 概念 | K8s 做什么 | Agent 世界等价物 | 落地状态 |
|---|---|---|---|
| **Node** | 物理/虚拟机器，运行 kubelet | Agent 实例 + 宿主机资源 | Agent 表已有 |
| **Pod** | 容器组，共享网络/存储 | Gateway/同 capability Agent 组 | 需新增 |
| **Deployment** | 期望副本数管理，滚动更新 | 管控模块：启停 + 渐进式扩容 | Reconcile Loop 有架子 |
| **Scheduler** | Filter + Score → 选最优 Node | 标签匹配 + Least Connection → 选最优 Agent | `scheduler_service` 已有 |
| **Service/Ingress** | 服务发现 + 负载均衡 + 流量入口 | 网关 Agent + 语义路由 | 需新增 |
| **etcd** | 集群状态存储，Watch 机制 | `agent_memories` + `agent_probes` 表 | 已有 |
| **HPA** | CPU > 80% → 自动加 Pod | Token 耗尽/排队 > N → 渐进式扩容 | 需新增 |

### 11.2 分层监控模型

```
机器层 → Gateway 层 → Agent 层 → Skill 层 → 模型层
 CPU%     Token总量    Token/并发   耗时/成功率   API latency
 内存     并发Agent数  任务队列深度  被调用次数    rate limit
 网络IO   路由命中率   平均耗时                    key 有效期
```

| 层 | 数据源 | 现有 |
|---|---|---|
| 机器层（CPU/内存/网络） | `psutil`（需新增） | ❌ |
| Gateway 层（Token 总量/并发数） | 网关自身计数（需新增） | ❌ |
| Agent 层（Token/并发/耗时） | `session_metrics` + `metrics_raw` | ✅ |
| Skill 层（耗时/成功率） | `trace_tool_call` | ✅ |
| 模型层（API latency/rate limit） | LLM API 响应头（需新增） | ❌ |

### 11.3 架构演进路线

| 阶段 | 内容 | 依赖 |
|---|---|---|
| **第一波**（本周） | 服务发现 + 内部状态表 + 调度器增强 | 现有代码 80% |
| **第二波**（下周） | 网关 Agent（标签路由 + 转发）+ 全栈监控 | 第一波 |
| **第三波**（下月） | 弹性伸缩（渐进式扩容 + 副本管理） | 第二波 + 记忆系统 |

### 11.4 记忆系统设计（Agent 状态一致性）

> 问题：弹性伸缩时新 Agent 副本如何获得已有 Agent 的上下文？

**方案**：共享内存模式，复用现有 `agent_memories` 表。

```
Agent A 执行完 → 写记忆: {key:"auth.py:review", value:"L42 SQL注入", type:"decision"}
新 Agent B 启动  → 读记忆: 同 owner_id + 同 capability + 最近 N 条
                 → 状态对齐
```

| 共享（读） | 不共享（隔离） |
|---|---|
| 审查结论、项目上下文、代码缓存 | 对话历史、API key、用户身份 |
| 能力标签 | Token 配额 |

| 操作 | 权限 |
|---|---|
| 读同 capability 记忆 | 自动（限于同 owner_id） |
| 写执行结论 | Agent 执行完成后自动 |
| 人工修正/删除 | admin |
| 跨 capability 读 | ❌ 禁止 |

### 11.5 网关安全模型

| 安全层 | Agent 网关 |
|---|---|
| 认证 | `X-User-Id` header（沿用） |
| 授权 | 用户只能路由到自己的 Agent |
| 限流 | 网关层限流 |
| 审计 | `log_audit` 记录每次路由 |
| 加密 | API key 已加密 |

**网关红线**：不读任务内容、不缓存响应、不改写内容。

### 11.6 弹性伸缩 = 渐进式扩容

Agent 有状态（上下文/缓存），不能像 K8s Pod 无状态复制。

```
触发条件: 同 capability Agent 排队长 > N
动作:     创建新 Agent 副本
策略:     新任务 → 新副本；旧任务在原 Agent 完成
区别:     类似 StatefulSet，非 Deployment
```

### 11.7 实施入口

下次会话入口：`@code-kit/GO.md` →「继续 agent-control-plane，实施 11.1-11.6 架构演进」

---

## 12. 隔离域（Domain）设计 · 2026-07-06

> K8s 的 Namespace 不是「一个应用」，而是「一个逻辑隔离边界」。
> Agent 管控引入相同概念：**Domain（隔离域）**。

### 12.1 概念层级

```
全局管控面
  └─ 隔离域 A（团队/环境/客户）
  │    ├─ Agent 组（同 capability）
  │    │    └─ 单 Agent 实例
  │    ├─ 域内路由规则
  │    └─ 域内共享配置/记忆
  │
  └─ 隔离域 B
       └─ ...
```

业务项目（code-kit-monitor、ai-dev-platform 等）在域内自由绑定 Agent 和 Workflow。

### 12.2 隔离规则

| 规则 | 说明 |
|---|---|
| 同域内 Agent 自动互相发现 | 按 capability 标签匹配 |
| 同域内自动路由 | 负载均衡到同 capability 最空闲 Agent |
| 跨域默认隔离 | 不可见，不可调用 |
| 跨域调用需显式配置 | 类似 K8s NetworkPolicy |

### 12.3 每个域内的完整能力闭环

- ✅ Agent 可伸缩（创建/停用/销毁）
- ✅ 记忆系统保持状态（etcd 等价）
- ✅ 同域内自动服务发现
- ✅ 调度器按策略选择最空闲 Agent
- ✅ 负载均衡可视化
- ✅ Reconcile Loop 自愈重启
- ✅ 分层监控
- ✅ 跨域隔离、域内互通

### 12.4 前端递进式 UI

```
📊 管控面总览
  ├─ 跨域概览卡片
  │
  └─ 📁 隔离域列表
       └─ 点击进入某个域
            ├─ 🤖 Agent 组（按 capability 分，可折叠）
            │    └─ 展开 → Agent 实例列表
            │         └─ 点击 → 探针详情 + Skill 耗时
            ├─ 🔀 域内路由规则
            └─ ⚙️ 调度策略


---

## 13. 三波实施方案（架构门共识 · 2026-07-06）

> 后端骨架在但每个能力有缺口，分三波渐进落地。

### 13.1 第一波：隔离域（Domain）

只做域的概念落地——Agent 按域分组，域间互不可见。

```
新增: domains 表 (id, name, owner_id)
改造: agents 表加 domain_id 字段
改造: 管控面 API 加 ?domain_id= 过滤
改造: 前端按 domain 分层展示
```

### 13.2 第二波：域内自动化

```
新增: Agent 注册时自动分配 domain
改造: 调度器接入探针状态 → 选最空闲 Agent
改造: Reconcile Loop 接入自动重启 (探针→Reconcile→重启)
新增: 前端负载均衡面板（同 capability Agent 的负载可视化）
```

### 13.3 第三波：弹性伸缩 + 记忆 + 全栈监控

```
新增: 渐进式扩容（排队超阈值 → 自动创建副本）
改造: agent_memories 接入 Agent 启动流程（启动时加载同域记忆）
新增: psutil 机器层采集
新增: 模型 API rate limit 采集
```

### 13.4 待决定的设计点

| 决策点 | 选项 |
|---|---|
| Agent 归属域 | A:手动选 / B:继承创建者默认域 / C:按 capability 自动匹配 |
| 域层级 | v1 平级 / v2 父子关系 |
| 域内记忆 | 全共享 / 按 capability 隔离 |
| 跨域调用 | 需显式 allow_outbound 配置 |

### 13.5 域安全模型

| 规则 | 说明 |
|---|---|
| 域 = NetworkPolicy | 不是 RBAC，是网络层隔离 |
| Agent 注册 | 只能注册到有权访问的域 |
| 跨域调用 | 域配置显式 allow_outbound |
| admin 视角 | 可切换域，非默认全局可见 |

### 13.6 实施入口

下次会话：`@code-kit/GO.md` →「继续 agent-control-plane，第一波实施隔离域」

---

## 14. 新模块设计方向（待讨论 · 2026-07-06）

在管控面内新建模块，实践 K8s 架构思想。两种方案并存：

| 方案 | 使用场景 | 设计要点 |
|---|---|---|
| **通用 Agent** | 开箱即用，一个 Agent 自动路由到同 capability 最空闲实例 | 网关统一入口，用户不感知底层 Agent 池 |
| **编排 Agent** | 精细控制，用户定义 YAML 拓扑 → 管控模块调度 | 复用现有编排画布 + 新增域内调度策略 |

> 两种方案保留，不互斥。下次专家团专门讨论架构设计。
