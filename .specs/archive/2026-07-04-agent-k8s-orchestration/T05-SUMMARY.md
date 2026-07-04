# T05-SUMMARY: 调度器引擎 + 模板渲染服务

- **Task**: T05
- **状态**: ✅ done

## 做了什么

实现 PriorityQueue 调度器（优先级队列+防饥饿+抢占）+ Go template 风格模板渲染服务。

## verify 输出

```
✅ T05: scheduler priority ordering OK
✅ T05: template service OK
```

## 越界检查

- TASK write_files：`backend/engine/scheduler.py` + `backend/services/template_service.py`
- 实际 diff：同上（新建）
- 越界：0 ✅
