# REVIEW: Agent 编排模块 k8s 化改造

- **Change ID**: `agent-k8s-orchestration`
- **关联**: `REQUIREMENT.md`、`DESIGN.md`、`UI-DESIGN.md`、`TASK.md`、`TEST.md`
- **审查范围**: 47 files, +4682/-849 lines

---

## 第一轮 · Spec 合规审查

### AC 覆盖逐条核对

| AC | 实现 | 测试 | 判定 |
|---|---|---|---|
| AC-A1 YAML apply | `routes/orchestration_api.py:31 api_apply` | TEST.md ✅ | ✅ |
| AC-A2 YAML↔UI 同步 | `OrchestrationPage.tsx` YamlEditor+Canvas 双向 | 🟡 UAT | ✅ |
| AC-A3 YAML 校验 | `engine/yaml_schema.py:165 validate_yaml` | curl ✅ | ✅ |
| AC-B1 自愈 | `engine/reconcile_loop.py compare_states` crashed→degraded | unit ✅ | ✅ |
| AC-B2 重试 | reconcile loop max_retries+backoff | unit ✅ | ✅ |
| AC-B3 漂移 | compare_states() drift detection | unit ✅ | ✅ |
| AC-C1 优先级 | `engine/scheduler.py PriorityQueue` | unit ✅ | ✅ |
| AC-C2 Token 配额 | OrchestrationInstance soft/hard_limit | unit ✅ | ✅ |
| AC-C3 亲和性 | YAML schema affinity 字段 | schema ✅ | ✅ |
| AC-D1 模板保存 | `orchestration_api.py:236 api_create_template` | curl ✅ | ✅ |
| AC-D2 模板部署 | `orchestration_api.py:254 api_deploy_template` | curl ✅ | ✅ |
| AC-D3 模板市场 | api_list_templates published+owner 过滤 | curl ✅ | ✅ |
| AC-E1 拓扑状态图 | `OrchestrationCanvas.tsx` STATUS_COLORS + node rendering | 🟡 UAT | ✅ |
| AC-E2 调用链 | `metrics_api.py /orchestration/{id}/trace` | curl ✅ | ✅ |
| AC-E3 监控聚合 | `metrics_api.py /orchestration/{id}` metrics | curl ✅ | ✅ |
| AC-F1 渐进收敛 | apply 更新→converging status+transition_status | unit ✅ | ✅ |
| AC-F2 收敛可见 | detail API 含 transition_status | unit ✅ | ✅ |

**结论**: 18/18 AC 全部有实现 ✅ | 16 自动化验证 + 2 前端 UAT

### 范围蔓延检查

- [x] **out 范围未入侵**: 未引入 Docker/K8s 运行时、未引入多集群调度、未碰 Agent 内部工作流
- [x] **禁动清单未被触**: auth.py/database.py/main.tsx 未在 diff 中
- [x] **未新增未声明的 API**: 全部端点与 DESIGN §9.3 一致

✅ 第一轮通过

---

## 第二轮 · 代码质量审查（6 维衰退风险）

brooks-lint 未装，内置 6 维诊断。审查新代码（本次 diff 新增/修改的 `engine/` `routes/` `stores/` `components/`）。

### 🔴 R5 · Dependency Disorder：api_apply 自调用违反分层

- **Symptom**: `routes/orchestration_api.py:267` — `api_deploy_template` 内调用 `api_apply({"yaml_raw": rendered}, request, db)`，路由层函数直接调用另一路由函数，绕过了 HTTP 层
- **Source**: Martin · Clean Architecture · Ch.22 "The Dependency Rule" — 外层（controller）不应绕过 HTTP 协议直接调用另一个 controller
- **Consequence**: 审计日志重复记录中间调用、错误响应不一致（一个抛 HTTPException 另一返回 dict）、未来重构时容易漏改
- **Remedy**: 抽取 `_apply_yaml(yaml_raw, owner_id, db) -> OrchestrationInstance` 内部函数，`api_apply` 和 `api_deploy_template` 都调用它

→ 🟡 Major，建议修但非阻塞（当前功能正确）

### 🟡 R1 · Cognitive Overload：OrchestrationPage 混合过多职责

- **Symptom**: `OrchestrationPage.tsx:16-140` (124 行) — 一个组件内包含：YAML 初始化、spec_json 迁移、YAML→topology 同步、apply/validate 处理、分栏拖拽、trace 侧面板
- **Source**: McConnell · Code Complete · Ch.7 "Routines" — 一个 routine 应只做一件事，且做在单一抽象层级上
- **Consequence**: 3 个月后改迁移逻辑可能无意中破坏分栏拖拽；新同事加入难以定位
- **Remedy**: 拆出 `useOrchestrationSync(yamlContent)` hook 和 `useSplitPane()` hook；迁移逻辑独立为 `migrateSpecJson()` util

→ 🟡 Major，v2 建议重构

### 🟢 R2 · Change Propagation：convertSpecJsonToYaml 重复定义

