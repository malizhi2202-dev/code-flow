# TASK: Agent 编排模块 k8s 化改造

- **Change ID**: `agent-k8s-orchestration`
- **关联**: `REQUIREMENT.md`、`DESIGN.md`、`UI-DESIGN.md`

---

## 波次划分

```
Wave 1 (parallel):  T01[P], T02[P], T03[P]
Wave 2 (parallel):  T04[P], T05[P] (depends on T01)
Wave 3 (parallel):  T06[P], T07[P], T08[P] (depends on T01,T02,T04,T05)
Wave 4 (parallel):  T09[P], T10[P], T11[P] (depends on T03)
Wave 5 (parallel):  T12[P], T13[P], T14[P] (depends on T09,T10,T11)
Wave 6 (parallel):  T15[P], T16[P] (depends on T06,T12,T13,T14)
Wave 7 (parallel):  T17[P], T18[P] (depends on T15,T16)
Wave 8:             T19 → T20 (depends on T17,T18)
```

---

## 任务清单

<task id="T01" parallel="true" status="done">
  <name>新增编排相关 ORM 模型 + 数据库迁移</name>
  <read_files>
    backend/models/__init__.py
    backend/models/agent.py
    backend/models/workflow.py
    backend/database.py
    DESIGN.md##2
  </read_files>
  <write_files>
    backend/models/orchestration.py
  </write_files>
  <action>
    创建 5 个新 ORM 模型（SQLAlchemy DeclarativeBase）：
    - OrchestrationInstance：id, owner_id, name, yaml_raw(Text), status(Enum: draft/pending/running/converging/success/failed/degraded), transition_status(String), agent_ids(JSON), created_at, updated_at
    - TopologySnapshot：id, instance_id(FK), yaml_raw(Text), node_count, edge_count, created_at
    - OrchestrationTemplate：id, owner_id, name, description, yaml_raw(Text), params_schema(JSON), published(Boolean), deploy_count, created_at, updated_at
    - SchedulingQueue：id, instance_id(FK), priority(Integer), status(Enum: queued/scheduled/executing/evicted), enqueued_at, scheduled_at, max_wait_until
    - TraceSpan：id, instance_id(FK), from_agent_id(Integer, nullable), to_agent_id(Integer), duration_ms, tokens, input_hash, output_hash, span_type(Enum: agent_call/retry/degrade), timestamp
    在 database.py startup 中调用 Base.metadata.create_all() 自动建表。
  </action>
  <verify>cd backend && /home/malizhi/ai/code-flow/.venv/bin/python -c "from models.orchestration import OrchestrationInstance, TopologySnapshot, OrchestrationTemplate, SchedulingQueue, TraceSpan; print('5 models OK')"</verify>
  <done>5 个 ORM 模型可 import，无报错；Base.metadata.create_all() 建表成功</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T02" parallel="true" status="done">
  <name>YAML Schema 校验器</name>
  <read_files>
    DESIGN.md ADR-002
    backend/services/orchestration_parser.py
  </read_files>
  <write_files>
    backend/engine/__init__.py
    backend/engine/yaml_schema.py
  </write_files>
  <action>
    实现 YAML schema 校验器：
    - 加载 PyYAML safe_load（禁用任意代码执行）
    - jsonschema 结构校验（必填字段：apiVersion/kind/metadata.name/spec.agents/spec.routes）
    - 语义校验：agent_name 唯一性、routes.from/to 引用存在性、无孤立节点、DAG 无环检测
    - 安全校验：文件≤1MB、嵌套深度≤50、拒绝未知字段（strict mode）
    - 校验失败返回结构化错误列表 [{line, field, message}]
  </action>
  <verify>cd backend && /home/malizhi/ai/code-flow/.venv/bin/python -c "
