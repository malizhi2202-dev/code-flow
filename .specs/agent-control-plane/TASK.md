# TASK: Agent 管控面

- **Change ID**: `agent-control-plane`
- **关联**: `@.specs/agent-control-plane/REQUIREMENT.md`、`DESIGN.md`、`UI-DESIGN.md`

---

## 波次划分

```
Wave 1 (parallel): T01[P], T02[P]          ← 数据模型 + store
Wave 2 (parallel): T03[P], T04[P], T05[P]  ← 后端服务 + API
Wave 3 (parallel): T06[P], T07[P], T08[P]  ← 前端页面
Wave 4:           T09                       ← App.tsx 入口 + CSS tokens
```

---

<task id="T01" parallel="true">
  <auto>true</auto>
  <name>新增数据表 agent_probes + scheduler_queue</name>
  <read_files>
    backend/models/agent.py
    backend/database.py
  </read_files>
  <write_files>
    backend/models/agent_probe.py
    backend/models/scheduler_queue.py
    backend/models/__init__.py
  </write_files>
  <action>
    新建 agent_probes 表：(id, agent_id FK, probe_type enum[heartbeat/capability/dependency/load], status enum[pass/fail], detail TEXT, consecutive_failures INT, created_at)。
    新建 scheduler_queue 表：(id, task_id, agent_id FK, priority INT, score FLOAT, status enum[queued/running/done/failed], created_at, started_at)。
    在 models/__init__.py 注册两个新模型。
  </action>
  <verify>python -c "from backend.models import AgentProbe, SchedulerQueue; print('OK')"</verify>
  <done>两个模型可被导入，Base.metadata.create_all 能创建新表</done>
  <depends_on></depends_on>
</task>

<task id="T02" parallel="true">
  <auto>true</auto>
  <name>创建前端 controlPlane Zustand store</name>
  <read_files>
    frontend/src/stores/agents.ts
    frontend/src/stores/metrics.ts
  </read_files>
  <write_files>
    frontend/src/stores/controlPlane.ts
  </write_files>
  <action>
    新建 controlPlane store，包含：
    - agents: AgentStatus[]（探针数据列表）
    - schedulerQueue: QueueItem[]（调度队列）
    - reconcileLog: ReconcileEntry[]（修复日志）
    - selectedAgent: AgentStatus | null
    - fetchProbes / fetchQueue / fetchReconcile / restartAgent / updateSchedule actions
    复用 fetch() + X-User-Id 注入（沿用 main.tsx 拦截器）。
  </action>
  <verify>npx tsc --noEmit --pretty 2>&1 | grep -v "node_modules" | grep -c "error TS" | xargs -I{} sh -c '[ {} -eq 0 ] && echo PASS || echo FAIL'</verify>
  <done>TypeScript 编译无错误，store 导出 useControlPlane hook</done>
  <depends_on></depends_on>
</task>

<task id="T03" parallel="true">
  <auto>true</auto>
  <name>实现 agent_probe_service 探针采集</name>
  <read_files>
    backend/services/runtime_watcher.py
    backend/models/agent.py
    backend/models/agent_probe.py
    backend/config.py
  </read_files>
  <write_files>
    backend/services/agent_probe_service.py
  </write_files>
  <action>
    实现 ProbeService 类：
    - start() → asyncio.create_task 启动 3 秒循环
    - _pull_all() → 取所有 Agent，逐个 HTTP GET /health（超时 5s，失败阈值 3 次）
    - _save_probe() → 写入 agent_probes 表，含脱敏处理（sk-xxx → sk-***）
    - _cleanup() → 每晚清理 7 天前数据
    Agent /health 返回格式：{status, capabilities, load, dependencies}
  </action>
  <verify>python -c "from backend.services.agent_probe_service import ProbeService; print('import OK')"</verify>
  <done>ProbeService 可启动后台采集循环，探针写入 agent_probes 表且含脱敏</done>
  <depends_on>T01</depends_on>
</task>

<task id="T04" parallel="true">
  <auto>true</auto>
  <name>实现 scheduler_service 负载均衡</name>
  <read_files>
    backend/engine/scheduler.py
    backend/models/agent.py
    backend/models/scheduler_queue.py
  </read_files>
  <write_files>
    backend/services/scheduler_service.py
  </write_files>
  <action>
    实现 SchedulerService 类：
    - match(label) → 按能力标签过滤候选 Agent
    - pick_least_loaded(candidates) → 选 current_load/max_concurrency 最小的
    - enqueue(task_id, label) → 无空闲 Agent 时入队等待
    - dequeue() → 有 Agent 空闲时出队分配
    复用 engine/scheduler.py 的 PriorityQueue。
  </action>
  <verify>python -c "from backend.services.scheduler_service import SchedulerService; print('import OK')"</verify>
  <done>SchedulerService 支持标签匹配 + Least Connection 分发 + 排队</done>
  <depends_on>T01</depends_on>
</task>

<task id="T05" parallel="true">
  <auto>true</auto>
  <name>实现 control_plane_api 路由</name>
  <read_files>
    backend/routes/metrics_api.py
    backend/main.py
  </read_files>
  <write_files>
    backend/routes/control_plane_api.py
    backend/main.py
  </write_files>
  <action>
    GET /api/control-plane/probes → 返回所有 Agent 探针状态
    GET /api/control-plane/queue → 返回调度队列
    GET /api/control-plane/reconcile → 返回 Reconcile 日志
    POST /api/control-plane/agent/:id/restart → 手动重启 Agent
    PUT /api/control-plane/schedule → 管理员配置调度策略（鉴权 admin）
    调度查询接口限流 10 次/分钟/用户。
    在 main.py 注册新 router。
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/control-plane/probes | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if 'agents' in d else 'FAIL')"</verify>
  <done>API 返回探针数据 JSON，admin 可配置调度策略，限流生效</done>
  <depends_on>T03,T04</depends_on>
