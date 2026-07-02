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

## 默认偏好（AI 在缺省时按此决策）

- 命名风格：Python snake_case / TypeScript camelCase 函数 + PascalCase 组件 + kebab-case 文件
- 提交格式：`<type>(<change-id>): <subject>`（与 code-kit 一致）
- 主题策略：默认暗色，亮色不低于 WCAG AA，暗色不做强制对比度要求

## 既有抽象索引（来自 I-intel-scan · 防 AI 重复实现 · B5 老项目护栏）

> greenfield 项目，暂无既有抽象。将在 2-design 和首次 intel-scan 后填充。
