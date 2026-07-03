# CONTEXT — 项目共享上下文

> 本文件**跨 change 长期累积**。每个 change 在 REQUIREMENT 阶段会向这里追加术语和决策。
> 目标：为 AI 提供项目级的「域语言 + 默认偏好」，省去重复解释。

---

## 项目概要

code-kit-monitor 是一个**本地工业风 Web 监控面板**，为 code-kit 工作流提供可视化。目标用户是使用 code-kit 的开发者（单人）和团队 lead（全局视角）。核心能力：展示 change 进度、task 状态、专家团门禁投票、token 消耗、产物查看。技术方向：前端 SPA + Python FastAPI 后端。

## 技术栈（团队级默认 / 已锁定）

> 这里写**全项目共用**的栈。每次 CHANGE 的 `DESIGN.md ## 0` 会读此处作为默认。

- **语言/运行时**: Python 3.10+（后端）、TypeScript（前端）
- **前端框架**: 待 2-design 选定（React/Vue/Svelte 之一）
- **后端框架**: FastAPI
- **数据库**: MySQL
- **缓存**: Redis（如需）
- **向量数据库**: 待 2-design 选定（如需，选最新版本）
- **测试**: 待 2-design 选定
- **构建/部署**: 待 2-design 选定
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

## 已锁决策

- `[2026-07-02]` 视觉调性锁定为「工业（Industrial）」— 暗色默认、等宽字体、数据密度优先、冷色温 — 来自 `code-kit-monitor` CHANGE.md
- `[2026-07-02]` v1 产物交互为**只读查看 + 批注**，不做在线编辑（避免人机冲突）— 来自 `code-kit-monitor` G1 门禁
- `[2026-07-02]` 部署环境仅本地 localhost，不设网络访问控制 — 用户明确要求
- `[2026-07-02]` Token 数据仅展示聚合数字，不展示单次请求 prompt/response — 来自 `code-kit-monitor` G1 门禁（安全审计师）
- `[2026-07-02]` 用户认证方式：密码登录 + localStorage 持久化登录态，**不做随时切换用户**功能 — 来自 `code-kit-monitor` 需求变更
- `[2026-07-02]` 用户个人信息查看：侧边栏点击用户名进入「用户中心」独立页面（非弹窗）— 来自 `code-kit-monitor` 需求变更

## 默认偏好（AI 在缺省时按此决策）

- 命名风格：Python snake_case / TypeScript camelCase 函数 + PascalCase 组件 + kebab-case 文件
- 提交格式：`<type>(<change-id>): <subject>`（与 code-kit 一致）
- 主题策略：默认暗色，亮色不低于 WCAG AA，暗色不做强制对比度要求

## 既有抽象索引（来自 I-intel-scan · 防 AI 重复实现 · B5 老项目护栏）

- **用户权限系统**：`auth.py` — 密码登录 + localStorage 持久化 + 用户隔离 + admin 全见 + 危险权限显式分配 + 审计日志（`audit.jsonl`）
- **项目监控面板**：`Runtime.tsx` + `StatsTab.tsx` + `HealthTab.tsx` — 5 秒轮询扫描 + 数据一致性校验 + token 聚合展示
- **产物存储**：`ArtifactTab.tsx` + `SpecsEditor.tsx` — 只读查看 + 批注（纯前端存储）+ 自动备份（`.specs/backup/`）
- **工作流编辑器**：`WorkflowEditor.tsx` + `WorkflowTab.tsx` — 阶段/门禁增删改
- **角色管理**：`Roles.tsx` — 12 角色查看/编辑/新增/删除
- **项目切换器**：`ProjectSwitcher.tsx` — 多项目隔离
- **门禁矩阵表**：`GateTab.tsx` — Gate × 角色矩阵投票展示

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

## `ai-dev-platform` 已锁决策（新增 · 2026-07-03）

- `[2026-07-03]` token 限制分软硬两层：软限制在执行中触发警告不中断，硬限制在执行完成后阻断后续调用 — 来自用户明确要求
- `[2026-07-03]` 全部 10 模块属于本 change v1 范围，按 M1→M2→M3 有序推进但都要落地 — 来自用户明确要求
- `[2026-07-03]` 完成定义：API 全通 + 界面可操作 + 本地真实运行 — 来自用户明确要求
- `[2026-07-03]` MCP 托管 v1 仅 Python，工作流可视化使用 React Flow（复用前端技术栈）— 来自竞品比对+架构判断
- `[2026-07-03]` 权限底座延续既有 `auth.py` 体系，新实体追加 owner_id + visibility 字段 — 来自 DESIGN 预判

## 既有抽象索引（续 · 本次 change 将新增）

> 以下为 2-design 阶段将填充的抽象索引占位，防止 AI 重复实现：
> - Agent 运行时抽象层（LangChain/LangGraph 适配）
> - 工作流引擎（DAG 解析 + 节点调度 + 快照管理）
> - MCP 进程管理器（端口分配 + 进程隔离 + 生命周期管理）
