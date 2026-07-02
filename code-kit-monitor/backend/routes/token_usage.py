"""GET /api/token-usage — Token 聚合."""
import os
import re
from datetime import date
from fastapi import APIRouter
from config import SPECS_DIR

router = APIRouter()


def _scan_token_usage() -> dict:
    today = date.today().isoformat()
    total_today = 0
    per_change = {}
    if not os.path.isdir(SPECS_DIR):
        return {"total_today": 0, "per_change": {}}
    for entry in os.listdir(SPECS_DIR):
        path = os.path.join(SPECS_DIR, entry)
        if not os.path.isdir(path) or entry.startswith('.'):
            continue
        change_total = 0
        for fname in os.listdir(path):
            if not fname.endswith('-SUMMARY.md') and fname != 'CHANGE.md':
                continue
            try:
                content = open(os.path.join(path, fname), encoding='utf-8').read()
                tokens = re.findall(r'(\d[\d,]*)\s*(?:token|k)', content, re.IGNORECASE)
                for t in tokens:
                    change_total += int(t.replace(',', ''))
            except Exception:
                pass
        if change_total > 0:
            per_change[entry] = change_total
            total_today += change_total
    return {"total_today": total_today, "per_change": per_change, "date": today}


@router.get("/api/token-usage")
async def token_usage():
    return _scan_token_usage()
