# CHANGELOG

| 日期 | Change ID | 摘要 | LESSONS |
|---|---|---|---|
| 2026-07-07 | `fix-slow-access` | 前端全站 API 去重 + 缓存 + 轮询治理：首页 21→6 次调用，审批页 140+→7 次，500 错误清零，性能改善 67-99.9% | — |
| 2026-07-07 | `monitor-scan-perf` | code-kit-monitor 性能优化：Scanner 单例化 + 去 force=True + 合并文件读，8 API 响应从 >200ms 降至 <30ms（缓存 3ms） | — |
| 2026-07-04 | `agent-k8s-orchestration` | Agent 编排模块 k8s 化改造：声明式 YAML + reconcile 控制循环 + 优先调度 + Operator 模板 + 可观测性 + React Flow 拓扑画布 + CodeMirror YAML 编辑器 | L-005, L-006 |
| 2026-07-04 | `remove-ollama-default` | 移除自动运行 Ollama 代码：删除后端 Ollama API 端点 + 前端 NL 生成 UI + settings 权限清理 + ADR 更新 | — |
| 2026-07-04 | `orchestration-canvas-v2` | 编排画布 v2：双向同步 + 富连线配置（12 种模式）+ 编排列表页 + MD/YAML 全页查看 + NodePool 拖入 + 6 种 Edge 可视化 | — |
| 2026-07-03 | `ai-dev-platform` | AI 开发平台升级：工具库（Plugin/Skill/MCP）+ 工作流市场 + 角色工厂 + Agent 创建/编排 + 项目管理 + 组装 + 监控 + 安全策略（10 模块） | — |
| 2026-07-02 | `code-kit-monitor` | code-kit 工业风 Web 监控面板：change 进度/task 状态/Token 消耗/Gate 门禁/产物查看 | L-001~L-004 |
