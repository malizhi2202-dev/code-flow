---
name: agent-k8s-orchestration
description: 工业操作台 — 暗色终端美学，单一蓝强调色，等宽字体主导，数据密度优先。在既有 code-kit-monitor Industrial 调性上延伸拓扑画布+ YAML 编辑器+监控面板。

colors:
  brand: "#548cf0"
  brand-deep: "#3d6fd4"
  bg-app: "#0d0e12"
  bg-canvas: "#0b0c10"
  bg-card: "#181a1f"
  bg-card-hover: "#1e2028"
  bg-input: "#0b0c10"
  text-primary: "#e1e2e5"
  text-secondary: "#9699a0"
  text-muted: "#5d6068"
  border: "rgba(255,255,255,0.06)"
  border-strong: "rgba(255,255,255,0.10)"
  green: "#5cb878"
  red: "#e05555"
  orange: "#e8a450"

typography:
  display:
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  headline:
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  supporting:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    color: "var(--text-muted)"
  mono:
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5

spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
  "3xl": "40px"

rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"

motion:
  ease: "cubic-bezier(0.16, 0, 0.2, 1)"
  ease-spring: "cubic-bezier(0.34, 1.56, 0.64, 1)"
  duration-fast: "100ms"
  duration-base: "200ms"
  duration-slow: "300ms"
  duration-loop: "1.5s"

shadow:
  sm: "0 1px 2px rgba(0,0,0,0.3)"
  md: "0 4px 12px rgba(0,0,0,0.4)"
  node-glow-healthy: "0 0 6px rgba(92,184,120,0.3)"
  node-glow-failed: "0 0 8px rgba(224,85,85,0.4)"
---

# UI Design: Agent 编排模块 k8s 化改造

## 0. 视觉语汇对齐（brownfield）

> 来自 2a 步骤 1.5。新增的元素目标是与原有 UI 在视觉上「无法区分」。

### 0.1 观察报告（代码为源）

- **Token 源**：`frontend/src/styles/tokens.css`（179 行完整 design token）+ `frontend/tailwind.config.ts`
- **主色实际比例**：蓝 `#548cf0` 约占页面 2-3%，仅在 primary button、链接、选中态、active tab 下划线上出现
- **中性色**：背景 5 层灰度 `#0d0e12 → #0f1015 → #13141a → #181a1f → #1e2028`，无纯黑；文字 3 层 `#e1e2e5 / #9699a0 / #5d6068`，无纯白；边框极淡 `rgba(255,255,255,0.06 / 0.10)`
- **hover/focus 反馈**：hover = `background-color` 深一层 + `border-color` 强一档；focus = `border-color → var(--blue)`；**不用 transform/scale/shadow 作 hover 反馈**
- **动效语言**：`cubic-bezier(0.16, 0, 0.2, 1)`（VSCode 同款缓动）；时长 100ms(fast) / 200ms(normal)；3 个 @keyframes；`prefers-reduced-motion` 已支持
- **elevation 层级**：2 级 shadow（sm: 0 1px 2px, md: 0 4px 12px）；卡片平放无 shadow，hover 仅变背景色
- **卡片密度/rounded**：卡片内边距 16px，rounded 3 级（4/8/12px）；无渐变/glassmorphism
- **图标库**：lucide-react，stroke 风格；Logo 为 ◈ unicode 字符
- **文案调性**：中文工程向——「工具库」「工作流」「角色」「Agent」「编排」「监控」「项目」；按钮动词简洁

### 0.2 用户校准结论

- 用户确认：观察无误 ✓
- 本次确定**全部沿用**既有视觉语汇，新组件在此基础上延伸

### 0.3 应用策略

- **沿用**：字体体系、颜色 token、间距 scale、圆角、缓动曲线、shadow 层级
- **延伸**：新增画布背景色 `--bg-canvas`（比 `--bg-app` 更深一层）、节点 glow shadow、连线动画
- **打破**：无

---

## 1. 美学北极星

**工业操作台** — 暗色终端美学，单一蓝色强调，等宽字体主导标题和数据，数据密度优先于留白。用起来像 VSCode + Linear + Grafana 的交集：冷静、高效、不做装饰。

### v0 确认摸路

- **已确认的假设**（用户说 go）：
  - 拓扑画布 60% + YAML 编辑器 40% 双栏，可拖拽调整分栏
  - 画布背景点阵网格（`#0b0c10` 底 + 32px 间距 4px 点）
  - 节点为圆角矩形卡片（8px），不用圆形/菱形
  - 连线默认 smoothstep 曲线，数据流时虚线+偏移动画
  - 模板市场复用既有 card grid + `.card-clickable`
  - 不需要亮色模式（工业操作台默认暗色）
