# T01-SUMMARY — Scanner 单例化 + 去除 force=True

| 字段 | 值 |
|---|---|
| Task | T01 |
| Change | monitor-scan-perf |
| 状态 | ✅ done |

## 做了什么

1. `scanner.py`: `_count_tasks` 签名改为 `_count_tasks(content=None, change_dir='')`，支持传入已读取内容避免重复 IO；scan() 循环中 TASK.md 只读一次同时用于 task 计数和 auto/manual 统计；门禁统计只扫描 `-SUMMARY.md`/`REVIEW.md`/`TEST.md` 跳过已读的大文件；末尾添加 `get_file_scanner()` 模块级单例
2. `runtime/scanner.py`: 末尾添加 `get_runtime_scanner()` 模块级单例
3. `routes/changes.py`: `FileScanner()` → `get_file_scanner()`，`scan(force=True)` → `scan()`
4. `routes/change_detail.py`: `FileScanner()` → `get_file_scanner()`
5. `routes/health.py`: `FileScanner()` → `get_file_scanner()`，`scan(force=True)` → `scan()`
6. `routes/search.py`: `FileScanner()` → `get_file_scanner()`，`scan(force=True)` → `scan()`
7. `routes/runtime_api.py`: `RuntimeScanner()` → `get_runtime_scanner()`

## 改动的文件

| 文件 | 改动类型 |
|---|---|
| `code-kit-monitor/backend/scanner.py` | 优化 + 单例 |
| `code-kit-monitor/backend/runtime/scanner.py` | 单例 |
| `code-kit-monitor/backend/routes/changes.py` | 单例 + 去 force |
| `code-kit-monitor/backend/routes/change_detail.py` | 单例 |
| `code-kit-monitor/backend/routes/health.py` | 单例 + 去 force |
| `code-kit-monitor/backend/routes/search.py` | 单例 + 去 force |
| `code-kit-monitor/backend/routes/runtime_api.py` | 单例 |

## verify 结果

全部 4 个核心接口通过：

```
/api/changes      → OK (16 items, summary: 9 keys)
/api/health       → OK (consistent=True, issues=0)
/api/search       → OK
/api/runtime/summary → OK
```

性能数据（实测）：
- `/api/changes` 首请求 27ms → 缓存命中 3ms（9x 提升）
- `/api/runtime/summary` 首请求 132ms → 缓存命中 3ms（44x 提升）
- `/api/health` 7ms, `/api/search` 2ms

## 6 维自查

- **R1 认知过载**：改动是单例模式 + 缓存策略，无新增复杂逻辑，每函数改动 < 10 行
- **R2 变更传播**：仅 7 个文件，均在 write_files 范围内
- **R3 知识重复**：无重复逻辑
- **R4 偶然复杂**：无过度抽象
- **R5 依赖混乱**：导入方向正常（routes → scanner，无反向依赖）
- **R6 领域扭曲**：命名清晰（get_file_scanner / get_runtime_scanner）

## 越界检查（R6.5）

```
TASK write_files：7 项
实际 diff 涉及：7 项
越界：0 ✅
```

## LESSONS 扫描

grep `.specs/LESSONS.md` 关键词 scanner/performance/cache/FileScanner/RuntimeScanner → 0 命中，无相关历史条目。
