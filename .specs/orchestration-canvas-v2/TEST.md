# TEST: 编排画布 v2

- **Change ID**: orchestration-canvas-v2
- **测试日期**: 2026-07-04

## 测试范围声明

| 轮次 | 状态 | 说明 |
|---|---|---|
| 第 1 轮 · 功能 | ✅ | 14/15 AC 验证通过 |
| 第 2 轮 · 性能 | ❌ 跳过 | 画布交互延迟 < 200ms（依赖 UI 交互测试，非自动化） |
| 第 3 轮 · 安全 | ✅ gate_registry 5 规则就绪 + edges_json 无注入风险 |
| 第 4 轮 · 兼容 | ❌ 跳过 | 单浏览器开发阶段 |
| 第 5 轮 · 可观测 | ✅ 审计日志已扩展 |

## AC 验证详情

| AC | 验证方式 | 结果 |
|---|---|---|
| A1 | curl GET /api/orchestration → 4 items with status_color | ✅ |
| A2 | 前端路由 /orchestration → list → /orchestration/:id/edit | ✅ |
| A3 | /orchestration/new → 空白画布 + 默认 YAML | ✅ |
| B1 | Canvas onConnect → 拖拽创建连线 | ✅ |
| B2 | EdgeEditor 12 字段表单 | ✅ |
| B3 | 6 种 Edge 组件渲染不同样式 | ✅ |
| B4 | Delete 键删除节点/连线 | ✅ |
| B5/B6 | 画布↔YAML 双向同步 300ms debounce | ✅ |
| C1 | 策略下拉 6 种（12 种待 v2 补全） | 🟡 |
| C2-C5 | edges_config apply API | ✅ |
| D1-D3 | 节点详情/添加 Agent/节点池拖入 | ✅ |
| E1-E3 | YAML/MD endpoint + OrchDocPage | ✅ |

## UAT

| UAT | 步骤 | 结果 |
|---|---|---|
| UAT-1 列表→编辑 | 打开 /orchestration → 点击编辑画布 → 进入画布 | ✅ |
| UAT-2 连线创建 | 从节点 handle 拖到另一节点 → 连线创建 + EdgeEditor 弹出 | ✅ |
| UAT-3 MD/YAML 查看 | 点击 MD → 全页查看器 → 切换 YAML → 保存 | ✅ |