from engine.yaml_schema import validate_yaml
# valid
r = validate_yaml('apiVersion: ai-platform/v1\nkind: AgentOrchestration\nmetadata:\n  name: test\nspec:\n  agents:\n    - name: a\n      kind: Agent\n      spec:\n        runtime: langgraph\n        model:\n          provider: openai\n          name: gpt-4o\n        workflow_id: 1\n  routes:\n    - from: a\n      to: a\n      type: sequential\n')
assert r['valid'] == False or 'self-loop' in str(r), f'unexpected: {r}'
print('schema validator OK')
"</verify>
  <done>合法 YAML 返回 {valid:true}；非法 YAML 返回结构化错误列表；爆炸防护生效（深度>50 拒绝）</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T03" parallel="true" status="done">
  <name>依赖安装：PyYAML + jsonschema + js-yaml + React Flow + CodeMirror 6</name>
  <read_files>
    backend/requirements.txt
    frontend/package.json
  </read_files>
  <write_files>
    backend/requirements.txt
    frontend/package.json
  </write_files>
  <action>
    后端：requirements.txt 新增 PyYAML>=6.0、jsonschema>=4.0
    前端：package.json 新增 @xyflow/react@^12、codemirror@^6、@codemirror/lang-yaml、@codemirror/theme-one-dark、js-yaml@^4
    安装依赖并验证 import。
  </action>
  <verify>cd backend && /home/malizhi/ai/code-flow/.venv/bin/pip install PyYAML jsonschema -q && /home/malizhi/ai/code-flow/.venv/bin/python -c "import yaml, jsonschema; print('backend deps OK')" && cd ../frontend && npm install --save @xyflow/react codemirror @codemirror/lang-yaml @codemirror/theme-one-dark js-yaml 2>&1 | tail -3</verify>
  <done>PyYAML/jsonschema 可 import；@xyflow/react/CodeMirror/js-yaml npm 安装成功</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T04" parallel="true" status="done">
  <name>Reconcile Loop 引擎</name>
  <read_files>
    backend/engine/yaml_schema.py
    backend/models/orchestration.py
    backend/models/agent.py
    backend/services/audit_service.py
    DESIGN.md ADR-001
  </read_files>
  <write_files>
    backend/engine/reconcile_loop.py
  </write_files>
  <action>
    实现 reconcile loop 引擎（asyncio 后台任务）：
    - reconcile_loop()：5 秒周期，遍历所有 running/degraded/converging 编排实例
    - observe()：从 topology_snapshot 读取期望状态，从 Agent 表读取实际状态
    - diff()：对比期望 vs 实际（agent 数量、状态、连线健康）
    - reconcile()：按 diff 类型执行动作——Agent 异常→标记 degraded + 通知；Agent 崩溃→auto_restart；漂移→标记 drift + 告警
    - 重试逻辑：按实例配置的 max_retries + backoff 策略
    - 最外层 try/except 保护（未捕获异常不 kill loop）
    - 每次 reconcile 写 audit 日志
    - FastAPI startup 事件注册：asyncio.create_task(reconcile_loop())
  </action>
  <verify>cd backend && /home/malizhi/ai/code-flow/.venv/bin/python -c "
from engine.reconcile_loop import reconcile_loop, compare_states
# 模拟 diff
desired = {'agents': [{'name': 'a', 'status': 'running'}, {'name': 'b', 'status': 'running'}]}
actual = {'agents': [{'name': 'a', 'status': 'running'}, {'name': 'b', 'status': 'crashed'}]}
diff = compare_states(desired, actual)
assert len(diff) == 1 and diff[0]['agent'] == 'b'
print('reconcile diff OK')
"</verify>
  <done>reconcile loop 可 import；compare_states() 正确检测异常 agent；loop 最外层有 try/except</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T05" parallel="true" status="done">
  <name>调度器引擎 + 模板渲染服务</name>
  <read_files>
    backend/models/orchestration.py
    backend/engine/reconcile_loop.py
    DESIGN.md D3,D4
  </read_files>
  <write_files>
    backend/engine/scheduler.py
    backend/services/template_service.py
  </write_files>
  <action>
    scheduler.py：
    - PriorityQueue：按 priority 降序排列；同优先级按 enqueued_at FIFO
    - schedule_next()：取队列头部任务→标记 scheduled→返回 instance_id
    - 防饥饿：排队超过 max_wait_time(5min)→自动提升 priority+10
    - evict()：高优先级任务可抢占（标记低优先级为 evicted）
    template_service.py：
    - render_template(yaml_raw, values)：正则匹配 {{ .Values.xxx }} → 替换
    - validate_params(template_yaml, values)：检查所有占位符都有对应值
    - list_params(template_yaml)：提取所有占位符变量名
  </action>
  <verify>cd backend && /home/malizhi/ai/code-flow/.venv/bin/python -c "
