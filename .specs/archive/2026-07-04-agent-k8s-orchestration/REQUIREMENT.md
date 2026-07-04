# REQUIREMENT: Agent 编排模块 k8s 化改造

- **Change ID**: `agent-k8s-orchestration`
- **关联**: `@.specs/agent-k8s-orchestration/CHANGE.md`、`@.specs/CONTEXT.md`

---

## 用户故事

- **US-A**：作为开发者，我想用 YAML 描述一套 Agent 拓扑（节点+连线+策略），一键 `apply` 部署，以便纳入 Git 版本管理和 CI/CD 流程。
- **US-B**：作为开发者，我想编排运行时自动监控 Agent 状态——Agent 挂了自动重启或降级、链路超时自动重试，以便长链路任务具备容错能力。
- **US-C**：作为团队 lead，我想为多个编排任务设置优先级和 token 配额，调度器按优先级+配额公平分配资源，以便高峰期关键任务不被阻塞。
- **US-D**：作为开发者，我想把已验证的 Agent 拓扑保存为参数化模板，下次填参数一键部署，以便复用最佳实践。
- **US-E**：作为运维者，我想在拓扑画布上实时看到每个 Agent 节点颜色（绿/红/黄/灰）和数据流方向，点击节点查看调用链追踪，以便快速定位故障。
- **US-F**：作为开发者，我想修改拓扑 YAML 后 `apply`，系统渐进式收敛到新状态，不中断正在执行的 Agent，过渡状态可见。

---

## 验收准则（AC）

### AC-A1 · YAML 声明式部署

- **Given** 用户编写了一份合法的 Agent 拓扑 YAML（含至少 2 个 Agent 节点 + 1 条连线）
- **When** 用户上传 YAML 文件并点击「apply」
- **Then** 拓扑被解析并部署，所有 Agent 节点按 YAML 定义启动，连线关系生效
- **验证方式**: `curl -X POST /api/orchestration/apply -H "Content-Type: application/yaml" --data-binary @topology.yaml` → 返回 `{"ok": true, "orchestration_id": N}`，`GET /api/orchestration/N` 返回拓扑状态含节点+连线

### AC-A2 · YAML ↔ UI 实时同步

- **Given** 用户在拓扑画布上已有一个 3 节点 2 连线的编排
- **When** 用户在画布上拖拽新增一个 Agent 节点并连线
- **Then** 侧边 YAML 编辑器内容实时更新（节点列表增加新 Agent、edges 增加新连线）；反之编辑 YAML 后画布同步刷新
- **验证方式**: UI 操作后检查 YAML 编辑器内容变化；直接修改 YAML 后检查画布节点变化

### AC-A3 · YAML 校验 + 错误提示

- **Given** 用户粘贴了一份 YAML 内容
- **When** YAML 存在语法错误（缩进不对/字段缺失/引用了不存在的 Agent ID）
- **Then** 界面在错误行高亮 + 显示具体错误描述（类似 `kubectl apply --dry-run` 的输出），不允许提交
- **验证方式**: 提交非法 YAML（引用不存在的 agent_id）→ 返回 400 + `{"error": "reference not found: agent_id=xxx"}`

### AC-B1 · Agent 异常自愈

- **Given** 一个编排实例包含 Agent A → Agent B 的串行链路，两个 Agent 均正常运行
- **When** Agent A 进程异常退出（手动 kill 或模拟 crash）
- **Then** 5 秒内 reconcile loop 检测到 Agent A 状态异常，自动重启 Agent A；编排链路在 Agent A 恢复后继续执行
- **验证方式**: 部署编排 → 手动终止 Agent A 对应进程 → `GET /api/orchestration/N` 在 5 秒内看到 Agent A 状态从 `healthy` → `degraded` → `recovering`，最终恢复为 `healthy`

### AC-B2 · 链路异常自动降级/重试

- **Given** Agent A → Agent B 链路，Agent B 配置了重试策略（max_retries=3, backoff=exponential）
- **When** Agent B 返回执行失败（exit_code ≠ 0 或超时）
- **Then** 系统按退避策略自动重试 3 次，全部失败后走备用链路（如有配置）或标记该节点为 `failed` + 通知
- **验证方式**: 配置一个有重试策略的编排 → 模拟 Agent B 失败 → 检查审计日志含 3 次重试记录 + 最终状态 `failed`

### AC-B3 · 状态漂移检测

