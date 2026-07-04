# CONTEXT — 项目共享上下文

> 本文件**跨 change 长期累积**。每个 change 在 REQUIREMENT 阶段会向这里追加术语和决策。
> 目标：为 AI 提供项目级的「域语言 + 默认偏好」，省去重复解释。
> 
> **源文档**：本次扫描综合了 code-kit 既有 CONTEXT.md + 代码库 grep/find 取证。

---

## 项目概要

code-kit-monitor 是一个**本地工业风 Web 监控面板**，为 code-kit 工作流提供可视化。目标用户是使用 code-kit 的开发者（单人）和团队 lead（全局视角）。核心能力：展示 change 进度、task 状态、专家团门禁投票、token 消耗、产物查看。

**代码规模**：前端 54 个 ts/tsx 文件 + 后端 63 个 py 文件。全栈 SPA 架构：React 18 + TypeScript 前端 → FastAPI 后端 → SQLite/MySQL。

## 技术栈（团队级默认 / 已锁定）

> 这里写**全项目共用**的栈。每次 CHANGE 的 `DESIGN.md ## 0` 会读此处作为默认。

- **语言/运行时**: Python 3.10+（后端 · `requirements.txt`）、TypeScript 5.5（前端 · `package.json:35`）
- **前端框架**: React 18.3（`frontend/package.json:17` · `frontend/src/main.tsx:1`）
- **后端框架**: FastAPI 0.110+（`backend/requirements.txt:1` · `backend/main.py:3`）
- **数据库**: SQLAlchemy 2.0 ORM（`backend/requirements.txt:3` · `backend/database.py:3-4`）— 默认 SQLite，支持 MySQL 切换（`backend/database.py:7-14`）
- **缓存**: Redis 5.0（`backend/requirements.txt:5`）— 可选，metrics_service 按需连接（`backend/services/metrics_service.py:14-15`）
- **构建工具**: Vite 5.4（`frontend/package.json:36` · `frontend/vite.config.ts`）
- **CSS 框架**: Tailwind CSS 3.4（`frontend/package.json:34`）+ Tremor 3.18 组件库（`frontend/package.json:13`）
- **图表**: Recharts 2.15（`frontend/package.json:21`）
- **状态管理**: Zustand 4.5（`frontend/package.json:22` · 7 个 store 文件）
- **测试**: Vitest 2.0 + @testing-library/react（`frontend/package.json:10,25-26`）
- **图标**: Lucide React 1.23（`frontend/package.json:17`）
- **部署**: 本地 localhost — 无 Docker / CI 配置
- **栈卡片编号**: 待 2-design 从 `tech-stacks.md` 匹配

## 域语言（术语表）

| 术语 | 定义 |
|---|---|
| change | code-kit 中的一次变更单元，对应 `.specs/<id>/` 目录 |
| Gate / 门禁 | 每个阶段出口的 4 领域专家对抗审核，全票/多数通过才能进入下一阶段 |
| `<auto>` | TASK.md 中每个 task 的自动化标记，true=专家团投票自动化执行，false=需人工确认 |
| 波次（Wave） | 可并行的 task 组成一个执行波次 |
| 中断任务 | STATE.md 中记录了断点的 task，开发者清窗后需要恢复 |
| safety commit | 每个 task 开始前 git 自动创建的 checkpoint（R10.1） |
| 产物 | `.specs/<id>/` 下的结构化文档：CHANGE/REQUIREMENT/DESIGN/UI-DESIGN/TASK/SUMMARY/TEST/REVIEW |

## `ai-dev-platform` 域语言（新增 · 2026-07-03）

