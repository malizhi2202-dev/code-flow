# TEST: 移除自动运行 Ollama 的代码

- **Change ID**: remove-ollama-default
- **测试日期**: 2026-07-04
- **路径**: 最短（纯代码清理）

---

## 本次测试范围声明

| 轮次 | 状态 | 范围 | 跳过理由 |
|---|---|---|---|
| 第 1 轮 · 功能 | ⚠️ 部分 | 4 条 UAT 手动验证 | 纯删除变更，无新增逻辑 |
| 第 2 轮 · 性能 | ❌ 跳过 | — | 仅删除代码，性能不变 |
| 第 3 轮 · 安全 | ✅ 必跑 | 确认 ollama 命令权限已移除 | 本次变更核心目标 |
| 第 4 轮 · 兼容 | ❌ 跳过 | — | 无 API 签名变更 |
| 第 5 轮 · 可观测 | ❌ 跳过 | — | 无运行时行为变更 |

---

## 第 1 轮 · 功能测试（UAT）

### UAT-1：后端端点已移除
- **前置**：后端服务运行中
- **步骤**：
  1. `curl -s -X POST http://127.0.0.1:8000/api/tools/generate-from-text -H "Content-Type: application/json" -d '{"description":"test"}'`
  2. 检查 HTTP 状态码
- **期望**：返回 404 Not Found
- **结果**：⬜ 待验证

### UAT-2：前端 NL 生成按钮已消失
- **前置**：前端 dev server 运行中
- **步骤**：
  1. 打开 ToolMarket 页面
  2. 检查工具栏区域
- **期望**：不再出现"自然语言生成"按钮和 Sparkles 图标
- **结果**：⬜ 待验证

### UAT-3：Ollama 命令权限已清除
- **步骤**：`grep -i "ollama" .claude/settings.local.json`
- **期望**：无输出（grep 返回 1）
- **结果**：✅ 通过

### UAT-4：ADR 文档已更新
- **步骤**：`grep -i "ollama" .specs/adr/002-yaml-schema-spec.md`
- **期望**：无输出
- **结果**：✅ 通过

---

## 第 3 轮 · 安全检查

| 检查项 | 方法 | 结果 |
|---|---|---|
| settings.local.json 无 ollama 命令权限 | `grep -i ollama` → 空 | ✅ |
| 无 ollama serve/pull/run 可执行路径 | 同上 | ✅ |
| 无 ollama 安装脚本权限 | 同上 | ✅ |
| 后端不再调用 ollama API | 代码审查 tools_api.py | ✅ |
| AgentBuilder/AgentDetail 保留 Ollama 选项（按设计） | 代码审查 | ✅ |

---

## 测试结论

- **UAT-1/2** 需启动服务后手动验证
- **UAT-3/4 + 安全轮** 已通过（grep + 代码审查）
- **无回归风险**——所有变更为纯删除，不引入新逻辑
