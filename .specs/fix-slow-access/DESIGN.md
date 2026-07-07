# DESIGN — 前端全站 API 去重 + 缓存 + 轮询治理

| 字段 | 值 |
|---|---|
| **Change ID** | `fix-slow-access` |
| **版本** | v1 |
| **状态** | 活跃 |

## 0. 技术栈选定

**CONTEXT.md 已锁定，无变更**：

| 层 | 技术 | 说明 |
|---|---|---|
| 框架 | React 18.3 + TypeScript 5.5 | 沿用 |
| 状态管理 | Zustand 4.5 | 沿用 |
| 构建 | Vite 5.4 | 沿用 |
| 新增依赖 | **无** | 手写去重层 |

## 0.5 既有架构对齐

### 0.5.1 本次触碰的既有模块

**会修改**（均仅前端）：

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `src/utils/requestDedup.ts` | **新建** | 去重 + 缓存核心模块 |
| `src/App.tsx` | 尾加 hook | alerts/count 轮询接入去重 + 降低频率 |
| `src/stores/controlPlane.ts` | 接入去重 | probes/queue/reconcile 接入 |
| `src/stores/auth.ts` | 接入去重 | fetchMe/fetchUsers 接入 |
| `src/stores/agents.ts` | 接入去重 | fetchAgents 接入 |
| `src/stores/workflows.ts` | 接入去重 | fetchWorkflows 接入 |
| `src/stores/orchestration.ts` | 接入去重 | 5 个 fetch 接入 |
| `src/stores/projects.ts` | 接入去重 | fetchProjects 接入 |
| `src/stores/tools.ts` | 接入去重 | fetchTools 接入 |
| `src/pages/MonitoringDashboard.tsx` | fetchAll 改为 store | tab 切换 0 次调用 |
| `src/pages/Home.tsx` | 接入去重 | changes 轮询 |
| `src/pages/ApprovalPage.tsx` | 接入去重 + 错误处理 | approvals 轮询 |
| `src/pages/AgentControlPlane.tsx` | 接入去重 | 3 端点轮询 |

**不动**（非本次范围）：

| 文件 | 理由 |
|---|---|
| `backend/**` | CHANGE 明确不碰后端 |
| `src/components/TopBar.tsx` | token-usage 频率低、单次调用，不影响性能 |
| `src/pages/ConversationCenter.tsx` | 对话中心的轮询是实时特性需求，不在此 change |
| `src/pages/AlertsPage.tsx` | 与告警中心页面相关，另开 change |
| `src/pages/KnowledgeBase.tsx` | 知识库 upload status 轮询，特性需求 |

### 0.5.2 对齐既有抽象

| 本次需要 | 既有？ | 决定 |
|---|---|---|
| HTTP 请求 | 原生 `fetch()`（全局拦截器 main.tsx:9-21） | **沿用**，不引入 axios/ky |
| 状态管理 | Zustand 4.5 | **沿用**，去重层为纯函数独立模块 |
| 请求去重 | 无 | **新建** `src/utils/requestDedup.ts` |
| 缓存 | 无 | **新建** Map-based 内存缓存 |
| 错误处理 | 各 store 无统一处理 | **新建** 统一错误状态模式 |

### 0.5.3 沿用模式 vs 引入新模式

- **请求方式**：**沿用** `fetch()`（全局拦截器自动注入 X-User-Id）
- **Store 模式**：**沿用** Zustand `create<T>((set, get) => (...))` 模式
- **请求去重**：**引入新模式** → 理由：既无此抽象，独立手写模块避免引入 React Query 等外部库的 bundle 负担
- **错误处理**：**引入新模式** → 理由：各 store 当前无统一的 500/超时处理，统一 API wrapper 可拦截 `res.json()` 前的非 200 响应

## 1. 技术决策

### 决策 1 · 请求去重层架构

**决策**：手写 3 层去重模块（in-flight dedup → 短期缓存 → 手动穿透），不引入外部库。

**备选**：引入 React Query / SWR / RTK Query。

**选择理由**：
- CHANGE.md 明确排除外部依赖，不增加 bundle size
- 现有 12 个 Zustand store 改造量小——只需把 `fetch(url)` 替换为 `dedupedFetch(url)`，不改变 store 结构
- React Query 需重构所有 store 为 hooks 模式，改动量远超这次 bug fix 的范围

