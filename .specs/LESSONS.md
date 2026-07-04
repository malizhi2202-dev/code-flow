# LESSONS — 跨 change 经验库

> 从每个 change 的失败/试错/决策偏离中提取。
> 提名条件：耗时 > 30min / 错因通用 / 6 月内可能再撞。

---

## L-001 · SQLAlchemy SQLite 替代 MySQL 开发

- **标签**: #database #local-dev #quickstart
- **关键词**: SQLite, MySQL, SQLAlchemy, zero-dependency
- **适用栈**: Python + SQLAlchemy
- **状态**: active
- **来源**: `ai-dev-platform`

**问题**: MySQL 需要额外安装和配置，本地开发启动门槛高。
**解决**: 使用 SQLite 作为默认数据库（`sqlite:///platform.db`），通过环境变量 `DATABASE_URL` 可切换到 MySQL。
**关键代码**: `database.py` 中 `connect_args={"check_same_thread": False}` 解决 SQLite 多线程问题。

---

## L-002 · SQLAlchemy Enum 在 SQLite 不兼容

- **标签**: #orm #sqlite #compatibility
- **关键词**: SQLAlchemy, Enum, SQLite, String
- **适用栈**: Python + SQLAlchemy + SQLite
- **状态**: active
- **来源**: `ai-dev-platform`

**问题**: `SAEnum(SomeEnum)` 在 SQLite 上运行时报 `AttributeError`，因为 SQLite 不支持 ENUM 类型。
**解决**: 将所有 `SAEnum` 替换为 `String(16)`，在应用层用字符串比较代替枚举成员访问（如 `tool.type == "plugin"` 而非 `tool.type == ToolType.plugin`）。
**教训**: 选择技术栈时优先考虑 SQLite 兼容性；设计模型时用 String 而非 Enum 保证跨数据库可移植。

---

## L-003 · 权限过滤逻辑重复

- **标签**: #refactor #dry #security
- **关键词**: owner_id, filter, middleware, DRY
- **适用栈**: FastAPI + SQLAlchemy
- **状态**: active
- **来源**: `ai-dev-platform`

**问题**: `_filter_owner` 逻辑在 `tools_api.py`、`workflows_api.py`、`agents_api.py` 三个文件中重复定义。
**当前方案**: 在每个 route 文件内部定义 `_filter_owner`（v1 可接受）。
**改进方向**: 提取到公共 `services/auth_helper.py` 或 FastAPI middleware/dependency。
**风险**: 如果新增 entity 类型时忘记添加 owner 过滤 → 越权漏洞。建议 4-dev 实现新 entity 时强制 code review 检查 WHERE 子句。

---

## L-004 · zustand store 模式高复用

- **标签**: #frontend #state-management #pattern
- **关键词**: zustand, store, fetch, CRUD
- **适用栈**: React + TypeScript + zustand
- **状态**: active
- **来源**: `ai-dev-platform`

**问题**: 5 个 zustand store（tools/workflows/agents/projects/metrics）结构高度相似（fetch/list/create/delete）。
**当前方案**: 每个 store 独立编写（v1 可接受，约 30 行/个）。
---

## L-005 · FastAPI 静态路由必须在动态路由之前注册

- **标签**: #fastapi #routing #bug-pattern
- **关键词**: FastAPI, route ordering, path parameter
- **适用栈**: FastAPI
- **状态**: active
- **来源**: `agent-k8s-orchestration`

**问题**: `/api/orchestration/templates` 返回 422，因 `@router.get("/{instance_id}")` 在 `/templates` 之前注册，FastAPI 将 "templates" 误匹配为 instance_id。
**解决**: 静态路由（`/templates`、`/queue/list`）必须在 `/{instance_id}` 之前注册。
**教训**: 注册路由时先静态路径后动态路径，建议在路由文件顶部注释标注。

---

## L-006 · YAML safe_load 返回值必须校验类型

- **标签**: #yaml #validation #defense
- **关键词**: PyYAML, safe_load, type check
- **适用栈**: Python + PyYAML
- **状态**: active
- **来源**: `agent-k8s-orchestration`

**问题**: `yaml.safe_load("bad")` 返回字符串而非 dict，导致 `AttributeError` → 500。
**解决**: `safe_load` 后加 `isinstance(doc, dict)` 检查，非 dict 返回结构化错误。
**教训**: YAML 解析后必须校验返回值类型。

---

**改进方向**: 抽象 `createEntityStore<T>(endpoint, uid)` 工厂函数，减少重复代码 ~80%。

---
