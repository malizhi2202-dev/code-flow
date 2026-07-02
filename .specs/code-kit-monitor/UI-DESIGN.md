# UI-DESIGN: code-kit 工作流监控面板

- **Change ID**: `code-kit-monitor`
- **关联**: `CHANGE.md`（视觉调性）· `DESIGN.md ## 0`（技术栈）· `REQUIREMENT.md`（AC）
- **调性**: 3️⃣ 工业（Industrial）— 从 CHANGE.md 继承，本阶段不重选

---

## 1. 美学北极星

### 1.1 四个问题

- **目的**：开发者/团队 lead 快速感知 code-kit 工作流状态——哪些 change 活跃、哪个 task 卡住了、门禁过了没、token 烧了多少
- **调性**：工业 — 等宽字 / 暴露网格 / 冷色温 / 数据密度（对标 Grafana、Datadog）
- **约束**：React + Vite + Tremor + Tailwind / 暗色默认 / localhost / WCAG AA 亮色
- **差异化**：「一屏看清全链路」——不做花哨图表，做信息密度最高的监控面板

### 1.2 v0 确认记录

- v0 布局（卡片网格首页 + tab 详情页）→ 确认
- 暗色默认 + 手动切换亮色 → 确认
- 图表用 Recharts，不做 ECharts → 确认
- 图标用 Lucide React → 确认
- 无渐变/毛玻璃/emoji → 确认
- 数据缺失用 `[待填]` 标签 → 确认

---

## 2. 设计令牌（Design Tokens）

### 2.1 颜色 · 暗色主题（默认）

```css
:root[data-theme="dark"] {
  /* 背景层级 */
  --color-bg:           oklch(0.12 0.01 260);   /* 主背景 · 近黑带蓝 */
  --color-surface:      oklch(0.18 0.01 260);   /* 卡片/面板 */
  --color-elevated:     oklch(0.22 0.01 260);   /* 悬浮/弹出层 */

  /* 主色 */
  --color-primary:      oklch(0.65 0.18 230);   /* 冷蓝 · 按钮/链接/进度 */
  --color-primary-hover:oklch(0.72 0.18 230);

  /* 语义色 */
  --color-success:      oklch(0.65 0.16 150);   /* ✅ 通过/正常 */
  --color-danger:       oklch(0.55 0.22 25);    /* 🔴 告警/中断 */
  --color-warning:      oklch(0.70 0.15 85);    /* ⚠️ 警告/平票 */
  --color-info:         oklch(0.60 0.10 200);   /* ℹ️ 信息 */

  /* 文字 */
  --color-text:         oklch(0.85 0.01 260);   /* 正文 */
  --color-text-secondary: oklch(0.65 0.01 260); /* 辅助 */
  --color-text-dim:     oklch(0.45 0.01 260);   /* 禁用/占位 */

  /* 网格线 */
  --color-grid:         oklch(0.25 0.01 260);   /* 暴露网格 */
  --color-border:       oklch(0.28 0.01 260);   /* 分隔线/边框 */
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
}
```

### 2.3 字体

```css
:root {
  --font-display:  'JetBrains Mono', 'Fira Code', monospace;  /* 标题/数字/code */
  --font-body:     'IBM Plex Sans', -apple-system, sans-serif; /* 正文/UI */
}
```

字体加载策略：`font-display: swap`，子集化 latin + latin-ext。JetBrains Mono 使用 Variable 版本（`wght` 轴 100–800）。

### 2.4 间距

```
--space-0:  0
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  24px
--space-6:  32px
--space-7:  48px
--space-8:  64px
```

紧凑向：数据密集型面板默认走 4px 基准。卡片内边距 16px，卡片间距 12px。

### 2.5 圆角

```
--radius-none:   0      /* 面板/表格/网格 */
--radius-sm:     4px    /* 按钮/输入框/标签 */
--radius-md:     8px    /* 卡片 */
```

最多 3 个值，不引入 > 8px 圆角（违背工业风）。

### 2.6 动效

```css
:root {
  --easing-standard:   cubic-bezier(0.16, 1, 0.3, 1);  /* 工业弹簧，不弹 */
  --duration-micro:    150ms;  /* hover/焦点 */
  --duration-standard: 300ms;  /* 过渡/展开 */
  --duration-slow:     500ms;  /* 页面切换 */

  /* 中断任务脉冲 */
  --pulse-duration:    2s;
  --pulse-easing:      ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-micro:    0ms;
    --duration-standard: 0ms;
    --duration-slow:     0ms;
    --pulse-duration:    0ms;
  }
}
```

**禁止**：bounce、elastic 缓动、动画改变 layout 属性（width/height/top/left）。

### 2.7 阴影（克制）

```
--shadow-none:  none;                    /* at rest · 默认平面 */
--shadow-sm:    0 1px 2px oklch(0 0 0 / 0.08);   /* hover 微抬 */
--shadow-md:    0 4px 8px oklch(0 0 0 / 0.12);   /* 弹出层 */
```

工业风默认平面（at rest 无阴影）。hover 时微抬（alpha ≤ 0.15）。无大阴影、无彩色阴影。

