# REQUIREMENT — 前端全站 API 重复调用修复

| 字段 | 值 |
|---|---|
| **Change ID** | `fix-slow-access` |
| **版本** | v1 |
| **状态** | 活跃 |

## 用户故事

### US1 · 页面切换即时响应
**作为** 开发者/用户，  
**我想** 点击左侧导航栏或页面内按钮后页面立即切换（< 300ms 看到内容），  
**以便** 我能流畅地浏览和操作监控面板，不被转圈等待打断工作流。

### US2 · 无重复 API 请求
**作为** 前端架构，  
**我想** 同一端点在同一时刻只发起一次请求（in-flight 去重），会话内不重复加载已获取的数据（短期缓存），  
**以便** 后端不被前端自 DDoS，页面切换不会因重复请求竞争而越来越慢。

### US3 · 轮询不泄漏
**作为** 前端架构，  
**我想** 离开页面时所有定时器/轮询自动停止，  
**以便** 后台请求不会持续累积，长时间使用后页面不会变成「死亡螺旋」。

### US4 · 内部操作响应流畅
**作为** 开发者/用户，  
**我想** 页面内按钮（tab 切换、刷新、创建、删除等）的响应与首次加载一样快，  
**以便** 我不需要在每个操作后等待同样的转圈。

## 验收准则（AC）

### AC1 · 页面导航 API 调用次数
**Given** 用户从任意页面 A 导航到任意页面 B  
**When** 页面 B 完成渲染  
**Then** 页面 B 产生的 API 调用 ≤ 8 次（不含全局轮询）  
**And** 每个独立端点 ≤ 1 次调用（含全局端点如 alerts/count）

### AC2 · 页面切换时间
**Given** 用户点击任一左侧导航项或侧边栏按钮（告警中心/用户中心）  
**When** 页面内容开始渲染  
**Then** 从点击到首屏内容可见（FCP）< 300ms  
**And** 从点击到可交互（TTI）< 500ms

### AC3 · 同端点 in-flight 去重
**Given** 多个组件（或同一组件快速重渲染）同时请求同一端点（含相同 query params）  
**When** 第一个请求已发出但未返回  
**Then** 后续请求复用第一个请求的 Promise，不发起新的 HTTP 调用  
**And** 所有调用方收到相同的响应数据

### AC4 · 会话内短期缓存
**Given** 端点 X 的数据已在当前会话中被成功加载  
**When** 5 秒内任意组件再次请求端点 X（相同 params）  
**Then** 直接返回缓存数据，不发起新的 HTTP 请求  
**And** 5 秒后缓存失效，下次请求重新获取

### AC5 · 轮询定时器清理
**Given** 用户从页面 A（含 setInterval 轮询）导航到页面 B  
**When** 页面 A 的组件已卸载  
**Then** 页面 A 的所有 setInterval/setTimeout 已停止  
**And** 持续会话 10 分钟后，全局 API 调用频率不高于初始频率的 1.2 倍

### AC6 · 内部按钮响应
**Given** 用户在任一页面（监控/Agent 管控/工具库等）  
**When** 点击页面内按钮（tab 切换、刷新、下拉筛选、排行榜维度切换）  
**Then** 触发的 API 调用 ≤ 该操作必需的端点数量（无额外重复）  
**And** 响应时间 < 300ms（不含后端处理时间的纯网络+渲染）

### AC7 · 监控页 tab 切换
**Given** 用户在监控页  
**When** 点击「🤖 Agent」「🔀 工作流」「🔧 工具」「📁 项目」任一 tab  
**Then** 触发 API 调用 = 0（数据已在首次加载中获取，tab 仅为前端筛选）

### AC8 · Agent 管控页轮询隔离
**Given** 用户进入 Agent 管控页  
**When** probes/queue/reconcile 轮询启动  
**Then** 轮询仅在 Agent 管控页可见时运行  
**And** 导航到其他页面后，probes/queue/reconcile 端点的请求立即停止（不再出现在 Network 面板）

### AC9 · 后端慢接口保护（alerts/count + changes）
**Given** `/api/alerts/count` 后端响应时间 ~400ms，`/api/changes` ~185ms  
**When** 前端发起对这些慢接口的请求  
**Then** 使用 in-flight 去重确保同时刻最多 1 个请求  
**And** 不因前端重复调用而放大后端延迟

### AC10 · 不影响已有功能
**Given** 请求去重层和缓存层已部署  
**When** 运行全部已有测试（前端 5 + 后端 7）  
**Then** 所有测试通过  
**And** 所有 11 个导航项 + 2 个侧边栏按钮 + 各页面内部按钮功能正常  
**And** 数据刷新（手动点击刷新按钮）仍能从后端获取最新数据（非缓存旧数据）

## 范围切分

### v1（本次必做）

| 编号 | 内容 |
|---|---|
| V1.1 | 实现 in-flight 请求去重层（基于 URL + params 的 Promise 复用） |
| V1.2 | 实现 5 秒短期缓存层（session 级，页面切换不丢失） |
| V1.3 | 修复 App.tsx alerts/count 轮询：添加 in-flight 去重 + 降低频率（15s → 30s） |
| V1.4 | 修复 MonitoringDashboard.tsx：fetchAll 结果改为 store 缓存，tab 切换不重复请求 |
| V1.5 | 修复 AgentControlPlane.tsx：probes/queue/reconcile 轮询添加页面可见性检查 |
| V1.6 | 审计全部 12 个 store + 页面级 fetch，统一接入去重层 |
| V1.7 | 全量回归测试（接口 + 前端交互） |

### v2（后续优化）

| 编号 | 内容 |
|---|---|
| V2.1 | React StrictMode 兼容（避免 dev 环境 double-render 导致的额外调用） |
| V2.2 | 后端 `/api/alerts/count` 和 `/api/changes` 性能优化（当前 185-435ms） |
| V2.3 | 引入 SWR/React Query 替代手写缓存（评估 bundle size 影响后决定） |
| V2.4 | 离线/弱网降级策略（缓存过期后显示旧数据 + 后台刷新） |

### out（本次不做）

| 编号 | 内容 |
|---|---|
| OUT.1 | 不引入 React Query / SWR / RTK Query 等外部依赖 |
| OUT.2 | 不改后端任何代码 |
| OUT.3 | 不修改路由/导航结构 |
| OUT.4 | 不改 UI 布局/样式 |
| OUT.5 | 不添加 Service Worker / PWA 离线缓存 |

## 非功能性需求

| 类别 | 要求 |
|---|---|
| **性能** | 页面切换 FCP < 300ms，TTI < 500ms；API 调用 ≤ 8 次/页面 |
| **兼容性** | 与现有 Zustand store 模式兼容，不要求所有 store 重写 |
| **可维护性** | 去重层为独立模块（`src/utils/requestDedup.ts`），所有 store 按需接入 |
| **安全** | 缓存层不额外存储敏感数据；与 localStorage 隔离；敏感字段（api_key/secret）不进入缓存 key |
| **可观测性** | 开发环境 console 输出去重命中/缓存命中日志（生产环境关闭）|
| **体积** | 去重层代码 ≤ 150 行，不引入新 npm 依赖 |