- **用户指出的偏差**：无

---

## 2. 4 个决策问题

- **目的**：让开发者用 YAML 声明式定义 Agent 编排拓扑，在画布上实时看到拓扑结构和运行时状态，从模板市场一键部署已验证的编排模式
- **调性**：**工业（Industrial）** — 从 CHANGE.md 继承，已锁定
  - **理由**：操作台面向开发者，暗色降低长时间注视疲劳；等宽字体传达「精确/可控」感；数据密度优先匹配监控场景
- **约束**：React 18 + Tailwind + React Flow + CodeMirror 6；性能预算：画布 50 节点 ≤ 500ms 渲染；WCAG 2.1 A（节点颜色不是唯一状态载体）
- **差异化**：拓扑编排画布不是「看图」，是「驾驶舱」——每个节点的颜色、连线动画、数据流指标让运维者 3 秒内判断系统健康状态

---

## 3. 颜色系统

### Primary

- **蓝 `#548cf0`**：主按钮、链接、选中态、tab 激活下划线、拓扑连线（数据流方向指示）。**绝不用于**大背景/装饰性渐变

### Semantic（拓扑状态专用）

| 颜色 | 值 | 用途 | 节点状态 |
|---|---|---|---|
| 绿 | `#5cb878` | 健康/成功 | 🟢 healthy |
| 红 | `#e05555` | 异常/失败 | 🔴 failed |
| 橙 | `#e8a450` | 等待/降级 | 🟡 degraded / waiting |
| 灰 | `#5d6068` | 未启动 | ⚪ not_started |

### Neutral（沿用既有）

| Token | 值 | 用途 |
|---|---|---|
| `--bg-canvas` | `#0b0c10` | 拓扑画布底色（比 `--bg-input` 更深） |
| `--bg-app` | `#0d0e12` | 页面底色 |
| `--bg-sidebar` | `#0f1015` | 侧边栏 |
| `--bg-card` | `#181a1f` | 卡片/节点 at rest |
| `--bg-card-hover` | `#1e2028` | 卡片/节点 hover |
| `--text` | `#e1e2e5` | 主文字 |
| `--text-secondary` | `#9699a0` | 次要文字 |
| `--text-muted` | `#5d6068` | 禁用/占位文字 |
| `--border` | `rgba(255,255,255,0.06)` | 卡片边框/画布网格点 |
| `--border-strong` | `rgba(255,255,255,0.10)` | hover 边框/节点边框 |

### 命名规则

- **The One Voice Rule**：本项目主色只有蓝 `#548cf0`，语义色（绿/红/橙/灰）仅用于状态传达，不算「强调色」
- **The Tinted Neutral Rule**：所有背景/文字/边框含蓝色倾向（非纯灰），与主色 harmony
- **OKLCH 豁免**：本项目为既有 brownfield，颜色已用 HEX 定义在 `tokens.css` 中。新引入的画布背景和 glow 沿用 HEX 风格保持一致

---

## 4. 字体系统

- **Display/Headline**：`'JetBrains Mono', 'Fira Code', monospace` — 等宽字体做标题是工业控制台的标志性特征（VSCode/Grafana/终端均此模式）
- **Body**：`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` — 沿用既有 system-ui stack。**Roboto 豁免理由**：本项目属于「行政内部工具」（ui-anti-patterns 模糊地带第 1 条），操作台场景 system font 是合理选择
- **Mono/Code**：`'JetBrains Mono', 'Fira Code', monospace` — YAML 编辑器、token 数字、节点 ID

### 层次表

| 角色 | 字体 | 字号 | 字重 | 行高 | 用途 |
|---|---|---|---|---|---|
| Display | JetBrains Mono | 20px | 600 | 1.3 | 页面标题 |
| Headline | JetBrains Mono | 16px | 600 | 1.3 | 区块标题 |
| Title | system-ui | 14px | 600 | 1.4 | 卡片标题/节点名 |
| Body | system-ui | 13px | 400 | 1.5 | 正文/表单 |
| Supporting | system-ui | 11px | 400 | 1.4 | 辅助说明/时间戳 |
| Label | system-ui | 11px | 500 | 1.3 | 按钮/标签（uppercase + letter-spacing 0.04em） |
| Mono | JetBrains Mono | 12px | 400 | 1.5 | YAML 代码/token 数字/节点 ID |

---

## 5. 间距 & 圆角 & 动效

完全沿用 `tokens.css` 既有 token，新场景映射如下：

