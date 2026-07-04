# ADR-002: Agent 编排 YAML Schema 规范

- **状态**: accepted
- **日期**: 2026-07-04
- **决策者**: AI（Architect 角色）+ 人工 review

---

## Context

Agent 编排声明式配置需要一套 YAML schema，用于描述：

- 哪些 Agent 参与编排
- Agent 之间的拓扑关系（串行/并行/fork/一主多从）
- 每个 Agent 的模型配置、工作流绑定、token 限制
- 编排级别的策略（重试/降级/优先级/亲和性/调度约束）
- 安全闸门（gate_pre/gate_post）

Schema 需要在前端 YAML 编辑器提供自动补全和 lint，后端做严格校验（schema 合法性 + 引用完整性）。

---

## Decision

**自定义 YAML schema**，兼容 k8s `apiVersion/kind` 风格以降低用户学习成本，字段针对 Agent 编排定制。

```yaml
apiVersion: ai-platform/v1
kind: AgentOrchestration
metadata:
  name: code-review-pipeline
  description: 代码审查流水线
spec:
  strategy:
    priority: 80
    token_soft_limit: 800000
    token_hard_limit: 1000000
    max_retries: 3
    retry_backoff: exponential
    on_failure: degrade     # degrade | halt | ignore
  affinity:
    mode: same-node          # same-node | spread | none
  agents:
    - name: reviewer
      kind: Agent
      spec:
        runtime: langgraph
        model:
          provider: openai
          name: gpt-4o
          api_key_ref: env://OPENAI_API_KEY
        workflow_id: 1
        token_soft_limit: 500000
        token_hard_limit: 800000
        gate_pre: ""
        gate_post: ""
        io_filter: none
        inputs:
          from: trigger
          map:
            doc: "$.input.requirement_doc"
    - name: reporter
      kind: Agent
      spec:
        runtime: langchain
        model:
          provider: openai
          name: gpt-4o
          api_key_ref: env://OPENAI_API_KEY
        workflow_id: 2
  routes:
    - from: reviewer
      to: reporter
      type: sequential
      condition: ""           # 空 = 无条件，或表达式
    - from: reporter
      to: reviewer
      type: fork
      condition: "$.output.score < 0.7"
```

### Schema 校验规则

| 层 | 校验内容 | 实现 |
|---|---|---|
| **语法层** | YAML 合法（无解析错误）/ 嵌套深度 ≤ 50 | PyYAML safe_load |
| **结构层** | 必填字段完整 / 字段类型正确 / 枚举值合法 | jsonschema 验证 |
| **语义层** | 引用的 agent_id/workflow_id/tool_id 真实存在 / api_key_ref 环境变量存在 | 自定义校验器（查 DB） |
| **拓扑层** | 无孤立节点 / 无循环引用（DAG） / 连线 from/to 引用的 agent 存在 | 图算法检测 |

### 前端集成

- CodeMirror 6 YAML mode + JSON Schema → 自动补全
- js-yaml 解析错误 → lint 标记（行号 + 错误描述）
- 编辑器与画布双向绑定：编辑 YAML → 画布更新节点，拖拽画布 → YAML 更新

---

## Alternatives Considered

| 方案 | 评价 |
|---|---|
| **直接用 k8s CRD 格式** | 与 k8s 生态 100% 兼容。但 Agent 编排字段与 Pod spec 差异大（无容器/端口/卷），生搬硬套反而别扭。**排除** |
| **纯 JSON Schema** | 标准化，工具链成熟。但编写体验不如 YAML + k8s 风格（缺乏 `apiVersion/kind` 的熟悉感）。**备选** |
| **HCL（Terraform 语言）** | 声明式能力最强。但学习成本高，与 Python 生态结合差。**排除** |
| **自定义 YAML（k8s 风格）** | **选定**。用户熟悉 `apiVersion/kind` 范式，字段自行设计贴合 Agent 编排语义 |

---

## Consequences

### 正面

- 用户上手成本低（k8s 用户过渡自然）
- schema 完全定制，无冗余字段
- 前后端校验分层清晰（语法→结构→语义→拓扑）

### 负面

- 需自维护 schema 文档 + 校验器代码（无现成 CRD controller）
- 不与 k8s API Server 兼容（不能 `kubectl apply` 到 k8s 集群）
- schema 未来版本变更需向后兼容策略（`apiVersion` 版本号机制）

### Schema 版本兼容策略

- `apiVersion: ai-platform/v1` → v1 稳定版
- 新字段加法（additive）不升版本号
- 字段删除/重命名 → 升 `apiVersion: ai-platform/v2`，支持 v1→v2 自动迁移
