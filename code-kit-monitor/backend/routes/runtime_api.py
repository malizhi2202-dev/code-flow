"""GET /api/runtime/* — 双路数据：埋点 + 适配器."""
from fastapi import APIRouter, Query
from runtime.scanner import RuntimeScanner

router = APIRouter()
_scanner = RuntimeScanner()


@router.get("/api/runtime/summary")
async def runtime_summary():
    return _scanner.summary()


@router.get("/api/runtime/sessions")
async def runtime_sessions():
    return {"sessions": _scanner.sessions()}


@router.get("/api/runtime/stats")
async def runtime_stats(
    granularity: str = Query(default="hour"),
    days: int = Query(default=7),
):
    return _scanner.stats(granularity=granularity, days=days)


@router.get("/api/runtime/sessions/{session_id}")
async def runtime_session_detail(session_id: str):
    events = [e for e in _scanner.scan() if (e.get('change_id') or e.get('agent')) == session_id]
    if not events:
        return {"error": "not found"}
    total_input = sum(e.get('tokens_input', 0) for e in events)
    total_output = sum(e.get('tokens_output', 0) for e in events)
    return {
        "session_id": session_id,
        "agent": events[0].get('agent', ''),
        "timestamp": events[0].get('timestamp', ''),
        "stage": events[0].get('stage', ''),
        "change_id": events[0].get('change_id', ''),
        "input_tokens": total_input,
        "output_tokens": total_output,
        "total_tokens": total_input + total_output,
        "message_count": len(events),
        "events": [{
            "timestamp": e.get('timestamp', ''),
            "stage": e.get('stage', ''),
            "model": e.get('model', ''),
            "tokens_input": e.get('tokens_input', 0),
            "tokens_output": e.get('tokens_output', 0),
            "skills": e.get('skills', []),
            "mcps": e.get('mcps', []),
            "summary": e.get('summary', '')[:200],
            "source": e.get('_source', 'unknown'),
        } for e in events],
    }
