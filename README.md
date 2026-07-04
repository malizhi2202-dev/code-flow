<p align="center">
  <a href="?lang=zh" style="font-size:18px;font-weight:bold;text-decoration:none;padding:8px 20px;margin:0 8px;border:2px solid #548cf0;border-radius:6px;color:#548cf0;">🇨🇳 中文版</a>
  <a href="./README.en.md" style="font-size:18px;font-weight:bold;text-decoration:none;padding:8px 20px;margin:0 8px;border:2px solid #548cf0;border-radius:6px;color:#548cf0;">🇺🇸 English</a>
</p>

---

# code-kit-platform / code-kit 平台

> **全栈 AI 开发平台** — 从需求到归档的 Agent 编排 + 可视化监控面板
> **Full-stack AI Development Platform** — Agent Orchestration + Visual Monitoring from Requirements to Archive

<p align="center">
  <img src="./demo.mp4" alt="Demo" width="800" />
</p>

---

## 📖 目录 / Table of Contents

- [为什么有这个项目 / Why This Project](#-为什么有这个项目--why-this-project)
- [核心优势 / Core Advantages](#-核心优势--core-advantages)
- [竞品分析 / Competitive Analysis](#-竞品分析--competitive-analysis)
- [功能全景 / Feature Overview](#-功能全景--feature-overview)
- [技术方案 / Technical Architecture](#-技术方案--technical-architecture)
- [架构 / Architecture](#-架构--architecture)
- [依赖环境 / Dependencies](#-依赖环境--dependencies)
- [快速开始 / Quick Start](#-快速开始--quick-start)
- [使用指南 / Usage Guide](#-使用指南--usage-guide)
- [项目结构 / Project Structure](#-项目结构--project-structure)
- [配置参考 / Configuration](#-配置参考--configuration)
- [安全模型 / Security Model](#-安全模型--security-model)
- [常见问题 / FAQ](#-常见问题--faq)
- [路线图 / Roadmap](#-路线图--roadmap)

---

## 🤔 为什么有这个项目 / Why This Project

2025-2026 年，AI Agent 编排工具遍地开花——Dify、Coze、n8n、Langflow，但它们都有共同的盲区：
> From 2025 to 2026, AI agent orchestration tools have exploded — Dify, Coze, n8n, Langflow — yet they all share the same blind spots:

| 痛点 / Pain Point | 现有工具的局限 / Limitations of Existing Tools |
|------|---------------|
| **连线策略太少** / Too few edge strategies | 大多数只有 3-5 种（顺序/分支/循环），复杂场景（扇出汇聚/主从/死信）需要写大量胶水代码 / Most offer only 3-5 types; complex scenarios require heavy glue code |
| **连线没有独立配置** / No per-edge configuration | 每条连线的重试策略、Token 限制、安全栅栏、数据脱敏……所有平台都是"选个类型就完事" / Every platform treats edges as "pick a type and done" |
| **可视化改了 YAML 不会变** / Visual changes don't sync to YAML | YAML 和画布是两张皮，改了这边那边就废，没有一个平台做到实时双向同步 / No platform achieves real-time bidirectional sync between visual canvas and YAML |
| **提交了就跑，没人在乎对不对** / Fire-and-forget, no one checks correctness | 所有平台都是"提交即忘"，没有 K8s 风格的控制循环（期望状态 vs 实际状态 → 自动修复漂移）/ All platforms are "deploy and hope"; no K8s-style reconcile loop |
| **只管构建，不管流程** / Build only, no process governance | 需求评审、设计审查、专家门禁、测试验收……整个软件工程流程在现有 Agent 平台上完全缺席 / The entire software engineering lifecycle is absent from existing agent platforms |

**code-kit-platform 就是为填补这些空白而生的。**
> **code-kit-platform was born to fill these gaps.**

---

## 🎯 核心优势 / Core Advantages

### 1. 15 种连线策略（全球最多）/ 15 Edge Strategies (Most in the World)

```
pipeline │ fan-out │ fan-in │ map-reduce │ fork │ condition
master-slave │ parallel │ event-trigger │ human-approval
retry-fallback │ dead-letter │ sequential │ dynamic-router │ sub-orch
```

> Dify: 3-4 种 | Sim Studio: 3-4 种 | n8n: 基础/basic | **你/You: 15 种**

### 2. 每条连线独立配置面板 / Per-Edge Configuration Panel

```
每条连线可独立配置 / Each edge can be independently configured:
├─ 策略类型 + 触发方式 + 触发条件 / Strategy + Trigger Type + Condition
├─ 安全栅栏: 前置校验 + 后置校验 + 数据脱敏 / Security Gates: Pre/Post Validation + Data Masking
├─ Token 限制: 软限制(警告) + 硬限制(阻断) + 最大调用次数 / Token Limits: Soft(Warn) + Hard(Block) + Max Invocations
├─ 数据范围: 全部/指定字段/脱敏 + 数据转换表达式 / Data Scope: All/Subset/Masked + Transform Expression
├─ 等待合并: wait_all/wait_any/wait_first/wait_n + merge_all/merge_first/merge_concat/merge_pick
├─ 重试策略: 次数 + 退避(fixed/exponential) + 降级节点 / Retry: Count + Backoff(fixed/exponential) + Fallback Node
├─ 超时: 秒数 + 动作(degrade/skip/fail/retry) / Timeout: Seconds + Action
└─ IO Schema: 输入/输出 JSON Schema / Input/Output JSON Schema
```

> 所有竞品：选个连线类型，然后就没有然后了。
> Every competitor: pick an edge type, and that's it.

### 3. YAML ↔ 画布双向实时同步 / YAML ↔ Canvas Bidirectional Sync

```
编辑 YAML → 画布自动更新 / Edit YAML → Canvas auto-updates
拖拽画布 → YAML 自动更新 / Drag on canvas → YAML auto-updates
┌──────────────────────────────────┐
│  两者互为单一数据源                │
│  无需手动同步，不会冲突             │
│  Single source of truth,          │
│  no manual sync, no conflicts     │
└──────────────────────────────────┘
```

> Microsoft Foundry 2025 年 11 月才加入此功能。你领先了。
> Microsoft Foundry only added this in November 2025. You're ahead.

### 4. Reconcile Loop 声明式调度 / Reconcile Loop Declarative Scheduling

```
期望状态 / Desired State (YAML)  ──→  Topology Snapshot
                                        │
      ┌─────────────────────────────────┼─────────────────────────┐
      ▼                                 ▼                         ▼
  实际状态 / Actual State          对比差异 / Diff              自动修复 / Auto-heal
  (Agent Runtime)                  (Drift Detection)            (Gradual Convergence)
```

> K8s 风格的声明式编排。所有竞品都是"提交即忘"。
> K8s-style declarative orchestration. Every competitor is "fire and forget."

### 5. code-kit 完整开发流程 / code-kit Full Development Lifecycle

```
CHANGE → REQUIREMENT → DESIGN → UI-DESIGN → TASK
                                                    ↓
  ARCHIVE ← REVIEW ← TEST ← 4-dev(编码/coding) ←────┘
                                    ↑
                          每个阶段出口有 4 人专家团门禁
                          4-expert panel gate at each stage exit
```

> 竞品只管"构建和运行"，你管"从需求到归档的全生命周期"。
> Competitors only handle "build and run." You handle the full lifecycle.

---

## 📊 竞品分析 / Competitive Analysis

| 能力 / Capability | **code-kit-platform** | Sim Studio | Langflow | Dify | n8n | Build A Harness |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| YAML↔画布双向同步 / YAML↔Canvas Sync | ✅ | ❌ | ❌ | ❌ | ❌ | 🔄 JSON |
| 连线策略种类 / Edge Strategies | **15** | 3-4 | 3-4 | 3-4 | 基础/basic | 5-6 |
| 每条连线独立配置 / Per-Edge Config | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reconcile Loop | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 完整开发流程 / Full Dev Lifecycle | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Agent 管理 / Agent Management | ✅ | ✅ | ⚠️ | ✅ | ❌ | ✅ |
| 模板市场 / Template Marketplace | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 可观测性/Trace / Observability | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| MCP 协议 / MCP Protocol | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| 开源 / Open Source | 私有/Private | Apache 2.0 | MIT | Apache 2.0 | 商业/Prop | MIT |

### 最接近的竞品 / Closest Competitors

- **[Sim Studio](https://sim.ai)** — YC 孵化/YC-backed，28.8K⭐，ReactFlow 画布 + Mothership NL 双向控制。连线深度远不如你。/ Edge depth far behind.
- **[Build A Harness](https://github.com/3IVIS/buildaharness)** — 画布编译到/canvas compiles to LangGraph/CrewAI/Mastra，27 节点类型/node types。无 YAML 双向同步/no YAML sync.
- **[Kumiho Construct](https://docs.rs/crate/kumiho-construct)** — Rust + YAML 声明式/declarative + Neo4j 图记忆/graph memory。偏运行时/runtime-focused，无连线配置深度/no edge config depth.

**结论：市场上没有完全一样的产品。**
> **Conclusion: No identical product exists on the market.**

---

## 🧩 功能全景 / Feature Overview

```
┌───────────────────────────────┐  ┌────────────────────────────────┐
│     code-kit 工作流监控        │  │         AI 开发平台              │
│     Workflow Monitoring        │  │         AI Dev Platform          │
│                               │  │                                │
│  • Change 列表 + 进度追踪      │  │  • 工具库/Plugin+Skill+MCP      │
│  • 专家团门禁投票可视化         │  │  • 工作流/文本声明 + 可视化DAG   │
│  • 产物查看/编辑               │  │  • Agent 管理/LangChain+Graph   │
│  • 运行时 Session 监控          │  │  • 项目管理/需求→执行→交付      │
│  • Token 消耗统计              │  │  • 角色系统 + 自定义角色         │
│  • Git 安全提交追踪             │  │  • 用户管理 + RBAC 权限         │
│  • 健康检查 + 死代码扫描         │  │  • 审计日志/Audit Log          │
└───────────────────────────────┘  └────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                      Agent 编排引擎 / Orchestration Engine         │
│                                                                   │
│  • 声明式 YAML 定义 / Declarative YAML (K8s-style)                 │
│  • 可视化拓扑画布 / Visual Topology Canvas (React Flow · 拖拽/Drag) │
│  • YAML ↔ 画布 双向实时同步 / Bidirectional Real-time Sync         │
│  • 15 种连线策略 · 每条连线独立配置面板 / 15 Edge Types + Config    │
│  • Reconcile Loop · 漂移检测 · 自动修复 / Drift Detection + Repair  │
│  • 优先级调度队列 · 渐进式收敛 / Priority Queue + Gradual Converge  │
│  • 模板市场 · 参数化一键部署 / Template Market + One-click Deploy   │
│  • 跨 Agent 调用链追踪 / Cross-Agent Trace Viewer                  │
│  • 拓扑级实时监控 / Topology Monitor (节点状态颜色/Node Status)     │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔧 技术方案 / Technical Architecture

### 技术栈 / Tech Stack

| 层/Layer | 技术/Technology | 版本/Version |
|---|------|------|
| **前端框架/Frontend** | React + TypeScript | 18.3 / 5.5 |
| **构建工具/Build** | Vite | 5.4 |
| **UI 组件/UI** | Tailwind CSS + Tremor | 3.4 / 3.18 |
| **状态管理/State** | Zustand (8 stores) | 4.5 |
| **可视化画布/Canvas** | React Flow (@xyflow/react) | 12.x |
| **代码编辑器/Editor** | CodeMirror 6 | 6.x |
| **图表/Charts** | Recharts | 2.15 |
| **图标/Icons** | Lucide React | 1.23 |
| **后端框架/Backend** | FastAPI (Python) | 0.110+ |
| **ORM** | SQLAlchemy | 2.0 |
| **数据库/Database** | SQLite / MySQL | — |
| **缓存/Cache** | Redis | 5.0 (可选/Optional) |
| **YAML 处理** | PyYAML + jsonschema | 6.0 / 4.0 |

### 关键设计决策 / Key Design Decisions

| 决策/Decision | 理由/Rationale |
|------|------|
| **React Flow 而非自研画布** / React Flow over custom canvas | 成熟的节点/连线库，DAG 布局、MiniMap、拖拽开箱即用 / Mature library with built-in DAG, MiniMap, drag |
| **Zustand 而非 Redux** / Zustand over Redux | 轻量、无 boilerplate、与 React 18 并发特性兼容 / Lightweight, no boilerplate, concurrent-safe |
| **YAML 作为单一数据源** / YAML as single source of truth | 可版本控制、可 diff、可与 CI/CD 集成、声明式语义 / Versionable, diffable, CI/CD-friendly, declarative |
| **名称 → ID 稳定映射** / Name→ID stable mapping | `agentNameToId()` 确保节点 ID 跨解析不变，解决连线漂移 / Prevents edge ID drift across parses |
| **canvasDirtyRef 守卫** / canvasDirtyRef guard | 阻止手动同步触发反向解析的死循环 / Prevents infinite sync loop |
| **SQLite 默认 / MySQL 可选** / SQLite default, MySQL optional | 本地开发零配置，生产可切换 / Zero-config local dev, swappable for production |
| **X-User-Id header 注入** / X-User-Id injection | 全局 fetch 拦截器自动携带认证信息，前端零感知 / Transparent auth via global fetch interceptor |

---

## 🏗 架构 / Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (:5173)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ 30 pages │ │21 comps  │ │ 8 stores │ │ React Flow    │  │
│  │ (React)  │ │(Tailwind)│ │ (Zustand)│ │ (拓扑画布)     │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘  │
│       └─────────────┴────────────┴───────────────┘          │
│                         │ fetch()                             │
│              X-User-Id header (自动注入/auto-injected)         │
└─────────────────────────┼───────────────────────────────────┘
                          │
              Vite proxy /api → :8000
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                  FastAPI (:8000)                             │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │  认证中间件 / Auth Middleware                          │    │
│  │  (localhost 白名单/whitelist + 用户注入/user inject)    │    │
│  └──────────────────────┬──────────────────────────────┘    │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────────┐   │
│  │20 APIs│ │14 Svc │ │7 Model│ │3 Engine│ │runtime    │   │
│  │(routes)│ │(svc)  │ │(ORM)  │ │(engine)│ │watcher    │   │
│  └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └─────┬─────┘   │
│      └─────────┴─────────┴─────────┴─────────────┘         │
│                         │                                    │
│              ┌──────────┴──────────┐                        │
│              │   SQLite / MySQL     │                        │
│              │   Redis (可选/Opt)    │                        │
│              └─────────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                  文件系统 / Filesystem                        │
│  .specs/   ←→   code-kit/   ←→   runtime.jsonl             │
│  (产物/Artifacts)  (CLI 工具/Tool)   (运行时数据/Runtime)      │
└──────────────────────────────────────────────────────────────┘
```

### 数据流 / Data Flow

```
YAML 编辑器 / Editor          拓扑画布 / Topology Canvas (React Flow)
    │                            │
    │  onChange                  │  onNodesChange
    ▼                            ▼
  yamlContent (Zustand)    topologyState (Zustand)
    │                            │
    │  useEffect (300ms)          │  syncToYaml / handleApply
    ▼                            ▼
  yamlToTopology()          topologyToYaml()
    │                            │
    └──────────┬─────────────────┘
               ▼
         orc-sync.ts (双向转换器/Bidirectional Converter)
               │
               ▼
          API /apply → 数据库/DB + 调度队列/Scheduling Queue
```

---

## 📦 依赖环境 / Dependencies

| 依赖/Dependency | 最低版本/Min Version | 用途/Purpose | 必需/Required |
|------|---------|------|:---:|
| **Python** | 3.10+ | 后端运行时 / Backend runtime | ✅ |
| **Node.js** | 18+ | 前端构建 / Frontend build | ✅ |
| **npm** | 9+ | 包管理 / Package manager | ✅ |
| **SQLite** | 3.x | 默认数据库（内置，无需安装）/ Default DB (built-in) | ✅ |
| **MySQL** | 8.0+ | 生产数据库（可选）/ Production DB (optional) | ❌ |
| **Redis** | 5.0+ | 指标缓存（可选）/ Metrics cache (optional) | ❌ |

---

## 🚀 快速开始 / Quick Start

### 1. 克隆项目 / Clone

```bash
git clone <repo-url>
cd code-flow
```

### 2. 安装后端 / Install Backend

```bash
cd code-kit-monitor/backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. 安装前端 / Install Frontend

```bash
cd ../frontend
npm install
```

### 4. 启动 / Launch

```bash
# 终端 1 / Terminal 1 — 启动后端 / Start Backend
cd code-kit-monitor/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 终端 2 / Terminal 2 — 启动前端 / Start Frontend
cd code-kit-monitor/frontend
npm run dev
```

### 5. 打开浏览器 / Open Browser

```
http://localhost:5173
```

首次启动会自动创建 SQLite 数据库 (`platform.db`)，无需额外配置。
> First launch auto-creates SQLite database (`platform.db`). No extra config needed.

---

## 📘 使用指南 / Usage Guide

### Agent 编排（核心功能）/ Agent Orchestration (Core)

```yaml
# 1. 在 YAML 面板编写编排拓扑 / Write topology in YAML panel
# 或直接在画布上拖拽 Agent 节点 + 连线 / Or drag agents + connect on canvas
apiVersion: ai-platform/v1
kind: AgentOrchestration
metadata:
  name: my-pipeline
spec:
  agents:
    - name: reviewer
      kind: Agent
      spec:
        runtime: langgraph
        model: { provider: openai, name: gpt-4o }
        workflow_id: 1
  routes:
    - { from: reviewer, to: analyzer, type: pipeline }
```

```text
# 2. 在画布上操作 / On the canvas —
   - 从左侧 Agent 池拖入新节点 / Drag new nodes from the left Agent Pool
   - 连线两个节点 → 右侧弹出连线配置面板 / Connect two nodes → Edge Config panel slides in
   - 配置重试策略/Token 限制/安全栅栏/数据脱敏 / Configure retry/token/gates/masking
   - 点击「同步」→ YAML 自动更新 / Click "Sync" → YAML auto-updates
   - 点击「Apply」→ 部署到调度队列 / Click "Apply" → Deploy to scheduling queue
```

### 工作流 / Workflows

```
工具库/Tool Library → 选择 Plugin/Skill/MCP → 创建工作流/Create Workflow → 发布/Publish → 绑定 Agent/Bind Agent
```

### 项目管理 / Project Management

```
新建项目/New Project → 输入需求文档/Input Requirements → 绑定 Agent + 工作流/Bind → 执行/Execute → 监控/Monitor
```

### code-kit 监控 / code-kit Monitoring

```
Home → 查看活跃 Change / View Active Changes → 进入详情/Detail → 查看门禁投票/Task 进度/Token 消耗 / View Gates/Tasks/Tokens
```

---

## 📁 项目结构 / Project Structure

```
code-flow/
├── code-kit/                         # code-kit CLI 工具 / CLI Tool
├── .specs/                           # 项目规范文档 + AI 产物 / Specs + AI Artifacts
│   ├── CONTEXT.md                    # 项目共享上下文 / Shared Context
│   ├── ARCHITECTURE.md               # 架构决策记录 / Architecture Decisions
│   └── <change-id>/                  # 每个 change 的产物目录 / Per-change artifacts
│       ├── CHANGE.md
│       ├── REQUIREMENT.md
│       ├── DESIGN.md
│       ├── TASK.md
│       └── ...
├── code-kit-monitor/                 # 本产品 / This Product (Web Dashboard)
│   ├── backend/
│   │   ├── main.py                   # FastAPI 入口 + 认证中间件 / Entry + Auth Middleware
│   │   ├── config.py                 # 配置 / Config (端口/Port, CORS, 路径/Paths)
│   │   ├── database.py               # SQLAlchemy 引擎 + 双后端 / Dual Backend
│   │   ├── auth.py                   # 用户认证 + 密码管理 / Auth + Password
│   │   ├── routes/                   # 20 个 API 路由模块 / 20 API Route Modules
│   │   │   ├── orchestration_api.py  # 编排 CRUD + apply/validate
│   │   │   ├── agents_api.py         # Agent CRUD
│   │   │   ├── workflows_api.py      # 工作流管理 / Workflow Mgmt
│   │   │   ├── tools_api.py          # 工具库 / Tool Library
│   │   │   ├── metrics_api.py        # 指标 + 链追踪 / Metrics + Traces
│   │   │   ├── projects_api.py       # 项目管理 / Project Mgmt
│   │   │   └── ...
│   │   ├── models/                   # 7 个 ORM 模型 / 7 ORM Models
│   │   ├── services/                 # 14 个业务服务 / 14 Business Services
│   │   │   ├── reconcile_loop.py     # K8s 风格控制循环 / K8s-style Control Loop
│   │   │   ├── runtime_watcher.py    # 文件系统监控 / Filesystem Watcher
│   │   │   ├── template_service.py   # 模板渲染 / Template Rendering
│   │   │   └── ...
│   │   └── engine/                   # 引擎 / Engine
│   │       ├── yaml_schema.py        # YAML 校验 / Validation
│   │       ├── scheduler.py          # 优先级调度 / Priority Scheduling
│   │       └── gate_registry.py      # 安全闸门注册 / Gate Registry
│   └── frontend/
│       ├── src/
│       │   ├── pages/                # 30 个页面组件 / 30 Page Components
│       │   │   ├── OrchestrationPage.tsx   # 编排画布 / Orchestration Canvas
│       │   │   ├── Home.tsx               # 仪表盘 / Dashboard
│       │   │   ├── WorkflowEditor.tsx     # 工作流编辑器 / Workflow Editor
│       │   │   └── ...
│       │   ├── components/           # 21 个可复用组件 / 21 Reusable Components
│       │   │   ├── OrchestrationCanvas.tsx # 拓扑画布 / Topology Canvas (React Flow)
│       │   │   ├── EdgeEditor.tsx         # 连线配置面板 / Edge Config Panel
│       │   │   ├── TopologyMonitor.tsx    # 拓扑监控 / Topology Monitor
│       │   │   ├── TraceViewer.tsx        # 链追踪 / Trace Viewer
│       │   │   └── ...
│       │   ├── stores/               # 8 个 Zustand Store
│       │   ├── lib/
│       │   │   └── orchestration-sync.ts  # YAML ↔ 画布转换器 / Bidirectional Converter
│       │   └── hooks/
│       └── vite.config.ts
├── STATE.md                          # 项目状态（AI 入口）/ Project State (AI Entry)
├── CLAUDE.md                         # AI 指令 / AI Instructions
└── README.md                         # 本文件 / This File
```

---

## ⚙️ 配置参考 / Configuration

### 环境变量 / Environment Variables

| 变量/Variable | 默认值/Default | 说明/Description |
|------|--------|------|
| `HOST` | `127.0.0.1` | 后端监听地址 / Backend listen address |
| `PORT` | `8000` | 后端端口 / Backend port |
| `CORS_ORIGIN` | `http://localhost:5173` | 允许的前端源 / Allowed frontend origin |
| `DATABASE_URL` | (空/empty=SQLite) | MySQL 连接串 / MySQL connection string |
| `REDIS_URL` | (空/empty=跳过/skip) | Redis 缓存连接串 / Redis cache URL |
| `SPECS_DIR` | `../.specs` | code-kit 产物目录 / Artifacts directory |
| `SCAN_INTERVAL` | `5` | 文件系统扫描间隔（秒）/ Scan interval (seconds) |

### 数据库切换 / Database Switching

```bash
# 默认 SQLite（零配置，开箱即用）/ Default (zero-config)
uvicorn main:app

# 切换到 MySQL / Switch to MySQL
DATABASE_URL="mysql+aiomysql://root:password@localhost:3306/platform" uvicorn main:app
```

---

## 🔒 安全模型 / Security Model

| 层次/Layer | 机制/Mechanism |
|------|------|
| **认证/Authentication** | 密码登录 + localStorage 持久化 + `X-User-Id` header 注入 / Password login + persistent session + auto-injected header |
| **授权/Authorization** | RBAC（admin / user）+ per-user 自定义权限 / RBAC + per-user custom permissions |
| **隔离/Isolation** | owner_id 数据隔离 + project_ids 项目过滤 / owner_id isolation + project_ids filtering |
| **加密/Encryption** | Agent API Key 加密存储 / Encrypted API key storage (`encryption_service.py`) |
| **审计/Audit** | 全操作审计日志 / Full audit trail for all operations |
| **安全栅栏/Gate** | 每条连线可配置前置/后置校验 / Per-edge pre/post validation (SQL注入检测/PII脱敏/Schema校验) |
| **网络/Network** | 默认 localhost 白名单，仅允许 `CORS_ORIGIN` / Default localhost whitelist |

---

## ❓ 常见问题 / FAQ

**Q: 为什么是 YAML 不是 JSON？ / Why YAML over JSON?**
A: YAML 可读性更好、支持注释、与 K8s 生态一致。内部还有 JSON 编译目标（`flow.json`）用于运行时。 / YAML is more readable, supports comments, and aligns with K8s ecosystem.

**Q: 画布节点跑到屏幕外面了怎么办？ / Nodes outside visible area?**
A: 进入画布时会自动 `fitView` 聚焦所有节点。也可以双击右下角 MiniMap 快速定位。 / Auto `fitView` on entry. Double-click MiniMap to locate.

**Q: 同步按钮点了没反应？ / Sync button unresponsive?**
A: 看工具栏是否出现 `✅ 已同步到 YAML` 提示。YAML 面板折叠时同步会自动展开。 / Check for green confirmation toast in toolbar.

**Q: 连线每次打开都不一样？ / Edges scrambled on re-entry?**
A: v2 已修复。节点 ID 基于名称稳定映射 (`agentNameToId`)，跨解析不变。 / Fixed in v2. Node IDs are name-based, stable across parses.

**Q: 能部署到生产环境吗？ / Production-ready?**
A: 当前定位本地开发工具。如需生产部署，建议切换 MySQL + Redis + 配置 HTTPS + 引入 Alembic 迁移。 / Currently a local dev tool. For production: MySQL + Redis + HTTPS + Alembic.

---

## 🗺 路线图 / Roadmap

- [x] Agent 编排画布 v2（YAML↔画布双向同步）/ Orchestration Canvas v2 (YAML↔Canvas Bidirectional Sync)
- [x] 15 种连线策略 + 独立配置面板 / 15 Edge Strategies + Config Panel
- [x] Reconcile Loop + 调度队列 / Reconcile Loop + Scheduling Queue
- [x] 模板市场 + 参数化部署 / Template Market + Parameterized Deploy
- [x] 跨 Agent 调用链追踪 / Cross-Agent Trace Viewer
- [x] 项目管理（需求→执行→交付）/ Project Management (Requirements→Execution→Delivery)
- [ ] Alembic 数据库迁移 / Alembic DB Migrations
- [ ] ESLint + Prettier + Ruff 代码规范 / Code Linting & Formatting
- [ ] CI/CD 集成 / CI/CD Integration
- [ ] 单元测试 + E2E 测试覆盖 / Unit + E2E Test Coverage
- [ ] 自然语言 → 拓扑画布 / Natural Language → Topology Canvas (Mothership-style)
- [ ] 画布 → 多运行时编译 / Canvas → Multi-Runtime Compilation (LangGraph/CrewAI/Mastra)
- [ ] MCP Server 发布 / MCP Server Publishing (让其他 Agent 调用你的编排)
- [ ] Docker 一键部署 / Docker One-click Deploy

---

## 📄 License

Private. All rights reserved.

---

<p align="center">
  <sub>Built with React · FastAPI · React Flow · SQLAlchemy · Zustand</sub>
</p>