</task>

<task id="T06" parallel="true">
  <auto>true</auto>
  <name>实现 AgentControlPlane 主页面</name>
  <read_files>
    frontend/src/pages/MonitoringDashboard.tsx
    frontend/src/stores/controlPlane.ts
    frontend/src/hooks/useTheme.ts
  </read_files>
  <write_files>
    frontend/src/pages/AgentControlPlane.tsx
  </write_files>
  <action>
    管控面主页面，三层结构：
    - 顶部概览卡片（Agent 总数/健康/异常/队列），按 UI-DESIGN 样式
    - Tab 栏：Agent 列表 | 调度队列 | Reconcile 日志
    - Agent 列表：每行状态指示灯 + 名称 + 标签 + 负载 + 心跳时间，默认异常排最上
    - 点击 Agent 行 → 右侧滑出详情面板（四探针分区 + 操作按钮）
    3 秒轮询 controlPlane store。
  </action>
  <verify>npx tsc --noEmit --pretty 2>&1 | grep -c "error TS" | xargs -I{} sh -c '[ {} -eq 0 ] && echo PASS || echo FAIL'</verify>
  <done>页面渲染 Agent 列表 + 概览卡片 + Tab 切换，TypeScript 无错误</done>
  <depends_on>T02</depends_on>
</task>

<task id="T07" parallel="true">
  <auto>true</auto>
  <name>实现 AgentProbePanel + SchedulerConfig + ReconcileConsole 子组件</name>
  <read_files>
    frontend/src/components/EntityMonitor.tsx
    frontend/src/stores/controlPlane.ts
  </read_files>
  <write_files>
    frontend/src/components/AgentProbePanel.tsx
    frontend/src/components/SchedulerConfig.tsx
    frontend/src/components/ReconcileConsole.tsx
  </write_files>
  <action>
    AgentProbePanel：探针时间线（Recharts 圆点图）+ 四分区展开 + 操作按钮过渡态
    SchedulerConfig：admin 可见，全局配置表单 + Agent 标签/优先级/并发编辑表格
    ReconcileConsole：时间线日志列表，safe🟢/caution🟡/dangerous🔴 三级颜色标记
  </action>
  <verify>npx tsc --noEmit --pretty 2>&1 | grep -c "error TS" | xargs -I{} sh -c '[ {} -eq 0 ] && echo PASS || echo FAIL'</verify>
  <done>三个子组件渲染正常，操作按钮有过渡态，dangerous 弹出确认框</done>
  <depends_on>T02</depends_on>
</task>

<task id="T08" parallel="true">
  <auto>true</auto>
  <name>Reconcile Loop 增强（diff 逻辑 + 三级修复）</name>
  <read_files>
    backend/engine/reconcile_loop.py
    backend/engine/scheduler.py
    backend/models/agent.py
    backend/models/agent_probe.py
  </read_files>
  <write_files>
    backend/engine/reconcile_loop.py
    backend/services/agent_probe_service.py
  </write_files>
  <action>
    在现有 reconcile_loop.py 中增加：
    - _detect_drift() → 对比期望 Agent 数 vs 实际健康 Agent 数
    - _classify_action() → 按三级分类：safe（重启）/ caution（重调度）/ dangerous（重建+删除）
    - 退避机制：连续失败 3 次暂停 + 指数退避（1s/2s/4s/8s）
    - 拓扑感知：修复 B 前暂停依赖 B 的 Agent
    在 agent_probe_service 中探针状态变化时触发 Reconcile 检查。
  </action>
  <verify>python -c "from backend.engine.reconcile_loop import reconcile_loop, _detect_drift, _classify_action; print('import OK')"</verify>
  <done>Reconcile Loop 支持漂移检测 + 三级分级修复 + 退避 + 拓扑感知</done>
  <depends_on>T03</depends_on>
</task>

<task id="T09">
  <auto>true</auto>
  <name>App.tsx 侧边栏入口 + CSS tokens 追加</name>
  <read_files>
    frontend/src/App.tsx
    frontend/src/styles/tokens.css
    UI-DESIGN.md
  </read_files>
  <write_files>
    frontend/src/App.tsx
    frontend/src/styles/tokens.css
  </write_files>
  <action>
    App.tsx：
    - import K8sOrchestration 无效引用替换为 AgentControlPlane
    - NAV 数组追加 {id:'control-plane', label:'Agent 管控', icon:<Radio size={16}>}
    - View 类型追加 'control-plane'
    - renderContent 追加 case 'control-plane': return <AgentControlPlane />
    tokens.css 追加 UI-DESIGN 定义的 --cp-* CSS variables。
  </action>
  <verify>npx tsc --noEmit --pretty 2>&1 | grep -c "error TS" | xargs -I{} sh -c '[ {} -eq 0 ] && echo PASS || echo FAIL'</verify>
  <done>侧边栏出现「Agent 管控」入口，点击进入管控面，CSS tokens 定义完整</done>
  <depends_on>T06</depends_on>
</task>
