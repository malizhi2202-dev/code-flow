# T02-SUMMARY: YAML Schema 校验器

- **Task**: T02
- **状态**: ✅ done
- **时间**: 2026-07-04

## 做了什么

实现 5 层 YAML 校验：(1)大小限制(1MB) (2)YAML safe_load 解析 (3)嵌套深度≤50 (4)jsonschema 结构校验 (5)DAG 拓扑校验（孤立节点/自环/循环引用/引用完整性）。

## 改动文件

| 文件 | 操作 |
|---|---|
| `backend/engine/__init__.py` | 新建 |
| `backend/engine/yaml_schema.py` | 新建 |

## verify 输出

```
✅ T02: valid YAML passed
✅ T02: invalid rejected: 'kind' is a required property
✅ T02: bad ref rejected: 引用不存在的 agent: 'nonexistent'
```

## 6 维自查

- **R1 认知过载**：单文件 ~130 行，函数拆分清晰（validate_yaml / _check_dag / _check_nesting）
- **R2 变更传播**：仅新增 engine 包，无修改既有文件
- **R3 知识重复**：无——项目首次引入 YAML 校验
- **R4 偶然复杂**：DAG 环检测用标准 DFS 三色标记，无过度设计
- **R5 依赖混乱**：engine → 不依赖 routes/models/services
- **R6 领域扭曲**：ORCHESTRATION_SCHEMA 用 jsonschema 标准格式

## 越界检查

- TASK write_files：`backend/engine/__init__.py` + `backend/engine/yaml_schema.py`
- 实际 diff：同上
- 越界：0 ✅
