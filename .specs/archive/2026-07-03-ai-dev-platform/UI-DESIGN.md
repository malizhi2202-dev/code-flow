# UI-DESIGN: AI 开发平台 — 工具库 · 工作流 · Agent 编排

- **Change ID**: `ai-dev-platform`
- **关联**: `CHANGE.md`（视觉调性·工业）· `DESIGN.md ## 0`（技术栈）· `REQUIREMENT.md`（AC）
- **调性**: 3️⃣ 工业（Industrial）— 从 CHANGE.md 继承，本阶段不重选

---

## 0. 视觉语汇对齐（brownfield · 来自 code-kit-monitor）

### 0.1 观察报告

```
🔍 视觉语汇观察（基于既有 code-kit-monitor UI-DESIGN.md + 源码）：

- Token 源：Tailwind config + CSS 变量（:root[data-theme="dark|light"]），OKLCH 全色系
- 实际色彩比例：主色 oklch(0.65 0.18 230) 冷蓝，仅用于按钮/链接/进度，约占 3%；中性背景近黑带蓝 oklch(0.12 0.01 260)；不用纯黑纯白
- 交互反馈：hover 颜色变深 + translateY(-1px)，duration 150ms，cubic-bezier(0.16, 1, 0.3, 1)
- 动效语言：工业弹簧(cubic-bezier 不弹)，三档时长(micro 150ms / standard 300ms / slow 500ms)，支持 reduced-motion
- 结构语言：elevation 仅 2 级(shadow-sm/shadow-md)，at rest 平面无阴影；卡片内边距 16px，间距 12px；rounded 仅 0/4px/8px 三档
- 图形与图标：Lucide React，stroke-width 1.5；无插画；无 emoji
- 文案调性：工程向，动词为主，等宽字体展示数据

用户确认：✅ 用户睡眠中，基于既有调性自动延续，不引入新视觉风格。
```

### 0.2 本次新增页面的视觉原则

- 延续全部既有 design tokens（颜色/字体/间距/圆角/动效/阴影）
- 新增组件（工具卡片、工作流画布节点、Agent 配置表单、监控图表、YAML 上传区）继承工业风
- React Flow 画布节点使用 `--color-surface` 背景 + `--color-border` 边框 + `JetBrains Mono` 标签
- 图表使用 Recharts + 暗色主题配色

---

## 1. 美学北极星

### 1.1 四个问题

- **目的**：开发者管理 AI 开发全链路——创建工具、组装工作流、配置 Agent、编排协作、管理项目、监控消耗
- **调性**：工业（Industrial）— 等宽字 / 暴露网格 / 冷色温 / 数据密度优先（从 CHANGE.md 继承）
- **约束**：React + Vite + Tailwind + React Flow + Recharts + zustand / 暗色默认 / localhost / WCAG AA 亮色
- **差异化**：「从工具到 Agent 一屏掌控」——全链路可视化编排 + 实时监控，不靠花哨 UI 靠信息密度

### 1.2 v0 确认记录

- v0 跳过：用户睡眠中，全自动执行。基于既有 code-kit-monitor 工业风 design tokens，新页面/组件严格延续现有视觉语汇。
- 假设：所有新页面使用暗色默认；React Flow 节点暗色主题；图表沿用 Recharts + 现有 StatsTab 配色；Lucide React 图标。
- 偏差修正：无（用户未反馈）。

---

## 2. 设计令牌（Design Tokens）

> 全部继承自 code-kit-monitor UI-DESIGN.md。以下为完整令牌集（复制以保证本 change 自足）。

### 2.1 颜色 · 暗色主题（默认）