| 术语 | 定义 |
|---|---|
| Plugin | 用户自定义的工具插件，含名称/描述/token 限制/权限清单/demo 模板 |
| Skill | 用户自定义的技能单元，含结构化 prompt + 工具绑定 + token 限制 |
| MCP (Model Context Protocol) | 标准化的工具发现与调用协议，可通过语言描述生成 Python 骨架代码 |
| 工具库 | Plugin / Skill / MCP 的统一管理入口，用户级隔离 |
| 工作流 (Workflow) | 多个工具的编排组合，支持文本描述声明 + Dify 式可视化连线两种定义方式 |
| 工具快照 (Snapshot) | 工作流组装时拷贝的工具版本，上游修改不影响已部署工作流 |
| Agent | LangChain 或 LangGraph 运行时驱动的 AI 执行单元，绑定工作流+模型 |
| Agent 编排 | 多个 Agent 的拓扑编排（并发/fork/一主多从/混合），支持文本+可视化双模式 |
| 角色 (Role) | code-kit 风格的角色定义（性情/职责/边界/触发场景），可绑定到工作流节点 |
| 项目管理 | 需求文档输入→自动解析→绑定 Agent+工作流→端到端执行→监控 |
| 软限制 (Soft Limit) | token 消耗达到阈值时**警告但不中断**正在执行的任务（保护已消耗 token） |
| 硬限制 (Hard Limit) | 任务执行完毕后 token 达到硬上限时**阻断**后续调用，需人工介入 |
| 安全闸门 | 工作流节点的前置/后置校验规则，默认关闭（允许全部） |

## `agent-k8s-orchestration` 域语言（新增 · 2026-07-04）

| 术语 | 定义 |
|---|---|
| 编排拓扑 (Orchestration Topology) | 多个 Agent 通过连线形成的 DAG，定义 Agent 间的调用顺序和并发关系 |
| 声明式编排 (Declarative Orchestration) | 用 YAML/JSON 描述编排拓扑的期望状态，系统保证实际状态向其收敛 |
| Reconcile Loop (控制循环) | 后台持续对比期望状态 vs 实际状态，发现偏差自动修复（observe → diff → reconcile）|
| 编排实例 (Orchestration Instance) | 一个已部署的运行中编排拓扑，包含所有 Agent 的运行状态 |
| 拓扑快照 (Topology Snapshot) | 编排部署时记录的期望状态副本，用于后续漂移检测 |
| 状态漂移 (State Drift) | 实际运行状态与拓扑快照不一致（例如有人绕过编排系统手动修改了 Agent）|
| 调度器 (Scheduler) | 多编排任务并发时的资源分配组件，按优先级+配额+亲和性决定执行顺序 |
| 编排模板 (Orchestration Template) | 参数化的已验证拓扑，含 `{{ .Values.xxx }}` 占位符，填参数后可一键部署 |
| 模板市场 (Template Marketplace) | 公开模板的浏览和复用入口，admin 可发布，用户可浏览+一键部署 |
| 渐进式收敛 (Gradual Convergence) | 修改运行中拓扑时不中断现有 Agent，新节点就绪后再切流，旧节点排空后移除 |
| 调度队列 (Scheduling Queue) | 待执行的编排任务队列，按优先级排序 |
| 拓扑画布 (Topology Canvas) | 可视化编排的拖拽 UI，节点和连线实时同步到 YAML 配置 |
| 编排监控 (Orchestration Monitor) | 拓扑级可观测性：实时节点状态颜色 + 跨 Agent 调用链追踪 + token 聚合 |

## 已锁决策

- `[2026-07-02]` 视觉调性锁定为「工业（Industrial）」— 暗色默认、等宽字体、数据密度优先、冷色温 — 来自 `code-kit-monitor` CHANGE.md
- `[2026-07-02]` v1 产物交互为**只读查看 + 批注**，不做在线编辑（避免人机冲突）— 来自 `code-kit-monitor` G1 门禁
- `[2026-07-02]` 部署环境仅本地 localhost，不设网络访问控制 — 用户明确要求
- `[2026-07-02]` Token 数据仅展示聚合数字，不展示单次请求 prompt/response — 来自 `code-kit-monitor` G1 门禁（安全审计师）
- `[2026-07-02]` 用户认证方式：密码登录 + localStorage 持久化登录态，**不做随时切换用户**功能 — 来自 `code-kit-monitor` 需求变更
- `[2026-07-02]` 用户个人信息查看：侧边栏点击用户名进入「用户中心」独立页面（非弹窗）— 来自 `code-kit-monitor` 需求变更

