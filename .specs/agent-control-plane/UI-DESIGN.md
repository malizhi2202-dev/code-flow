# UI-DESIGN: Agent 管控面

- **Change ID**: `agent-control-plane`
- **关联**: `@.specs/agent-control-plane/CHANGE.md`、`REQUIREMENT.md`、`DESIGN.md`
- **调性**: 工业（Industrial）— 暗色默认、等宽字体、数据密度优先、冷色温（继承项目既有调性）

---

## 0. 视觉语汇对齐（brownfield）

> 复用现有 `frontend/src/styles/tokens.css` + Tailwind 暗色主题 + Lucide React 图标库。
> 本项目已有完整 UI 体系，本 change 是新增页面，沿用不引入新风格。

观察报告：
- 主色：`var(--blue)` #548cf0，用于选中态、链接、primary button
- 背景：`var(--bg-main)` 暗色 / `var(--bg-card)` 卡片 / `var(--bg-sidebar)` 侧边栏
- 状态色：`var(--green)` / `var(--yellow)` / `var(--red)` / `var(--text-muted)`
- 字体：等宽 `var(--font-mono)` 用于代码/数据；系统字体用于正文
- 图标：Lucide React，stroke-width 1.5，尺寸 14/16/18/22
- 圆角：`var(--r-sm)` / `var(--r-md)` 两级
- 过渡：`var(--fast)` / `var(--normal)` 两档
- 交互：hover 颜色加深，无 transform 动画（工业风克制动效）
- 卡片：暗色背景 + 1px `var(--border)` 边框，无阴影

---

## 1. 美学北极星

- **目的**：运维面板，展示 Agent 实时状态。工程师/开发者使用，快速扫读定位异常
- **调性**：工业（Industrial）— 已锁定，不重选
- **约束**：WCAG 2.1 AA（状态色不能是唯一信息载体）；3 秒探针刷新；Chrome/Firefox/Edge
- **差异化**：「Agent 的 K8s Dashboard」— 一眼看清谁活着谁挂了，和 K8s Dashboard 一样的运维心智

---

## 2. 美学维度决策

### 字体

- **Display/标题**: 系统字体栈（`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`）— 工业风不引入装饰性字体
- **Body/正文**: 同上，13px 正文，11px 辅助文字
- **Mono/数据**: `var(--font-mono)` — 状态码、时间戳、Agent ID 用等宽

### 颜色（OKLCH）

```
主色（蓝）:    oklch(0.62 0.18 255) — 选中态、链接、primary button
成功（绿）:    oklch(0.65 0.19 155) — 空闲/健康状态指示灯
警告（黄）:    oklch(0.72 0.16 85)  — 运行中/排队状态
危险（红）:    oklch(0.58 0.22 25)  — 阻塞/死亡/失败
离线（灰）:    oklch(0.55 0.01 260) — 离线/未知状态
背景主:        oklch(0.15 0.01 260) — var(--bg-main)
背景卡片:      oklch(0.18 0.01 260) — var(--bg-card)
边框:          oklch(0.25 0.01 260) — var(--border)
文字主:        oklch(0.90 0.01 260) — var(--text-primary)
文字次:        oklch(0.60 0.01 260) — var(--text-secondary)
文字弱:        oklch(0.45 0.01 260) — var(--text-muted)
```

### 动效

- 缓动：`cubic-bezier(0.16, 1, 0.3, 1)` — 工业风弹簧感
- 时长：fast 150ms / normal 250ms — 克制，不花哨
- 探针状态指示灯：脉冲动画（`opacity` 呼吸），仅心跳正常的 Agent 显示，异常状态静态
- Tab 切换：`opacity` + `translateY(-2px)` 淡入，无大幅位移

### 空间

- 页面内边距：24px 水平 / 32px 垂直
- 卡片内边距：16px
- 间距 scale：4 / 8 / 12 / 16 / 24 / 32 px
- 圆角：`var(--r-sm)` 4px / `var(--r-md)` 8px — 工业风小圆角
- Agent 列表行高：40px，hover 时背景微亮

### 质感