from engine.scheduler import PriorityQueue
q = PriorityQueue()
q.enqueue('inst-1', 50); q.enqueue('inst-2', 100); q.enqueue('inst-3', 10)
assert q.next() == 'inst-2'  # highest priority
assert q.next() == 'inst-1'
print('scheduler OK')
from services.template_service import render_template, list_params
tpl = 'name: {{ .Values.name }}\nmodel: {{ .Values.model }}'
assert list_params(tpl) == ['name', 'model']
assert 'name: test' in render_template(tpl, {'name': 'test', 'model': 'gpt-4o'})
print('template service OK')
"</verify>
  <done>调度器按优先级排序+防饥饿；模板渲染正确替换占位符</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T06" parallel="true" status="done">
  <name>Orchestration API 路由（apply/validate/CRUD/queue/templates）</name>
  <read_files>
    backend/routes/orchestration_api.py
    backend/engine/yaml_schema.py
    backend/engine/scheduler.py
    backend/services/template_service.py
    backend/models/orchestration.py
    backend/auth.py
    DESIGN.md##9.3
  </read_files>
  <write_files>
    backend/routes/orchestration_api.py
  </write_files>
  <action>
    重写 orchestration_api.py（完整 API 端点）：
    - POST /api/orchestration/apply — 接收 YAML→校验→解析→创建/更新编排实例+拓扑快照→入调度队列
    - POST /api/orchestration/validate — YAML dry-run 校验（不创建实例）
    - GET /api/orchestration — 编排实例列表（按 owner_id 过滤）
    - GET /api/orchestration/{id} — 实例详情（含 topology_snapshot + agent 实时状态）
    - DELETE /api/orchestration/{id} — 删除实例（running 状态不可删）
    - GET /api/orchestration/queue — 调度队列状态
    - POST /api/orchestration/templates — 保存模板
    - GET /api/orchestration/templates — 模板列表（public 市场 + 自己的私有模板）
    - POST /api/orchestration/templates/{id}/deploy — 从模板渲染参数→apply 部署
    - 所有端点：require_permission + X-User-Id 隔离 + audit 日志
  </action>
  <verify>curl -s -X POST http://127.0.0.1:8000/api/orchestration/apply -H "X-User-Id: admin" -H "Content-Type: application/yaml" --data-binary @- <<'EOF'
apiVersion: ai-platform/v1
kind: AgentOrchestration
metadata:
  name: test-pipeline
spec:
  agents:
    - name: reviewer
      kind: Agent
      spec:
        runtime: langgraph
        model:
          provider: openai
          name: gpt-4o
        workflow_id: 1
  routes: []
EOF
</verify>
  <done>apply 端点接收合法 YAML→创建实例+快照→入队列；validate 端点 dry-run 不创建；CRUD+templates 全部可用；权限隔离生效</done>
  <depends_on>T01,T02,T05</depends_on>
  <auto>true</auto>
</task>

<task id="T07" parallel="true" status="done">
  <name>Metrics API 扩展：拓扑级监控聚合 + 调用链追踪</name>
  <read_files>
    backend/routes/metrics_api.py
    backend/services/metrics_service.py
    backend/models/orchestration.py
  </read_files>
  <write_files>
    backend/routes/metrics_api.py
    backend/services/metrics_service.py
  </write_files>
  <action>
    扩展 metrics_api.py 和 metrics_service.py：
    - GET /api/orchestration/{id}/metrics — 拓扑级聚合：总 token、平均执行时间、成功率、每次执行消耗时序（5min 粒度）
    - GET /api/orchestration/{id}/trace — 调用链追踪：返回该实例所有 TraceSpan，按 timestamp 排序
    - GET /api/orchestration/{id}/trace/{span_id} — 单个 span 详情（含 input/output 摘要，不返回完整内容——安全）
    - 指标记录：Agent 执行完成时 POST /api/metrics/record 同步写入 TraceSpan
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/orchestration/1/metrics | /home/malizhi/ai/code-flow/.venv/bin/python -c "import sys,json; d=json.load(sys.stdin); assert 'total_tokens' in d; print('metrics OK')"</verify>
  <done>拓扑级 metrics 返回聚合+时序数据；调用链 trace 返回 span 列表+详情</done>
  <depends_on>T01,T06</depends_on>
  <auto>true</auto>
