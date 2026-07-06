# REQUIREMENT: Agent 管控面

- **Change ID**: `agent-control-plane`
- **关联**: `@.specs/agent-control-plane/CHANGE.md`、`@.specs/CONTEXT.md`

---

## 用户故事

- **US-1**：作为 Agent 编排用户，我想在 Apply 编排后查看所有 Agent 的实时运行状态，以便及时发现挂掉或卡住的 Agent。
- **US-2**：作为 Agent 编排用户，我想让同语义的多个 Agent 之间自动分配任务给最空闲的那个，以便不用手动选择发到哪个 Agent。
- **US-3**：作为 Agent 编排用户，我想看到 Reconcile Loop 的漂移检测结果和自动修复日志，以便了解系统是否在自动维持期望状态。
- **US-4**：作为 Agent 编排用户，我想手动触发单个 Agent 的重新调度或重启，以便在自动修复不能解决问题时人工介入。
- **US-5**：作为管理员，我想配置调度策略（Agent 优先级、能力标签、并发上限），以便控制多 Agent 的资源分配。

## 验收准则（AC）

### AC-1 · Agent 状态总览

- **Given** 至少有 1 个 Agent 在运行
- **When** 用户点击侧边栏「Agent 管控」
- **Then** 看到所有 Agent 的列表，每行显示：名称、能力标签、实时状态（空闲/运行/阻塞/已死亡）、当前负载（X/Y 任务）、最后心跳时间
- **Then** 列表默认按状态排序：死亡 > 阻塞 > 运行中 > 空闲，死亡的排最上面
- **Then** 每行左侧有彩色状态指示灯：🟢空闲、🟡运行中、🔴阻塞/死亡、⚪离线
- **验证方式**: 启动至少 2 个 Agent，模拟不同状态，打开管控面板验证颜色和排序

### AC-2 · Agent 详情 + 探针历史

- **Given** Agent 列表已展示
- **When** 用户点击某个 Agent 行
- **Then** 进入 Agent 详情页，展示四个分区的探针信息：
  - 心跳（Heartbeat）：最近 N 次检查的时间线和通过/失败状态
  - 能力（Capability）：当前 API key 是否有效、模型是否可达
  - 依赖（Dependency）：上游依赖 Agent 的状态列表
  - 负载（Load）：当前任务队列、已完成数、平均耗时
- **Then** 详情页顶部有操作按钮：「重新调度」「强制重启」「暂停接收任务」
- **Then** 点击操作按钮后，按钮变为进度状态（如「重启中…」），完成后状态指示灯自动更新
- **验证方式**: 点击一个 BLOCKED 状态的 Agent，确认详情页显示依赖超时原因；点击「强制重启」后确认按钮变为过渡态

### AC-3 · 同语义 Agent 自动路由 + 负载均衡

- **Given** 存在 3 个能力标签包含 `code-review` 的 Agent，负载分别为 2/5、0/5、3/5
- **When** 编排引擎分发一个 `code-review` 任务
- **Then** 任务自动分配给负载最低的 Agent（0/5 的那个）
- **Then** 任务分配日志记录在调度队列中，包含：任务 ID、选中 Agent、候选 Agent 列表及各自负载
- **Then** 管控面「调度队列」tab 可见最近 50 条任务分配记录
- **Then** 当所有候选 Agent 满负载时，任务进入等待队列，管控面显示「排队中（第 N 位）」，有可用 Agent 后自动分配
- **验证方式**: 创建 3 个同标签 Agent，全部设为 5/5 满负载，发起任务，确认进入排队

### AC-4 · Reconcile Loop 漂移检测 + 自动修复

- **Given** 编排部署时记录了拓扑快照，YAML 期望有 2 个 `code-review` Agent
- **When** 其中 1 个 Agent 心跳丢失超过连续 3 次（约 15 秒）
- **Then** Reconcile Loop 检测到漂移（期望 2 个，实际 1 个健康）
- **Then** 自动触发 `safe` 级别修复：尝试重启该 Agent
- **Then** 修复事件记录在 Reconcile 日志中，包含时间戳、漂移类型、修复动作、结果
- **验证方式**: 手动 kill 一个 Agent 进程，15 秒后在管控面看到漂移事件和自动修复尝试

### AC-5 · Reconcile Loop 分级修复 + 人工确认

