# CHANGE: 移除自动运行 Ollama 的代码

- **Change ID**: remove-ollama-default
- **创建日期**: 2026-07-04
- **路径建议**: 最短
- **状态**: draft

---

## Why（为什么做）

项目中存在自动调用 Ollama 后端 API 的代码（`api_generate_tool` 端点直接向 `http://127.0.0.1:11434/api/generate` 发请求），以及 `.claude/settings.local.json` 中允许 AI 自动执行 `ollama serve`/`ollama pull`/`ollama run` 等命令的权限。这些代码在没有用户明确意图的情况下可能自动触发 Ollama 相关操作，需要移除。

## What（做什么）

1. 移除后端 `tools_api.py` 中 `POST /generate-from-text` 端点（该端点直接调用 Ollama API 生成工具定义）
2. 移除前端 `ToolMarket.tsx` 中调用该端点的「AI 生成」按钮及相关状态
3. 清理 `.claude/settings.local.json` 中所有 ollama 命令权限（serve/pull/run/list/install）
4. 更新 `.specs/adr/002-yaml-schema-spec.md` 中 Ollama 示例为 OpenAI

**保留**：Ollama 作为 Agent 模型 provider 的可选项（AgentBuilder/AgentDetail 中的下拉选项和默认值不变）。

## 影响面

- [ ] 影响 `REQUIREMENT.md`
- [ ] 影响 `DESIGN.md` / 引入新 ADR
- [ ] 影响现有 AC
- [ ] 影响数据模型 / 迁移
- [ ] 影响外部 API 兼容性
- [x] 仅清理代码，无范围变化

**API 影响**：移除 `POST /api/tools/generate-from-text` 端点。如果外部有调用方依赖此端点，将收到 404。

## 范围排除（这次不做）

- **不替换** `api_generate_tool` 为其他 LLM provider（如 OpenAI）— 保持功能移除，如需恢复另开 change
- **不删除** Ollama 作为 Agent 模型 provider 的 UI 选项 — Ollama 仍可在创建 Agent 时手动选择
- **不清理** `dist/` 构建产物中的 Ollama 引用 — 随下次构建自然消失

## 验收线（粗粒度，不是 AC）

1. 前端 ToolMarket 页面不再出现「AI 生成」按钮
2. `POST /api/tools/generate-from-text` 返回 404
3. `.claude/settings.local.json` 中不再包含任何 ollama 命令权限
4. ADR 002 的 YAML schema 示例中不再出现 `provider: ollama`

## 风险与未知

- 无。改动范围明确，仅删除代码，不引入新逻辑。
