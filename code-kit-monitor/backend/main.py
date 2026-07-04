"""code-kit-monitor FastAPI 入口."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config import CORS_ORIGIN, HOST, PORT
from auth import get_user, load_users
from routes.changes import router as changes_router
from routes.change_detail import router as detail_router
from routes.artifact import router as artifact_router
from routes.health import router as health_router
from routes.token_usage import router as token_router
from routes.git_safety import router as git_router
from routes.search import router as search_router
from routes.roles_api import router as roles_router
from routes.admin_api import router as admin_router
from routes.runtime_api import router as runtime_router
from routes.auth_api import router as auth_router
from routes.audit_api import router as audit_router
from routes.tools_api import router as tools_router
from routes.workflows_api import router as workflows_router
from routes.agents_api import router as agents_router
from routes.orchestration_api import router as orchestration_router
from routes.metrics_api import router as metrics_router
from routes.projects_api import router as projects_router
from routes.roles_custom_api import router as roles_custom_router
from routes.assembly_api import router as assembly_router
from routes.agent_knowledge_api import router as agent_knowledge_router
from routes.chat_api import router as chat_router
from routes.channel_api import router as channel_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[monitor] 启动中... 数据源: .specs/ 扫描间隔: 5s")
    from database import init_db
    try:
        init_db()
        print("[monitor] 数据库表已就绪")
    except Exception as e:
        print(f"[monitor] 数据库初始化跳过（可能 MySQL 未启动）: {e}")
    # 启动 runtime.jsonl 文件监控器（每 30s 增量导入 code-kit 运行时数据）
    from services.runtime_watcher import start_watcher
    start_watcher()
    # 启动 metrics 模拟数据生成器（仅 METRICS_DEMO=true 时启用）
    import os
    if os.getenv("METRICS_DEMO", "").lower() in ("1", "true", "yes"):
        from services.metrics_scheduler import start_scheduler
        start_scheduler(owner_id="admin", interval_seconds=300)
        print("[monitor] 📊 演示数据生成器已启动（每 5min）")
    yield
    print("[monitor] 关闭.")


app = FastAPI(title="code-kit-monitor", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 认证中间件：读取 X-User-Id header，注入 request.state.user
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # localhost 安全检查
    host = request.client.host if request.client else "unknown"
    if host not in ("127.0.0.1", "localhost", "::1"):
        return JSONResponse({"error": "forbidden: localhost only"}, status_code=403)

    # 加载用户：从 X-User-Id header 获取
    # - 未传 header → 默认 admin（向后兼容）
    # - 传了 header 但用户不存在 → 401（安全：不静默提权）
    user_id = request.headers.get("X-User-Id")
    if user_id:
        user = get_user(user_id)
        if not user:
            return JSONResponse({"error": f"用户 '{user_id}' 不存在"}, status_code=401)
    else:
        user = get_user("admin")  # 默认 admin
    request.state.user = user
    return await call_next(request)


# 运行时 Metrics 收集中间件（兜底 — 自动追踪关键 API 调用）
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    import time
    start = time.time()
    response = await call_next(request)
    duration_ms = int((time.time() - start) * 1000)

    # 只追踪有副作用的 API（chat/run/execute）
    path = request.url.path
    method = request.method
    if method in ("POST", "PUT") and any(k in path for k in ("/chat", "/run", "/execute", "/stop")):
        try:
            from services.runtime_tracer import tracer
            user = getattr(request.state, "user", {"id": "admin"})
            # 从路径推断 entity_type 和 entity_id
            import re
            entity_type = "agent"
            entity_id = 0
            if "/agents/" in path:
                m = re.search(r'/agents/(\d+)', path)
                entity_type = "agent"
                entity_id = int(m.group(1)) if m else 0
            elif "/projects/" in path:
                m = re.search(r'/projects/(\d+)', path)
                entity_type = "project"
                entity_id = int(m.group(1)) if m else 0
            elif "/orchestration/" in path:
                entity_type = "orchestration"
                m = re.search(r'/orchestration/(\d+)', path)
                entity_id = int(m.group(1)) if m else 0

            tracer.trace_model_call(
                entity_type=entity_type, entity_id=entity_id,
                owner_id=user.get("id", "admin"),
                model_name="auto-traced",
                prompt_tokens=0, completion_tokens=0,
                duration_ms=duration_ms,
                tool_name=path.split("/")[-1] if "/" in path else path,
                tool_calls=1,
                status="success" if response.status_code < 400 else "error",
            )
        except Exception:
            pass  # 追踪失败不影响业务

    return response


app.include_router(changes_router)
app.include_router(detail_router)
app.include_router(artifact_router)
app.include_router(health_router)
app.include_router(token_router)
app.include_router(git_router)
app.include_router(search_router)
app.include_router(roles_router)
app.include_router(admin_router)
app.include_router(runtime_router)
app.include_router(auth_router)
app.include_router(audit_router)
app.include_router(tools_router)
app.include_router(workflows_router)
app.include_router(agents_router)
app.include_router(orchestration_router)
app.include_router(metrics_router)
app.include_router(projects_router)
app.include_router(roles_custom_router)
app.include_router(agent_knowledge_router)
app.include_router(assembly_router)
app.include_router(chat_router)
app.include_router(channel_router)


@app.get("/api/ping")
async def ping():
    return {"status": "ok", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
