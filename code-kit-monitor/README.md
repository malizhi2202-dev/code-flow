# code-kit-platform — AI 开发平台

## 启动

```bash
# 1. 环境变量
export ENCRYPTION_KEY="your-32-byte-secret-key-here!"
export DATABASE_URL="mysql+pymysql://root@127.0.0.1:3306/code_kit_platform?charset=utf8mb4"
export REDIS_URL="redis://127.0.0.1:6379"

# 2. 后端
cd backend
pip install -r requirements.txt
python main.py
# → http://127.0.0.1:8000
# → Swagger: http://127.0.0.1:8000/docs

# 3. 前端
cd frontend
npm install
npm run dev
# → http://127.0.0.1:5173

# 4. 演示流程
# 登录 → 创建 Plugin/Skill/MCP → 下载 demo
# → 创建工作流（文本/可视化）→ 发布
# → 创建 Agent（选模型+绑定工作流）→ 运行
# → 上传 K8s 风格 YAML 编排多 Agent
# → 创建项目（输入需求+绑定 Agent）→ 执行
# → 监控面板查看 token 图表
```

## 架构

```
Frontend(React+TypeScript+Tailwind+React Flow+Recharts+zustand)
  ↕ REST API
Backend(FastAPI+SQLAlchemy+MySQL+Redis)
  ├── /api/tools/*       工具库 CRUD
  ├── /api/workflows/*   工作流 CRUD + 执行
  ├── /api/agents/*      Agent CRUD + 运行
  ├── /api/orchestration/* Agent 编排(YAML)
  ├── /api/projects/*    项目管理
  └── /api/metrics/*     监控聚合
```

## API 端点速查

| 端点 | 方法 | 说明 |
|---|---|---|
| /api/tools | GET/POST | 工具列表/创建 |
| /api/tools/:id/demo | GET | 下载 demo zip |
| /api/tools/:id/disable | POST | admin 禁用 |
| /api/workflows | GET/POST | 工作流列表/创建 |
| /api/workflows/:id/publish | POST | 发布(创建快照) |
| /api/workflows/:id/execute | POST | 执行 |
| /api/agents | GET/POST | Agent 列表/创建 |
| /api/agents/:id/run | POST | 运行 Agent |
| /api/orchestration/validate | POST | 校验 YAML |
| /api/orchestration/execute | POST | 执行编排 |
| /api/projects | GET/POST | 项目列表/创建 |
| /api/projects/:id/execute | POST | 执行项目 |
| /api/metrics/:type/:id | GET | 实体监控 |
| /api/metrics/global | GET | 全局监控(admin) |