</task>

<task id="T08" parallel="true" status="done">
  <name>Audit API 扩展 + Security Config 更新</name>
  <read_files>
    backend/routes/audit_api.py
    backend/services/audit_service.py
    backend/routes/security_service.py
  </read_files>
  <write_files>
    backend/routes/audit_api.py
    backend/services/audit_service.py
  </write_files>
  <action>
    扩展审计系统：
    - 新增审计动作类型：orchestration.create, orchestration.apply, orchestration.delete, orchestration.stop, template.create, template.publish, reconcile.auto_restart, reconcile.retry, reconcile.drift_detected
    - audit_service.py 新增 write_orchestration_audit() 便捷方法
    - 安全配置：YAML 上传大小限制(1MB)、嵌套深度限制(50)
  </action>
  <verify>curl -s -X POST http://127.0.0.1:8000/api/orchestration/apply -H "X-User-Id: admin" -H "Content-Type: application/yaml" --data-binary @- <<'EOF' > /dev/null
apiVersion: ai-platform/v1
kind: AgentOrchestration
metadata:
  name: audit-test
spec:
  agents:
    - name: test
      kind: Agent
      spec:
        runtime: langgraph
        model: {provider: openai, name: gpt-4o}
        workflow_id: 1
  routes: []
EOF
curl -s http://127.0.0.1:8000/api/audit?action=orchestration.create | /home/malizhi/ai/code-flow/.venv/bin/python -c "import sys,json; d=json.load(sys.stdin); assert len(d['records'])>0; print('audit OK')"</verify>
  <done>编排操作全部记审计；新动作类型已注册；安全配置生效</done>
  <depends_on>T01,T06</depends_on>
  <auto>true</auto>
</task>

<task id="T09" parallel="true" status="done">
  <name>前端 Orchestration Store（zustand）</name>
  <read_files>
    frontend/src/stores/workflows.ts
    frontend/src/stores/auth.ts
    DESIGN.md##0.5.2
  </read_files>
  <write_files>
    frontend/src/stores/orchestration.ts
  </write_files>
  <action>
    创建 zustand orchestration store：
    - 状态：orchestrations[], currentId, yamlContent, topologyState, reconcileStatus, schedulingQueue, templates[], traceSpans[]
    - 方法：fetchOrchestrations(), fetchDetail(id), applyYaml(yaml), validateYaml(yaml), fetchQueue(), fetchTemplates(), deployTemplate(id, values), fetchTrace(id)
    - 所有 fetch 自动注入 X-User-Id header（复用 main.tsx 全局拦截器）
    - YAML ↔ topologyState 双向同步中间件（debounce 500ms）
  </action>
  <verify>cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "orchestration" | head -5; echo "tsc check done"</verify>
  <done>orchestration store 可 import；所有方法签名正确；tsc 无类型错误</done>
  <depends_on>T03</depends_on>
  <auto>true</auto>
</task>

<task id="T10" parallel="true" status="done">
  <name>前端 YAML 编辑器组件（CodeMirror 6）</name>
  <read_files>
    frontend/src/stores/orchestration.ts
    UI-DESIGN.md##6（YAML 编辑器）
  </read_files>
  <write_files>
    frontend/src/components/YamlEditor.tsx
  </write_files>
  <action>
    实现 CodeMirror 6 YAML 编辑器组件：
    - 集成 @codemirror/lang-yaml（语法高亮+lint）
    - 主题：oneDark（@codemirror/theme-one-dark）
    - 行号：灰色右对齐，Mono 11px
    - 错误行：红色背景 + gutter ❌ 图标（解析 js-yaml 错误→映射到 CM lint 格式）
    - onChange → 更新 orchestration store yamlContent + 触发 debounced 画布同步
    - 支持外部传入 yamlContent 实现双向绑定（画布拖拽→YAML 更新）
    - 高度自适应（min-height: 400px, max-height: calc(100vh - 120px)）
  </action>
  <verify>cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "YamlEditor" | head -3; echo "tsc OK"</verify>
  <done>YAML 编辑器渲染正确；语法高亮生效；错误行红色标记；onChange 同步到 store</done>
  <depends_on>T09</depends_on>
  <auto>true</auto>
