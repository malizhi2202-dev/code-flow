"""Agent 编排 API — YAML 校验 + 执行."""
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from services.orchestration_parser import parse_yaml
from services.audit_service import log_audit

router = APIRouter(prefix="/api/orchestration", tags=["orchestration"])


def _user(request: Request) -> dict:
    return request.state.user


@router.post("/validate")
def api_validate_orchestration(payload: dict, request: Request = None):
    yaml_raw = payload.get("yaml_raw", "")
    if not yaml_raw:
        raise HTTPException(status_code=400, detail="yaml_raw 不能为空")
    result, errors = parse_yaml(yaml_raw)
    if errors:
        return {"valid": False, "errors": errors}
    return {"valid": True, "dag": result["dag"] if result else {}}


@router.post("/upload-yaml")
async def api_upload_yaml(file: UploadFile = File(...), request: Request = None):
    content = (await file.read()).decode("utf-8")
    result, errors = parse_yaml(content)
    if errors:
        return {"valid": False, "errors": errors, "filename": file.filename}
    user = _user(request) if request else None
    if user:
        log_audit(user["id"], user.get("name", user["id"]), "orchestration.upload", file.filename, "orchestration", "yaml uploaded", request.client.host if request.client else "127.0.0.1")
    return {"valid": True, "dag": result["dag"] if result else {}, "filename": file.filename, "parsed": result}


@router.post("/execute")
def api_execute_orchestration(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request) if request else None
    yaml_raw = payload.get("yaml_raw", "")
    if not yaml_raw:
        raise HTTPException(status_code=400, detail="yaml_raw 或 dag 不能为空")
    result, errors = parse_yaml(yaml_raw)
    if errors:
        raise HTTPException(status_code=400, detail={"valid": False, "errors": errors})
    if user:
        log_audit(user["id"], user.get("name", user["id"]), "orchestration.execute", result["metadata"]["name"], "orchestration", "execution started", request.client.host if request.client else "127.0.0.1")
    return {"status": "executing", "dag": result["dag"], "agent_count": len(result["dag"]["nodes"])}
