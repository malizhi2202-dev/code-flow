# UAT: Agent 编排模块 k8s 化改造

- **Change ID**: `agent-k8s-orchestration`

---

## UAT-1: AC-A2 YAML ↔ 画布实时同步

**前置**: 前端运行中（`npm run dev`），后端运行中（`python main.py`）

**步骤**:
1. 打开浏览器 → http://localhost:5173
2. 点击左侧「编排」导航
3. 左侧 YAML 编辑器中修改 agent name 为 "my-agent"
4. 观察右侧拓扑画布是否实时更新节点名
5. 在画布上拖拽节点到新位置

**期望**:
- YAML 编辑后画布节点名同步变化
- 拖拽节点后画布实时响应

**结果**: 🟡 待手动验证（需浏览器操作）

---

## UAT-2: AC-E1 拓扑实时状态颜色

**前置**: 已部署一个编排实例（通过 apply）

**步骤**:
1. 打开拓扑画布查看已部署实例
2. 观察每个 Agent 节点的颜色
3. 观察节点左侧色条 + 右下角圆点

**期望**:
- 🟢 健康节点 = 绿色 #5cb878
- 🔴 异常节点 = 红色 #e05555（含脉冲动画）
- 🟡 等待节点 = 橙色 #e8a450
- ⚪ 未启动节点 = 灰色 #5d6068

**结果**: 🟡 待手动验证（需真实 Agent 运行状态）

---

## 自动化验证汇总

| 检查 | 结果 |
|---|---|
| tsc --noEmit | ✅ 0 errors (our code) |
| Python imports | ✅ all backend modules |
| vite build | ✅ 2945 modules, 5.33s |
| API functional | ✅ 11/11 endpoints |
| Backend running | ✅ localhost:8000 |

---

## 结论

自动化检查全部通过。2 项 UAT 需在浏览器中手动操作验证（需前端 dev server + 后端运行）。