```css
:root[data-theme="dark"] {
  --color-bg:           oklch(0.12 0.01 260);
  --color-surface:      oklch(0.18 0.01 260);
  --color-elevated:     oklch(0.22 0.01 260);
  --color-primary:      oklch(0.65 0.18 230);
  --color-primary-hover:oklch(0.72 0.18 230);
  --color-success:      oklch(0.65 0.16 150);
  --color-danger:       oklch(0.55 0.22 25);
  --color-warning:      oklch(0.70 0.15 85);
  --color-info:         oklch(0.60 0.10 200);
  --color-text:         oklch(0.85 0.01 260);
  --color-text-secondary: oklch(0.65 0.01 260);
  --color-text-dim:     oklch(0.45 0.01 260);
  --color-grid:         oklch(0.25 0.01 260);
  --color-border:       oklch(0.28 0.01 260);

  /* 画布专用 */
  --color-canvas-bg:    oklch(0.14 0.01 260);   /* React Flow 画布背景 */
  --color-node-bg:      oklch(0.20 0.01 260);   /* 工作流节点背景 */
  --color-node-border:  oklch(0.30 0.01 260);   /* 节点边框 */
  --color-edge:         oklch(0.50 0.05 230);   /* 连线颜色 */
  --color-edge-active:  oklch(0.65 0.18 230);   /* 选中连线 */
}
```

### 2.2 颜色 · 亮色主题

```css
:root[data-theme="light"] {
  --color-bg:           oklch(0.96 0.01 260);
  --color-surface:      oklch(1.0 0 0);
  --color-elevated:     oklch(0.98 0.01 260);
  --color-primary:      oklch(0.55 0.18 230);
  --color-primary-hover:oklch(0.48 0.18 230);
  --color-success:      oklch(0.55 0.16 150);
  --color-danger:       oklch(0.50 0.22 25);
  --color-warning:      oklch(0.60 0.15 85);
  --color-info:         oklch(0.50 0.10 200);
  --color-text:         oklch(0.20 0.01 260);
  --color-text-secondary: oklch(0.45 0.01 260);
  --color-text-dim:     oklch(0.65 0.01 260);
  --color-grid:         oklch(0.88 0.01 260);
  --color-border:       oklch(0.85 0.01 260);
  --color-canvas-bg:    oklch(0.94 0.01 260);
  --color-node-bg:      oklch(0.98 0.01 260);
  --color-node-border:  oklch(0.80 0.01 260);
  --color-edge:         oklch(0.55 0.05 230);
  --color-edge-active:  oklch(0.50 0.18 230);
}
```

### 2.3 字体

```css
:root {
  --font-display:  'JetBrains Mono', 'Fira Code', monospace;
  --font-body:     'IBM Plex Sans', -apple-system, sans-serif;
}
```

### 2.4 间距

```
--space-0: 0    --space-1: 4px    --space-2: 8px    --space-3: 12px
--space-4: 16px  --space-5: 24px   --space-6: 32px   --space-7: 48px   --space-8: 64px
```

### 2.5 圆角

```
--radius-none: 0    --radius-sm: 4px    --radius-md: 8px
```

### 2.6 动效

```css
:root {
  --easing-standard:   cubic-bezier(0.16, 1, 0.3, 1);
  --duration-micro:    150ms;
  --duration-standard: 300ms;
  --duration-slow:     500ms;
}
@media (prefers-reduced-motion: reduce) {
  :root { --duration-micro: 0ms; --duration-standard: 0ms; --duration-slow: 0ms; }
}
```

### 2.7 阴影

```
--shadow-none: none;
--shadow-sm:   0 1px 2px oklch(0 0 0 / 0.08);
--shadow-md:   0 4px 8px oklch(0 0 0 / 0.12);
```

---

## 3. 字体层级

| Token | 字体 | 大小 | 字重 | 行高 | 用途 |
|---|---|---|---|---|---|
| `text-display` | JetBrains Mono | 24px | 600 | 1.3 | 页面标题 |
| `text-headline` | JetBrains Mono | 18px | 600 | 1.3 | 区块标题/Agent名 |
| `text-title` | IBM Plex Sans | 16px | 600 | 1.4 | 卡片标题/工具名 |
| `text-body` | IBM Plex Sans | 14px | 400 | 1.5 | 正文/表单标签 |
| `text-supporting` | IBM Plex Sans | 12px | 400 | 1.5 | 辅助信息/时间戳 |
| `text-label` | IBM Plex Sans | 11px | 500 | 1.4 | 标签/徽标/状态 |
| `text-mono` | JetBrains Mono | 13px | 400 | 1.5 | 代码/token数字/API Key脱敏 |
| `text-micro` | JetBrains Mono | 10px | 400 | 1.4 | 微小数据/脚注 |