## `agent-channel-dialogue` 域语言（新增 · 2026-07-04）

| 术语 | 定义 |
|---|---|
| 对话中心 (Conversation Center) | 独立的 Agent 对话聚合页面，侧边栏入口，左侧 Agent 列表 + 右侧聊天窗口，类 ChatGPT 交互模式 |
| 渠道适配器 (Channel Adapter) | 满足 `ChannelAdapter` Protocol 的 IM/邮箱接入模块，负责签名校验、消息格式互转、消息推送 |
| 消息中继网关 (Message Relay Gateway) | 平台核心：渠道消息 → 签名校验 → 路由到 Agent → Agent 调用 LLM → 回复推回渠道 |
| 渠道状态机 | 每个渠道配置的生命周期：`draft`（初始）→ `active`（已验签）→ `error`（连接失败）→ `disabled`（手动关闭）|
| Webhook 回调 | 渠道平台（飞书/钉钉/Slack）向平台推送消息的 HTTP 回调，需签名校验 + 防重放 |
| 通用消息格式 | 所有渠道消息归一化的中间表示（纯文本 + 可选附件 URL），Agent 只感知此格式，不感知具体渠道 |

## `ai-dev-platform` 已锁决策（新增 · 2026-07-03）

- `[2026-07-03]` token 限制分软硬两层：软限制在执行中触发警告不中断，硬限制在执行完成后阻断后续调用 — 来自用户明确要求
- `[2026-07-03]` 全部 10 模块属于本 change v1 范围，按 M1→M2→M3 有序推进但都要落地 — 来自用户明确要求
- `[2026-07-03]` 完成定义：API 全通 + 界面可操作 + 本地真实运行 — 来自用户明确要求
- `[2026-07-03]` MCP 托管 v1 仅 Python，工作流可视化使用 React Flow（复用前端技术栈）— 来自竞品比对+架构判断
- `[2026-07-03]` 权限底座延续既有 `auth.py` 体系，新实体追加 owner_id + visibility 字段 — 来自 DESIGN 预判

## `agent-channel-dialogue` 已锁决策（新增 · 2026-07-04）

- `[2026-07-04]` v1 消息格式走方案 A（通用消息抽象层），渠道特性（卡片/按钮）留 v2 — 来自 G1 架构师
- `[2026-07-04]` Bot 适配器使用 Python Protocol 定义接口契约，新增渠道只需实现一个类 — 来自 G1 架构师
- `[2026-07-04]` 渠道凭证（App Secret / Bot Token / 邮箱密码）必须加密存储，与 Agent API Key 同等级 — 来自 G1 安全审计师
- `[2026-07-04]` Webhook 签名校验为强制方法（`validate_request()`），未实现的不允许标记 `active` — 来自 G1 安全审计师
- `[2026-07-04]` 对话历史默认 100 条 + 分页加载更多，不做自动清理 — 来自 G1 产品经理
- `[2026-07-04]` 独立对话中心为侧边栏一级入口，非 Agent 详情子页 — 来自用户确认

## 默认偏好（AI 在缺省时按此决策）

- 命名风格：Python snake_case（`backend/database.py`、`backend/auth.py`）/ TypeScript camelCase 函数 + PascalCase 组件 + kebab-case 文件（`frontend/src/pages/AgentBuilder.tsx`）
- 提交格式：`<type>(<change-id>): <subject>`（与 code-kit 一致）
- 主题策略：默认暗色，亮色不低于 WCAG AA，暗色不做强制对比度要求（`frontend/src/hooks/useTheme.ts:6` — localStorage key `theme`，默认 `dark`）
- 导入风格：前端使用相对路径导入（`../stores/auth`、`../hooks/useFileNames`），后端使用绝对模块导入（`from config import ...`、`from models import ...`）
- 认证模式：前端 fetch 全局拦截器自动注入 `X-User-Id` header（`frontend/src/main.tsx:9-21`），后端中间件解析后注入 `request.state.user`（`backend/main.py:58-76`）