- **Given** 一个已部署的运行中编排实例（期望状态记录在拓扑快照中）
- **When** 有人手动修改了某个 Agent 的配置（绕过了编排系统）
- **Then** reconcile loop 检测到实际状态与期望不一致，界面显示 `⚠️ 漂移` 标记，支持「自动修复」或「人工确认」
- **验证方式**: 部署编排 → 直接修改 Agent 数据库记录 → reconcile loop 检测到漂移 → UI 显示漂移标记

### AC-C1 · 优先级调度

- **Given** 队列中有 3 个编排任务：priority=100（高）、priority=50（中）、priority=10（低）
- **When** 调度器分配资源（仅 1 个可用 worker）
- **Then** priority=100 的任务先执行，完成后依次执行 priority=50，最后 priority=10
- **验证方式**: 一次性提交 3 个不同优先级的编排 → `GET /api/orchestration/queue` 返回队列顺序为 [100, 50, 10]

### AC-C2 · Token 配额控制

- **Given** 编排任务 A 声明 token_soft_limit=100000, token_hard_limit=200000
- **When** 任务 A 执行过程中 token 消耗达到 100000
- **Then** 界面显示 ⚠️ 软限制警告（不中断任务）；达到 200000 时任务完成后阻断后续调用，显示 🛑 硬限制
- **验证方式**: 提交有配额限制的编排 → 模拟 token 消耗逼近软限制 → 检查警告出现 → 达到硬限制后检查后续调用被阻断

### AC-C3 · 亲和性约束

- **Given** Agent A 和 Agent B 在编排 YAML 中配置了 `affinity: same-node`（必须在同一节点）
- **When** 调度器分配这两个 Agent
- **Then** Agent A 和 Agent B 被调度到同一个执行节点
- **验证方式**: 提交含亲和性约束的编排 → 检查两个 Agent 分配的 node_id 相同

### AC-D1 · 模板保存

- **Given** 用户已编排好一个 3 Agent 的拓扑（含完整节点配置+连线+策略）
- **When** 用户点击「保存为模板」，填写模板名称和描述
- **Then** 模板被保存到模板库，`GET /api/orchestration/templates` 返回该模板
- **验证方式**: UI 操作 → `curl GET /api/orchestration/templates` → 列表中包含新模板

### AC-D2 · 模板参数化 + 一键部署

- **Given** 模板库中存在模板 `code-review-pipeline`，含参数 `{{ .Values.reviewer_model }}`
- **When** 用户选择该模板，填入 `reviewer_model: gpt-4o`，点击「部署」
- **Then** 系统渲染模板参数 → 创建编排实例 → 所有节点按填入值配置
- **验证方式**: 选择模板 → 填参数 → deploy → `GET /api/orchestration/N` → 节点配置中 model_name 为 `gpt-4o`

### AC-D3 · 模板市场

- **Given** admin 用户有 3 个已保存模板，其中 1 个标记为「公开发布」
- **When** 普通用户浏览模板市场
- **Then** 仅看到 admin 公开发布的模板，可一键复用；看不到 admin 未发布的私有模板
- **验证方式**: admin 发布模板 → 切换普通用户 → 模板市场可见已发布模板

### AC-E1 · 拓扑实时状态图

- **Given** 一个 3 Agent 的编排实例正在运行，Agent A 正常、Agent B 异常、Agent C 等待中
- **When** 用户打开编排详情页的拓扑画布
- **Then** Agent A 节点显示绿色、Agent B 显示红色+错误摘要、Agent C 显示黄色脉冲动画；连线显示数据流方向和吞吐量数字
- **验证方式**: UI 渲染验证 → 节点颜色与 Agent 实际状态一致，颜色变化延迟 ≤ 3 秒

### AC-E2 · 跨 Agent 调用链追踪

- **Given** 一个编排任务执行路径为 A → B → C
- **When** 用户点击拓扑画布上的「查看调用链」
- **Then** 展示瀑布图：A（1500ms, 2000 tokens）→ B（800ms, 500 tokens）→ C（300ms, 100 tokens），每段可展开查看输入/输出摘要
- **验证方式**: 部署编排→执行→查看调用链→确认时间+token数据与实际一致

### AC-E3 · 拓扑级监控聚合

- **Given** 编排实例已执行 10 次
- **When** 用户查看编排监控面板
- **Then** 展示：总 token 消耗、平均执行时间、成功率（百分比）、每次执行消耗柱状图（5 分钟粒度）
- **验证方式**: `GET /api/orchestration/N/metrics` → 返回聚合数据 + 时序数据

