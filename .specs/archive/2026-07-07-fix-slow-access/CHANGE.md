# CHANGE — 前端全站 API 重复调用致页面响应极慢

| 字段 | 值 |
|---|---|
| **Change ID** | `fix-slow-access` |
| **创建日期** | 2026-07-07 |
| **状态** | 活跃 |
| **优先级** | P0（阻塞性 bug，全站不可用） |
| **路径建议** | 完整：REQUIREMENT → DESIGN → TASK → DEV → TEST → REVIEW → INTEGRATION |

## Why

用户反馈「点击各个左边栏以及内部的按钮响应都很慢」。实测发现前端 12 个 Zustand store 各自独立发起 API 请求，无统一缓存/去重/请求合并层，导致每次页面切换（点击导航或内部按钮）产生 **3-5x 重复 API 调用**。

**实测数据**（浏览器 Performance API）：

| 页面 | API 调用次数 | 期望次数 | 浪费倍数 |
|---|---|---|---|
| 首页（项目管理） | 19-21 | ~7 | ~3x |
| 监控页 | 20 | ~6 | ~3.3x |

**典型重复模式（监控页）**：

| 端点 | 重复次数 | 首次耗时 | 末次耗时（竞争） |
|---|---|---|---|
| `/api/metrics/stats` | 3x | 49ms | 405ms |
| `/api/metrics/rankings` | 3x | 67ms | 434ms |
| `/api/metrics/sessions` | 3x | 54ms | 434ms |
| `/api/alerts/count` | 5x | 10ms | 380ms |

后端单次请求很快（10-50ms），但 **重复请求并发竞争** 导致有效响应延迟飙升至 300-400ms，页面 domComplete 达 1.5 秒。

## What

1. **诊断所有 12 个 Zustand store 的请求去重问题**：识别哪些 store 在组件 mount 时重复 fetch、哪些在 useEffect 依赖变化时重复触发
2. **引入请求去重层**：基于 URL + params 的 in-flight 请求去重，多个组件同时请求同一资源时合并为单次调用
3. **引入短期缓存层**：页面切换期间（< 会话生命周期）缓存 API 响应，避免重复请求
4. **修复热点 store**：`alerts` store（count 被调 5-9 次）、`metrics` store（5 个端点各重复 3 次）
5. **全面回归测试**：所有 11 个导航项 + 内部按钮，确认每次导航 ≤ 8 次 API 调用，页面切换 < 300ms

## 影响面

- **改动范围**：仅 `code-kit-monitor/frontend/src/` 下 stores/ 和可能的 utils/api.ts（新增请求层）
- **不影响**：后端 API、数据库 schema、路由逻辑
- **API 兼容**：所有接口签名不变，请求体/响应体不变
- **不新增依赖**：优先手写去重逻辑，不引入 React Query/SWR 等外部库

## 验收线

- 首页加载 API 调用 ≤ 8 次（当前 19-21 次）
- 监控页加载 API 调用 ≤ 7 次（当前 20 次）
- 任意页面切换 API 调用 ≤ 8 次
- 页面切换 domComplete < 500ms（当前 ~1.5s）
- 所有 11 个导航项点击后 < 300ms 出现内容
- 不影响任何已有功能（全接口回归 + 前端功能测试）

## 范围排除（本次不做）

- 不引入 React Query / SWR / RTK Query 等重量级数据请求库（保持轻量）
- 不改后端任何代码（问题在前端重复调用）
- 不修改路由/导航结构
- 不改 UI 布局/样式
- 不增加新功能