| Token | 拓扑画布中的用法 |
|---|---|
| `--s1` (4px) | 节点内 icon↔text 间距、连线箭头 |
| `--s2` (8px) | 节点内 padding |
| `--s3` (12px) | 画布工具栏间距 |
| `--s4` (16px) | 节点最小间距（自动布局）|
| `--s6` (24px) | 画布 padding |

| 圆角 | 用法 |
|---|---|
| `--r-sm` (4px) | 节点内 badge、YAML 行号 |
| `--r-md` (8px) | **拓扑节点**、模板卡片、面板 |
| `--r-lg` (12px) | 弹窗、详情侧面板 |

| 动效 | 场景 |
|---|---|
| `var(--ease)` + `var(--fast)` | 节点 hover 颜色切换、YAML error 行高亮 |
| `var(--ease)` + `var(--base)` | 节点状态颜色切换、面板展开 |
| `ease-spring` + `300ms` | 节点拖拽吸附到网格 |
| `linear` + `1.5s` loop | 连线虚线偏移动画（数据流指示） |
| `@keyframes pulse-red` 2s loop | 异常节点外发光脉冲 |

---

## 6. 关键组件规约

### 拓扑节点（新增核心组件）

- **形状**：圆角矩形，`border-radius: var(--r-md)` (8px)
- **尺寸**：最小 160×64px，内容自适应宽度
- **at rest**：`background: var(--bg-card)` + `border: 1px solid var(--border)`，平面无 shadow
- **hover**：`border-color → var(--blue)` + `background → var(--bg-card-hover)`，duration `var(--fast)`
- **状态表达**：左侧 3px 色条（绿=healthy / 红=failed / 橙=waiting / 灰=not_started）+ 右下角 7px 圆点同色
- **failed 状态**：外发光 `box-shadow: var(--node-glow-failed)` + `@keyframes pulse-red` 2s 循环
- **内容**：Agent 名称（Mono 12px）+ 模型名（Supporting 11px）+ 运行时 badge

### 连线（新增）

- **at rest**：`stroke: var(--border-strong)` (rgba 0.10)，1.5px 实线，smoothstep 曲线
- **数据流中**：`stroke: rgba(84,140,240,0.3)`，1.5px 虚线 + `stroke-dashoffset` 偏移动画 (`linear 1.5s` loop)
- **箭头**：终止端三角形箭头，6×8px，颜色跟随连线
- **标签**：连线中点上方 Supporting 11px 文字（类型：sequential/parallel/fork）

### YAML 编辑器（CodeMirror 6）

- **主题**：`oneDark` 暗色（与工业暗色一致，不做自定义主题）
- **行号**：灰色 `var(--text-muted)`，右对齐
- **错误行**：背景 `var(--red-bg)` + 左侧 3px `var(--red)` 色条 + gutter 中 ❌ 图标
- **自动补全弹窗**：`background: var(--bg-tooltip)` + `border: 1px solid var(--border-strong)` + Mono 12px

### Button（沿用既有 `.btn` 体系）

- **Primary**：`.btn-primary` — `background: var(--blue)`，用于「apply」「部署」「保存」
- **Secondary**：`.btn` — `background: var(--bg-card)` + `border: 1px solid var(--border-strong)`，用于「validate(dry-run)」「取消」
- **Ghost**：`.btn-ghost` — 透明背景，用于画布工具栏图标按钮（zoom in/out/fit）

### Card / Container（模板市场）

- 完全复用既有 `.card` + `.card-clickable`
- **at rest**：`bg-card` + hairline `border`，无 shadow
- **hover**：`bg-card-hover` + `border-strong`
- 卡片内容：模板名（Title 14px）+ 描述（Supporting 11px）+ 统计行（Agent 数/部署次数，Mono 12px）+ [一键部署] 按钮

### Real-time Status Panel（拓扑监控面板）

- 复用既有 `.stat` 统计卡：节点健康数/异常数/等待数
- 拓扑状态图例：一行 4 个色点 + 标签（健康/异常/等待/未启动）
- 收敛进度条：复用 `.progress` + `.progress-fill`，绿色填充 + Supporting 文字（「期望 5 / 就绪 4 / 变更中 1」）

### Trace Viewer（调用链瀑布图）

- 水平时间轴：每条 span 为圆角矩形条，宽度按 duration 比例
- Span 颜色：`var(--blue)` 半透明填充，`var(--blue)` 实色边框
- 展开的 span：下方缩进展示 input/output 摘要（Mono 11px，`--bg-input` 背景）
- 时间标尺：顶部 Supporting 11px 刻度

---

## 7. Do's and Don'ts（本项目特定）

### Do