---

## 3. 字体层级

| Token | 字体 | 大小 | 字重 | 行高 | 用途 |
|---|---|---|---|---|---|
| `text-display` | JetBrains Mono | 24px | 600 | 1.3 | 页面标题/change-id |
| `text-headline` | JetBrains Mono | 18px | 600 | 1.3 | 区块标题 |
| `text-title` | IBM Plex Sans | 16px | 600 | 1.4 | 卡片标题 |
| `text-body` | IBM Plex Sans | 14px | 400 | 1.5 | 正文 |
| `text-supporting` | IBM Plex Sans | 12px | 400 | 1.5 | 辅助信息/时间戳 |
| `text-label` | IBM Plex Sans | 11px | 500 | 1.4 | 标签/徽标 |
| `text-mono` | JetBrains Mono | 13px | 400 | 1.5 | 代码/token 数字/commit hash |
| `text-micro` | JetBrains Mono | 10px | 400 | 1.4 | 微小数据/脚注 |

---

## 4. 关键组件规约

### 4.1 首页 · Change 卡片

```
┌──────────────────────────────────────┐
│ 🔴 中断                              │ ← 状态标记（颜色+图标双重）
│ add-auth                     4-dev   │ ← change-id(mono) + 阶段(badge)
│ ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱ 3/5 task      │ ← 进度条(Tremor ProgressBar)
│ T03 暂停 · G3 待审                  │ ← 关键状态一行
│                           [恢复 →]  │ ← CTA
└──────────────────────────────────────┘
```

- 状态色：🟢 正常(无边框) / 🟡 阻塞(warning 左边框 2px) / 🔴 中断(danger 左边框 2px + 脉冲动画)
- 中断卡片置顶，背景 `--color-elevated`，左边框脉冲 `@keyframes pulse-border`
- at rest 平面（无阴影），hover 微抬 `shadow-sm` + `translateY(-1px)`
- 圆角 `--radius-md`（8px），内边距 16px

### 4.2 详情页 · Tab 导航

```
[工作流] [Task] [门禁] [产物] [健康]
───────                              ← 选中 tab 下划线 2px primary
```

- Tab 切换无页面跳转（同级内容区替换），过渡 `duration-standard` opacity
- 当前阶段对应的 tab 有 primary 色小圆点标记

### 4.3 门禁面板 · Gate 卡片

```
┌─ G1 需求门 ───────────────── ✅ ───┐
│ 🟫高级产品经理  ✅ 范围清晰         │
│ 🟦用户评测员    ✅ 痛点真实         │
│ 🟩架构师        ✅ 可行             │
│ 🔴安全审计师    ⚪ 弃权             │
│ 2026-07-02 14:32                   │
└────────────────────────────────────┘
```

- 每角色一行：角色色块(8×8px) + 角色名 + 投票(✅/❌/⚪) + 理由摘要(≤1 行省略)
- 未触发的 gate 灰色 + `等待中`
- 通过 → success 边框 / 拒绝 → danger 边框 / 平票 → warning 边框
- 展开查看完整投票理由

### 4.4 Task 面板 · 波次列表

```
Wave 1 ▰▰▰▰ 2/2 done
  T01 🤖 React 项目脚手架        ✅ done
  T02 🤖 FastAPI 项目初始化       ✅ done
Wave 2 ▰▱▱▱ 0/3 done
  T03 🤖 解析引擎·SectionParser  ○ pending
  T04 👤 解析引擎·XMLTaskParser  ○ pending  ← 人工确认
  T05 🤖 文件扫描器               ○ pending
```

- 🤖 = 自动化（蓝色标签）/ 👤 = 人工（橙色标签 + `[确认]` 按钮）
- 每个 task 行：id + auto标记 + name + status(pending/in_progress/done/blocked)
- 重试次数：`🔄×2` 红色标记（如 > 0）

### 4.5 产物查看器

```
┌─ CHANGE.md ─────────────────────────┐
│ [markdown 渲染内容]                  │
│                                      │
│                                      │
├─ 批注 ──────────────────────────────┤
│ 💬 "这里 v1 范围建议加 AC-12"       │ ← 纯前端存储
│ [+ 添加批注]                         │
└──────────────────────────────────────┘
```

- Markdown 渲染（代码高亮、表格、checkbox）
- 批注区在底部，输入框 + 时间戳，不写回文件
- 无编辑功能（v2 才做）
- 全屏宽度，`--color-bg` 背景

### 4.6 顶部状态栏

```
┌──────────────────────────────────────────────────────────┐
│ [🔴 1] [⚡ 3活跃]  本日 Token: 127,450  主题: 🌙 ⇅      │
└──────────────────────────────────────────────────────────┘
```

- 固定顶部，`--color-surface` 背景，底部 `--color-grid` 1px 分隔线
- 🔴 数字 = 中断/告警 change 数
- ⚡ 数字 = 活跃 change 数
- Token：JetBrains Mono 数字 + `本日 Token:` 标签
- 主题切换：图标按钮，无文字

### 4.7 搜索栏