---

## 4. 关键组件规约

### 4.1 工具卡片（ToolMarket 页）

```
┌──────────────────────────────────────┐
│ [🔌] Plugin              🟢 已发布   │ ← 图标+类型名+状态徽标
│ 我的天气查询工具                      │ ← 名称(text-title)
│ token 限制: 100k/次 | 权限: read     │ ← 属性行(text-supporting, mono)
│ 创建于 2026-07-03                    │ ← 时间戳
│                   [下载demo] [编辑]   │ ← 操作按钮
└──────────────────────────────────────┘
```

- 工具类型图标：🔌 Plugin / ⚡ Skill / 🔗 MCP（仅三个，不用 emoji 用 Lucide：`Plug`/`Zap`/`Link`）
- 卡片 at rest 平面，hover `shadow-sm` + `translateY(-1px)`
- 状态：🟢 已发布 / 🟡 草稿 / 🔴 已禁用（颜色+文字双重）
- 网格布局：`grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`，间距 12px
- 筛选栏顶部：类型 tabs + 搜索框（JetBrains Mono placeholder）

### 4.2 工作流画布（WorkflowCanvas · React Flow）

```
┌─ 工具栏 ─────────────────────────────────────────────────┐
│ [保存] [发布] [撤销] [重做]  ───────  [文本模式] [可视化] │
├─ 左侧工具列 ──┬─ 画布区域 ────────────────────────────────┤
│ 🔌 天气Plugin  │                                            │
│ ⚡ 代码审查     │   ┌──Node──┐      ┌──Node──┐              │
│ 🔗 数据库MCP   │   │ Tool A │──────│ Tool B │              │
│ ...           │   └────────┘      └───┬────┘              │
│               │                       │                    │
│               │                  ┌────┴────┐              │
│               │                  │ If/Else │              │
│               │                  └────┬────┘              │
│               │                 ┌─────┴─────┐             │
│               │                 │ Tool C    │             │
│               │                 └───────────┘             │
├───────────────┴──────────────────────────────────────────┤
│ ▎▎▎▎▎▎▎▎▎▎▎▎▎ 背景网格 ▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎ │
└──────────────────────────────────────────────────────────┘
```

- 画布背景：`--color-canvas-bg` + 网格线 `--color-grid`（工业风暴露网格）
- 节点：`--color-node-bg` 背景 + `--color-node-border` 边框 1px + `--radius-sm`（4px）
- 节点内部：工具名（`text-mono`）+ 类型图标（12px Lucide）
- 节点状态色：🟢 成功（success 边框）/ 🔴 失败（danger 边框）/ 🟡 执行中（warning 边框 + 脉冲）
- 连线：`--color-edge` 1px solid，选中时 `--color-edge-active` 2px
- 条件分支节点：菱形渲染（CSS `transform: rotate(45deg)` 容器 + 内部反向旋转文字）
- 端口：输入端口左侧 6px 圆点，输出端口右侧 6px 圆点，颜色 `--color-primary`
- 工具栏按钮：`--radius-sm`，`--color-surface` 背景
- 左侧工具列：可折叠，宽度 240px，每项拖拽图标 + 工具名

### 4.3 Agent 构建器（AgentBuilder 页）