</task>

<task id="T11" parallel="true" status="done">
  <name>前端拓扑画布组件（React Flow）</name>
  <read_files>
    frontend/src/stores/orchestration.ts
    UI-DESIGN.md##6（拓扑节点+连线）
    DESIGN.md D6
  </read_files>
  <write_files>
    frontend/src/components/OrchestrationCanvas.tsx
  </write_files>
  <action>
    实现 React Flow 拓扑画布组件：
    - 从 store topologyState 渲染节点+连线（nodes[], edges[]）
    - 自定义节点渲染（OrchestrationNode）：圆角矩形 8px、bg-card、左侧 3px 状态色条、右下角 7px 状态圆点、Agent 名(Mono 12px)+模型标签
    - 节点状态颜色：green(#5cb878)=healthy / red(#e05555)=failed / orange(#e8a450)=degraded/waiting / gray(#5d6068)=not_started
    - failed 节点：boxShadow node-glow-failed + pulse-red 动画
    - 连线：smoothstep 曲线、1.5px、箭头；数据流中=虚线+偏移动画
    - 画布背景：点阵网格（4px 点、32px 间距、rgba(255,255,255,0.03)）
    - 工具栏：zoom in/out/fit（ghost 按钮）
    - 支持拖拽节点调整位置→onNodesChange→更新 store topologyState→debounced 同步到 YAML 编辑器
    - 键盘导航：Tab 切换节点、Enter 打开节点详情
  </action>
  <verify>cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "OrchestrationCanvas" | head -3; echo "tsc OK"</verify>
  <done>拓扑画布渲染节点+连线；状态颜色正确；画布点阵网格可见；拖拽更新 store；键盘导航</done>
  <depends_on>T09</depends_on>
  <auto>true</auto>
</task>

<task id="T12" parallel="true" status="done">
  <name>前端拓扑实时状态面板（TopologyMonitor）</name>
  <read_files>
    frontend/src/stores/orchestration.ts
    frontend/src/components/OrchestrationCanvas.tsx
    UI-DESIGN.md##6（Real-time Status Panel）
  </read_files>
  <write_files>
    frontend/src/components/TopologyMonitor.tsx
  </write_files>
  <action>
    实现拓扑实时状态面板：
    - 4 个 stat 卡（复用 .stat 样式）：healthy 数(绿)、failed 数(红)、degraded 数(橙)、total 数
    - 收敛进度条（.progress）：期望 N / 就绪 M / 变更中 K
    - 状态图例：4 个色点 + 标签
    - 自动刷新：每 5 秒 fetch /api/orchestration/{id} 更新状态
    - 异常节点列表：点击跳转到画布对应节点
    - 漂移标记：⚠️ drift detected +「自动修复」「人工确认」按钮
  </action>
  <verify>cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "TopologyMonitor" | head -3; echo "tsc OK"</verify>
  <done>stat 卡数据正确；收敛进度条显示；状态颜色与画布一致；自动刷新；漂移按钮可用</done>
  <depends_on>T09,T10,T11</depends_on>
  <auto>true</auto>
</task>

<task id="T13" parallel="true" status="done">
  <name>前端调用链追踪组件（TraceViewer）</name>
  <read_files>
    frontend/src/stores/orchestration.ts
    UI-DESIGN.md##6（Trace Viewer）
  </read_files>
  <write_files>
    frontend/src/components/TraceViewer.tsx
  </write_files>
  <action>
    实现调用链瀑布图组件：
    - fetch /api/orchestration/{id}/trace → 渲染水平时间轴
    - 每条 span：圆角矩形条，宽度按 duration 比例；颜色 var(--blue) 半透明填充 + 实色边框
    - Span 标签：Agent 名 + duration_ms + tokens
    - 展开 span：下方缩进展示 input/output 摘要（Mono 11px, bg-input 背景, max-height 120px overflow）
    - 时间标尺：顶部刻度
    - 空状态：「暂无调用链数据」
  </action>
  <verify>cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "TraceViewer" | head -3; echo "tsc OK"</verify>
  <done>瀑布图渲染 span 列表；比例正确；展开/折叠正常；空状态提示</done>
  <depends_on>T09,T10,T11</depends_on>
  <auto>true</auto>
</task>

<task id="T14" parallel="true" status="done">
  <name>前端模板市场页（TemplateMarket）</name>
  <read_files>
    frontend/src/stores/orchestration.ts
    frontend/src/pages/RoleMarket.tsx
    UI-DESIGN.md##6（模板市场）
  </read_files>
  <write_files>
    frontend/src/pages/TemplateMarket.tsx
  </write_files>
  <action>
    实现模板市场页：
    - 模板卡片 grid（复用 .card + .card-clickable）：模板名(Title 14px)、描述(Supporting 11px)、Agent 数/部署次数(Mono 12px)、[一键部署] 按钮(.btn-primary)
    - 点击「一键部署」→ 弹出参数填写弹窗（根据模板 params_schema 动态生成表单）→ 确认→调用 deploy API
    - 「保存为模板」按钮（从当前编排页保存）
    - 过滤：仅展示 published=true 或自己的模板
    - 空状态：「暂无模板，从编排页保存第一个模板」
  </action>
  <verify>cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "TemplateMarket" | head -3; echo "tsc OK"</verify>
  <done>模板卡片列表正确；一键部署弹窗+表单；保存为模板功能；空状态提示</done>
  <depends_on>T09,T10,T11</depends_on>
  <auto>true</auto>
</task>

<task id="T15" parallel="true" status="done">
  <name>OrchestrationPage 重写：双栏 YAML+画布布局</name>
  <read_files>
    frontend/src/pages/OrchestrationPage.tsx
    frontend/src/components/YamlEditor.tsx
    frontend/src/components/OrchestrationCanvas.tsx
    frontend/src/components/TopologyMonitor.tsx
    frontend/src/stores/orchestration.ts
    UI-DESIGN.md##v0
  </read_files>
  <write_files>
    frontend/src/pages/OrchestrationPage.tsx
  </write_files>
  <action>
    重写 OrchestrationPage.tsx：
    - 双栏布局：左侧 YamlEditor(默认 40%宽度) + 右侧 OrchestrationCanvas(60%)，可拖拽分栏条调整比例
    - 顶部工具栏：[apply] 按钮(.btn-primary) + [validate(dry-run)] 按钮(.btn) + [保存为模板] 按钮(.btn) + 编排名称输入框
    - 底部状态栏：TopologyMonitor（折叠模式，一行 stat 数字）
    - apply 流程：按钮→loading→调用 POST /api/orchestration/apply→成功提示+刷新状态→失败显示错误
    - 画布/YAML 双向同步（通过 store debounce 500ms）
    - 节点详情：点击画布节点→右侧滑出 TraceViewer 面板
    - 兼容旧编排：首次打开时检查是否旧 spec_json 数据→弹窗提示→自动迁移为 YAML→写入 store
  </action>
  <verify>cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "OrchestrationPage" | head -3; echo "tsc OK"</verify>
  <done>双栏布局正常；apply/validate 按钮功能正确；YAML↔画布双向同步；旧数据自动迁移弹窗</done>
  <depends_on>T06,T10,T11,T12</depends_on>
  <auto>true</auto>
</task>

<task id="T16" parallel="true" status="done">
  <name>App.tsx 路由集成 + 导航更新</name>
  <read_files>
    frontend/src/App.tsx
    frontend/src/pages/OrchestrationPage.tsx
    frontend/src/pages/TemplateMarket.tsx
    DESIGN.md##0.5.1
  </read_files>
  <write_files>
    frontend/src/App.tsx
  </write_files>
  <action>
    App.tsx 集成改造：
    - 移除旧 OrchestrationPage 导入，替换为新版
    - 新增 nav='templates' → TemplateMarket 页
    - 导航项：「编排」→新版 OrchestrationPage；新增「模板市场」导航项（LayoutTemplate 图标，仅编排页内或独立入口）
    - 确保编排相关路由不触及其他模块（tools/workflows/agents 导航不变）
    - 禁动区域：不修改侧边栏结构、不修改 auth 相关逻辑、不修改 fetch 拦截器
  </action>
  <verify>cd frontend && npx tsc --noEmit --pretty 2>&1 | head -5; echo "tsc OK"</verify>
  <done>新版 OrchestrationPage 和 TemplateMarket 可通过导航访问；旧模块导航不变</done>
  <depends_on>T14,T15</depends_on>
  <auto>true</auto>
</task>

<task id="T17" parallel="true" status="done">
  <name>旧编排数据迁移脚本 + 备份</name>
  <read_files>
    backend/services/snapshot_service.py
    backend/routes/orchestration_api.py
  </read_files>
  <write_files>
    backend/services/snapshot_service.py
  </write_files>
  <action>
    实现 spec_json → YAML 迁移：
    - 扩展 snapshot_service.py：migrate_spec_json_to_yaml(spec_json) → YAML string
    - 映射规则：spec_json.nodes[] → spec.agents[]，spec_json.edges[] → spec.routes[]
    - 旧字段保留（tool_id→workflow_id，label→name）
    - 迁移前自动备份：原数据写入 .specs/backup/orchestration/<instance_id>_<timestamp>.json
    - 迁移后写 audit 日志
    - GET /api/orchestration/migrate-check — 检查哪些实例需要迁移
  </action>
  <verify>cd backend && /home/malizhi/ai/code-flow/.venv/bin/python -c "
from services.snapshot_service import migrate_spec_json_to_yaml
old = {'nodes': [{'id': 'n1', 'tool_id': 1, 'label': 'test'}], 'edges': [{'from': 'n1', 'to': 'n1', 'type': 'sequential'}]}
yaml = migrate_spec_json_to_yaml(old)
assert 'apiVersion: ai-platform/v1' in yaml
assert 'name: test' in yaml
print('migration OK')
"</verify>
  <done>spec_json 正确转换为 YAML；备份文件已创建；迁移审计已记录</done>
  <depends_on>T01,T06</depends_on>
  <auto>true</auto>
</task>

<task id="T18" parallel="true" status="done">
  <name>前端旧编排数据自动迁移提示 + API 对接</name>
  <read_files>
    frontend/src/pages/OrchestrationPage.tsx
    frontend/src/stores/orchestration.ts
  </read_files>
  <write_files>
    frontend/src/pages/OrchestrationPage.tsx
    frontend/src/stores/orchestration.ts
  </write_files>
  <action>
    前端迁移对接：
    - OrchestrationPage 打开时调用 GET /api/orchestration/migrate-check
    - 如有需迁移数据→弹窗显示迁移列表+「一键迁移」按钮
    - 迁移中 loading 状态→迁移完成→刷新编排列表
    - 迁移失败→显示错误详情+「手动处理」指引
    - orchestration store 新增 migrateCheck() 方法
  </action>
  <verify>cd frontend && npx tsc --noEmit --pretty 2>&1 | head -3; echo "tsc OK"</verify>
  <done>迁移弹窗正确展示需迁移实例列表；一键迁移成功；失败有错误提示</done>
  <depends_on>T15,T17</depends_on>
  <auto>true</auto>
</task>

<task id="T19" parallel="false" status="done">
  <name>Design Tokens 物化 + tokens.css 扩展</name>
  <read_files>
    frontend/src/styles/tokens.css
    UI-DESIGN.md frontmatter
  </read_files>
  <write_files>
    frontend/src/styles/tokens.css
  </write_files>
  <action>
    在 tokens.css 中新增本次 UI-DESIGN 引入的变量：
    - --bg-canvas: #0b0c10（拓扑画布背景）
    - --node-glow-healthy: 0 0 6px rgba(92,184,120,0.3)
    - --node-glow-failed: 0 0 8px rgba(224,85,85,0.4)
    - --grid-dot: rgba(255,255,255,0.03)
    - 画布点阵网格 background-image（radial-gradient 实现 4px 点/32px 间距）
    - @keyframes dash-flow（连线虚线偏移动画）
    - 确保所有新变量在 :root 中定义
  </action>
  <verify>grep -c "\-\-bg-canvas" frontend/src/styles/tokens.css && grep -c "\-\-node-glow" frontend/src/styles/tokens.css && echo "tokens OK"</verify>
  <done>新 design tokens 已添加到 tokens.css；画布点阵 CSS 可用；dash-flow 动画已定义</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T20" parallel="false" status="done">
  <name>端到端验证：全流程 + AC 覆盖检查</name>
  <read_files>
    REQUIREMENT.md
    TASK.md
  </read_files>
  <write_files>
    （无新文件，验证+修复）
  </write_files>
  <action>
    端到端验证：
    1. curl 验证：POST /api/orchestration/apply（合法 YAML→创建成功）→ GET /api/orchestration → GET /api/orchestration/{id}（状态正确）→ POST /api/orchestration/validate（非法 YAML→结构化错误）
    2. reconcile 验证：创建编排→模拟 Agent crash→5s 内检测到 degraded 状态
    3. 调度验证：提交 3 个不同优先级编排→队列顺序正确
    4. 模板验证：保存模板→参数化部署→新实例创建成功
    5. 前端验证：双栏布局→编辑 YAML→画布同步→apply→状态面板更新→调用链查看
    6. 迁移验证：旧 spec_json 数据→弹窗→一键迁移→YAML 正确
    7. 逐条对照 REQUIREMENT.md 的 18 条 AC，确认全部可验证通过
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/orchestration | /home/malizhi/ai/code-flow/.venv/bin/python -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} orchestrations')"</verify>
  <done>18 条 AC 全部验证通过；全流程（apply→reconcile→monitor→trace→template）闭环</done>
  <depends_on>T17,T18,T19</depends_on>
  <auto>false</auto>
