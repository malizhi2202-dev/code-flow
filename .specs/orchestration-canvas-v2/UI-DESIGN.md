# UI Design: 编排画布 v2 — 双向同步 + 富连线配置

- **Change ID**: orchestration-canvas-v2
- **关联**: `agent-k8s-orchestration` UI-DESIGN.md（视觉基线）、`tokens.css`
- **调性**: Industrial（工业操作台）— 从 CHANGE.md 继承，已锁定

---

## 0. 视觉语汇对齐（brownfield）

> 本项目已有完整 design token 体系（`tokens.css` 179 行）+ 上一版 UI-DESIGN（agent-k8s-orchestration）覆盖拓扑画布/YAML 编辑器/模板市场/监控面板。

### 0.1 观察报告（代码为源）

- **Token 源**: `frontend/src/styles/tokens.css` — 5 层背景、4 个语义色、3 层文字、2 级边框、等宽+system-ui 双字体、8 级间距、3 级圆角
- **主色比例**: 蓝 `#548cf0` 约占页面 2-3%（主按钮、链接、选中态、tab 下划线）
- **交互反馈**: hover = `background-color` 深一层 + `border-color` 强一档；**不用 transform/scale/shadow 做 hover**
- **动效语言**: `cubic-bezier(0.16, 0, 0.2, 1)` + 100ms/200ms 两档；`prefers-reduced-motion` 已支持
- **elevation**: 2 级 shadow；卡片默认无 shadow，hover 仅变背景色
- **圆角**: 3 级（4/8/12px）— 画布节点 r-md、面板 r-lg
- **图标**: lucide-react，stroke 风格
- **文案**: 中文工程向 — 动词简洁（「Apply」「Validate」「保存」）
- **画布**: `--bg-canvas: #0b0c10` 点阵网格 32px，节点圆角矩形 + 左侧 3px 状态色条

### 0.2 用户校准结论

全部沿用既有工业操作台视觉语汇。本次新增组件在此基础上延伸。

### 0.3 应用策略

- **沿用**: tokens.css 全部变量、字体体系、间距 scale、圆角、缓动曲线、shadow 层级、反应色语义
- **延伸**: 本次新增：连线动画样式（6 种 Edge）、EdgeEditor 面板布局、NodePool 侧边栏、编排列表卡片
- **打破**: 无

---

## 1. 美学北极星

**工业操作台** — 暗色终端美学，单一蓝强调色，等宽字体主导标题，数据密度优先。新增的编排列表页和连线配置面板都保持这个调性：冷静、高效、不做装饰。

> 与上一版 agent-k8s-orchestration UI-DESIGN 完全一致。

---

## 2. 5 维美学决策

> (uipro 未检出，使用内置基线)

### 2.1 字体

- **沿用**: Display/Headline `JetBrains Mono` | Body `system-ui` | Code `JetBrains Mono 12px`
- **新增场景映射**:
  - 编排列表卡片标题 → Headline（16px/600）
  - 连线标签文字 → Mono 10px/400（画布上空间有限）
  - EdgeEditor 表单标签 → Label（11px/500/uppercase/letter-spacing 0.04em）
  - NodePool 列表项 → Body 13px/400

### 2.2 颜色

- **沿用**: 全部 tokens.css 变量
- **新增场景映射**:
  - 编排列表状态指示器 → 复用语义色（绿 running / 红 failed / 橙 degraded / 灰 stopped）
  - EdgeEditor 面板 → `bg-card` 底 + `border` 边框
  - 连线路径 at rest → `rgba(255,255,255,0.15)` 实线
  - 连线路径 hover → `var(--blue)` + strokeWidth 2px
  - NodePool 拖拽手柄 → `var(--blue)` 2px 左边框

### 2.3 间距

- **沿用**: 8 级间距 scale
- **新增场景映射**:
  - EdgeEditor 面板宽度 360px，内部字段间距 `--s3` (12px)
  - NodePool 侧边栏宽度 220px，列表项间距 `--s2` (8px)
  - 三栏布局最小宽度：YAML 280px / 画布 auto / EdgeEditor 360px
  - 画布工具栏间距 `--s3` (12px)

### 2.4 动效

- **沿用**: `cubic-bezier(0.16, 0, 0.2, 1)` + 100ms(fast)/200ms(base)
- **新增场景**:
  - 连线创建: 从 0 到 1 的 opacity + stroke-dashoffset 动画 (200ms)
  - EdgeEditor 面板: 从右侧滑入 (transform translateX, 200ms, ease)
  - 节点从 NodePool 拖入画布: drop 时 scale 1.05 → 1 弹入 (200ms, ease-spring)
  - 连线虚线偏移动画（数据流指示）: `linear 1.5s` loop（event-trigger/retry-fallback 类型专用）

### 2.5 EdgeEditor 面板布局

```
┌─────────────────────────────┐
│ ═ 连线配置: AgentA → AgentB │  ← Headline 16px
│                             │
│ 策略类型  [sequential  ▾ ]  │  ← select dropdown
│ 触发方式  [auto  ▾ ]        │
│ 触发条件  ┌──────────────┐  │
│           │ $.output...   │  │  ← CodeMirror (单行 JSON path)
│           └──────────────┘  │
│ 描述      ┌──────────────┐  │
│           │ 代码审查通过后  │  │  ← textarea 2 rows
│           │ 通知部署       │  │
│           └──────────────┘  │
│ ─────── 安全栅栏 ───────   │
│ 前置校验  [validate_sql ▾ ] │
│ 后置校验  [mask_pii ▾ ]     │
│ 数据过滤  [none ▾ ]         │
│ ─────── Token ───────────   │
│ 软限制    [80000       ]    │  ← number input
│ 硬限制    [100000      ]    │
│ ─────── IO Schema ───────  │
│ Input     ┌──────────────┐  │
│ (JSON)    │ {...}         │  │  ← CodeMirror mini (5 rows)
│           └──────────────┘  │
│ Output    ┌──────────────┐  │
│ (JSON)    │ {...}         │  │
│           └──────────────┘  │
│ ─────── 重试策略 ───────   │
│ 重试次数  [3          ]    │
│ 退避策略  [exponential ▾ ] │
│ 降级节点  [无 ▾ ]          │
│                             │
│ [删除连线]        [保存]    │  ← btn-ghost / btn-primary
└─────────────────────────────┘
```

