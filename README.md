# code-flow

> **AI 编程流程框架 + 可视化面板** — code-kit（流程规范）+ code-kit-monitor（Web 面板），一个管怎么开发，一个管看得见

---

## 解决什么问题

AI 编程工具（Claude Code、Cursor、Copilot）能写代码，但缺少结构化的开发流程。`code-flow` 提供一套可复用的流程框架和可视化面板，辅助 AI 辅助开发的各个环节。

---

## 这是什么

`code-flow` 是一个 monorepo，包含两个互补的部分：

| 部分 | 路径 | 是什么 |
|---|---|---|
| **code-kit** | `code-kit/` | 纯 Markdown 的 AI 编程流程框架 —— 10 阶段主流程 + 8 道专家团门禁 + 12 个领域角色 |
| **code-kit-monitor** | `code-kit-monitor/` | Web 监控面板 —— 可视化 code-kit 工作流进度、Agent 编排、对话中心、Token 消耗 |

**关系**：code-kit 定义「怎么开发」，code-kit-monitor 提供「看得见的界面」。两者独立可用，合在一起构成完整的 AI 开发工具链。

---

## code-kit — AI 编程流程框架

一套**零依赖**的 Markdown 文件集合。clone 到任何项目根目录即可使用，不依赖任何 CLI 或运行时。

### 核心流程

```
0-change → 1-requirement → 2-design → [2a-ui-design] → 3-task → 4-dev → 5-test → 6-review → 7-integration → ARCHIVE
```

每个阶段产出结构化 `.md` 工件，存入 `.specs/<change-id>/`。

### 关键能力

- **自动路由**：`@code-kit/GO.md` + 一句话意图，自动判断阶段
- **8 道专家团门禁**：12 个领域角色 × 3 轮对抗审查，全票/多数通过自动进入下一阶段
- **逐 Task 自动化投票**：专家按 7 维框架判定 🤖自动化 或 👤人工
- **老项目 5 道护栏**：入场扫描、架构对齐、文件边界、破坏性变更检测、防重复实现
- **纯 Markdown**：任何 AI IDE 都能用（Windsurf / Cursor / Claude Code / Hermes / Copilot）

### 适配 Hermes Agent

```
# Skills 导入（已配置）
~/.hermes/skills/flow-*/    ← 25 个阶段 skill

# 项目规则注入
.hermes.md                  ← 自动加载 SYSTEM.md 规则

# 使用方式
@code-kit/GO.md
设计一个陪诊网站
```

---

## code-kit-monitor — Web 监控面板

全栈 SPA（React + FastAPI），为 code-kit 工作流提供可视化界面。

### 功能模块

**🎛 监控面板**
- Change 进度追踪 + Task 状态 + 专家团门禁投票可视化
- Token 消耗统计 + 运行时 Session 监控
- 产物文档查看与批注

**🤖 Agent 编排**（核心）
- YAML ↔ 拓扑画布双向同步
- 13 种连线策略（sequential/pipeline/parallel/fan-out/fan-in 等）
- Reconcile Loop 声明式调度
- 跨 Agent 调用链追踪 + 拓扑监控

**💬 对话中心**
- 侧边栏独立入口，类 ChatGPT 交互
- 飞书/钉钉渠道消息中继
- OAuth 扫码接入 + Mock 开发模式

**🧩 工具库 + 工作流**
- Plugin / Skill / MCP 管理
- 文本声明 + 可视化 DAG 两种工作流定义方式
- 模板市场

**📊 项目管理**
- 需求文档输入 → 绑定 Agent + 工作流 → 执行 → 监控

**🔒 安全**
- RBAC 权限 + 凭证加密存储 + 全操作审计日志

### 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Tailwind + Tremor + React Flow + Recharts |
| 状态管理 | Zustand（9 stores） |
| 后端 | FastAPI + SQLAlchemy + SQLite/MySQL + Redis |
| 编辑器 | CodeMirror 6 / YAML |

**代码规模**：后端 97 .py + 前端 89 ts/tsx + 12 个测试文件

---

## 项目结构

```
code-flow/
├── code-kit/                    # AI 编程流程框架（纯 Markdown）
│   ├── GO.md                    # 统一入口（自动路由）
│   ├── METHODOLOGY.md           # 方法论骨架
│   ├── RULES.md                 # 系统级硬规则
│   ├── SYSTEM.md                # 精简注入版
│   ├── prompts/                 # 阶段 prompt + 角色定义
│   ├── templates/               # 工件模板
│   └── reference/               # 参考文档
├── code-kit-monitor/            # Web 监控面板
│   ├── backend/                 # FastAPI 后端（97 .py）
│   │   ├── routes/              # 24 个 API 路由
│   │   ├── models/              # 13 个 ORM 模型
│   │   ├── services/            # 20 个业务服务
│   │   ├── engine/              # 编排引擎（Reconcile Loop/Scheduler）
│   │   ├── storage/             # 存储抽象（Memory/SQLite/MySQL）
│   │   ├── runtime/             # 运行时适配器（Claude Code/Codex/Hermes）
│   │   └── tests/               # 7 个测试文件
│   └── frontend/                # React 前端（89 ts/tsx）
│       ├── src/pages/           # 20 个页面
│       ├── src/components/      # 25 个组件
│       ├── src/stores/          # 9 个 Zustand Store
│       ├── src/__tests__/       # 5 个测试文件
│       └── src/styles/          # Design tokens
├── .specs/                      # 项目规范 + AI 产物
│   ├── CONTEXT.md               # 项目共享上下文
│   ├── LESSONS.md               # 跨任务失败知识库
│   └── <change-id>/             # 各 change 产物目录
├── .hermes.md                   # Hermes Agent 项目规则
├── CLAUDE.md                    # Claude Code 项目规则
├── STATE.md                     # 跨会话状态
└── README.md                    # 本文件
```

---

## 快速开始

### code-kit（框架）

```bash
# 复制到你的项目根目录即可，零安装
cp -r code-flow/code-kit/ your-project/code-kit/
```

然后在 AI IDE 中：
```
@code-kit/GO.md
<你的需求>
```

### code-kit-monitor（面板）

```bash
# 后端
cd code-kit-monitor/backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 前端（新终端）
cd code-kit-monitor/frontend
npm install
npm run dev

# 浏览器打开 http://localhost:5173
```

---

## License

- `code-flow`（本仓库整体）：Private. All rights reserved.
- `code-kit/`（子模块）：MIT License © 2026 rihebty