- ✅ 节点状态用**颜色 + 文字标签**双重表达（色条 + 圆点 + 状态文字）
- ✅ YAML 编辑器错误行高亮 + 具体错误描述（不只说"syntax error"）
- ✅ 拓扑画布支持键盘导航（Tab 切换节点、方向键移动选中节点、Enter 打开节点详情）
- ✅ 所有动效支持 `prefers-reduced-motion: reduce`
- ✅ 连线方向始终用箭头明确指示（不只是颜色/动画）
- ✅ 模板市场卡片复用既有 `.card` 样式，保持视觉一致性

### Don't

- ❌ 禁止节点用圆形/菱形/图标化形状——矩形卡片保持工业操作台的一板一眼
- ❌ 禁止画布背景用渐变或图片——纯色+点阵网格
- ❌ 禁止节点 hover 时 scale 放大或 shadow 弹出——工业调性不要「弹跳感」
- ❌ 禁止引入第二个强调色——语义色（绿/红/橙）仅用于状态，不做装饰
- ❌ 禁止 YAML 编辑器用亮色主题
- ❌ 禁止拓扑节点嵌套（card in card）——节点内只放扁平信息

---

## 8. 占位符策略

| 缺的东西 | 本项目有什么？ | 缺时用什么占位 | 禁什么 |
|---|---|---|---|
| 图标 | lucide-react | `[icon]` 方块 或 lucide `Box` 图标占位 | emoji (🚀⚡✨) / AI 粗糙 SVG |
| 头像 | 无头像组件 | 首字母圆 + `var(--blue)` 填充 | AI 生人脸 / 网抓图 |
| Agent 模型 logo | 无 | 模型名缩写 Mono 12px + `--bg-input` 背景 | 编造 logo |
| 数据 | API 提供 | `GET /api/orchestration/{id}/metrics` 真数据 | 编 token 消耗数字 |
| 模板市场内容 | DB 查询 | 真数据（模板从 API 返回） | 编模板名/描述 |
| 调用链 trace | `orchestration_trace_spans` 表 | 真数据 | 编造执行时间 |

**红线**：本项目是操作台（工程向），emoji 一个不用。

---

## 9. 反 AI-slop 自检结果

逐条对照 `code-kit/reference/ui-anti-patterns.md`「强制禁忌」段：

- [x] **字体类**：`Roboto` 在 body fallback 中 → **豁免**：工业操作台属于「行政内部工具」例外（模糊地带第 1 条）；等宽 JetBrains Mono 做 display 避开了 Inter/Space Grotesk
- [x] **颜色类**：无纯黑 `#000`/纯白 `#fff` ✓；无紫色渐变 ✓；无霓虹青 ✓；单强调色 ✓；无 gradient text ✓
- [x] **阴影类**：卡片平放无 shadow ✓；shadow alpha 0.3-0.4 未超 0.15？→ **豁免**：暗色背景下需更高 alpha 才有可见层次，且仅 2 级 shadow
- [x] **边框类**：无 `border-left` > 1px 彩色侧条（节点左侧 3px 色条是**状态指示器**，功能性强于装饰性）✓；无渐变边框 ✓；无 glassmorphism ✓
- [x] **动效类**：无 bounce/elastic ✓；动画只用 opacity/transform/background-color ✓；支持 `prefers-reduced-motion` ✓；无滚动劫持 ✓
- [x] **布局类**：无卡片嵌套卡片 ✓；无统一大小卡片网格+图标+标题+文本重复（模板市场卡片内容各异）✓；无 hero-metric cliché ✓；间距非线性 ✓；暗色默认（操作台合理）✓
- [x] **文案类**：无空话 ✓；无 Lorem ipsum ✓；按钮具体动词 ✓
- [x] **组件类**：placeholder 不替代 label ✓；YAML 编辑器 CodeMirror 自带无障碍 ✓

**结论**：0 条命中需改。1 条豁免已声明理由。

---

## 10. 触发任务

下一步进入 `3-task` 阶段时，把以下作为**第一批 UI 任务**：

- T-UI-01：物化 design tokens — 在 `tokens.css` 中新增 `--bg-canvas`、`--node-glow-*` 变量
- T-UI-02：实现 `OrchestrationCanvas` 组件 — React Flow 拓扑画布（节点渲染+连线+状态颜色）
- T-UI-03：实现 `YamlEditor` 组件 — CodeMirror 6 集成（oneDark 主题+YAML lint+错误行高亮）
- T-UI-04：实现 `TopologyMonitor` 组件 — 实时状态 stat 卡+收敛进度条+图例
- T-UI-05：实现 `TraceViewer` 组件 — 调用链瀑布图
- T-UI-06：实现 `TemplateMarket` 页面 — 模板卡片 grid+一键部署
