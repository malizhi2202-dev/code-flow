"""GET /api/changes/<id>/<artifact> — 产物内容."""
import os
from fastapi import APIRouter, HTTPException
from config import SPECS_DIR

router = APIRouter()
SAFE_NAMES = {'CHANGE', 'REQUIREMENT', 'DESIGN', 'UI-DESIGN', 'TASK', 'TEST', 'REVIEW'}


@router.get("/api/changes/{change_id}/{artifact}")
async def get_artifact(change_id: str, artifact: str):
    if artifact.upper() not in SAFE_NAMES:
        raise HTTPException(400, f"unknown artifact: {artifact}")
    if '..' in change_id or '/' in change_id:
        raise HTTPException(400, "invalid change_id")
    change_dir = os.path.join(SPECS_DIR, change_id)
    if not os.path.isdir(change_dir):
        raise HTTPException(404, f"change '{change_id}' not found")
    for fname in os.listdir(change_dir):
        if artifact.upper() in fname.upper() and fname.endswith('.md'):
            path = os.path.join(change_dir, fname)
            content = open(path, encoding='utf-8').read()
            return {"artifact": fname, "content": content, "size": len(content)}
    raise HTTPException(404, f"artifact '{artifact}' not found in change '{change_id}'")
