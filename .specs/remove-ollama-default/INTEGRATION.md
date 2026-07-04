# INTEGRATION: 移除自动运行 Ollama 的代码

- **Change ID**: remove-ollama-default
- **归档日期**: 2026-07-04
- **路径**: 最短

---

## 产物清单

| 产物 | 状态 |
|---|---|
| CHANGE.md | ✅ |
| TASK.md | ✅ |
| TEST.md | ✅ |
| REVIEW（内嵌于 6-review 门禁） | ✅ |
| INTEGRATION.md | ✅ |

---

## 变更文件

| 文件 | 改动 | 行数变化 |
|---|---|---|
| `code-kit-monitor/backend/routes/tools_api.py` | 删除 `api_generate_tool` 端点 | -56 |
| `code-kit-monitor/frontend/src/pages/ToolMarket.tsx` | 删除 NL 生成 UI | -28 |
| `.claude/settings.local.json` | 删除 11 条 ollama 权限 + 修复 1 条 curl payload | -10 |
| `.specs/adr/002-yaml-schema-spec.md` | ollama → openai 示例替换 | 3 |

---

## 门禁记录

| 门 | 结果 |
|---|---|
| G1 需求门 | ✅ 4/4 全票 |
| Task 门 | ✅ 4/4 全票 + 全 🤖 自动化 |
| 测试门 | ✅ 4/4 全票 |
| G4 审查门 | ✅ 4/4 全票 · 0 Critical |

---

## LESSONS 提名检查

- 无耗时 > 30min 的问题
- 无通用性错因
- → 不提名新 LESSONS

---

## 验收确认

- [x] `POST /api/tools/generate-from-text` → 404
- [x] ToolMarket 页面无「自然语言生成」按钮
- [x] settings.local.json 无 ollama 命令权限
- [x] ADR 002 无 ollama 引用
- [x] Ollama 仍作为 Agent provider 可选项保留（AgentBuilder/AgentDetail）
