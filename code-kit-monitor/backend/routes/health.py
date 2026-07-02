"""GET /api/health — 数据一致性校验."""
import os
from fastapi import APIRouter
from scanner import FileScanner, _count_tasks
from config import SPECS_DIR
from parsers.section import SectionParser

router = APIRouter()
_scanner = FileScanner()


@router.get("/api/health")
async def health_check():
    issues = []
    for c in _scanner.scan(force=True):
        change_dir = os.path.join(SPECS_DIR, c.id)
        # TASK 数 vs SUMMARY 数
        total_tasks, _ = _count_tasks(change_dir)
        summaries = len([f for f in c.artifacts if f.endswith('-SUMMARY.md')])
        if total_tasks > 0 and summaries < total_tasks:
            issues.append({"change_id": c.id, "type": "missing_summary", "detail": f"{summaries}/{total_tasks} SUMMARY files"})
        # 前端项目缺 UI-DESIGN
        if 'DESIGN.md' in c.artifacts and 'UI-DESIGN.md' not in c.artifacts:
            design_path = os.path.join(change_dir, 'DESIGN.md')
            content = SectionParser.read_file(design_path)
            if '前端' in content and 'UI' in content:
                issues.append({"change_id": c.id, "type": "missing_ui_design", "detail": "前端项目缺少 UI-DESIGN.md"})
        # 缺 REQUIREMENT
        if 'CHANGE.md' in c.artifacts and 'REQUIREMENT.md' not in c.artifacts:
            issues.append({"change_id": c.id, "type": "missing_requirement", "detail": "有 CHANGE.md 但缺少 REQUIREMENT.md"})
    return {"consistent": len(issues) == 0, "issues": issues}