## 既有抽象索引（来自 I-intel-scan · 防 AI 重复实现 · B5 老项目护栏）

### HTTP 客户端

- **路径**：`frontend/src/main.tsx:9-21`
- **入口符号**：全局 `window.fetch` 拦截器（自动注入 `X-User-Id` header，从 `localStorage.getItem('current_user_id')` 读取）
- **使用方式**：所有前端代码直接使用原生 `fetch()`，header 自动携带，无需手动调用 `authHeaders()`

### 数据库访问

- **模式**：SQLAlchemy ORM — `DeclarativeBase` + `sessionmaker` + FastAPI `Depends(get_db)` 依赖注入
- **路径**：
  - 引擎：`backend/database.py:3-17`（`create_engine` + `SessionLocal`）
  - 依赖注入：`backend/database.py:26-32`（`get_db() -> Session`）
  - ORM 基类：`backend/models/__init__.py:2-6`（`class Base(DeclarativeBase)`）
- **示例**：`backend/routes/metrics_api.py:11` — `db: Session = Depends(get_db)` 注入后直接 `db.query(Model).filter(...)`
- **双后端**：默认 SQLite（`platform.db`），设置 `DATABASE_URL` 环境变量切 MySQL（`backend/database.py:7-14`）
- **Schema 工具**：⚠️ 未引入迁移工具（无 Alembic / Prisma）。生产注释："开发环境 `Base.metadata.create_all`，生产用 Alembic"（`backend/database.py:20-22`），但 Alembic 未实际配置

### 状态管理

- **库**：Zustand 4.5（`frontend/package.json:22`）
- **Store 清单**（7 个文件，均在 `frontend/src/stores/`）：

| Store 文件 | 行数 | 用途 |
|---|---|---|
| `auth.ts:1` | 85 | 用户认证、权限、用户列表（`useAuth` — `create<AuthState>`） |
| `changes.ts:1` | 48 | Change 列表、筛选、摘要（`useChanges` — `create<ChangeState>`） |
| `agents.ts:1` | 58 | Agent 管理 |
| `metrics.ts:1` | 30 | Token/运行时指标 |
| `projects.ts:1` | 56 | 项目切换与隔离 |
| `tools.ts:1` | 52 | 工具库管理 |
| `workflows.ts:1` | 71 | 工作流管理 |

- **额外**：`frontend/src/hooks/useFileNames.ts:2` — 也使用 `create` from zustand（文件名映射存储）
- **使用方式**：`import { create } from 'zustand'` → `export const useXxx = create<XxxState>((set, get) => ({...}))`

### 工具函数（utils / helpers）

| 工具类型 | 路径 | 状态 |
|---|---|---|
| 日期 | 未发现独立工具文件 | 项目中直接使用 `new Date()` / `Date` |
| 字符串 | 未发现独立工具文件 | — |
| 校验 | 未发现独立工具文件 | — |
| 存储 | `frontend/src/hooks/useTheme.ts:6` | `localStorage.getItem/setItem('theme')` — 无安全封装 |
| 错误 | `frontend/src/components/ErrorBoundary.tsx` | React class ErrorBoundary（`getDerivedStateFromError`）|

### 自定义 hooks（前端）

| 文件 | 路径 | 用途 |
|---|---|---|
| `useFileNames.ts` | `frontend/src/hooks/useFileNames.ts` | 文件名→中文映射 + zustand store + 产物名/门禁名辅助函数 |
| `useTheme.ts` | `frontend/src/hooks/useTheme.ts` | 暗/亮主题切换，localStorage 持久化，`data-theme` 属性 |

### 中间件

