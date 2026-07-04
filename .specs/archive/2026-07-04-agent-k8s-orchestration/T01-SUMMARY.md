# T01-SUMMARY: 新增编排相关 ORM 模型 + 数据库迁移

- **Task**: T01
- **状态**: ✅ done
- **时间**: 2026-07-04

## 做了什么

创建 5 个 ORM 模型 + 注册到 models/__init__.py + Base.metadata.create_all() 建表。

## 改动文件

| 文件 | 操作 |
|---|---|
| `backend/models/orchestration.py` | 新建（5 模型） |
| `backend/models/__init__.py` | 修改（注册新模型） |

## verify 输出

```
✅ T01: 5 models import OK
✅ T01: create_all() OK
```

## 6 维自查

- **R1 认知过载**：单文件 5 个模型，每个 10-20 行，清晰
- **R2 变更传播**：仅新增文件 + __init__.py 注册行，无越界
- **R3 知识重复**：复用既有 Column/String/Integer/DateTime/JSON/ForeignKey 模式
- **R4 偶然复杂**：无过度抽象
- **R5 依赖混乱**：models → Base 方向正确
- **R6 领域扭曲**：OrchestrationInstance/TopologySnapshot/SchedulingQueue/TraceSpan 均为领域术语

## 越界检查

- TASK write_files：`backend/models/orchestration.py`
- 实际 diff：`backend/models/orchestration.py`(new) + `backend/models/__init__.py`(注册行)
- 越界：0 ✅

## 数据库迁移

- 机制：`Base.metadata.create_all()`（开发环境 SQLite）
- 5 张新表已建：orchestration_instances, topology_snapshots, orchestration_templates, scheduling_queue, trace_spans
- 验证：`create_all()` 无报错