- **Given** Reconcile Loop 检测到漂移
- **When** 修复动作为 `safe` 级别（重启探针失败的 Agent）
- **Then** 自动执行，不等待人工确认
- **When** 修复动作为 `caution` 级别（重新调度任务）
- **Then** 管控面弹出通知，记录事件但不自动执行，等用户确认
- **When** 修复动作为 `dangerous` 级别（删除并重建 Agent）
- **Then** 管控面弹出红色警告，强制用户手动确认后才执行，且 3 次连续失败后自动暂停
- **验证方式**: 模拟不同漂移场景，确认修复行为分级正确

### AC-6 · 调度策略配置（管理员）

- **Given** 用户具有管理员权限
- **When** 进入 Agent 管控面 → 调度器配置
- **Then** 看到所有 Agent 的能力标签列表，可编辑每个 Agent 的标签、优先级（高/中/低）、最大并发数
- **Then** 配置变更记入审计日志
- **验证方式**: admin 修改一个 Agent 的优先级，检查审计日志有记录

### AC-7 · 探针数据隔离

- **Given** 用户 A 和用户 B 各有自己的 Agent
- **When** 用户 A 进入 Agent 管控面
- **Then** 只能看到自己项目下的 Agent 状态，看不到用户 B 的 Agent
- **When** 管理员进入 Agent 管控面
- **Then** 能看到所有用户的 Agent 状态
- **验证方式**: 用两个不同用户登录，确认互不可见对方的 Agent

---

## 范围切分

### v1（本次必做）

- Agent 状态列表（IDLE / RUNNING / BLOCKED / DEAD 四态，颜色指示灯）
- Agent 详情页（四探针分区 + 操作按钮）
- 同语义标签匹配 + Least Connection 负载均衡
- Reconcile Loop 漂移检测 + 三级修复（safe / caution / dangerous）
- 管理员调度器配置（标签、优先级、并发上限）
- 探针数据按项目/用户隔离
- 侧边栏新入口「Agent 管控」（放在 Agent 之后）

### v2（下一轮考虑，不本次）

- 语义匹配路由（embedding + 向量搜索自动匹配 Agent 能力，非标签精确匹配）
- Startup Probe（Agent 初始化完成检测）
- 多后端实例的 Agent Registry 一致性（当前单实例内存 + SQLite 够用）
- 任务亲和性路由（同类型任务优先发上次的 Agent）

### out（永远不做）

- Agent 自报能力标签（安全风险，标签只能由 admin 和 Workflow 派生）
- K8s Pod↔Node 绑定概念的 Agent 映射（Agent 运行时绑定逻辑与本模块无关）
- 替代现有编排画布（本模块是新增，不改动现有编排）

---

## 非功能性需求

- **性能**: Agent 列表（100 个 Agent 以内）打开 ≤ 1 秒；探针状态刷新间隔 3 秒；详情页加载 ≤ 500ms
- **可访问性**: WCAG 2.1 AA — 状态颜色不能是唯一的信息表达方式（需辅助图标或文字）；Tab 键可导航所有操作按钮
- **安全**: 探针失败原因中的 API key 需正则脱敏（`sk-[a-zA-Z0-9]+` → `sk-***`）；调度器配置变更需审计日志；Agent 能力标签仅 admin 可修改；探针接口不接受任意字符串参数（枚举校验）；调度查询接口限流 10 次/分钟/用户；探针数据保留最近 7 天，超过自动清理；全局设置（算法/重试/间隔）有下限约束（间隔 ≥ 1s、重试 ≤ 10 次）+ 仅 admin 可改
- **兼容性**: Chrome 90+ / Firefox 90+ / Edge 90+
- **可观测性**: 每次探针检查结果写入 `agent_probes` 表；每次调度分配记录写入 `scheduler_queue` 表；Reconcile Loop 每次循环输出结构化日志（时间戳 + 状态 before/after + 动作）

## 依赖与假设

- **依赖**: 现有 `/api/agents` 路由读 Agent 信息；现有 `runtime_watcher.py` 扫描结果；`reconcile_loop.py`（增强不换接口）
- **假设**: 探针采用 Pull 模式——管控面主动 HTTP GET 每个 Agent 的 `/health` 端点，Agent 返回 JSON `{status, capabilities, load, dependencies}`；拉取超时 5 秒；连续失败 3 次标记异常；Agent 能力标签由管理员手动配置或从 Workflow 自动派生；管控面与 Agent 在同一内网（IP 白名单免 token 认证）；单后端实例部署
- **新增数据表**: `agent_probes`（探针记录表）、`scheduler_queue`（调度队列表）

---

> AC 是 TEST 阶段派生用例的唯一来源，禁止在 TEST 阶段引入新 AC。