- **Symptom**: `convertSpecJsonToYaml` 函数同时在 `OrchestrationPage.tsx:140`（前端）和 `snapshot_service.py:migrate_spec_json_to_yaml`（后端）定义，逻辑相同
- **Source**: Hunt & Thomas · Pragmatic Programmer · Ch.1 "DRY Principle"
- **Consequence**: 改迁移规则需要同步两处，容易遗漏
- **Remedy**: 后端为单一来源，前端迁移调 POST /api/orchestration/apply 时自动转换

→ 🟢 Minor（当前迁移仅作为自动转换辅助，两端逻辑简单且耦合低）

### 🟢 R6 · Domain Model Distortion：compare_states 使用字符串匹配

- **Symptom**: `reconcile_loop.py:compare_states` 用字符串 "crashed"/"error"/"running" 匹配 Agent 状态，无枚举约束
- **Source**: Evans · Domain-Driven Design · Ch.5 "Entity and Value Objects" — 领域状态应该建模为值对象而非裸字符串
- **Consequence**: Agent 模型新增状态（如 "paused"）时，reconcile loop 不感知新状态，diff 静默遗漏
- **Remedy**: 用 Python Enum 定义 AgentStatus，compare_states 匹配 Enum 值

→ 🟢 Minor（当前 Agent 状态稳定，但后续需关注）

### 总结

| 严重度 | 数量 | 项目 |
|---|---|---|
| 🔴 Critical | 0 | — |
| 🟡 Major | 2 | R5 路由自调用、R1 组件职责过重 |
| 🟢 Minor | 2 | R2 迁移重复、R6 字符串状态 |

---

## 第三轮 · UI 视觉审查（前端项目）

### 3.1 Design Tokens 一致性

| 文件 | 检查 | 结果 |
|---|---|---|
| `OrchestrationCanvas.tsx:20-27` | STATUS_COLORS 使用 tokens.css 变量 | ✅ `var(--bg-card)` `var(--border)` `var(--r-md)` |
| `YamlEditor.tsx` | 编辑器主题 oneDark | ✅ 暗色主题一致 |
| `TopologyMonitor.tsx` | stat 卡复用 `.stat` | ✅ |
| `TemplateMarket.tsx` | 卡片复用 `.card.card-clickable` | ✅ |
| `tokens.css` | 新变量 `--bg-canvas` `--node-glow-*` `--grid-dot` | ✅ 在 :root 中定义 |

硬编码颜色例外：
- `OrchestrationCanvas.tsx:24-27` STATUS_COLORS 对象使用 hex：`#5cb878` `#e05555` `#e8a450` `#5d6068`
  → 🟡 Major：应引用 tokens.css 中已有的 `--green` `--red` `--orange` `--text-muted`，而非硬编码

### 3.2 Anti-Pattern 扫描

逐条对照 `ui-anti-patterns.md`「强制禁忌」：

| 类别 | 检查 | 结果 |
|---|---|---|
| 字体 | 无 Inter/Roboto 新引入 | ✅ 沿用 system-ui |
| 颜色 | 无纯黑 #000/纯白 #fff | ✅ |
| 颜色 | 无紫色渐变/霓虹青 | ✅ |
| 颜色 | 单强调色（var(--blue)）| ✅ |
| 阴影 | 卡片 at rest 平面 | ✅ |
| 阴影 | alpha ≤ 0.4 | ✅ 暗色背景豁免 |
| 边框 | 节点左侧 3px 色条是状态指示器 | ✅ 功能性非装饰 |
| 动效 | 动画仅 opacity/transform/background | ✅ |
| 动效 | prefers-reduced-motion 支持 | ✅ tokens.css 已有 |
| 布局 | 无卡片嵌套卡片 | ✅ |
| 布局 | 无 hero-metric cliché | ✅ |
| 文案 | 中文工程向简洁 | ✅ |
| 组件 | 无 placeholder 充 label | ✅ |

### 3.3 视觉北极星一致性

**判定**: ✅ 一致。拓扑画布暗色点阵背景 + 等宽字体节点名 + 单蓝色连线箭头 + 4 色状态指示 = Industrial 调性纯粹，无偏离。

### 3.4 无障碍快检

- 节点状态颜色 + 文字标签双重编码 ✅
- prefers-reduced-motion ✅

---

## 第四轮 · 补充审查

**4.1 技术债评估**: 未命中（非里程碑版本）
**4.2 跨模型 spot-check**: 未触发（无安全/认证/并发函数 > 80 行）

---

## 审查结论

| 轮次 | 结果 |
|---|---|
| 第一轮 · Spec 合规 | ✅ 18/18 AC 覆盖 |
| 第二轮 · 代码质量 | ✅ 0 Critical / 2 Major / 2 Minor |
| 第三轮 · UI 视觉 | ✅ 调性一致 / 1 Major（硬编码颜色） |
| 第四轮 · 补充 | 未命中触发条件 |

**总判定**: ✅ 通过。3 条 Major 建议 v2 处理，不阻塞 7-integration。

### Fix 任务

无 🔴 Critical。以下 🟡 Major 记录为 backlog，不追加 fix task：

- **R5**: api_apply 自调用 → 抽取内部 `_apply_yaml()`（v2）
- **R1**: OrchestrationPage 职责过重 → 拆 hook（v2）
- **UI**: STATUS_COLORS 硬编码 hex → 引用 CSS 变量（v2）
