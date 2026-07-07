# TASK — fix-slow-access 任务拆分

| 字段 | 值 |
|---|---|
| **Change ID** | `fix-slow-access` |
| **任务数** | 7 |
| **波次** | 3 |

## 波次划分

```
Wave 1 (parallel): T01[P]
Wave 2 (parallel): T02[P], T03[P], T04[P], T05[P], T06[P], T07[P] (全部依赖 T01)
Wave 3:            T08 (依赖 T02-T07)
```

---

<task id="T01" parallel="true">
  <name>创建 requestDedup.ts 核心去重+缓存模块</name>
  <read_files>
    src/main.tsx
    src/utils/*
    src/stores/auth.ts
    src/stores/metrics.ts
    src/stores/controlPlane.ts
  </read_files>
  <write_files>
    src/utils/requestDedup.ts
  </write_files>
  <action>
    新建 src/utils/requestDedup.ts，导出三个函数：
    1. dedupedFetch(url, options?) — 3 层去重（in-flight Promise 复用 → 5s TTL 缓存 → 新建 fetch）
    2. safeFetch(url, options?) — 包装 dedupedFetch，拦截 !res.ok 返回 {error: true, status}，401 时清除 localStorage 并 reload
    3. invalidateCache(url?) — 手动穿透缓存（创建/删除/更新操作后调用）
    
    URL 标准化：sort query params + strip trailing slash
    缓存 Map max 200 条，LRU 淘汰
    开发环境 console.log 去重命中/缓存命中
  </action>
  <verify>npm run build --prefix frontend  # 确认模块编译通过，无导入错误</verify>
  <done>requestDedup.ts 编译通过；手动测试 dedupedFetch 对同一 URL 返回相同 Promise；5s 后缓存过期</done>
  <depends_on></depends_on>
</task>

<task id="T02" parallel="true">
  <name>App.tsx alerts/count + auth 接入去重</name>
  <read_files>
    src/App.tsx
    src/stores/auth.ts
    src/utils/requestDedup.ts
    src/main.tsx
  </read_files>
  <write_files>
    src/App.tsx
    src/stores/auth.ts
  </write_files>
  <action>
    1. App.tsx alerts/count 轮询：将 fetch('/api/alerts/count') 替换为 safeFetch('/api/alerts/count')，降低轮询频率 15s → 30s
    2. auth.ts：fetchMe/fetchUsers 中的 fetch() 替换为 safeFetch()
    3. auth.ts fetchMe/fetchUsers 添加 !res.ok 错误处理（不抛 SyntaxError）
  </action>
  <verify>npm run build --prefix frontend  # 确保编译通过</verify>
  <done>编译通过；浏览器 Network 面板确认 alerts/count 不再出现 SyntaxError</done>
  <depends_on>T01</depends_on>
</task>

<task id="T03" parallel="true">
  <name>stores 全量接入去重层</name>
  <read_files>
    src/stores/agents.ts
    src/stores/workflows.ts
    src/stores/orchestration.ts
    src/stores/projects.ts
    src/stores/tools.ts
    src/stores/metrics.ts
    src/stores/changes.ts
    src/stores/controlPlane.ts
    src/utils/requestDedup.ts
  </read_files>
  <write_files>
    src/stores/agents.ts
    src/stores/workflows.ts
    src/stores/orchestration.ts
    src/stores/projects.ts
    src/stores/tools.ts
    src/stores/metrics.ts
    src/stores/changes.ts
  </write_files>
  <action>
    将所有 store 中的 fetch() 调用替换为 safeFetch()（8 个 store 共约 30 处替换）
    每个 store 的异步方法添加 !res.ok 错误处理
    controlPlane.ts 暂不处理（T05 单独处理，因为有轮询逻辑）
  </action>
  <verify>npm run build --prefix frontend  # 确保全部 store 编译通过</verify>
  <done>8 个 store 编译通过；所有 fetch 调用走 safeFetch</done>
  <depends_on>T01</depends_on>
</task>

<task id="T04" parallel="true">
  <name>MonitoringDashboard fetchAll 改为 store 缓存 + tab 切换 0 次调用</name>
  <read_files>
    src/pages/MonitoringDashboard.tsx
    src/stores/metrics.ts
    src/utils/requestDedup.ts
  </read_files>
  <write_files>
    src/pages/MonitoringDashboard.tsx
  </write_files>
  <action>
    1. 将 fetchAll 中的 5 个 fetch() 替换为 safeFetch()
    2. 移除 useEffect 依赖中的 rankDim（tab 切换不重新 fetchAll）
    3. tab 切换（Agent/工作流/工具/项目）仅切换前端筛选维度，不发起新网络请求
    4. 保留 30s 轮询和页面刷新按钮的强制穿透
  </action>
  <verify>npm run build --prefix frontend</verify>
  <done>监控页编译通过；tab 切换时 Network 面板确认 0 次新 API 调用</done>
  <depends_on>T01</depends_on>
</task>

<task id="T05" parallel="true">
  <name>AgentControlPlane 轮询接入去重 + 错误处理</name>
  <read_files>
    src/pages/AgentControlPlane.tsx
    src/stores/controlPlane.ts
    src/utils/requestDedup.ts
  </read_files>
  <write_files>
    src/pages/AgentControlPlane.tsx
    src/stores/controlPlane.ts
  </write_files>
  <action>
    1. controlPlane.ts：fetchProbes/fetchQueue/fetchReconcile 替换为 safeFetch()
    2. 添加 error 状态字段到 ControlPlaneState：{ probesError, queueError, reconcileError }
    3. AgentControlPlane.tsx：setInterval 使用 useRef 存储 interval ID 防泄漏
    4. 500 错误时不重试，展示错误提示而非崩溃
  </action>
  <verify>npm run build --prefix frontend</verify>
  <done>编译通过；500 错误时 UI 展示错误提示而非 SyntaxError crash</done>
  <depends_on>T01</depends_on>
</task>

<task id="T06" parallel="true">
  <name>ApprovalPage 轮询接入去重 + 错误处理</name>
  <read_files>
    src/pages/ApprovalPage.tsx
    src/utils/requestDedup.ts
  </read_files>
  <write_files>
    src/pages/ApprovalPage.tsx
  </write_files>
  <action>
    1. fetchApprovals 中的 fetch('/api/approvals?limit=100') 替换为 safeFetch()
    2. setInterval 使用 useRef 存储 interval ID
    3. 500 错误时 setApprovals 保持上一次数据，展示错误提示而非 crash
    4. handleRespond 操作成功后调用 invalidateCache() 穿透缓存
  </action>
  <verify>npm run build --prefix frontend</verify>
  <done>编译通过；审批页 500 错误时不 crash，保留上一条数据 + 错误提示</done>
  <depends_on>T01</depends_on>
</task>

<task id="T07" parallel="true">
  <name>Home 页 changes 轮询接入去重</name>
  <read_files>
    src/pages/Home.tsx
    src/stores/changes.ts
    src/utils/requestDedup.ts
  </read_files>
  <write_files>
    src/pages/Home.tsx
  </write_files>
  <action>
    1. Home.tsx：fetchChanges setInterval 使用 useRef 防泄漏
    2. 确保 useEffect cleanup 返回 clearInterval
    3. fetchChanges 走 safeFetch（已在 T03 处理 changes store）
  </action>
  <verify>npm run build --prefix frontend</verify>
  <done>编译通过；Home 页面离开后 Network 面板确认 changes 轮询停止</done>
  <depends_on>T01</depends_on>
</task>

<task id="T08" parallel="false">
  <name>全量回归测试 + 性能验证</name>
  <read_files>
    src/*
    src/__tests__/*
  </read_files>
  <write_files>
    无（测试验证任务）
  </write_files>
  <action>
    1. 执行前端 npm run build 确认完整构建通过
    2. 逐页导航测试：确认每个页面 API 调用 ≤ 8 次
    3. 执行后端全量 API 测试：curl 测试所有端点
    4. 验证 500 端点（probes/queue/approvals）在低并发下正常返回
    5. AC1-AC10 逐条验证
  </action>
  <verify>
    # 前端构建
    cd frontend && npm run build
    # 后端全接口测试
    for ep in /api/changes /api/agents /api/workflows /api/orchestration /api/projects /api/tools /api/auth/me /api/auth/users /api/alerts/count /api/runtime/summary; do
      curl -s -o /dev/null -w "%{http_code} " http://localhost:8000$ep; echo $ep
    done
  </verify>
  <done>全部任务完成；AC1-AC10 全部通过；前端构建无错误</done>
  <depends_on>T02, T03, T04, T05, T06, T07</depends_on>
</task>
