# REQUIREMENT: 项目详情 Agent 消耗监控 Tab

- **Change ID**: project-agent-metrics
- **关联**: `@.specs/project-agent-metrics/CHANGE.md`、`@.specs/CONTEXT.md`

---

## 用户故事

- **US-1**：作为**开发者/Lead**，我想在项目详情页看到绑定 Agent 的基本信息（名称、模型、工作流、角色、工具）并可以跳转到 Agent 详情，以便快速了解谁在执行这个项目。
- **US-2**：作为**开发者/Lead**，我想看到 Agent 在本项目中的 token 消耗柱状图（1 分钟粒度），以便快速判断"这个项目花了多少钱"。
- **US-3**：作为**开发者/Lead**，我想看到项目下每个工作流和子 Agent 各自的消耗柱状图（可折叠），以便定位"哪个工作流/Agent 最烧钱"。
- **US-4**：作为**开发者/Lead**，我想看到本项目中 Agent 的每次会话记录列表（时间、模型、token、状态），以便审计和排查问题。

---

## 验收准则（AC）

### US-1 · Agent 基本信息展示

#### AC-1.1 · Agent 基本信息卡片

- **Given** 项目已绑定 Agent
- **When** 用户打开项目详情并点击「🤖 Agent」tab
- **Then** 展示 Agent 名称、模型名称、运行时、token 上限、简介；工作流/角色/工具以标签形式展示
- **验证方式**: 手动 UAT-1

#### AC-1.2 · 跳转 Agent 详情

- **Given** Agent 信息卡片可见
- **When** 用户点击「查看详情 →」
- **Then** 跳转到该 Agent 详情页（AgentDetail）
- **验证方式**: 手动 UAT-1

#### AC-1.3 · 未绑定 Agent

- **Given** 项目未绑定 Agent
- **When** 用户打开「🤖 Agent」tab
- **Then** 展示「未绑定 Agent」提示，建议返回概览或重新创建项目
- **验证方式**: 手动 UAT-1

### US-2 · Agent 消耗柱状图

#### AC-2.1 · 消耗总览

- **Given** Agent tab 已打开，项目有消耗数据
- **When** 页面加载完成
- **Then** 展示总消耗 token 数 + 平均每分钟消耗（最近 60 分钟），默认折叠
- **验证方式**: 手动 UAT-2

#### AC-2.2 · 展开柱状图

- **Given** 消耗总览区域可见
- **When** 用户点击「▸ 展开柱状图」
- **Then** 折叠区域展开，展示 1 分钟粒度柱状图（亮绿色 `#5cb878` 柱子），X 轴为时间（HH:MM），hover 显示具体数值
- **验证方式**: 手动 UAT-2

#### AC-2.3 · 空数据状态

- **Given** 项目无消耗数据
- **When** 用户打开 Agent tab
- **Then** 展示「暂无消耗数据」提示
- **验证方式**: 手动 UAT-2

### US-3 · 工作流/子 Agent 消耗

#### AC-3.1 · 工作流消耗行

- **Given** Agent tab 已打开，有工作流消耗数据
- **When** 页面加载完成
- **Then** 每个工作流展示名称 + 总消耗 +「▸ 展开」按钮，柱子颜色蓝色 `#3b82f6`
- **验证方式**: 手动 UAT-3

#### AC-3.2 · 子 Agent 消耗

- **Given** 项目下有其他 Agent 的消耗记录
- **When** 页面加载完成
- **Then** 展示「🤖 其他 Agent 消耗」段，每个 Agent 名称 + 总量 + 可展开柱状图（琥珀色 `#f59e0b`）
- **验证方式**: 手动 UAT-3

#### AC-3.3 · 无子 Agent 数据

- **Given** 本项目仅有主 Agent 的消耗记录
- **When** 页面加载完成
- **Then** 不展示「其他 Agent 消耗」段
- **验证方式**: 手动 UAT-3

### US-4 · 会话记录列表

#### AC-4.1 · 会话列表

- **Given** Agent tab 已打开，有会话记录
- **When** 页面加载完成
- **Then** 展示本项目 Agent 的会话记录列表：时间、模型、token 消耗、状态，按时间倒序，最新 50 条
- **验证方式**: 手动 UAT-4

#### AC-4.2 · 分页

- **Given** 会话记录超过 20 条
- **When** 用户滚动到底部或点击「加载更多」
- **Then** 加载下一页数据
- **验证方式**: 手动 UAT-4

---

## 范围切分

### v1（本次必做）

- Agent tab（5 个 tab 之一）
- Agent 基本信息卡片（只读 + 跳转详情）
- 主 Agent 消耗总览 + 可折叠柱状图（绿色）
- 工作流消耗行 + 可折叠柱状图（蓝色）
- 子 Agent 消耗行 + 可折叠柱状图（琥珀色，有数据才显示）
- 会话记录列表（时间倒序，50 条，分页）
- 后端 API：`GET /api/metrics/project/{id}/breakdown`

### v2（下一轮考虑）

- 时间范围选择器（15min / 60min / 6h / 24h）
- 自动刷新（setInterval 30s）
- 子 Agent/wf 消耗排序

### out（永远不做）

- 实时 WebSocket 推送（单用户本地部署，轮询足够）
- 消耗报告导出（PDF/CSV）
- 项目间消耗对比视图

---

## 非功能性需求

- **性能**: API 响应 < 1s（60 分钟数据量），柱状图渲染不阻塞页面
- **可访问性**: 柱状图 hover 显示数值，颜色对比度 > 4.5:1（暗色背景）
- **安全**: 按 owner_id 过滤数据，用户只能看自己的消耗
- **兼容性**: Recharts 2.x 兼容 Chrome/Firefox/Edge 最近 2 个主版本
- **可观测性**: 无新增日志需求

## 依赖与假设

- **依赖**: 现有 `SessionMetric` 表数据完整性（entity_type + owner_id + timestamp + total_tokens）
- **假设**: 项目 owner_id 与 SessionMetric.owner_id 一致
- **假设**: 子 Agent 消耗由编排场景自动记录到 SessionMetric
- **依赖**: Recharts 2.x（项目已有依赖 `frontend/package.json`）

---

> AC 是 TEST 阶段派生用例的唯一来源，禁止在 TEST 阶段引入新 AC。