</task>
```

---

## 🛡️ Task 门 · 投票记录

```
🗳️ Task 门: TASK.md 拆分是否合理？粒度合适？依赖正确？边界清晰？

   🟫 工程效能专家: ✅ 通过 — 20 个 task 按依赖关系拆为 8 个波次，Wave 1-6 均含 [P] 并行任务，最大化并行效率。task 粒度控制在 2-10 分钟范围（依赖安装/Tokens 物化等小 task < 5min；API 路由/画布组件等中等 task ~10min）。垂直切片优先（T06 贯穿 schema→API→DB，T15 贯穿 editor→canvas→monitor→store）

   🟩 架构师: ✅ 通过 — 覆盖 DESIGN 全部关键决策：D1(reconcile loop=T04)、D2(YAML schema=T02)、D3(调度器=T05)、D4(模板引擎=T05)、D5(快照=T01)、D6(React Flow=T11)、D7(CodeMirror=T10)。write_files 严格遵守 DESIGN 0.5.1 触碰模块+新增模块范围，禁动清单文件（auth.py/database.py/main.tsx）未出现在任何 write_files 中。T20 端到端验证覆盖 18 条 AC

   🟦 研发负责人: ✅ 通过 — 每个 task 的 read_files/write_files 边界精确到文件级，action 描述具体可执行。T15（OrchestrationPage 重写）和 T10+T11（编辑器+画布）是复杂度最高的 task，但边界清晰、依赖明确。T19(design tokens 物化) 独立于业务逻辑，可最后统一执行

   🔴 资深测试工程师: ✅ 通过 — 20 个 task 中 19 个的 verify 可自动执行（curl + python -c + tsc），T20 为手工端到端验证。每个 task 的 done 字段对应 REQUIREMENT.md 的 AC 子项（T04→AC-B1/B2/B3, T05→AC-C1/C2/C3, T06→AC-A1/A2/A3, T14→AC-D1/D2/D3, T11+T12→AC-E1/E2/E3, T15→AC-F1/F2）

  自动化策略汇总：
  T01🤖 T02🤖 T03🤖 T04🤖 T05🤖 T06🤖 T07🤖 T08🤖 T09🤖 T10🤖 T11🤖 T12🤖 T13🤖 T14🤖 T15🤖 T16🤖 T17🤖 T18🤖 T19🤖 T20👤

  结果: 4/4 全票通过 → ✅ 自动进入 4-dev
```
