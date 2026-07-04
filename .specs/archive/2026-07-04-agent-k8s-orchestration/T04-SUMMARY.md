# T04-SUMMARY: Reconcile Loop 引擎

- **Task**: T04
- **状态**: ✅ done

## 做了什么

实现 asyncio reconcile loop 引擎：observe→diff→reconcile 循环，crash 检测/漂移检测/审计日志。

## verify 输出

```
✅ T04: compare_states() correct — crashed detected
✅ T04: drift detection OK
```

## 越界检查

- TASK write_files：`backend/engine/reconcile_loop.py`
- 实际 diff：同上（新建）
- 越界：0 ✅