- 纯色暗色背景，无渐变、噪点、网格
- 卡片：暗色填充 + 1px 边框，无阴影
- 选中态：左侧 3px 蓝色竖条（类似 IDE 文件树）
- 分隔线：1px `var(--border)`

---

## 3. 关键页面布局（v0 草稿）

### Agent 管控面主页（三层结构）

```
┌──────────────────────────────────────────────────────────┐
│  📡 Agent 管控                                          │
│                                                          │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ Agent 总数│  🟢 健康  │  🔴 异常  │  📋 队列  │          │  ← 概览卡片栏
│  │    12    │    9     │    3     │    7     │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│                                                          │
│  ┌─ Agent 列表 ─┬─ 调度队列 ──┬─ Reconcile ──┐          │  ← Tab 栏
│  │ 🟢 code-rev..│ 📋 T-042 →  │ 🔄 12:03 漂移  │          │
│  │ 🟡 code-rev..│ 📋 T-043 →  │ ✅ 12:01 修复  │          │
│  │ 🔴 translat..│ 📋 T-044 ⏳ │ ⚠️ 11:58 暂停  │          │
│  │ ...          │ ...         │ ...          │          │
│  └──────────────┴─────────────┴──────────────┘          │
│                                                          │
│  点击 Agent 行 → 展开详情面板（右侧滑出）                 │
└──────────────────────────────────────────────────────────┘
```

### Agent 详情面板（右侧滑出）

