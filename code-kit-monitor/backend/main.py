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


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[monitor] 启动中... 数据源: .specs/ 扫描间隔: 5s")
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


@app.get("/api/ping")
async def ping():
    return {"status": "ok", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