- **后端 HTTP 中间件**：`backend/main.py:58-76` — 认证中间件（localhost 白名单 + X-User-Id 解析 + 用户注入 `request.state.user`）
- **后端 CORS 中间件**：`backend/main.py:48-54` — 仅允许 `CORS_ORIGIN`（默认 `http://localhost:5173`）
- **中间件目录**：`backend/middleware/` 存在但当前为空

### 错误处理

- **前端**：`frontend/src/components/ErrorBoundary.tsx:7` — React class ErrorBoundary（捕获渲染错误，显示 `AlertTriangle` + 错误信息 + 重试按钮）
- **后端**：FastAPI `HTTPException`（`backend/auth.py:14` — `from fastapi import HTTPException`），`backend/main.py:62-63` — localhost 白名单校验返回 `JSONResponse 403`
- **通知**：无 toast 库集成

### Schema / 迁移

- **工具**：SQLAlchemy `Base.metadata.create_all()`（`backend/database.py:20-23`）— 自动建表
- **模型文件**（`backend/models/`）：`tool.py` (50行)、`workflow.py` (64行)、`agent.py` (55行)、`metrics.py` (63行)、`project.py` (33行)、`role_custom.py` (44行)
- **建议**：⚠️ 生产环境建议引入 Alembic 做迁移管理（代码注释已预留意图，见 `backend/database.py:20-22`）

### 命名约定

- 前端文件：PascalCase 组件（`AgentBuilder.tsx`、`ErrorBoundary.tsx`）、camelCase 工具/hooks（`useTheme.ts`）
- 前端目录：`pages/`（页面级组件）、`components/`（可复用组件）、`stores/`（zustand stores）、`hooks/`（自定义 hooks）
- 后端文件：snake_case（`auth.py`、`database.py`、`metrics_service.py`）
- 后端目录：`routes/`（API 路由，20 个文件）、`models/`（ORM 模型，6 个文件）、`services/`（业务逻辑，13 个文件）、`storage/`（存储后端，3 个文件）、`runtime/`（运行时适配器）
- API 路由命名：`<entity>_api.py`（`tools_api.py`、`agents_api.py`、`workflows_api.py`）
- 测试文件：⚠️ 项目源码中未发现测试文件（仅 `node_modules/` 中依赖库自带测试）。配置了 Vitest + @testing-library/react 但未编写业务测试

### 禁动清单（AI 不许"顺手"碰）

> 这些是与新 change 通常无关、改坏会出事的高风险模块。

- `backend/auth.py`（用户认证+权限系统 · 改错会导致全部用户无法登录 · 密码哈希、文件锁、审计日志均在此）
- `backend/database.py`（数据库引擎 · `DATABASE_URL` 切换逻辑影响 SQLite/MySQL 兼容性）
- `frontend/src/main.tsx:9-21`（全局 fetch 拦截器 · 改动影响所有 API 调用的认证 header 注入）
- `frontend/src/components/ErrorBoundary.tsx`（全局错误边界 · 改动影响所有页面的崩溃恢复）
- `backend/main.py:58-76`（认证中间件 · localhost 白名单 + 用户注入逻辑）

### 下次清理窗口移除（2026-07-04 M-health 检出）

> 以下依赖/文件已被 knip/depcheck 标记为未使用，下次专门清理窗口时移除。

- **未用 npm 依赖**：`@tremor/react`、`@esbuild/linux-x64`、`esbuild`、`js-yaml`、`react-syntax-highlighter`
- **未用 devDependencies**：`@testing-library/react`、`@types/react-syntax-highlighter`
- **未用 src 文件**：`ProjectSwitcher.tsx`、`SearchBar.tsx`、`TabNav.tsx`、`TopBar.tsx`（旧版组件，已被新侧边栏替代）
- **未接入导航的页面**：`AssemblyView.tsx`、`SecurityPage.tsx`

### 技术债（给 AI 在 2-design / 4-dev 时参考，别再加同类债）

