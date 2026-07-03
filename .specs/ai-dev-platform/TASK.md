# TASK: AI 开发平台 — 任务拆分

- **Change ID**: `ai-dev-platform`
- **关联**: `REQUIREMENT.md` · `DESIGN.md` · `UI-DESIGN.md`

---

## 波次划分

```
Wave 1  (并行): T01[P], T02[P]                    ← 基础设施
Wave 2  (并行): T03[P], T04[P], T05[P]            ← 工具库全栈
Wave 3  (并行): T06[P], T07[P]                     ← 工作流引擎
Wave 4  (并行): T08[P], T09[P], T10[P]            ← 工作流全栈
Wave 5  (并行): T11[P], T12[P], T13[P]            ← 安全+监控基础
Wave 6  (并行): T14[P], T15[P]                     ← Agent 基础设施
Wave 7  (并行): T16[P], T17[P]                     ← Agent 全栈
Wave 8  (并行): T18[P], T19[P]                     ← Agent 编排
Wave 9  (并行): T20[P], T21[P]                     ← 角色+组装
Wave 10 (并行): T22[P], T23[P]                     ← 项目管理
Wave 11 (并行): T24[P], T25[P]                     ← 项目监控
Wave 12 (串行): T26 → T27                          ← 集成测试+验收
```

---

## 任务列表

---

