# TASK: 移除自动运行 Ollama 的代码

- **Change ID**: remove-ollama-default
- **关联**: `@.specs/remove-ollama-default/CHANGE.md`

---

## 波次划分

```
Wave 1 (parallel): T01[P], T02[P], T03[P]
```

> 三个 task 无文件重叠，全部并行。

---

## 任务清单

```xml
<task id="T01" parallel="true" status="pending">
  <name>移除后端 Ollama 生成端点</name>
  <read_files>
    code-kit-monitor/backend/routes/tools_api.py
  </read_files>
  <write_files>
    code-kit-monitor/backend/routes/tools_api.py
  </write_files>
  <action>
    删除 tools_api.py 中的 POST /generate-from-text 端点（第 112-167 行，api_generate_tool 函数整段）。
    该函数直接向 http://127.0.0.1:11434/api/generate 发请求调用 Ollama，
    属于自动运行 Ollama 的代码，移除后该路由返回 404。
    删除前确认 @router.post("/generate-from-text") 装饰器及函数体一并移除，
    不残留空行或注释引用。
  </action>
  <verify>cd code-kit-monitor/backend && python -c "from routes.tools_api import router; print('OK')"</verify>
  <done>api_generate_tool 函数已删除；tools_api 模块可正常导入；POST /api/tools/generate-from-text 返回 404</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T02" parallel="true" status="pending">
  <name>移除前端自然语言生成 UI</name>
  <read_files>
    code-kit-monitor/frontend/src/pages/ToolMarket.tsx
  </read_files>
  <write_files>
    code-kit-monitor/frontend/src/pages/ToolMarket.tsx
  </write_files>
  <action>
    从 ToolMarket.tsx 中移除「自然语言生成」相关 UI：
    1. 移除状态变量（第 18-22 行）：showNL, nlDesc, nlType, generating, generated
    2. 移除「自然语言生成」按钮（第 37-39 行，含 Sparkles 图标）
    3. 移除 NL 生成弹窗（第 89-107 行，showNL && (...) 整段）
    4. 若 Sparkles 图标仅用于 NL 功能，从 import 中移除（第 2 行）
    保留其他功能（创建工具、上传 MD、筛选、搜索、删除、监控）不变。
  </action>
  <verify>cd code-kit-monitor/frontend && npx tsc --noEmit --pretty 2>&1 | head -20</verify>
  <done>ToolMarket 页面不再出现「自然语言生成」按钮；TypeScript 编译通过</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T03" parallel="true" status="pending">
  <name>清理 ollama 权限与 ADR 示例</name>
  <read_files>
    .claude/settings.local.json
    .specs/adr/002-yaml-schema-spec.md
  </read_files>
  <write_files>
    .claude/settings.local.json
    .specs/adr/002-yaml-schema-spec.md
  </write_files>
  <action>
    1. 从 settings.local.json 中删除以下 ollama 相关权限行（约第 159-173 行）：
       - ollama --version
       - curl ... ollama.com/install.sh（3 条变体）
       - curl ... ollama-linux-amd64（2 条变体）
       - chmod +x ~/bin/ollama
       - ollama serve *
       - ollama pull *
       - ollama list *
       - ollama run *
       以及第 227 行 curl 测试命令（含 provider: ollama 的 YAML payload）
    2. 将 002-yaml-schema-spec.md 第 67-69 行的 ollama 示例替换为 openai：
       provider: ollama → provider: openai
       name: qwen2:0.5b → name: gpt-4o
       api_key_ref: env://OLLAMA_API_KEY → api_key_ref: env://OPENAI_API_KEY
  </action>
  <verify>grep -i "ollama" .claude/settings.local.json .specs/adr/002-yaml-schema-spec.md; echo "EXIT:$?"</verify>
  <done>settings.local.json 中无 ollama 命令权限；ADR 002 中无 ollama 引用（grep 返回空）</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>
```

---

## 状态字段说明

- `status="pending"` — 未开始
- `status="in_progress"` — 进行中
- `status="done"` — 已完成（verify 通过）
- `status="blocked"` — 阻塞

---

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
|  |  |  |  |

---

## Fix 任务（来自 REVIEW / INTEGRATION）

> 此区域由 review/integration 阶段自动追加。