### AC-F1 · 渐进式收敛

- **Given** 一个 3 Agent 的编排实例正在执行中
- **When** 用户修改拓扑 YAML（删除 Agent B，新增 Agent D），点击 apply
- **Then** Agent B 排空后移除（不中断正在执行的任务），Agent D 就绪后加入，编排实例显示过渡状态「期望节点 3 / 就绪 2 / 变更中 1」
- **验证方式**: 运行中编排 → apply 修改 → `GET /api/orchestration/N` 返回 transition_status

### AC-F2 · 收敛状态可观测

- **Given** 编排处于渐进式收敛过程中
- **When** 用户查看编排详情
- **Then** 界面显示收敛进度条 + 各节点状态（`running`/`draining`/`pending`/`ready`）
- **验证方式**: UI 渲染验证 → 收敛进度条 + 节点标签与实际状态一致

---

## 范围切分

### v1（本次必做）

- **US-A**: YAML 声明式部署 + YAML ↔ UI 实时同步 + YAML 校验
- **US-B**: 控制循环（自愈 + 重试/降级 + 状态漂移检测）
- **US-C**: 调度策略（优先级队列 + Token 配额 + 亲和性）
- **US-D**: 编排模板保存 + 参数化部署 + 模板市场
- **US-E**: 拓扑实时状态图 + 跨 Agent 调用链追踪 + 拓扑级监控聚合
- **US-F**: 渐进式收敛 + 收敛状态可观测
- 现有 OrchestrationPage 改造（spec_json → YAML 迁移 + UI 底层 YAML 化）
- 安全闸门：YAML 上传校验（schema + 引用完整性 + 文件大小限制 + 解析炸弹防护）

### v2（下一轮考虑）

- **YAML 差分 diff**：apply 时显示本次变更的 diff（类似 `kubectl diff -f`），确认后再执行
- **多版本模板**：模板支持版本管理，回滚到历史版本
- **编排任务定时调度**：类似 CronJob，定时触发编排任务
- **跨项目编排**：编排模板可在不同项目间共享
- **编排 SLA 策略**：任务超过 SLA 时间自动告警 / 终止

### out（永远不做）

- ❌ 不做真实容器化部署（不引入 Docker / Kubernetes 运行时），reconcile loop 跑在 FastAPI 进程内
- ❌ 不做多集群 / 跨机器调度（仅本地单进程内调度）
- ❌ 不做 Agent 内部工作流执行引擎改造（那是 AgentBuilder/WorkflowDetail 的职责）
- ❌ 不做 Helm / Tanka / Kustomize 等 k8s 原生包管理工具集成

---

## 非功能性需求

- **性能**: reconcile loop 扫描周期 ≤ 5 秒（状态变化到界面更新延迟 ≤ 3 秒）；YAML 解析+校验 ≤ 1 秒（50 节点以内）；拓扑状态图画布 50 节点以内渲染 ≤ 500ms
- **可访问性**: 拓扑画布节点颜色必须有文本标签（颜色不是唯一信息载体）；键盘可操作节点选中+移动（WCAG 2.1 A）
- **安全**: YAML 上传必须校验文件大小（≤ 1MB）、防 YAML 解析炸弹（嵌套深度 ≤ 50 层）、校验拓扑引用的 Agent/工具/工作流 ID 真实存在；模板市场 admin 审核发布，发布操作记审计日志；所有编排变更操作（create/apply/delete/stop）记审计
- **兼容性**: 旧编排数据（`spec_json` 格式）自动迁移为 YAML 格式，迁移过程不丢数据
- **可观测性**: 每个编排实例记录完整的执行日志（时间线 + 每节点状态转换 + token 消耗）；reconcile loop 每次 reconcile 的 diff 和动作记日志；调度队列深度 + 等待时间暴露为 API metrics

## 依赖与假设

- **依赖**: 现有 `backend/models/agent.py`、`backend/models/workflow.py`、`backend/routes/agents_api.py`、`frontend/src/pages/OrchestrationPage.tsx`
- **假设**: 本地单进程运行（无分布式一致性问题）；Agent 个数 ≤ 50（v1 规模）；并发编排实例 ≤ 20
- **假设**: 现有 Agent 编排数据（`spec_json.nodes/edges`）格式稳定，可无损转换为 YAML

---

> AC 是 TEST 阶段派生用例的唯一来源，禁止在 TEST 阶段引入新 AC。