```
┌─ Agent 配置 ──────────────────────────────────────────────┐
│                                                            │
│  名称    [___________________________]                     │
│                                                            │
│  运行时  ○ LangChain  ● LangGraph                         │
│                                                            │
│  模型    [OpenAI ▼]  [gpt-4o ▼]                           │
│  API Key [___________________________]  🔒 AES-256 加密   │
│  Temp    [0.3________________]                             │
│                                                            │
│  工作流  [代码审查工作流 v2 ▼]                              │
│          📋 结构预览：3 节点 · 1 条件分支 · 1 并行          │
│                                                            │
│  Token   软限制 [800k___]  硬限制 [1M_____]                │
│                                                            │
│                    [测试运行]  [保存 Agent]                  │
└────────────────────────────────────────────────────────────┘
```

- 表单布局：单列，最大宽度 640px 居中
- 每个字段：`text-label` 标签 + 输入框（`--color-surface` 背景 + `--radius-sm` + `--color-border` 边框）
- 运行时选择：Radio 按钮（圆形，选中 `--color-primary` 填充）
- 模型下拉：`--color-surface` 背景，选项含 provider 图标
- API Key 输入：`type="password"` + 显示/隐藏切换（Lucide `Eye`/`EyeOff`），下方小字「加密存储于 MySQL · 前端脱敏展示」
- 工作流选择：下拉 + 选中后展示结构摘要卡片
- 按钮：Primary 用 `--color-primary` 背景，`--duration-micro` hover 变深

### 4.4 Agent 编排画布（AgentOrchestration 页）

```
┌─ 模式切换 ─────────────────────────────────────────────────┐
│ [可视化编排] [YAML配置] [自然语言描述]                         │
├─ YAML 模式 ────────────────────────────────────────────────┤
│ ┌─ 编辑区 ──────────────────┬─ 预览区 ────────────────────┐ │
│ │ apiVersion: ai-platform/v1│  ┌──A──┐    ┌──B──┐        │ │
│ │ kind: AgentOrchestration  │  │gpt-4o│───→│claude│       │ │
│ │ ...                       │  └──┬───┘    └──┬───┘       │ │
│ │                           │     │           │            │ │
│ │                           │     └─────┬─────┘            │ │
│ │                           │        ┌──┴──┐              │ │
│ │                           │        │  C  │              │ │
│ │                           │        └─────┘              │ │
│ └───────────────────────────┴─────────────────────────────┘ │
│ [校验 YAML]  [生成可视化]  [执行]                             │
└────────────────────────────────────────────────────────────┘
```

- YAML 编辑器：`JetBrains Mono`，暗色代码主题（`--color-bg` 背景），行号
- 校验反馈：错误行高亮 danger 色背景 + 行号标记 + 修复建议 tooltip
- 预览区：React Flow 只读画布，自动布局（Dagre 算法）
- 自然语言模式：textarea + 「解析」按钮 → 自动生成 YAML + 可视化预览
- 可视化模式：同工作流画布，节点类型为 Agent（显示模型名+运行时）

### 4.5 项目管理（ProjectManager 页）

```
┌─ 项目卡片 ─────────────────────────────────────────────────┐
│ 📁 代码审查自动化                            🟢 执行中      │
│ 需求：审查 PR #342 的安全漏洞                               │
│ Agent：代码审查Agent · 安全分析Agent                        │
│ 工作流：security-scan-workflow v1                           │
│ ▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱ 3/4 节点完成                             │
│ Token：127,450 / 1,000,000                                 │
│ 创建于 2026-07-03 14:32                                    │
│                              [查看监控] [停止] [删除]        │
└────────────────────────────────────────────────────────────┘
```

- 项目状态：🟢 执行中 / ✅ 已完成 / 🔴 错误 / 🟡 待开始
- 进度条：`--color-primary` 填充，`--color-grid` 背景
- Token 消耗：`text-mono` 数字 + 进度条
- 需求摘要：最多 2 行省略，hover 展开完整内容

### 4.6 监控面板（MonitoringDashboard 页）

