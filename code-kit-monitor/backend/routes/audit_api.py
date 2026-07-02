"""审计日志 API — 查询 + 统计."""

from fastapi import APIRouter, Request, HTTPException, Query
from auth import get_current_user, has_permission, read_audit, audit_stats

router = APIRouter()


@router.get("/api/audit")
async def get_audit_log(
    request: Request,
    user_id: str | None = Query(default=None),
    action: str | None = Query(default=None),
    days: int | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
):
    """查询审计日志（admin 专属）。"""
    user = get_current_user(request)
    if not has_permission(user, "audit:view"):
        raise HTTPException(status_code=403, detail="需要权限: audit:view")

    entries = read_audit(limit=limit, user_id=user_id, action=action, days=days)
    return {"entries": entries, "total": len(entries)}


@router.get("/api/audit/stats")
async def get_audit_stats(request: Request, days: int = Query(default=7)):
    """审计日志统计摘要（admin 专属）。"""
    user = get_current_user(request)
    if not has_permission(user, "audit:view"):
        raise HTTPException(status_code=403, detail="需要权限: audit:view")

    return audit_stats(days=days)


@router.get("/api/audit/actions")
async def get_audit_actions(request: Request):
    """返回所有审计动作类型列表。"""
    user = get_current_user(request)
    if not has_permission(user, "audit:view"):
        raise HTTPException(status_code=403, detail="需要权限: audit:view")

    return {
        "actions": [
            {"value": "user:create", "label": "创建用户"},
            {"value": "user:update", "label": "更新用户"},
            {"value": "user:delete", "label": "删除用户"},
            {"value": "permission:grant", "label": "授予权限"},
            {"value": "permission:revoke", "label": "撤销权限"},
            {"value": "project:delete", "label": "删除项目/产物"},
            {"value": "project:write", "label": "修改配置"},
            {"value": "workflow:stop", "label": "停止流程"},
        ]
    }
