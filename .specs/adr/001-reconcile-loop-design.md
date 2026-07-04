# ADR-001: Reconcile Loop 模型 — asyncio 单进程后台任务

- **状态**: accepted
- **日期**: 2026-07-04
- **决策者**: AI（Architect 角色）+ 人工 review

---

## Context

Agent 编排模块需要持续监控已部署编排实例的运行状态，并在以下场景自动执行修复动作：

1. Agent 实例异常退出 → 自动重启
2. 链路执行失败/超时 → 按策略重试或降级到备用链路
3. 手动修改 Agent 导致状态漂移 → 检测并告警/自动修复

需要一个后台持续运行的 reconcile loop，周期性地对比期望状态（拓扑快照）与实际状态（Agent 运行情况），发现偏差后自动执行修复。

---

## Decision

**选择 asyncio 后台任务**，在 FastAPI `startup` 事件中注册，单进程内循环执行。

```python
# 伪代码
async def reconcile_loop():
    while True:
        instances = await get_active_instances()
        for inst in instances:
            desired = await get_topology_snapshot(inst.id)
            actual = await get_agent_statuses(inst.agent_ids)
            diff = compare(desired, actual)
            if diff:
                await reconcile(diff)
                await write_audit(diff, action)
        await asyncio.sleep(5)  # 5 秒周期

@app.on_event("startup")
async def startup():
    asyncio.create_task(reconcile_loop())
```

---

## Alternatives Considered

| 方案 | 评价 |
|---|---|
| **Celery + Redis Beat** | 定时任务成熟，支持分布式。但需额外 Redis 进程，本地部署复杂，过度工程。**排除** |
| **独立 Python 进程** | 与 FastAPI 解耦。但增加运维负担（需额外启动/监控进程），本地场景无优势。**排除** |
| **APScheduler** | 比 asyncio 丰富（cron 表达式、持久化）。但引入新依赖，简单循环不需要调度框架。**排除** |
| **asyncio.create_task** | **选定**。Python 标准库，零额外依赖，与 FastAPI 共用事件循环，启动/停止随 FastAPI 生命周期 |

---

## Consequences

### 正面

- 零额外依赖，与 FastAPI 共用进程和事件循环
- 本地开发调试简单（一个进程内打日志）
- 与既有 SQLAlchemy session 管理兼容（async session）

### 负面

- **非持久化**：服务重启时 reconcile loop 状态丢失，依赖数据库中的 topology_snapshot 重建期望状态
- **无分布式能力**：不能多实例并行 reconcile（但 v1 仅本地单进程，无此需求）
- **单点瓶颈**：reconcile 代码 panic 会导致整个 loop 停止（需最外层 try/except + 日志告警）
- **资源竞争**：reconcile 查询与 API 请求共用 SQLAlchemy session pool（需独立 session）

### 长期迁移路径

如未来需要分布式 reconcile，可将 reconcile 逻辑抽取为独立 worker，通过消息队列（如 Redis pub/sub）分发 reconcile 任务。当前抽象已预留接口边界（`reconcile_loop.py` 对外仅暴露 `reconcile(instance_id)` 函数）。