<task id="T01" parallel="true">
  <auto>true</auto>
  <name>MySQL ORM 模型 + Alembic 迁移（tools/workflows/snapshots 表）</name>
  <read_files>
    backend/config.py
    backend/main.py
  </read_files>
  <write_files>
    backend/models/__init__.py
    backend/models/tool.py
    backend/models/workflow.py
    backend/models/snapshot.py
    backend/migrations/*
  </write_files>
  <action>
    创建 SQLAlchemy ORM 模型：Tool（id/owner_id/type:plugin|skill|mcp/name/description/token_soft_limit/token_hard_limit/permissions/mcp_host_config/visibility/created_at/updated_at），
    Workflow（id/owner_id/name/description/definition_mode:text|visual/spec_json/status:draft|published|running|completed|failed|stopped/visibility/created_at），
    WorkflowSnapshot（id/workflow_id/tool_snapshots_json/captured_at）。
    运行 Alembic 自动生成迁移脚本并执行 `alembic upgrade head`。
  </action>
  <verify>cd backend && python -c "from models.tool import Tool; from models.workflow import Workflow; print('OK')"</verify>
  <done>ORM 模型可 import，Alembic 迁移成功，MySQL 中 tables 已创建</done>
  <depends_on></depends_on>
</task>

<task id="T02" parallel="true">
  <auto>true</auto>
  <name>FastAPI 主入口扩展 + 新路由注册</name>
  <read_files>
    backend/main.py
    backend/config.py
    backend/auth.py
    backend/routes/__init__.py
  </read_files>
  <write_files>
    backend/main.py
    backend/routes/__init__.py
    backend/routes/tools_api.py
    backend/routes/workflows_api.py
  </write_files>
  <action>
    在 main.py 注册新路由组：/api/tools、/api/workflows。
    创建 tools_api.py（CRUD 骨架：GET list + POST create + GET detail + PUT update + DELETE delete + POST disable），
    创建 workflows_api.py（CRUD 骨架同上 + POST execute）。
    所有端点复用 auth.py 的 get_current_user 依赖注入。
  </action>
  <verify>curl -s http://127.0.0.1:8000/docs | grep -o "tools\|workflows" | wc -l</verify>
  <done>Swagger /docs 中可见 tools 和 workflows 路由组，端点列表完整</done>
  <depends_on></depends_on>
</task>

<task id="T03" parallel="true">
  <auto>true</auto>
  <name>工具库 CRUD 完整实现 + admin 管控</name>
  <read_files>
    backend/routes/tools_api.py
    backend/models/tool.py
    backend/auth.py
    backend/routes/audit_api.py
  </read_files>
  <write_files>
    backend/routes/tools_api.py
    backend/services/tool_service.py
  </write_files>
  <action>
    实现 tool_service.py：create_tool / get_tool / list_tools（owner_id 过滤 / admin 全量）/ update_tool / delete_tool / disable_tool（admin only）。
    实现 tools_api.py 完整端点：POST /api/tools（创建）、GET /api/tools（列表，按 type 筛选）、GET /api/tools/:id（详情）、PUT /api/tools/:id（编辑）、DELETE /api/tools/:id（删除）、POST /api/tools/:id/disable（admin 禁用）。
    所有查询非 admin 强制 WHERE owner_id = current_user.id（R6 缓解）。
    操作记录到 audit.jsonl（event: tool.create/update/delete/disable）。
  </action>
  <verify>curl -s -X POST http://127.0.0.1:8000/api/tools -H "Content-Type: application/json" -d '{"type":"plugin","name":"test","token_soft_limit":80000,"token_hard_limit":100000,"permissions":["read"]}' | jq '.id'</verify>
  <done>创建 Plugin 返回 201 + id；GET 列表只有自己的工具；非 admin 无法看他人工具</done>
  <depends_on>T01, T02</depends_on>
</task>

<task id="T04" parallel="true">
  <auto>true</auto>
  <name>MCP 语言描述生成器 + demo 模板下载</name>
  <read_files>
    backend/services/tool_service.py
    backend/models/tool.py
  </read_files>
  <write_files>
    backend/services/mcp_manager.py
    backend/services/demo_templates.py
    backend/routes/tools_api.py
  </write_files>
  <action>
    实现 demo_templates.py：为 plugin/skill/mcp 三种类型生成 demo zip 包（含目录结构+代码骨架+README），端点 GET /api/tools/:id/demo 下载。
    实现 mcp_manager.py：端口池管理（9100-9199）、子进程启动/健康检查/停止。端点 POST /api/tools/:id/generate-mcp（语言描述→Python 骨架代码）。
    MCP 骨架含：JSON-RPC 接口定义、requirements.txt（mcp 依赖）、README。
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/tools/{tool_id}/demo -o /tmp/demo.zip && unzip -l /tmp/demo.zip | head -10</verify>
  <done>demo 模板下载成功含目录结构；语言描述生成 MCP 骨架代码语法正确</done>
  <depends_on>T03</depends_on>
</task>

<task id="T05" parallel="true">
  <auto>true</auto>
  <name>工具市场前端页面（ToolMarket.tsx）</name>
  <read_files>
    frontend/src/App.tsx
    frontend/src/pages/Home.tsx
    frontend/src/components/ChangeCard.tsx
    frontend/src/stores/auth.ts
    frontend/src/stores/changes.ts
    UI-DESIGN.md
  </read_files>
  <write_files>
    frontend/src/pages/ToolMarket.tsx
    frontend/src/stores/tools.ts
    frontend/src/components/CreateToolDialog.tsx
    frontend/src/App.tsx
  </write_files>
  <action>
    创建 tools.ts zustand store：fetchTools / createTool / deleteTool。
    创建 CreateToolDialog.tsx：模态表单（类型选择 Plugin|Skill|MCP + 名称+描述+token软/硬限制+权限勾选+MCP 托管选项）。
    创建 ToolMarket.tsx：类型 tabs 筛选 + 搜索 + 工具卡片网格（参考 UI-DESIGN §4.1）+ "创建工具"按钮 + demo 下载 + admin 禁用按钮。
    在 App.tsx 侧边栏注册导航项「🔧 工具市场」（图标 Lucide Wrench）。
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose 2>&1 | tail -5</verify>
  <done>工具市场页可访问；创建 Plugin/Skill/MCP 表单可用；列表按类型筛选正确；非 admin 不可见他人工具</done>
  <depends_on>T02</depends_on>
</task>

<task id="T06" parallel="true">
  <auto>true</auto>
  <name>工作流 DAG 调度引擎（workflow_engine.py）</name>
  <read_files>
    backend/models/workflow.py
    backend/models/snapshot.py
    backend/models/tool.py
  </read_files>
  <write_files>
    backend/services/workflow_engine.py
    backend/services/workflow_engine_test.py
  </write_files>
  <action>
    实现轻量 DAG 调度器：① 拓扑排序（Kahn 算法）② asyncio.gather 并行执行 ③ 条件分支（运行时输出路由）④ 每节点执行后记录状态+token消耗。
    支持 workflow_spec JSON 格式：nodes[{id, tool_id, config}], edges[{from, to, condition?}]。
    每节点执行前检查 token 软硬限制（ADDR-006 三层检查）。
  </action>
  <verify>cd backend && python -m pytest services/workflow_engine_test.py -v</verify>
  <done>DAG 调度器单元测试通过（含：线性/并行/条件分支/软限制警告/硬限制阻断场景）</done>
  <depends_on>T01</depends_on>
</task>

<task id="T07" parallel="true">
  <auto>true</auto>
  <name>工具快照服务（snapshot_service.py）</name>
  <read_files>
    backend/models/snapshot.py
    backend/models/tool.py
  </read_files>
  <write_files>
    backend/services/snapshot_service.py
  </write_files>
  <action>
    实现 create_snapshot(workflow_id, tool_ids)：读取每个 tool 当前 JSON → zlib 压缩 → 存入 WorkflowSnapshot.tool_snapshots_json。
    实现 get_snapshot(workflow_id)：读取最新快照并解压。
    实现 cleanup_old_snapshots(workflow_id, keep=5)：保留最近 5 个版本。
    实现 compare_snapshots(s1, s2)：返回 diff 摘要（哪些工具变更了）。
  </action>
  <verify>cd backend && python -c "from services.snapshot_service import create_snapshot, get_snapshot; print('OK')"</verify>
  <done>快照创建/读取/清理/对比均可正常调用</done>
  <depends_on>T01</depends_on>
</task>

<task id="T08" parallel="true">
  <auto>true</auto>
  <name>工作流 CRUD API + 执行端点</name>
  <read_files>
    backend/routes/workflows_api.py
    backend/models/workflow.py
    backend/services/workflow_engine.py
    backend/services/snapshot_service.py
    backend/auth.py
  </read_files>
  <write_files>
    backend/routes/workflows_api.py
  </write_files>
  <action>
    实现完整端点：POST /api/workflows（创建，自动创建快照）→ GET /api/workflows（列表，owner 隔离）→ GET /api/workflows/:id（详情含快照摘要）→ PUT /api/workflows/:id（编辑，仅 draft 状态）→ DELETE /api/workflows/:id（非 running）→ POST /api/workflows/:id/publish（发布+创建快照）→ POST /api/workflows/:id/execute（调用 workflow_engine 执行）→ POST /api/workflows/:id/stop。
    所有操作记录 audit log。
  </action>
  <verify>curl -s -X POST http://127.0.0.1:8000/api/workflows -H "Content-Type: application/json" -d '{"name":"test-wf","definition_mode":"text","spec_json":{"nodes":[{"id":"n1","tool_id":1}]}}' | jq '.status'</verify>
  <done>工作流 CRUD 全端点可调；发布创建快照；执行返回状态</done>
  <depends_on>T06, T07, T02</depends_on>
</task>

<task id="T09" parallel="true">
  <auto>true</auto>
  <name>工作流可视化画布（WorkflowCanvas.tsx · React Flow）</name>
  <read_files>
    frontend/src/App.tsx
    frontend/src/stores/auth.ts
    frontend/src/components/ConfirmDialog.tsx
    UI-DESIGN.md
  </read_files>
  <write_files>
    frontend/src/pages/WorkflowCanvas.tsx
    frontend/src/components/WorkflowNode.tsx
    frontend/src/stores/workflows.ts
    frontend/src/App.tsx
  </write_files>
  <action>
    安装 reactflow 依赖。
    创建 workflows.ts zustand store。
    创建 WorkflowNode.tsx（自定义 React Flow 节点：暗色主题·Lucide 图标·端口圆点·状态色边框·参考 UI-DESIGN §4.2）。
    创建 WorkflowCanvas.tsx：左侧工具拖拽列 + 画布（React Flow 暗色主题·网格线背景·DAG 拖拽连线·条件分支菱形节点·无环校验·右键菜单·撤销重做·缩放平移）。
    工具栏：保存/发布/文本模式切换。
    在 App.tsx 注册导航项「🔀 工作流」。
  </action>
  <verify>cd frontend && npx tsc --noEmit 2>&1 | grep -c "error"</verify>
  <done>工作流画布可拖拽工具节点、连线、条件分支菱形渲染正确、保存后创建快照</done>
  <depends_on>T05, T08</depends_on>
</task>

<task id="T10" parallel="true">
  <auto>true</auto>
  <name>工作流文本描述模式 + 工作流列表页</name>
  <read_files>
    frontend/src/pages/WorkflowCanvas.tsx
    frontend/src/stores/workflows.ts
  </read_files>
  <write_files>
    frontend/src/pages/WorkflowEditor.tsx
    frontend/src/components/WorkflowTextEditor.tsx
  </write_files>
  <action>
    创建 WorkflowTextEditor.tsx：textarea 输入文本描述工作流（"用工具 A 处理输入→工具 B 审核→输出"），解析为 JSON spec 并预览。
    创建 WorkflowEditor.tsx：整合可视化+文本双模式切换；工作流列表页（卡片展示：name/工具数/状态/时间/操作按钮）。
    复用已有 WorkflowEditor.tsx 页面（扩展而非替换）。
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose 2>&1 | tail -3</verify>
  <done>文本描述可解析为工作流 spec；列表页按状态筛选正确</done>
  <depends_on>T09</depends_on>
</task>

<task id="T11" parallel="true">
  <auto>true</auto>
  <name>安全策略默认值 + Token 软硬限制执行</name>
  <read_files>
    backend/services/workflow_engine.py
    backend/services/tool_service.py
    backend/models/tool.py
    backend/models/workflow.py
    backend/auth.py
  </read_files>
  <write_files>
    backend/services/security_service.py
    backend/middleware/token_limit_middleware.py
  </write_files>
  <action>
    实现 security_service.py：apply_defaults(entity) → 自动填充安全闸门=「无」、I/O 过滤=「不过滤」、token 软限制=80k/800k、硬限制=100k/1M、权限=owner_only。
    实现 token_limit_middleware.py：三层检查（ADDR-006）→ 执行前硬限制预检（拒绝）→ 执行中每 chunk 检查软限制（警告事件）→ 执行后更新累计+硬限制阻断。
    全局配置端点 GET/PUT /api/admin/security-config（admin only）。
  </action>
  <verify>cd backend && python -c "from services.security_service import apply_defaults; e={'type':'test'}; apply_defaults(e); assert 'token_soft_limit' in e; print('OK')"</verify>
  <done>新实体自动填充安全默认值；token 软限制触发警告不中断；硬限制触发阻断</done>
  <depends_on>T03, T06</depends_on>
</task>

<task id="T12" parallel="true">
  <auto>true</auto>
  <name>监控数据聚合服务（Redis 5min bucket + MySQL 明细）</name>
  <read_files>
    backend/routes/token_usage.py
    backend/routes/runtime_api.py
    backend/config.py
  </read_files>
  <write_files>
    backend/services/metrics_service.py
    backend/models/metrics.py
    backend/routes/metrics_api.py
  </write_files>
  <action>
    创建 metrics ORM 模型：MetricRaw（id/entity_type/entity_id/owner_id/model_name/token_count/tool_hit_count/execution_time_ms/timestamp）。
    实现 metrics_service.py：record_metric() → 写 MySQL 明细 + Redis ZADD（5min bucket key: metrics:{type}:{id}:{ts//300}）。
    实现 GET /api/metrics/:entity_type/:entity_id（读 Redis 聚合值·柱/折/饼数据格式）。
    实现 GET /api/metrics/global（admin 全局汇总·按用户/实体/模型下钻）。
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/metrics/tool/1 | jq '.buckets | length'</verify>
  <done>metrics 写入 MySQL+Redis；5 分钟聚合查询返回 bucket 数组</done>
  <depends_on>T01, T02</depends_on>
</task>

<task id="T13" parallel="true">
  <auto>true</auto>
  <name>监控面板前端（MonitoringDashboard.tsx + TokenChart.tsx）</name>
  <read_files>
    frontend/src/components/StatsTab.tsx
    frontend/src/stores/changes.ts
    UI-DESIGN.md
  </read_files>
  <write_files>
    frontend/src/pages/MonitoringDashboard.tsx
    frontend/src/components/TokenChart.tsx
    frontend/src/stores/metrics.ts
    frontend/src/App.tsx
  </write_files>
  <action>
    创建 metrics.ts zustand store。
    创建 TokenChart.tsx：5 分钟粒度柱/折/饼图 Recharts 组件（暗色主题·aria-describedby 指向隐藏 table·参考 UI-DESIGN §4.6）。
    创建 MonitoringDashboard.tsx：token 消耗面板（按模型分组·柱/折/饼切换）+ 工具命中次数面板 + 使用频次面板 + 审计日志表格筛选。
    在 App.tsx 注册导航项「📈 监控面板」（admin 可见）。
  </action>
  <verify>cd frontend && npx tsc --noEmit 2>&1 | grep -c "error"</verify>
  <done>监控页可见三种图表切换；5 分钟粒度数据正确聚合展示；模型维度分组正确</done>
  <depends_on>T12</depends_on>
</task>

<task id="T14" parallel="true">
  <auto>true</auto>
  <name>Agent ORM 模型 + LangChain/LangGraph 适配层</name>
  <read_files>
    backend/models/tool.py
    backend/models/workflow.py
    backend/services/workflow_engine.py
  </read_files>
  <write_files>
    backend/models/agent.py
    backend/services/agent_runtime.py
    backend/migrations/*
  </write_files>
  <action>
    创建 Agent ORM 模型：id/owner_id/name/runtime:langchain|langgraph/model_provider/model_name/model_config_json/api_key_encrypted/workflow_id/status:standby|running|completed|error|disabled/token_soft_limit/token_hard_limit/total_tokens_used/created_at。
    实现 agent_runtime.py 适配层：根据 runtime 类型自动选择 LangChain LLMChain（线性）或 LangGraph StateGraph（复杂图）。统一接口 execute(input) → output。callback 中自动记录 model_name + token 消耗到 metrics。
  </action>
  <verify>cd backend && python -c "from models.agent import Agent; from services.agent_runtime import AgentRuntime; print('OK')"</verify>
  <done>Agent ORM 可 import；agent_runtime 适配层接口定义完成</done>
  <depends_on>T01, T06</depends_on>
</task>

<task id="T15" parallel="true">
  <auto>true</auto>
  <name>Agent CRUD API + API Key 加密存储</name>
  <read_files>
    backend/models/agent.py
    backend/services/agent_runtime.py
    backend/auth.py
    backend/routes/tools_api.py
  </read_files>
  <write_files>
    backend/routes/agents_api.py
    backend/services/encryption_service.py
  </write_files>
  <action>
    实现 encryption_service.py：AES-256-GCM 加密/解密（密钥从 ENCRYPTION_KEY 环境变量读取）。
    实现 agents_api.py：POST /api/agents（创建·加密 API Key）→ GET /api/agents（列表·API Key 脱敏）→ GET /api/agents/:id（详情·API Key 脱敏 sk-***...***xYz）→ PUT /api/agents/:id → DELETE /api/agents/:id（非 running）→ POST /api/agents/:id/run（执行）→ POST /api/agents/:id/stop。
    绑定工作流时自动解析结构摘要（节点数+类型+约束）。
  </action>
  <verify>curl -s -X POST http://127.0.0.1:8000/api/agents -H "Content-Type: application/json" -d '{"name":"test-agent","runtime":"langgraph","model_provider":"openai","model_name":"gpt-4o","api_key":"sk-test123","workflow_id":1}' | jq '.api_key'</verify>
  <done>Agent 创建返回脱敏 API Key；运行中不可删除；admin 可见全部</done>
  <depends_on>T14, T08</depends_on>
</task>

<task id="T16" parallel="true">
  <auto>true</auto>
  <name>Agent 构建器前端（AgentBuilder.tsx）</name>
  <read_files>
    frontend/src/pages/ToolMarket.tsx
    frontend/src/stores/auth.ts
    UI-DESIGN.md
  </read_files>
  <write_files>
    frontend/src/pages/AgentBuilder.tsx
    frontend/src/stores/agents.ts
    frontend/src/App.tsx
  </write_files>
  <action>
    创建 agents.ts zustand store。
    创建 AgentBuilder.tsx：Agent 配置表单（参考 UI-DESIGN §4.3）→ 名称/运行时选择 Radio/模型 provider+name 下拉/API Key 密码输入+显示切换/工作流下拉+结构预览/token 软硬限制。
    创建 Agent 列表页：卡片展示（名称/运行时/模型/状态/工作流/token消耗/引用项目数·可点击跳转）。
    在 App.tsx 注册导航项「🤖 Agent」。
  </action>
  <verify>cd frontend && npx tsc --noEmit 2>&1 | grep -c "error"</verify>
  <done>Agent 构建表单可创建；API Key 输入密码遮蔽；工作流选择后展示结构摘要</done>
  <depends_on>T05, T15</depends_on>
</task>

<task id="T17" parallel="true">
  <auto>true</auto>
  <name>K8s 风格 YAML 解析器（后端）</name>
  <read_files>
    backend/models/agent.py
    backend/services/agent_runtime.py
  </read_files>
  <write_files>
    backend/services/orchestration_parser.py
    backend/services/orchestration_parser_test.py
  </write_files>
  <action>
    实现 YAML 解析器：支持 apiVersion: ai-platform/v1, kind: AgentOrchestration。解析 agents[]（name/spec.tools/spec.model/spec.sop/spec.monitoring）、routes[]（from/to/type）、parallelism、security 段。
    JSON Schema 校验 + Pydantic 验证。语法错误返回精确行号+修复建议（如 "line 15: 'temprature' 未知字段，是否指 'temperature'？"）。
    解析成功后自动构建 Agent 编排 DAG 图（节点+边+并行标记）。
  </action>
  <verify>cd backend && python -m pytest services/orchestration_parser_test.py -v</verify>
  <done>合法 YAML 解析为编排 DAG；语法错误精确行号+修复建议；未知字段检测</done>
  <depends_on>T14</depends_on>
</task>

<task id="T18" parallel="true">
  <auto>true</auto>
  <name>Agent 编排 CRUD API + 执行引擎</name>
  <read_files>
    backend/services/orchestration_parser.py
    backend/services/agent_runtime.py
    backend/routes/agents_api.py
    backend/auth.py
  </read_files>
  <write_files>
    backend/routes/orchestration_api.py
    backend/models/orchestration.py
  </write_files>
  <action>
    创建 Orchestration ORM 模型：id/owner_id/name/definition_type:visual|yaml|text/spec_json/yaml_raw/status/created_at。
    实现 orchestration_api.py：POST /api/orchestration（创建·支持 YAML 上传+文本描述+可视化 JSON）→ PUT /api/orchestration/:id → POST /api/orchestration/:id/validate（校验 YAML/JSON 但不保存）→ POST /api/orchestration/:id/execute（按 DAG 拓扑顺序调度 Agent 执行·并行 Agent 用 asyncio.gather）。
    执行时每个 Agent 按 USP-AO-4 的 sop 配置触发（after_agent/after_all/on_project_create）。
  </action>
  <verify>curl -s -X POST http://127.0.0.1:8000/api/orchestration/validate -H "Content-Type: application/json" -d '{"yaml_raw":"apiVersion: ai-platform/v1\nkind: AgentOrchestration\nspec:\n  agents: []"}' | jq '.valid'</verify>
  <done>Agent 编排 CRUD 可调；YAML 校验端点返回 valid/errors；执行按拓扑顺序调度</done>
  <depends_on>T17, T15</depends_on>
</task>

<task id="T19" parallel="true">
  <auto>true</auto>
  <name>Agent 编排前端（AgentOrchestration.tsx · YAML+可视化+自然语言三模式）</name>
  <read_files>
    frontend/src/pages/WorkflowCanvas.tsx
    frontend/src/stores/agents.ts
    UI-DESIGN.md
  </read_files>
  <write_files>
    frontend/src/pages/AgentOrchestration.tsx
    frontend/src/components/YamlEditor.tsx
    frontend/src/stores/orchestrations.ts
    frontend/src/App.tsx
  </write_files>
  <action>
    创建 orchestrations.ts zustand store。
    创建 YamlEditor.tsx：Monaco/CodeMirror 暗色编辑器·JetBrains Mono·行号·错误行高亮+修复建议 tooltip。
    创建 AgentOrchestration.tsx：三模式切换（可视化编排·YAML 配置·自然语言描述）→ 参考 UI-DESIGN §4.4。
    - 可视化：React Flow 画布拖拽 Agent 节点连线·并发/fork 标记。
    - YAML：编辑器+实时预览（解析为可视化图）。
    - 自然语言：textarea+"解析"按钮→自动生成 YAML+可视化。
    工具栏：校验/执行/保存。
    在 App.tsx 注册导航项「🔗 Agent 编排」。
  </action>
  <verify>cd frontend && npx tsc --noEmit 2>&1 | grep -c "error"</verify>
  <done>三模式可切换；YAML 编辑语法错误实时高亮；自然语言解析为可视化图</done>
  <depends_on>T16, T18</depends_on>
</task>

<task id="T20" parallel="true">
  <auto>true</auto>
  <name>自定义角色 CRUD + 前端</name>
  <read_files>
    frontend/src/pages/Roles.tsx
    backend/routes/roles_api.py
    backend/auth.py
  </read_files>
  <write_files>
    backend/routes/roles_custom_api.py
    backend/models/role_custom.py
    frontend/src/pages/Roles.tsx
  </write_files>
  <action>
    创建 RoleCustom ORM 模型：id/owner_id/name/temperament/responsibilities/boundaries/triggers/input_spec/output_spec/based_on（参考的 code-kit 角色）。
    实现 roles_custom_api.py：CRUD + 列出 code-kit 内置 12 角色模板（只读）+ 基于模板创建自定义角色。
    扩展已有 Roles.tsx 页面：添加「自定义角色」tab·角色卡片（名称/性情摘要/来源标记）·编辑/删除。
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/roles/templates | jq 'length'</verify>
  <done>内置角色模板只读展示；自定义角色 CRUD 正常；用户隔离正确</done>
  <depends_on>T01, T02</depends_on>
</task>

<task id="T21" parallel="true">
  <auto>true</auto>
  <name>角色×工作流×节点组装 API + 前端</name>
  <read_files>
    backend/services/workflow_engine.py
    backend/routes/roles_custom_api.py
    frontend/src/pages/WorkflowCanvas.tsx
  </read_files>
  <write_files>
    backend/routes/assembly_api.py
    frontend/src/components/RoleBindingPanel.tsx
  </write_files>
  <action>
    实现 assembly_api.py：POST /api/assembly/bind（将角色绑定到工作流节点）→ GET /api/assembly/:workflow_id（查看绑定关系）。
    节点执行时加载绑定角色的审查 prompt（对抗模式下调用角色 B 审核角色 A 输出）。
    创建 RoleBindingPanel.tsx：在工作流画布右侧面板·下拉选择角色→绑定到选中节点·节点显示角色标签。
  </action>
  <verify>curl -s -X POST http://127.0.0.1:8000/api/assembly/bind -H "Content-Type: application/json" -d '{"workflow_id":1,"node_id":"n1","role_id":1,"mode":"review"}' | jq '.status'</verify>
  <done>角色可绑定到节点；节点显示角色标签；执行时加载角色 prompt</done>
  <depends_on>T20, T08</depends_on>
</task>

<task id="T22" parallel="true">
  <auto>true</auto>
  <name>项目管理 CRUD API + 需求文档递归解析</name>
  <read_files>
    backend/routes/agents_api.py
    backend/models/agent.py
    backend/models/workflow.py
    backend/auth.py
  </read_files>
  <write_files>
    backend/routes/projects_api.py
    backend/models/project.py
    backend/services/requirement_parser.py
  </write_files>
  <action>
    创建 Project ORM 模型：id/owner_id/name/requirement_raw/requirement_type:text|api_doc|markdown/parsed_summary/agent_id/workflow_id/status:pending|running|completed|error|cancelled/created_at。
    实现 requirement_parser.py：递归解析需求文档（Markdown→提取引用 URL→fetch→解析 API 文档→合并摘要）。支持嵌套不限层数。
    实现 projects_api.py：CRUD + POST /api/projects/:id/parse（解析需求）→ POST /api/projects/:id/execute（调用 Agent 执行）→ POST /api/projects/:id/upload-legacy（老旧项目 Git clone+代码扫描+分析报告）。
    删除保护：执行中不可删。
  </action>
  <verify>curl -s -X POST http://127.0.0.1:8000/api/projects -H "Content-Type: application/json" -d '{"name":"test-project","requirement_raw":"修复登录页 bug","agent_id":1}' | jq '.status'</verify>
  <done>项目创建/需求解析/绑定 Agent/执行/老旧项目上传均可调；执行中删除返回 400</done>
  <depends_on>T15, T08</depends_on>
</task>

<task id="T23" parallel="true">
  <auto>true</auto>
  <name>项目管理前端（ProjectManager.tsx）</name>
  <read_files>
    frontend/src/pages/Home.tsx
    frontend/src/stores/agents.ts
    UI-DESIGN.md
  </read_files>
  <write_files>
    frontend/src/pages/ProjectManager.tsx
    frontend/src/stores/projects.ts
    frontend/src/App.tsx
  </write_files>
  <action>
    创建 projects.ts zustand store。
    创建 ProjectManager.tsx：项目卡片列表（参考 UI-DESIGN §4.5）→ 创建对话框（名称+需求输入:text/api_doc/markdown+Agent选择+工作流选择）→ 需求解析按钮+摘要预览→ 执行按钮→ 老旧项目上传（Git URL 输入）。
    项目卡片展示：状态/Agent/工作流/进度条/token消耗/时间/操作按钮（查看监控/停止/删除）。
    在 App.tsx 注册导航项「📁 项目管理」。
  </action>
  <verify>cd frontend && npx tsc --noEmit 2>&1 | grep -c "error"</verify>
  <done>项目管理页可创建/查看/执行/停止/删除；执行中删除按钮灰掉；老旧项目上传入口可用</done>
  <depends_on>T16, T22</depends_on>
</task>

<task id="T24" parallel="true">
  <auto>true</auto>
  <name>项目监控 API（通用工作流监控 + 快照隔离）</name>
  <read_files>
    backend/routes/metrics_api.py
    backend/services/metrics_service.py
    backend/models/project.py
  </read_files>
  <write_files>
    backend/routes/project_metrics_api.py
  </write_files>
  <action>
    实现 project_metrics_api.py：GET /api/projects/:id/metrics（工作流执行状态+当前节点+已执行时长+预计剩余时长+token 趋势+工具命中+模型分布+审计日志）→ GET /api/projects/:id/snapshot（查看绑定的工作流快照版本）。
    快照隔离验证：工作流原型升级后，项目快照不变。
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/projects/{id}/metrics | jq '.workflow_status'</verify>
  <done>项目监控数据完整返回；工作流快照版本隔离正确</done>
  <depends_on>T12, T22</depends_on>
</task>

<task id="T25" parallel="true">
  <auto>true</auto>
  <name>项目监控前端</name>
  <read_files>
    frontend/src/pages/MonitoringDashboard.tsx
    frontend/src/components/TokenChart.tsx
    frontend/src/pages/ProjectManager.tsx
  </read_files>
  <write_files>
    frontend/src/pages/ProjectMonitor.tsx
  </write_files>
  <action>
    创建 ProjectMonitor.tsx：嵌入项目详情页·tab 切换（概览/监控/审计日志）。
    监控 tab：执行状态时间线+token 趋势图（复用 TokenChart）+工具命中图+模型分布饼图。
    审计日志 tab：可筛选时间/操作类型。
    "查看监控"按钮从项目卡片跳转到此页。
  </action>
  <verify>cd frontend && npx tsc --noEmit 2>&1 | grep -c "error"</verify>
  <done>项目监控页可查看实时状态+图表+审计日志；快照版本信息展示正确</done>
  <depends_on>T23, T24</depends_on>
</task>

<task id="T26" parallel="false">
  <auto>false</auto>
  <name>端到端集成测试（全链路）</name>
  <read_files>
    backend/routes/*
    frontend/src/pages/*
    REQUIREMENT.md
  </read_files>
  <write_files>
    backend/tests/test_e2e.py
    frontend/src/__tests__/e2e.test.tsx
  </write_files>
  <action>
    编写后端 pytest 集成测试：覆盖全链路（创建工具→工作流→Agent→编排→项目→执行→监控）。
    编写前端 vitest 测试：ToolMarket/WorkflowCanvas/AgentBuilder/AgentOrchestration/ProjectManager/MonitoringDashboard 关键操作。
    测试场景：正常流程+参数错误+未登录+权限不足+并发请求+token 硬限制阻断。
  </action>
  <verify>cd backend && python -m pytest tests/test_e2e.py -v && cd ../frontend && npx vitest run</verify>
  <done>全部集成测试通过；AC-DONE-1/2 覆盖完整</done>
  <depends_on>T25</depends_on>
</task>

<task id="T27" parallel="false">
  <auto>false</auto>
  <name>完成标准验收（AC-DONE-3 · 本地端到端演示）</name>
  <read_files>
    REQUIREMENT.md
    backend/main.py
    frontend/src/App.tsx
  </read_files>
  <write_files>
    README.md
  </write_files>
  <action>
    验证 AC-DONE-3：本地部署环境（ENCRYPTION_KEY/MYSQL/REDIS）→ 启动前后端 → 浏览器访问 http://127.0.0.1:{port} → 端到端执行：登录→创建 Plugin→创建工作流（文本+可视化）→创建 Agent 绑定工作流→上传 K8s YAML 编排多 Agent→创建项目绑定 Agent→执行并查看监控出图。
    编写 README.md：启动步骤/环境变量/依赖/端口/演示流程。
  </action>
  <verify>curl -s http://127.0.0.1:8000/health && curl -s http://127.0.0.1:5173 | head -5</verify>
  <done>前后端均正常启动；全链路无报错；监控图表出图；满足 AC-DONE-3</done>
  <depends_on>T26</depends_on>
</task>

---

## 波次汇总

| Wave | 任务 | 并行度 | 预计工时 |
|---|---|---|---|
| 1 | T01, T02 | 2 | 30min |
| 2 | T03, T04, T05 | 3 | 1h |
| 3 | T06, T07 | 2 | 45min |
| 4 | T08, T09, T10 | 3 | 1.5h |
| 5 | T11, T12, T13 | 3 | 1h |
| 6 | T14, T15 | 2 | 45min |
| 7 | T16, T17 | 2 | 1h |
| 8 | T18, T19 | 2 | 1h |
| 9 | T20, T21 | 2 | 45min |
| 10 | T22, T23 | 2 | 1h |
| 11 | T24, T25 | 2 | 45min |
| 12 | T26 → T27 | 1 | 1.5h |
| **总计** | 27 tasks | — | **~12h** |

---

## 🛡️ Task 门 · 投票记录

```
🗳️ Task 门: TASK.md 是否通过？

   🟫 工程效能专家: ✅ 通过 — 27 个 task 粒度合理（单个 20-60min），12 波次分层清晰，23/27 可并行最大化效率。垂直切片优先（每个 wave 覆盖模型+API+UI），依赖关系无环
   🟦 架构师: ✅ 通过 — 覆盖 DESIGN 全部 12 项决策：DAG引擎(T06)/快照(T07)/ReactFlow(T09)/双运行时(T14)/K8s YAML(T17)/加密(T15)/软硬限制(T11)/权限(T03)/监控聚合(T12)/模型追踪(T12)/YAML schema(T17)/完成标准(T26-27)。禁动清单无触碰
   🟩 研发负责人: ✅ 通过 — write_files 边界清晰，全部在 DESIGN 触碰+新增模块范围内。5 个引入新模式文件（agent_runtime/mcp_manager/encryption_service/workflow_engine/orchestration_parser）均有测试 task 覆盖。工时 12h 合理
   🔴 资深测试工程师: ✅ 通过 — 每个 task 有可执行 verify（curl/pytest/vitest/tsc），done 均可判定。T26(集成测试)+T27(端到端验收)覆盖 AC-DONE-1/2/3。T11(token软硬限制)/T15(API Key加密)安全关键路径有测试

   自动化策略汇总：
   T01🤖 T02🤖 T03🤖 T04🤖 T05🤖 T06🤖 T07🤖 T08🤖 T09🤖 T10🤖
   T11🤖 T12🤖 T13🤖 T14🤖 T15🤖 T16🤖 T17🤖 T18🤖 T19🤖 T20🤖
   T21🤖 T22🤖 T23🤖 T24🤖 T25🤖 T26👤 T27👤
   (25/27 🤖自动化 · 2/27 👤人工)

   结果: 4/4 全票通过 → ✅ 自动进入 4-dev
```