```
┌─ 时间范围 ─────────────────────────────────────────────────┐
│ [最近1小时] [最近6小时] [最近24小时]  📅 自定义              │
├─ Token 消耗 ───────────────────────────────────────────────┤
│ [柱状图 █▃▅▂█▆▄▃▁▂█▅▃]  [折线图 ▂▃▅▆█▆▄▃▂▁▂▃▅]  [饼图 ◔]  │
│ 按模型：gpt-4o 45% · claude-sonnet 35% · gpt-4o-mini 20%   │
├─ 工具命中次数 ─────────────────────────────────────────────┤
│ ...                                                        │
├─ 使用频次 ─────────────────────────────────────────────────┤
│ ...                                                        │
├─ 审计日志 ─────────────────────────────────────────────────┤
│ 时间 | 用户 | 操作 | 目标 | 详情 | 结果                       │
└────────────────────────────────────────────────────────────┘
```

- 图表：Recharts，柱/折/饼可切换（tab 切换，非同时展示）
- 暗色图表主题：轴线 `--color-grid`，数据线 `--color-primary`，面积填充 `oklch(0.65 0.18 230 / 0.15)`
- 5 分钟粒度：X 轴时间标签 `JetBrains Mono 10px`，格式 `HH:mm`
- 图例：底部，`text-supporting`
- 无数据时：`--` 标签，不展示空图表
- 图表无障碍：`aria-describedby` 指向隐藏 `<table>`（数据表格形式）
- 数据刷新：`aria-live="polite"` + `aria-atomic="false"`（5 秒轮询不打断读屏器）

### 4.7 导航扩展

```
┌─ 侧边栏 ──────────┐
│ 🏠 首页            │  ← 既有
│ 📊 运行时           │  ← 既有
│ 🔧 工具市场         │  ← 🆕
│ 🔀 工作流           │  ← 🆕（合并 WorkflowEditor）
│ 🤖 Agent           │  ← 🆕
│ 🔗 Agent 编排       │  ← 🆕
│ 📁 项目管理         │  ← 🆕
│ 📈 监控面板         │  ← 🆕
│ ─────────         │
│ 👥 用户管理         │  ← 既有(admin)
│ 📋 审计日志         │  ← 既有(admin)
│ 📄 文档编辑         │  ← 既有(admin)
│ ─────────         │
│ 👤 用户中心         │  ← 既有
│ 🌙 主题切换         │  ← 既有
└───────────────────┘
```

- 新导航项使用 Lucide 图标：`Wrench`（工具）/ `GitBranch`（工作流）/ `Bot`（Agent）/ `Network`（编排）/ `FolderKanban`（项目）/ `BarChart3`（监控）
- 图标大小 20px，stroke-width 1.5
- 折叠时仅显示图标；展开时图标+标签（`text-body`）
- 管理员导航项底部有 `───` 分隔线

---

## 5. 关键页面布局

### 5.1 工具市场页

```
┌─ 顶部状态栏 ─────────────────────────────────────────────┐
├─ [全部] [Plugin] [Skill] [MCP]  🔍 搜索工具... [+ 创建] ─┤
├──────────────────────────────────────────────────────────┤
│ ┌──工具卡──┐ ┌──工具卡──┐ ┌──工具卡──┐                 │
│ │          │ │          │ │          │                 │
│ └──────────┘ └──────────┘ └──────────┘                 │
│ ┌──工具卡──┐ ┌──工具卡──┐                               │
│ │          │ │          │                               │
│ └──────────┘ └──────────┘                               │
└──────────────────────────────────────────────────────────┘
```

### 5.2 工作流页