**取舍代价**：
- 手写去重不支持 SWR 的 stale-while-revalidate 模式（v2 可选）
- 缓存失效策略简单（固定 TTL），不如 React Query 的智能失效

### 决策 2 · 去重 Key 设计

**决策**：`key = canonicalUrl(url, params)`，使用 URL 标准化（sort query params + strip trailing slash）。

**备选**：直接用完整 URL 字符串。

**选择理由**：避免 `?a=1&b=2` 与 `?b=2&a=1` 被视为不同 key 而产生重复请求。

### 决策 3 · 缓存 TTL

**决策**：统一 5 秒 TTL，手动刷新时 `force=true` 穿透。

**备选**：按端点类型差异化 TTL（slow: 30s, normal: 5s, volatile: 0s）。

**选择理由**：
- 简化实现，v1 先统一
- 页面切换通常在 1-3 秒内完成，5 秒 TTL 足够覆盖连续导航
- 差异化 TTL 放在 v2，等数据验证后再调

**取舍代价**：低频变化数据（agents/workflows）也可能 5 秒后重新请求，但代价可接受（后端单次 10ms）。

### 决策 4 · 轮询治理

**决策**：所有 `setInterval` 添加 `useRef` + cleanup 保证卸载时清除，同时接入去重层。

**备选**：全局 visibility change 监听 + 路由级判断。

**选择理由**：
- `useEffect` 的 cleanup 已经是 React 标准模式，问题在于部分页面写了 cleanup 但依赖数组变化导致重建旧 interval 未清
- 修复措施：对所有 setInterval 添加 useRef 存储 interval ID，cleanup 函数统一从 ref 读取

### 决策 5 · 监控页 Tab 切换优化

**决策**：`MonitoringDashboard` 的 `fetchAll` 结果存入 Zustand store，tab 切换仅做前端筛选，不发网络请求。

**备选**：每个 tab 按需请求对应数据。

**选择理由**：
- `fetchAll` 已通过 `Promise.all` 一次性获取全部 5 个端点的数据
- tab 切换（Agent/工作流/工具/项目）只是对已有数据的维度筛选
- 当前实现每次都重新 `fetchAll`（因为 `useEffect` 依赖 `rankDim`），AC7 要求 0 次调用

### 决策 6 · 错误处理

**决策**：统一 `safeFetch` wrapper，拦截非 200 响应返回 `{ error: true, status }` 而非抛异常。

**备选**：各 store 独立 try/catch。

**选择理由**：
- 当前 `res.json()` 在 500 时解析 HTML 错误页导致 `SyntaxError`（未捕获）
- 统一 wrapper 避免每个 store 重复写错误处理
- 错误状态下标记 store 的 `error` 状态字段，UI 可展示错误提示而非崩溃

## 2. 数据流 / 架构图

```
┌────────────── requestDedup.ts ──────────────┐
│                                               │
│  dedupedFetch(url, options?)                  │
│    │                                          │
│    ├─► 1. 标准化 URL (sort params)            │
│    ├─► 2. 查 Cache Map ── hit ──► 返回缓存    │
│    ├─► 3. 查 In-flight Map ── hit ──► 返回共享 Promise │
│    ├─► 4. 创建新 fetch → 存入 In-flight       │
│    ├─► 5. on resolve → 移入 Cache (TTL 5s)    │
│    └─► 6. on reject  → 移除 (不缓存错误)      │
│                                               │
│  safeFetch(url, options?)                     │
│    └─► dedupedFetch → 拦截 !res.ok → {error}  │
│                                               │
│  invalidateCache(url?)  // 手动刷新           │
└───────────────────────────────────────────────┘
         ▲              ▲              ▲
         │              │              │
    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │ App.tsx │   │ stores/ │   │ pages/  │
    │ alerts  │   │ auth    │   │ Monitor │
    │ count   │   │ agents  │   │ Home    │
    │ poll    │   │ wf/ orch│   │ Approve │
    └─────────┘   │ projects│   │ CtrlPl  │
                  └─────────┘   └─────────┘
```

