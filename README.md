# code-kit-platform

> **全栈 AI 开发平台** — 从需求到归档的 Agent 编排 + 可视化监控面板

<p align="center">
  <img src="./demo.mp4" alt="Demo" width="800" />
</p>

---

## 📖 目录

- [为什么有这个项目](#-为什么有这个项目)
- [核心优势](#-核心优势)
- [竞品分析](#-竞品分析)
- [功能全景](#-功能全景)
- [技术方案](#-技术方案)
- [架构](#-架构)
- [依赖环境](#-依赖环境)
- [快速开始](#-快速开始)
- [使用指南](#-使用指南)
- [项目结构](#-项目结构)
- [配置参考](#-配置参考)
- [安全模型](#-安全模型)
- [常见问题](#-常见问题)
- [路线图](#-路线图)
- [License](#-license)

---

## 🤔 为什么有这个项目

2025-2026 年，AI Agent 编排工具遍地开花——Dify、Coze、n8n、Langflow，但它们都有共同的盲区：

| 痛点 | 现有工具的局限 |
|------|---------------|
| **连线策略太少** | 大多数只有 3-5 种（顺序/分支/循环），复杂场景（扇出汇聚/主从/死信）需要写大量胶水代码 |
| **连线没有独立配置** | 每条连线的重试策略、Token 限制、安全栅栏、数据脱敏……所有平台都是"选个类型就完事" |
| **可视化改了 YAML 不会变** | YAML 和画布是两张皮，改了这边那边就废，没有一个平台做到实时双向同步 |
| **提交了就跑，没人在乎对不对** | 所有平台都是"提交即忘"，没有 K8s 风格的控制循环（期望状态 vs 实际状态 → 自动修复漂移） |
| **只管构建，不管流程** | 需求评审、设计审查、专家门禁、测试验收……整个软件工程流程在现有 Agent 平台上完全缺席 |

**code-kit-platform 就是为填补这些空白而生的。**

---

## 🎯 核心优势

### 1. 15 种连线策略（全球最多）

```
pipeline │ fan-out │ fan-in │ map-reduce │ fork │ condition
master-slave │ parallel │ event-trigger │ human-approval
retry-fallback │ dead-letter │ sequential │ dynamic-router │ sub-orch
```

> Dify: 3-4 种 | Sim Studio: 3-4 种 | n8n: 基础 | **你: 15 种**

### 2. 每条连线独立配置面板

```
每条连线可独立配置：
├─ 策略类型 + 触发方式 + 触发条件
├─ 安全栅栏: 前置校验 + 后置校验 + 数据脱敏
├─ Token 限制: 软限制(警告) + 硬限制(阻断) + 最大调用次数
├─ 数据范围: 全部/指定字段/脱敏 + 数据转换表达式
├─ 等待合并: wait_all/wait_any/wait_first/wait_n
│             merge_all/merge_first/merge_concat/merge_pick
├─ 重试策略: 次数 + 退避(fixed/exponential) + 降级节点
├─ 超时: 秒数 + 动作(degrade/skip/fail/retry)
└─ IO Schema: 输入/输出 JSON Schema
```

> 所有竞品：选个连线类型，然后就没有然后了。

### 3. YAML ↔ 画布双向实时同步

```
编辑 YAML → 画布自动更新
拖拽画布 → YAML 自动更新
┌──────────────────────┐
│  两者互为单一数据源    │
│  无需手动同步，不会冲突  │
└──────────────────────┘
```

> Microsoft Foundry 2025 年 11 月才加入此功能。你领先了。

### 4. Reconcile Loop 声明式调度

```
期望状态 (YAML)  ──→  Topology Snapshot
                              │
      ┌───────────────────────┼───────────────────────┐
      ▼                       ▼                       ▼
  实际状态                 对比差异                自动修复
  (Agent 运行态)          (Drift Detection)       (渐进式收敛)
```

> K8s 风格的声明式编排。所有竞品都是"提交即忘"。

### 5. code-kit 完整开发流程

```
CHANGE → REQUIREMENT → DESIGN → UI-DESIGN → TASK
                                                    ↓
  ARCHIVE ← REVIEW ← TEST ← 4-dev(编码) ←──────────┘
                                    ↑
                          每个阶段出口有 4 人专家团门禁
```

> 竞品只管"构建和运行"，你管"从需求到归档的全生命周期"。

---

## 📊 竞品分析

| 能力 | **code-kit-platform** | Sim Studio | Langflow | Dify | n8n | Build A Harness |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| YAML↔画布双向同步 | ✅ | ❌ | ❌ | ❌ | ❌ | 🔄 JSON |
| 连线策略种类 | **15** | 3-4 | 3-4 | 3-4 | 基础 | 5-6 |
| 每条连线独立配置 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reconcile Loop | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 完整开发流程 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Agent 管理 | ✅ | ✅ | ⚠️ | ✅ | ❌ | ✅ |
| 模板市场 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 可观测性/Trace | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| MCP 协议 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| 开源 | 私有 | Apache 2.0 | MIT | Apache 2.0 | 商业 | MIT |

### 最接近的竞品

- **[Sim Studio](https://sim.ai)** — YC 孵化，28.8K⭐，ReactFlow 画布 + Mothership NL 双向控制。连线深度远不如你。
- **[Build A Harness](https://github.com/3IVIS/buildaharness)** — 画布编译到 LangGraph/CrewAI/Mastra，27 节点类型。无 YAML 双向同步。
- **[Kumiho Construct](https://docs.rs/crate/kumiho-construct)** — Rust + YAML 声明式 + Neo4j 图记忆。偏运行时，无连线配置深度。

**结论：市场上没有完全一样的产品。**

---

## 🧩 功能全景

```
┌───────────────────────────────┐  ┌────────────────────────────────┐
│     code-kit 工作流监控        │  │         AI 开发平台              │
│                               │  │                                │
│  • Change 列表 + 进度追踪      │  │  • 工具库 (Plugin/Skill/MCP)     │
│  • 专家团门禁投票可视化         │  │  • 工作流 (文本声明 + 可视化DAG)  │
│  • 产物查看/编辑               │  │  • Agent 管理 (LangChain/Graph)  │
│  • 运行时 Session 监控          │  │  • 项目管理 (需求→执行→交付)     │
│  • Token 消耗统计              │  │  • 角色系统 + 自定义角色         │
│  • Git 安全提交追踪             │  │  • 用户管理 + RBAC 权限         │
│  • 健康检查 + 死代码扫描         │  │  • 审计日志                    │
└───────────────────────────────┘  └────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                      Agent 编排引擎                                │
│                                                                   │
│  • 声明式 YAML 定义 (K8s 风格)                                     │
│  • 可视化拓扑画布 (React Flow · 拖拽构建)                           │
│  • YAML ↔ 画布 双向实时同步                                        │
│  • 15 种连线策略 · 每条连线独立配置面板                              │
│  • Reconcile Loop · 漂移检测 · 自动修复                            │
│  • 优先级调度队列 · 渐进式收敛                                      │
│  • 模板市场 · 参数化一键部署                                        │
│  • 跨 Agent 调用链追踪 (Trace Viewer)                              │
│  • 拓扑级实时监控 (节点状态颜色 · Token 聚合)                        │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔧 技术方案

### 技术栈

| 层 | 技术 | 版本 |
|---|------|------|
| **前端框架** | React + TypeScript | 18.3 / 5.5 |
| **构建工具** | Vite | 5.4 |
| **UI 组件** | Tailwind CSS + Tremor | 3.4 / 3.18 |
| **状态管理** | Zustand (8 stores) | 4.5 |
| **可视化画布** | React Flow (@xyflow/react) | 12.x |
| **代码编辑器** | CodeMirror 6 | 6.x |
| **图表** | Recharts | 2.15 |
| **图标** | Lucide React | 1.23 |
| **后端框架** | FastAPI (Python) | 0.110+ |
| **ORM** | SQLAlchemy | 2.0 |
| **数据库** | SQLite / MySQL | — |
| **缓存** | Redis | 5.0 (可选) |
| **YAML 处理** | PyYAML + jsonschema | 6.0 / 4.0 |

### 关键设计决策

| 决策 | 理由 |
|------|------|
| **React Flow 而非自研画布** | 成熟的节点/连线库，DAG 布局、MiniMap、拖拽开箱即用 |
| **Zustand 而非 Redux** | 轻量、无 boilerplate、与 React 18 并发特性兼容 |
| **YAML 作为单一数据源** | 可版本控制、可 diff、可与 CI/CD 集成、声明式语义 |
| **名称 → ID 稳定映射** | `agentNameToId()` 确保节点 ID 跨解析不变，解决连线漂移 |
| **canvasDirtyRef 守卫** | 阻止手动同步触发反向解析的死循环 |
| **SQLite 默认 / MySQL 可选** | 本地开发零配置，生产可切换 |
| **X-User-Id header 注入** | 全局 fetch 拦截器自动携带认证信息，前端零感知 |

---

## 🏗 架构

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (:5173)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ 30 pages │ │21 comps  │ │ 8 stores │ │ React Flow    │  │
│  │ (React)  │ │(Tailwind)│ │ (Zustand)│ │ (拓扑画布)     │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘  │
│       └─────────────┴────────────┴───────────────┘          │
│                         │ fetch()                             │
│              X-User-Id header (自动注入)                       │
└─────────────────────────┼───────────────────────────────────┘
                          │
              Vite proxy /api → :8000
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                  FastAPI (:8000)                             │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │  认证中间件 (localhost 白名单 + 用户注入)              │    │
│  └──────────────────────┬──────────────────────────────┘    │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────────┐   │
│  │20 APIs│ │14 Svc │ │7 Model│ │3 Engine│ │runtime    │   │
│  │(routes)│ │(svc)  │ │(ORM)  │ │(调度)  │ │watcher    │   │
│  └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └─────┬─────┘   │
│      └─────────┴─────────┴─────────┴─────────────┘         │
│                         │                                    │
│              ┌──────────┴──────────┐                        │
│              │   SQLite / MySQL     │                        │
│              │   Redis (可选缓存)    │                        │
│              └─────────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                  文件系统                                     │
│  .specs/   ←→   code-kit/   ←→   runtime.jsonl             │
│  (产物文档)      (CLI 工具)        (运行时数据)                │
└──────────────────────────────────────────────────────────────┘
```

### 数据流

```
YAML 编辑器                 拓扑画布 (React Flow)
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
         orc-sync.ts (双向转换器)
               │
               ▼
          API /apply → 数据库 + 调度队列
```

---

## 📦 依赖环境

| 依赖 | 最低版本 | 用途 | 必需 |
|------|---------|------|:---:|
| **Python** | 3.10+ | 后端运行时 | ✅ |
| **Node.js** | 18+ | 前端构建 | ✅ |
| **npm** | 9+ | 包管理 | ✅ |
| **SQLite** | 3.x | 默认数据库（内置，无需安装） | ✅ |
| **MySQL** | 8.0+ | 生产数据库（可选） | ❌ |
| **Redis** | 5.0+ | 指标缓存（可选） | ❌ |

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repo-url>
cd code-flow
```

### 2. 安装后端

```bash
cd code-kit-monitor/backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. 安装前端

```bash
cd ../frontend
npm install
```

### 4. 启动

```bash
# 终端 1 — 启动后端
cd code-kit-monitor/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 终端 2 — 启动前端
cd code-kit-monitor/frontend
npm run dev
```

### 5. 打开浏览器

```
http://localhost:5173
```

首次启动会自动创建 SQLite 数据库 (`platform.db`)，无需额外配置。

---

## 📘 使用指南

### Agent 编排（核心功能）

```yaml
# 1. 在 YAML 面板编写编排拓扑
# 或直接在画布上拖拽 Agent 节点 + 连线
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
# 2. 在画布上 —
   - 从左侧 Agent 池拖入新节点
   - 连线两个节点 → 右侧弹出连线配置面板
   - 配置重试策略/Token 限制/安全栅栏/数据脱敏
   - 点击「同步」→ YAML 自动更新
   - 点击「Apply」→ 部署到调度队列
```

### 工作流

```
工具库 → 选择 Plugin/Skill/MCP → 创建工作流（文本或可视化） → 发布 → 绑定 Agent
```

### 项目管理

```
新建项目 → 输入需求文档 → 绑定 Agent + 工作流 → 执行 → 监控
```

### code-kit 监控

```
Home → 查看活跃 Change → 点击进入详情 → 查看门禁投票 / Task 进度 / Token 消耗
```

---

## 📁 项目结构

```
code-flow/
├── code-kit/                         # code-kit CLI 工具
├── .specs/                           # 项目规范文档 + AI 产物
│   ├── CONTEXT.md                    # 项目共享上下文
│   ├── ARCHITECTURE.md               # 架构决策记录
│   └── <change-id>/                  # 每个 change 的产物目录
│       ├── CHANGE.md
│       ├── REQUIREMENT.md
│       ├── DESIGN.md
│       ├── TASK.md
│       └── ...
├── code-kit-monitor/                 # 本产品（Web 监控面板）
│   ├── backend/
│   │   ├── main.py                   # FastAPI 入口 + 认证中间件
│   │   ├── config.py                 # 配置（端口/CORS/项目路径）
│   │   ├── database.py               # SQLAlchemy 引擎 + 双后端
│   │   ├── auth.py                   # 用户认证 + 密码管理
│   │   ├── routes/                   # 20 个 API 路由模块
│   │   │   ├── orchestration_api.py  # 编排 CRUD + apply/validate
│   │   │   ├── agents_api.py         # Agent CRUD
│   │   │   ├── workflows_api.py      # 工作流管理
│   │   │   ├── tools_api.py          # 工具库
│   │   │   ├── metrics_api.py        # 指标 + 链追踪
│   │   │   ├── projects_api.py       # 项目管理
│   │   │   └── ...
│   │   ├── models/                   # 7 个 ORM 模型
│   │   ├── services/                 # 14 个业务服务
│   │   │   ├── reconcile_loop.py     # K8s 风格控制循环
│   │   │   ├── runtime_watcher.py    # 文件系统监控
│   │   │   ├── template_service.py   # 模板渲染
│   │   │   └── ...
│   │   └── engine/                   # 引擎
│   │       ├── yaml_schema.py        # YAML 校验
│   │       ├── scheduler.py          # 优先级调度
│   │       └── gate_registry.py      # 安全闸门注册
│   └── frontend/
│       ├── src/
│       │   ├── pages/                # 30 个页面组件
│       │   │   ├── OrchestrationPage.tsx   # 编排画布
│       │   │   ├── Home.tsx               # 仪表盘
│       │   │   ├── WorkflowEditor.tsx     # 工作流编辑器
│       │   │   └── ...
│       │   ├── components/           # 21 个可复用组件
│       │   │   ├── OrchestrationCanvas.tsx # 拓扑画布 (React Flow)
│       │   │   ├── EdgeEditor.tsx         # 连线配置面板
│       │   │   ├── TopologyMonitor.tsx    # 拓扑监控
│       │   │   ├── TraceViewer.tsx        # 链追踪
│       │   │   └── ...
│       │   ├── stores/               # 8 个 Zustand Store
│       │   ├── lib/
│       │   │   └── orchestration-sync.ts  # YAML ↔ 画布转换器
│       │   └── hooks/
│       └── vite.config.ts
├── STATE.md                          # 项目状态（AI 入口）
├── CLAUDE.md                         # AI 指令
└── README.md                         # 本文件
```

---

## ⚙️ 配置参考

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HOST` | `127.0.0.1` | 后端监听地址 |
| `PORT` | `8000` | 后端端口 |
| `CORS_ORIGIN` | `http://localhost:5173` | 允许的前端源 |
| `DATABASE_URL` | (空=SQLite) | MySQL 连接串，如 `mysql+aiomysql://user:pass@host/db` |
| `REDIS_URL` | (空=跳过) | Redis 缓存连接串 |
| `SPECS_DIR` | `../.specs` | code-kit 产物目录 |
| `SCAN_INTERVAL` | `5` | 文件系统扫描间隔（秒） |

### 数据库切换

```bash
# 默认 SQLite（零配置，开箱即用）
uvicorn main:app

# 切换到 MySQL
DATABASE_URL="mysql+aiomysql://root:password@localhost:3306/platform" uvicorn main:app
```

---

## 🔒 安全模型

| 层次 | 机制 |
|------|------|
| **认证** | 密码登录 + localStorage 持久化 session + `X-User-Id` header 注入 |
| **授权** | RBAC（admin / user）+ per-user 自定义权限 |
| **隔离** | owner_id 数据隔离 + project_ids 项目过滤 |
| **加密** | Agent API Key 加密存储 (`encryption_service.py`) |
| **审计** | 全操作审计日志（创建/修改/删除/权限变更/编排操作） |
| **安全栅栏** | 每条连线可配置前置/后置校验（SQL 注入检测、PII 脱敏、Schema 校验） |
| **网络** | 默认 localhost 白名单，仅允许 `CORS_ORIGIN` |

---

## ❓ 常见问题

**Q: 为什么是 YAML 不是 JSON？**
A: YAML 可读性更好、支持注释、与 K8s 生态一致。内部还有 JSON 编译目标（`flow.json`）用于运行时。

**Q: 画布节点跑到屏幕外面了怎么办？**
A: 进入画布时会自动 `fitView` 聚焦所有节点。也可以双击右下角 MiniMap 快速定位。

**Q: 同步按钮点了没反应？**
A: 看工具栏是否出现 `✅ 已同步到 YAML` 提示。YAML 面板折叠时同步会自动展开。

**Q: 连线每次打开都不一样？**
A: v2 已修复。节点 ID 基于名称稳定映射 (`agentNameToId`)，跨解析不变。

**Q: 能部署到生产环境吗？**
A: 当前定位本地开发工具。如需生产部署，建议切换 MySQL + Redis + 配置 HTTPS + 引入 Alembic 迁移。

---

## 🗺 路线图

- [x] Agent 编排画布 v2（YAML↔画布双向同步）
- [x] 15 种连线策略 + 独立配置面板
- [x] Reconcile Loop + 调度队列
- [x] 模板市场 + 参数化部署
- [x] 跨 Agent 调用链追踪
- [x] 项目管理（需求→执行→交付）
- [ ] Alembic 数据库迁移
- [ ] ESLint + Prettier + Ruff 代码规范
- [ ] CI/CD 集成
- [ ] 单元测试 + E2E 测试覆盖
- [ ] 自然语言 → 拓扑画布（Mothership 风格）
- [ ] 画布 → 多运行时编译（LangGraph/CrewAI/Mastra）
- [ ] MCP Server 发布（让其他 Agent 调用你的编排）
- [ ] Docker 一键部署

---

## 📄 License

Private. All rights reserved.

---

<p align="center">
  <sub>Built with React · FastAPI · React Flow · SQLAlchemy · Zustand</sub>
</p>