```
┌─ Agent 详情: code-reviewer-2 ──────────────────────┐
│  [重新调度] [强制重启] [暂停接收]                    │  ← 操作按钮
│                                                      │
│  ┌─ Heartbeat ─┬─ Capability ─┬─ Dependencies ─┐   │  ← 探针四分区
│  │ ● ● ● ● ○  │ ✅ API key   │ 🟢 reviewer-1  │   │
│  │ 最近5次通过  │ ✅ 模型可达   │ 🟡 tester-1    │   │
│  └─────────────┴──────────────┴────────────────┘   │
│                                                      │
│  ┌─ Load ──────────────────────────────────────┐   │
│  │ ████████░░  2/5 tasks  平均耗时 45s          │   │
│  │ 当前: T-042 code-review, T-043 lint          │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 调度器配置（admin 可见）

```
┌─ 调度器配置 ──────────────────────────────────────┐
│                                                     │
│  全局设置                                           │
│  负载均衡算法: [Least Connection ▼]                 │
│  最大修复重试: [3] (推荐 3, 范围 1-10)              │
│  探针间隔:     [3s] (推荐 3s, 最小 1s)              │
│                                                     │
│  Agent 标签管理                                     │
│  ┌──────────┬──────────┬──────┬──────────┐        │
│  │ Agent    │ 标签      │ 优先级│ 最大并发  │        │
│  │ reviewer │ code-rev  │ 高   │  5 ▾     │        │
│  │ tester   │ test,py   │ 中   │  3 ▾     │        │
│  └──────────┴──────────┴──────┴──────────┘        │
└─────────────────────────────────────────────────────┘
```

---

## 4. Design Tokens（CSS Variables）

```css
/* 管控面专属 token（在 tokens.css 追加） */
:root {
  /* 状态指示灯 */
  --cp-status-idle:    oklch(0.65 0.19 155);   /* 🟢 空闲 */
  --cp-status-running: oklch(0.72 0.16 85);    /* 🟡 运行中 */
  --cp-status-blocked: oklch(0.58 0.22 25);    /* 🔴 阻塞 */
  --cp-status-dead:    oklch(0.55 0.01 260);   /* ⚪ 死亡/离线 */
  --cp-status-failed:  oklch(0.55 0.22 20);    /* 🔴 失败 */

  /* 探针时间线 */
  --cp-probe-pass: oklch(0.65 0.19 155);       /* 探针通过 */
  --cp-probe-fail: oklch(0.58 0.22 25);        /* 探针失败 */

  /* 修复级别 */
  --cp-repair-safe:     oklch(0.65 0.19 155);   /* safe */
  --cp-repair-caution:  oklch(0.72 0.16 85);    /* caution */
  --cp-repair-dangerous: oklch(0.55 0.22 20);   /* dangerous */

  /* 调度器 */
  --cp-queue-pending:  oklch(0.72 0.16 85);     /* 排队中 */
  --cp-queue-assigned: oklch(0.62 0.18 255);    /* 已分配 */

  /* 详情面板 */
  --cp-detail-width: 420px;
  --cp-detail-bg: oklch(0.16 0.01 260);
}
```

---

## 5. 关键组件规约

### 状态指示灯

- 圆形 8px，实心填充对应状态色
- 空闲状态附加 `opacity` 脉冲动画（`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`），1.5s 周期
- 非空闲状态静态显示
- **必须**附带文字标签（"空闲"/"运行中"/"阻塞"/"死亡"），不能仅靠颜色传达

### 按钮

- Primary：`var(--blue)` 背景 + 白色文字，hover 亮度 +10%
- Danger：`var(--cp-repair-dangerous)` 背景 + 白色文字
- 操作按钮（重新调度/强制重启/暂停）：outline 样式，边框 `var(--border)`
- 过渡态：按钮文字变为 `[操作中…]`，加旋转 spinner 图标，disabled

### 卡片/容器

- 概览卡片：4 列网格，每卡片暗色背景 + 1px 边框，hover 无变换
- 点击卡片（异常数）→ 跳转并过滤 Agent 列表
- 详情面板：右侧滑出，宽度 420px，top: 0 / right: 0 / height: 100vh，带 backdrop 遮罩

### 导航

- 侧边栏新增入口：图标 `Radio` (lucide)，标签「Agent 管控」，位置在「Agent」之后、「编排」之前
- Tab 栏：「Agent 列表」「调度队列」「Reconcile 日志」三 tab

### 排版层级

- 页面标题：18px / weight 700 / `var(--text-primary)`
- Tab 标签：13px / weight 600（选中）/ 400（未选中）
- 卡片数值：24px / weight 700 / `var(--font-mono)`
- 卡片标签：10px / weight 600 / uppercase / `var(--text-muted)`
- 列表正文：13px / weight 400 / `var(--text-primary)`
- 辅助信息：11px / `var(--text-secondary)`
- 代码：11px / `var(--font-mono)` / `var(--text-muted)`

---

## 6. Do's and Don'ts

### Do
- ✅ 状态 = 颜色 + 图标 + 文字，三重信息载体
- ✅ Agent 列表默认按异常优先排序（死亡 > 阻塞 > 运行 > 空闲）
- ✅ 所有数据用等宽字体对齐
- ✅ 探针时间线用简洁圆点 + 连线，不用复杂图表
- ✅ 操作按钮防误触：dangerous 操作弹出确认框

### Don't
- ❌ 禁止渐变色背景或卡片
- ❌ 禁止 drop-shadow / box-shadow（工业风扁平）
- ❌ 禁止大面积留白（数据密度优先）
- ❌ 禁止超过 4 种状态色同时出现
- ❌ 禁止在列表中使用 emoji
- ❌ 禁止弹窗遮罩透明度 < 0.6（看不清底层状态）
- ❌ 禁止自动播放动画（尊重 `prefers-reduced-motion`）

---

## 7. 占位符策略

| 缺的东西 | 正确做法 |
|---|---|
| Agent 图标 | 首字母圆形 + `var(--blue)` 填充 |
| 无 Agent 数据 | 空状态插画：Lucide `Radio` 图标 + "暂无 Agent 数据" 文案 |
| 探针数据加载中 | 骨架屏：灰色脉冲条 3 条 |
| 调度队列为空 | "队列为空" + `CheckCircle` 图标 |

---

## 8. 反 AI-slop 自检

- [x] 无 emoji 图标（状态用 Lucide + 颜色指示灯）
- [x] 无编造数据（空状态用骨架屏/占位符）
- [x] 无 Inter/Roboto 字体（使用系统字体栈 + 等宽）
- [x] 无紫色渐变背景
- [x] 无 8px 全局圆角（用小圆角 4/8px）
- [x] 无 drop-shadow 卡片（用边框区分）