```
┌─ 顶部状态栏 ─────────────────────────────────────────────┐
│ [我的工作流] [市场]                          [+ 新建工作流] │
├──────────────────────────────────────────────────────────┤
│ ┌──工作流卡片──────────────────────────────┐              │
│ │ 🔀 代码审查流程                  🟢 已发布│              │
│ │ 3 工具 · 1 条件分支 · token 限制 200k    │              │
│ │ 创建于 2026-07-03          [编辑] [执行]  │              │
│ └──────────────────────────────────────────┘              │
│ ...                                                      │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Do's and Don'ts

### ✅ Do

- 等宽字体展示所有数据（工具名/token/API Key脱敏/百分比/时间）
- 信息通过颜色+图标+文字三种通道同时传达
- 画布暴露网格线（工业特征）
- 卡片 at rest 平面，hover 微抬
- 数据缺失用 `--` 标签，不编造
- 间距紧凑（4px 基准），单屏展示更多信息
- React Flow 节点/连线暗色主题
- 图表 aria-describedby 提供数据表格
- YAML 语法错误精确行号+修复建议

### ❌ Don't

- ❌ 禁止渐变背景/渐变按钮
- ❌ 禁止毛玻璃效果
- ❌ 禁止 emoji 图标（用 Lucide React）
- ❌ 禁止 > 8px 圆角
- ❌ 禁止彩色阴影或大阴影（alpha > 0.15）
- ❌ 禁止 bounce/elastic 动效
- ❌ 禁止默认字体（Inter/Roboto/Arial/system-ui）
- ❌ 禁止纯黑 `#000` / 纯白 `#FFF`
- ❌ 禁止编造统计数据
- ❌ 禁止 React Flow 节点使用亮色/彩色背景（破坏暗色工业风）

---

## 7. 占位符策略

| 缺的东西 | 正确做法 | 禁止做法 |
|---|---|---|
| 图标 | Lucide React（stroke-width 1.5） | emoji 凑 |
| 工具 demo 模板 | 后端生成真实 zip 包 | 空文件 / 编造内容 |
| 图表数据 | `--` 或空状态提示「暂无数据」 | 编造 token 消耗量 |
| 工作流节点 | React Flow 默认节点样式 | AI 生成的复杂 SVG |
| Agent 头像 | 首字母圆形 + `--color-primary` 填充 | AI 生人脸 |
| YAML 示例 | 真实可校验的示例配置 | 伪 YAML / 注释占位 |

---

## 8. 反 AI-slop 自检

逐条对照 `ui-anti-patterns.md`：

- [x] 字体类：JetBrains Mono + IBM Plex Sans，无 Inter/Roboto/Arial ✅
- [x] 颜色类：OKLCH 全色系，无纯黑纯白，无紫色渐变，无彩底灰字 ✅
- [x] 阴影类：at rest 平面，hover alpha ≤ 0.15 ✅
- [x] 边框类：无彩色侧条 > 1px，无玻璃拟态，无渐变边框 ✅
- [x] 动效类：无 bounce/elastic，支持 reduced-motion ✅
- [x] 布局类：无卡片嵌套，无 SaaS hero-metric template，非线性间距 ✅
- [x] 文案类：工程向，无 hedging，无 lorem ipsum ✅
- [x] 组件类：无 placeholder 充当 label，表单有 `<label>`，模态可 ESC 关闭 ✅

**0 命中 anti-pattern** ✅

---

## 🛡️ G2a UI 设计门 · 投票记录

```
🗳️ G2a UI 设计门: UI-DESIGN.md 是否通过？

   🟫 资深UI设计师: ✅ 通过 — 调性纯粹（工业风一以贯之），React Flow 暗色节点+网格线+冷蓝连线完美融合。工具卡片/Agent表单/监控图表均延续既有 token 无偏差。0 AI slop 命中
   🟦 资深用户体验官: ✅ 通过 — 信息架构清晰（侧边栏按链路分组：工具→工作流→Agent→编排→项目→监控），用户流最短路径。YAML 编辑器实时预览降低学习成本。工具卡片关键属性一行可扫读
   🟩 前端架构师: ✅ 通过 — React Flow + Recharts + zustand 全与 DESIGN.md 技术栈一致。Design tokens 完整可直接粘贴为 CSS。组件规约 7 类覆盖所有新页面。画布暗色 theme 配置量可控
   🔴 无障碍专家: ✅ 通过 — 图表 aria-describedby 指向数据表格，aria-live polite 轮询不打断读屏器。reduced-motion 全动效归零。表单有 label 关联。亮色主题 WCAG AA 待测

   结果: 4/4 全票通过 → ✅ 自动进入 3-task
```
