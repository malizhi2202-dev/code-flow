# INTEGRATION: 项目详情 Agent 消耗监控 Tab

- **Change ID**: project-agent-metrics
- **状态**: ✅ 归档
- **日期**: 2026-07-05

---

## 交付清单

| 工件 | 状态 |
|---|---|
| CHANGE.md | ✅ |
| REQUIREMENT.md | ✅ |
| DESIGN.md | ✅ |
| TASK.md (2 Wave × 3 Tasks) | ✅ |
| 后端 API (T01) | ✅ |
| 前端 Agent tab (T02+T03) | ✅ |
| TEST.md | ✅ |

## 变更文件

```
backend/routes/metrics_api.py          — +GET /api/metrics/project/{id}/breakdown
frontend/src/pages/ProjectDetail.tsx   — +🤖 Agent tab (基本信息 + 消耗柱状图 + 会话列表)
```

## Tab 栏

```
📋 概览 | 💬 对话 | 🤖 Agent | 📊 监控 | 📜 历史
```

## 柱状图颜色

| 维度 | 颜色 |
|---|---|
| 主 Agent | 工业绿 `#5cb878` |
| 子 Agent | 琥珀 `#f59e0b` |
| 工作流 | 冷蓝 `#3b82f6` |

---
> 🤖 Generated with [Claude Code](https://claude.com/claude-code)