**面板行为**:
- 创建连线后自动从右侧滑入
- 点击已有连线 → 面板滑入并加载配置
- 点击空白处/关闭按钮 → 面板滑出
- 删除连线 → 面板滑出 + 连线移除
- 字段变更即时保存到 zustand store，Apply 时一并提交

---

## 3. 新增组件视觉规约

### 3.1 编排列表卡片（OrchestrationListPage）

```
┌────────────────────────────────────────┐
│  ● my-orchestration         3 Agents   │  ← ●=状态色点 + Headline + 计数
│  running · 更新于 2 分钟前              │  ← Supporting 11px
│                                         │
│  [查看 MD] [查看 YAML] [编辑画布] [删除] │  ← btn-ghost × 4
└────────────────────────────────────────┘
```

- 卡片: `bg-card` + `border`，hover → `bg-card-hover` + `border-strong`
- 状态色点: 8px 圆点，绿/红/橙/灰
- 操作按钮: btn-ghost 样式，图标+文字，间距 `--s2`

### 3.2 连线自定义样式

| 类型 | 线型 | 颜色 | 标签 |
|---|---|---|---|
| sequential | 实线 1.5px + ▶ | `rgba(255,255,255,0.15)` | 「顺序」Mono 9px |
| parallel | 双线 1px + ▶▶ | `var(--green)` | 「并发」|
| fork | 分叉线 + ◆ | `var(--orange)` | 「条件: ...」|
| master-slave | 粗线 2.5px + ▶ | `var(--text-secondary)` | 「主→从」|
| event-trigger | 虚线 1.5px + 🕐 | `var(--text-muted)` | 「事件: ...」|
| retry-fallback | 虚线 1.5px + ↻ | `var(--red)` | 「重试×3」|

- 所有连线 hover → stroke 变 `var(--blue)` + strokeWidth +0.5px
- 所有连线选中 → stroke 变 `var(--blue)` + strokeWidth 2px
- 标签背景 `bg-card` + `border`，防遮挡连线

### 3.3 Agent 节点增强

在现有 OrchestrationNode（矩形卡片 + 左侧状态色条 + 右下状态圆点）基础上新增：

- **「详情」按钮**: 节点底部居中，btn-ghost 样式，图标 `ExternalLink` size=12，hover 时才显示
- **Input/Output handle**: React Flow Handle 组件，左侧 input ○ + 右侧 output ○，未连线时半透明（opacity 0.3），已连线时实色（opacity 1）
- **未连线 handle hover**: 放大 1.3× + `var(--blue)` 高亮，提示可拖拽

### 3.4 NodePool 侧边栏

```
┌─────────────────┐
│ 📦 Agent 节点池  │  ← Headline 14px
│                 │
│ ┌─────────────┐ │
│ │ reviewer    │ │  ← 可拖拽项 · bg-card + border
│ │ langgraph   │ │     hover: bg-card-hover + blue 左边框
│ │ gpt-4o      │ │     cursor: grab
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ reporter    │ │
│ │ langchain   │ │
│ │ gpt-4o      │ │
│ └─────────────┘ │
│                 │
│ [+ 添加 Agent]  │  ← btn-ghost 全宽，跳转 AgentBuilder
└─────────────────┘
```

- 宽度: 220px，可折叠（收起为 32px 图标条）
- 拖拽: React DnD / HTML5 drag API → drop 到画布创建新节点
- 列表已过滤已在画布上的 Agent（避免重复添加）

---

## 4. 反 AI-slop 自检

对照 `ui-anti-patterns.md` 强制禁忌：

- [x] **字体**: 无 Inter/Roboto/Space Grotesk，正文 system-ui 属于「行政内部工具」豁免；等宽 JetBrains Mono 做 headline ✓
- [x] **颜色**: 无纯黑/纯白 ✓；无紫色渐变 ✓；单强调色（蓝）✓
- [x] **阴影**: 卡片无 shadow ✓；节点仅 failed 状态有 glow shadow（功能性）✓
- [x] **边框**: 节点左侧 3px 色条是状态指示器（功能性）✓；无渐变边框 ✓
- [x] **动效**: 无 bounce/elastic ✓；`prefers-reduced-motion` ✓
- [x] **文案**: 动词简洁 ✓；无 Lorem ipsum ✓
- [x] **组件**: placeholder 不替代 label ✓；EdgeEditor 每个字段有 label

**结论**: 0 条命中需改。

---

## 5. 触发任务

下一步进入 3-task 时，UI 任务作为第一批：

- T-UI-01: EdgeEditor 面板组件（表单布局 + 所有字段）
- T-UI-02: 6 种自定义 Edge 组件（sequential/parallel/fork/master-slave/event-trigger/retry-fallback）
- T-UI-03: NodePool 侧边栏组件（Agent 列表 + 拖拽 + 折叠）
- T-UI-04: OrchestrationListPage 编排列表页
- T-UI-05: OrchestrationPage 重写 — 三栏布局 + 双向同步集成
- T-UI-06: OrchestrationCanvas 增强 — onConnect + 自定义 Edge 注册