| 债项 | 来源 | 首次发现 | 影响 | 计划处理 |
|---|---|---|---|---|
| 🔴 无业务测试文件（Vitest 已配置但 0 个测试） | 2026-07-03 intel-scan | 2026-07-03 | 重构/新增功能无回归保护 | **health-fix 优先处理** |
| 🟡 App.tsx 巨石组件（292 行 · 15 页面 · 10 个 setState） | 2026-07-04 M-health | 2026-07-04 | 新增页面需改 4+ 触点，新人理解困难 | 提取路由配置 + React.lazy 拆分 |
| 🟡 Schema 迁移无 Alembic（裸 `create_all`） | 2026-07-03 intel-scan | 2026-07-03 | 生产环境改表风险高 | 下个 change 引入 Alembic |
| 🟡 无 lint/format 工具配置（ESLint/Prettier/Ruff 全缺） | 2026-07-03 intel-scan | 2026-07-03 | 代码风格不一致风险 | 本季度引入 |
| 🟡 无 CI/CD 配置 | 2026-07-03 intel-scan | 2026-07-03 | 手工验证，易漏测 | 待部署策略确定后引入 |
| 🟡 未用依赖堆积（5 个 npm 包 + 9 个未用文件） | 2026-07-04 M-health | 2026-07-04 | 增加 bundle size 和维护负担 | 下次清理窗口移除 |
| 🟢 vulture 死代码（3 条真实未用函数/变量） | 2026-07-04 M-health | 2026-07-04 | 代码膨胀 | 低优先级清理 |

---

## intel-scan 元数据

- **last_intel_scan**: 2026-07-03
- **scanner**: `prompts/I-intel-scan.md`
- **detected_stack**: React 18 + TypeScript + Vite + Tailwind + Zustand | FastAPI + SQLAlchemy + SQLite/MySQL
- **source_docs_consulted**: `.specs/CONTEXT.md`（code-kit 既有）
- **files_sampled**: `frontend/package.json`, `backend/requirements.txt`, `backend/main.py`, `backend/database.py`, `backend/config.py`, `backend/auth.py`, `frontend/src/main.tsx`, `frontend/src/stores/*.ts`（7 个）, `frontend/src/hooks/*.ts`（2 个）, `frontend/src/components/ErrorBoundary.tsx`, `backend/models/__init__.py`
- **下次重扫建议**: `ai-dev-platform` change 完成后（预计大量新增模型/路由/服务），或距本次 > 90 天

---

## `channel-qr-onboarding` 域语言（新增 · 2026-07-05）

| 术语 | 定义 |
|---|---|
| QR 码扫码接入 | 飞书/钉钉渠道的 OAuth 2.0 设备授权码流程：后端调平台 API 拿 device_code → 前端展示二维码 → 用户扫码授权 → 后端轮询拿到凭证 → 渠道自动激活 |
| Device Code OAuth | 飞书开放平台的设备授权码授权流程，适用于无浏览器或 TV 端场景，二维码有效期 5 分钟 |
| OAuth Provider | 后端抽象层（类似 ChannelAdapter Protocol），飞书/钉钉各实现一个子类，统一 device_code 获取 + 轮询 + 凭证回调接口 |
| Mock OAuth 模式 | 本地开发/测试时的模拟流程，环境变量 `CHANNEL_OAUTH_MOCK=true` 启用，支持注入过期/拒绝/网络错误等场景 |
| 扫码弹窗 | 前端通用组件，展示二维码 + 倒计时 + 状态提示（等待扫码/授权成功/已过期/已取消/错误），不绑定具体渠道 |

## `channel-qr-onboarding` 已锁决策（新增 · 2026-07-05）

- `[2026-07-05]` 扫码接入与手动填表**共存**，不替换 — 来自用户明确要求
- `[2026-07-05]` v1 仅飞书 + 钉钉，Slack/微信/企微另开 change — 来自 G1 门禁范围排除

---
> 此文件长度建议 ≤ 300 行（含 intel-scan 自动填的字段）；超出时把陈旧条目归档到 `.specs/archive/CONTEXT-history.md`。