```
🔍 搜索 change-id / 关键词...     [状态: 全部 ▼] [阶段: 全部 ▼]
```

- 输入框 `--radius-sm`，`JetBrains Mono` placeholder
- 实时过滤（前端，< 100 条无需后端），防抖 200ms
- 两个下拉筛选器：状态（全部/正常/阻塞/中断）+ 阶段（全部/0-change/.../7-integration）

---

## 5. 关键页面布局

### 5.1 首页

```
┌─ 顶部状态栏 ─────────────────────────────────────────────┐
├─ 搜索栏 ─────────────────────────────────────────────────┤
├──────────────────────────────────────────────────────────┤
│ ┌─中断卡片──┐ ┌─正常卡片──┐ ┌─正常卡片──┐               │
│ │           │ │           │ │           │               │
│ └───────────┘ └───────────┘ └───────────┘               │
│ ┌─阻塞卡片──┐ ┌─正常卡片──┐ ┌─正常卡片──┐               │
│ │           │ │           │ │           │               │
│ └───────────┘ └───────────┘ └───────────┘               │
│ ...                                                      │
├──────────────────────────────────────────────────────────┤
│ ▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎ 背景网格线 ▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎ │
└──────────────────────────────────────────────────────────┘
```

卡片网格：`grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))`，间距 12px。

### 5.2 详情页

```
┌─ 顶部状态栏 ─────────────────────────────────────────────┐
│ ← 返回    code-kit-monitor                                │
├─ [工作流] [Task] [门禁] [产物] [健康] ──────────────────┤
├──────────────────────────────────────────────────────────┤
│                                                          │
│  tab 内容区（最大宽度 1200px 居中）                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 5.3 工作流 Tab

水平时间线：8 个阶段节点（0→1→2→2a→3→4→5→6→7），每个节点：
- ✅ 已完成（success 填充）
- ● 当前（primary 填充 + 脉冲）
- ○ 未到达（`--color-grid` 描边）

阶段名下方小字显示通过日期/Gate 状态。

---

## 6. Do's and Don'ts

### ✅ Do

- 用等宽字体展示所有数据（数字/commit hash/token 计数）
- 信息通过颜色+图标+文字三种通道同时传达（告警 = 🔴图标 + danger色边框 + 文字）
- 背景使用 `--color-grid` 细线暴露网格（工业特征）
- 卡片 at rest 平面，hover 微抬
- 数据缺失时标注 `[待填]`，不编造
- 间距紧凑（4px 基准），单屏尽可能展示更多信息

### ❌ Don't

- ❌ 禁止渐变背景/渐变按钮
- ❌ 禁止毛玻璃效果（`backdrop-filter`）
- ❌ 禁止 emoji 图标（用 Lucide React）
- ❌ 禁止 > 8px 圆角
- ❌ 禁止彩色阴影或大阴影（alpha > 0.15）
- ❌ 禁止 bounce/elastic 动效
- ❌ 禁止默认字体（Inter/Roboto/Arial/system-ui）
- ❌ 禁止卡片内嵌套卡片
- ❌ 禁止纯黑 `#000` / 纯白 `#FFF`
- ❌ 禁止 lorem ipsum 或编造的统计数据

---

## 7. 占位符策略

| 缺的东西 | 正确做法 | 禁止做法 |
|---|---|---|
| 图标 | Lucide React 图标（stroke-width 1.5） | emoji 凑（🚀⚡✨） |
| 头像 | 无需头像（监控面板无社交功能） | — |
| 数据 | `--` 或 `[待填]` 标签 | 编造数字（"95% 通过率"） |
| change 数据 | 解析 `.specs/` 真实文件 | 硬编码示例数据 |
| token 数字 | `0` 或 `--`（无数据时） | 编造消耗量 |

---

## 8. 反 AI-slop 自检

逐条对照 `ui-anti-patterns.md`：

- [x] 字体类：JetBrains Mono + IBM Plex Sans，无 Inter/Roboto/Arial ✅
- [x] 颜色类：OKLCH 全色系，无纯黑纯白，无紫色渐变，无彩底灰字 ✅
- [x] 阴影类：at rest 平面，hover alpha ≤ 0.15 ✅
- [x] 边框类：无彩色侧条 > 1px，无玻璃拟态 ✅
- [x] 动效类：无 bounce/elastic，支持 reduced-motion ✅
- [x] 布局类：无卡片嵌套，无 SaaS hero-metric template ✅
- [x] 文案类：工程向，无 hedging，无 lorem ipsum ✅
- [x] 组件类：无 placeholder 充当 label，模态可 ESC 关闭 ✅

**0 命中 anti-pattern** ✅

### G2a 门禁修订

- 图表替代文本：Recharts 图表区域添加 `aria-describedby` 指向隐藏的 `<table>` 元素（数据表格形式）
- 轮询更新：数据刷新区域使用 `aria-live="polite"` + `aria-atomic="false"`（不打断读屏器）
- 亮色 WCAG 验证：5-test 阶段跑 `npx axe-core --chrome-options="prefers-color-scheme=light" <url>`