**流程**：
1. 任意组件/页面调用 `safeFetch('/api/xxx')`
2. `requestDedup.ts` 标准化 URL → 查缓存 → 查 in-flight
3. 命中缓存 → 直接返回；命中 in-flight → 复用 Promise；都未命中 → 新建 fetch
4. `safeFetch` 拦截非 200 → 返回 `{error: true}` 而非抛异常
5. 5 秒后缓存自动过期（下次请求时惰性清除）

## 3. ADR

### ADR-001 · 手写去重层 vs 引入 React Query

**Context**：前端 12 个 Zustand store + 多个页面级 setInterval 导致 3-5x 重复 API 调用，需要统一请求去重和缓存。

**Decision**：手写 3 层去重模块（in-flight dedup + 短期缓存 + 手动穿透），不引入 React Query。

**Consequences**：
- ✅ 不改动现有 Zustand store 架构，改造量小（替换 fetch 调用即可）
- ✅ 不增加 bundle size（约 1KB gzipped）
- ✅ 不引入新的学习成本（所有 store 保持 Zustand 范式）
- ❌ 不支持 SWR、乐观更新、自动重试等高级特性
- ❌ 未来如果从 Zustand 迁移到 React Query，去重层是废弃代码

### ADR-002 · SQLite WAL 模式（建议，非本次实施）

**Context**：SQLite DELETE journal mode + 140+ 并发请求 → "database is locked" → 500 错误风暴。

**Decision**：v2 建议后端切换 SQLite 到 WAL 模式（`PRAGMA journal_mode=WAL`）。

**Consequences**：
- ✅ WAL 允许并发读 + 一个写，大幅降低锁冲突
- ✅ 零代码改动（仅启动时执行一条 PRAGMA）
- ❌ 不在此 change 范围，需另开 change

## 4. 风险

| # | 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|---|
| R1 | 缓存导致过期数据（手动操作后未刷新） | 中 | 中 | 所有 CRUD 操作（创建/删除/更新）后调用 `invalidateCache()` 手动穿透 |
| R2 | React StrictMode 开发环境 double-render 增加去重复杂度 | 低 | 低 | 去重层基于 URL key，double-render 的第二个 fetch 直接命中 in-flight 缓存，无额外网络请求 |
| R3 | 去重层内部状态泄漏（Session 级缓存无限增长） | 低 | 中 | Cache Map 设置最大条目数（200），超出时 LRU 淘汰 |
| R4 | 部分 store 使用了被废弃的 fetch 模式（绕过 global fetch 拦截器） | 低 | 中 | V1.6 全量审计 12 个 store，确保全部走 safeFetch |
| R5 | 审批页/控制面 500 错误在修复后仍存在（后端问题） | 中 | 高 | 前端只做防御（不去重不重试 500），真正的 500 修复需另开 change |

## 5. 不在范围内

- 不优化后端 `/api/alerts/count`（435ms）和 `/api/changes`（185ms）性能
- 不切换 SQLite 到 WAL 模式（ADR-002 建议 v2）
- 不引入 Service Worker 离线缓存
- 不修改任何后端代码
- 不重构 Zustand store 为 hooks 模式
- 不修复 ConversationCenter / AlertsPage / KnowledgeBase 的轮询（各自有轮询的业务合理性）

## 9. 架构沉淀建议

### 9.1 新增可复用抽象

| 抽象 | 路径 | 复用场景 |
|---|---|---|
| `requestDedup.ts` | `src/utils/requestDedup.ts` | 任何需要请求去重的前端模块，所有新 store 默认使用 |
| `safeFetch()` | 同上 | 统一的错误处理 wrapper，替代裸 `fetch().then(r=>r.json())` |

### 9.2 项目级技术决策

- `[2026-07-07]` 前端请求去重：统一使用 `src/utils/requestDedup.ts` 的 `safeFetch()` 替代原生 `fetch()`，所有新 store 和页面级请求必须接入
- `[2026-07-07]` 轮询模式：所有 `setInterval` 必须通过 `useEffect` cleanup 正确清除，使用 `useRef` 存储 interval ID 防止闭包陷阱

### 9.3 跨模块契约

N/A — 本 change 不涉及 API/事件/Schema 变更。

### 9.4 依赖变动

N/A — 本 change 不引入新依赖。

### 9.5 禁动清单变动

| 新增禁动 | 理由 |
|---|---|
| `src/utils/requestDedup.ts` — 去重/缓存逻辑不可绕过 | 绕过去重层会重新引入重复调用问题 |
