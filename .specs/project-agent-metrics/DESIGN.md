# DESIGN: 项目详情 Agent 消耗监控 Tab

- **Change ID**: project-agent-metrics
- **关联**: `@.specs/project-agent-metrics/REQUIREMENT.md`、`@.specs/CONTEXT.md`

---

## 0. 技术栈选定

沿用项目既有栈，无新依赖。

- **前端**: React 18 + TypeScript + Recharts 2.x（`BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`）
- **后端**: FastAPI + SQLAlchemy — 新增 1 个 API 端点
- **数据**: 复用 `SessionMetric` 表，无需迁移

## 0.5 既有架构对齐

| 本次需要 | 既有 | 决定 |
|---|---|---|
| HTTP 客户端 | 全局 fetch 拦截器 | 沿用 |
| 图表库 | Recharts 2.x | 沿用 |
| 指标数据 | `SessionMetric` 表 | 复用，新增聚合查询 |
| 会话列表 | `GET /api/metrics/sessions` | 复用，加 entity_type + entity_id 过滤 |

新增模块：
- `frontend/src/pages/ProjectDetail.tsx`（修改：+Agent tab）
- `backend/routes/metrics_api.py`（修改：+project breakdown API）

## 1. 决策清单

| # | 决策 | 选择理由 |
|---|---|---|
| D1 | Agent tab 复用 ProjectDetail 内联而非独立路由 | 减少状态管理复杂度，同一组件 state 内切换 tab |
| D2 | 后端 1 个 API 返回 agents + workflows 两组 breakdown | 前端一次 fetch，避免 N+1 请求 |
| D3 | 柱状图折叠用 React state（`expandedCharts: Set<string>`）| 纯前端交互，无后端依赖 |
| D4 | 颜色硬编码到组件（非 CSS 变量）| Recharts SVG fill 不继承 CSS 变量 |

## 2. 数据流

```
User click 🤖 Agent tab
    │
    │ GET /api/metrics/project/{projectId}/breakdown?minutes=60
    │ GET /api/metrics/sessions?entity_type=agent&entity_id={agentId}&limit=50
    └──────→ 后端聚合 SessionMetric GROUP BY entity_type, entity_id, 1min bucket
                  │
    ←────── { agents: [...], workflows: [...], total_tokens, sessions: [...] }
    
    ProjectDetail 状态更新
    │
    ├── AgentInfoCard（基本信息 + 标签）
    ├── ConsumptionOverview（总量 + 折叠柱状图）
    │     └── <BarChart> 绿色柱子 #5cb878
    ├── WorkflowBreakdown（每条行 + 折叠柱状图）
    │     └── <BarChart> 蓝色柱子 #3b82f6
    ├── SubAgentBreakdown（每条行 + 折叠柱状图）
    │     └── <BarChart> 琥珀色柱子 #f59e0b
    └── SessionList（时间倒序表格）
```

## 3. API 设计

### `GET /api/metrics/project/{project_id}/breakdown?minutes=60`

```json
{
  "project_id": 1,
  "minutes": 60,
  "total_tokens": 389200,
  "avg_tokens_per_min": 6487,
  "agents": [
    {
      "entity_id": 16, "name": "啵啵啵宝宝", "model_name": "qwen2:0.5b",
      "total_tokens": 245800, "avg_tokens": 8193, "calls": 30,
      "buckets": [{"ts": 1751701200, "tokens": 12500}, ...]
    }
  ],
  "workflows": [
    {
      "entity_id": 5, "name": "代码审查",
      "total_tokens": 145200, "avg_tokens": 14520, "calls": 10,
      "buckets": [{"ts": 1751701200, "tokens": 8000}, ...]
    }
  ]
}
```

## 4. UI 组件设计

### 柱状图颜色（工业风，暗色面板专用）

| 维度 | 颜色 | 色值 | 用途 |
|---|---|---|---|
| 主 Agent | 工业绿 | `#5cb878` | Agent 消耗柱状图 |
| 子 Agent | 琥珀 | `#f59e0b` | 其他 Agent 消耗 |
| 工作流 | 冷蓝 | `#3b82f6` | 工作流消耗 |
| Tooltip 背景 | 暗灰 | `#1f2937` | hover 浮层 |
| 网格线 | 微白 | `rgba(255,255,255,0.08)` | Y 轴参考线 |

### 折叠交互

```tsx
// 折叠状态管理
const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set());

const toggleChart = (key: string) => {
  setExpandedCharts(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
};

// 渲染
<div>
  <span onClick={() => toggleChart('agent-main')}>
    {expandedCharts.has('agent-main') ? '▾ 收起' : '▸ 展开柱状图'}
  </span>
  {expandedCharts.has('agent-main') && <BarChart ... />}
</div>
```

## 5. 风险

| # | 风险 | 影响 | 缓解 |
|---|---|---|---|
| R1 | SessionMetric 中 entity_type/owner_id 数据不全 | 聚合结果为空 | 空状态提示 + 日志排查 |
| R2 | 60 分钟数据量过大 | API 响应慢 | LIMIT 5000 条，前端分页 |
| R3 | Recharts 暗色背景 tooltip 默认白色 | 看不清文字 | 自定义 Tooltip 组件 + 暗色背景 |

---
> 本文件不包含完整代码实现。
