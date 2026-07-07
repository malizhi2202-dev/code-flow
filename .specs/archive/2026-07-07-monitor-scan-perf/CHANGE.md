# CHANGE — code-kit-monitor 数据获取性能优化

| 字段 | 值 |
|---|---|
| **Change ID** | `monitor-scan-perf` |
| **创建日期** | 2026-07-07 |
| **状态** | 活跃 |
| **优先级** | P0（阻塞性 bug） |
| **路径建议** | 最短：DEV → TEST → REVIEW → INTEGRATION（纯 bug 修复） |

## Why

code-kit-monitor 页面（Home 页、Runtime 页）数据加载明显卡顿。用户反馈「获取数据很卡」。

## What

优化 `.specs/` 文件扫描性能，解决 3 个根因：

1. **force=True 绕过缓存**：`changes.py`/`health.py`/`search.py` 每次请求都 `scan(force=True)` 强制全量扫描，5s 缓存形同虚设
2. **Scanner 实例不共享**：5 个路由文件各创建独立 `FileScanner()`/`RuntimeScanner()`，缓存互不可见
3. **TASK.md 重复读取 + 门禁扫描过多文件**：每个 change 循环内 TASK.md 被读 2 次（_count_tasks + auto 计数），门禁统计遍历所有 .md 文件（含已读的 CHANGE/REQUIREMENT/DESIGN）

## 影响面

- **改动范围**：仅 `code-kit-monitor/backend/` 下 7 个文件
- **不影响**：前端、数据库 schema、AgentFlow 主项目
- **API 兼容**：所有接口签名不变，仅性能提升

## 验收线

- `/api/changes` 首次请求 < 50ms（原 > 200ms），缓存命中 < 5ms
- `/api/runtime/summary` 首次请求 < 200ms，缓存命中 < 5ms
- 前后端全部接口通过测试
- 不影响任何已有功能

## 范围排除（本次不做）

- 不引入 Redis 等外部缓存层
- 不改前端轮询频率（5s 保持）
- 不修改数据库 schema
- 不重构 scanner 架构
