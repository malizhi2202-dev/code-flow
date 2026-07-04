# T03-SUMMARY: 依赖安装

- **Task**: T03
- **状态**: ✅ done
- **时间**: 2026-07-04

## 做了什么

后端 requirements.txt 新增 PyYAML + jsonschema，安装验证。

## 改动文件

| 文件 | 操作 |
|---|---|
| `backend/requirements.txt` | 修改（新增 2 行） |

## verify 输出

```
✅ T03: PyYAML + jsonschema deps available
   PyYAML=6.0.3, jsonschema=4.26.0
```

## 6 维自查

- R1-R6：纯依赖安装任务，不涉及代码逻辑
- 无越界

## 越界检查

- TASK write_files：`backend/requirements.txt`
- 实际 diff：`backend/requirements.txt`
- 越界：0 ✅
