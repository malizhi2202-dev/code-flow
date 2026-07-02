"""增量文件扫描器 — 解析 .specs/ 目录."""
import os
import re
from dataclasses import dataclass, field
from typing import Optional
from config import SPECS_DIR

STAGES = ['0-change', '1-requirement', '2-design', '2a-ui-design', '3-task', '4-dev', '5-test', '6-review', '7-integration']
STAGE_FILES = {
    '0-change': 'CHANGE.md', '1-requirement': 'REQUIREMENT.md',
    '2-design': 'DESIGN.md', '2a-ui-design': 'UI-DESIGN.md',
    '3-task': 'TASK.md', '5-test': 'TEST.md', '6-review': 'REVIEW.md',
}
ARTIFACTS = ['CHANGE.md', 'REQUIREMENT.md', 'DESIGN.md', 'UI-DESIGN.md', 'TASK.md', 'TEST.md', 'REVIEW.md']


@dataclass
class ChangeInfo:
    id: str
    phase: str = 'unknown'
    progress: str = '0/0'
    status: str = 'normal'
    interrupted: bool = False
    interrupted_task: Optional[str] = None
    artifacts: list = field(default_factory=list)


def _phase_order(phase: str) -> int:
    try:
        return STAGES.index(phase)
    except ValueError:
        return -1


def _detect_phase(change_dir: str) -> str:
    """按产物文件存在性推断阶段."""
    found = '0-change'
    for stage, fname in STAGE_FILES.items():
        if os.path.exists(os.path.join(change_dir, fname)):
            found = stage
    if os.path.exists(os.path.join(change_dir, 'T01-SUMMARY.md')):
        found = '4-dev'
    return found


def _count_tasks(change_dir: str) -> tuple[int, int]:
    """统计 TASK.md 中的 task 完成情况."""
    task_file = os.path.join(change_dir, 'TASK.md')
    if not os.path.exists(task_file):
        return 0, 0
    try:
        content = open(task_file).read()
        total = len(re.findall(r'status="(pending|in_progress|done|blocked)"', content))
        done = len(re.findall(r'status="done"', content))
        return total, done
    except Exception:
        return 0, 0


def _check_interrupted(specs_dir: str, change_id: str) -> tuple[bool, Optional[str]]:
    """检查 STATE.md 中的中断任务."""
    state_file = os.path.join(specs_dir, '..', 'STATE.md')
    if not os.path.exists(state_file):
        return False, None
    try:
        content = open(state_file).read()
        if change_id in content and ('中断任务' in content or 'interrupted' in content.lower()):
            m = re.search(r'中断任务.*?[:：]\s*(\S+)', content)
            return True, m.group(1) if m else 'unknown'
    except Exception:
        pass
    return False, None


class FileScanner:
    """增量文件扫描器."""

    def __init__(self, specs_dir: str = SPECS_DIR):
        self.specs_dir = specs_dir
        self._mtime_cache: dict[str, float] = {}
        self._cache: list[ChangeInfo] = []
        self._cache_valid = False

    def scan(self, force: bool = False) -> list[ChangeInfo]:
        if self._cache_valid and not force:
            return self._cache
        changes = []
        if not os.path.isdir(self.specs_dir):
            self._cache = changes
            self._cache_valid = True
            return changes
        for entry in sorted(os.listdir(self.specs_dir)):
            path = os.path.join(self.specs_dir, entry)
            if not os.path.isdir(path) or entry.startswith('.') or entry in ('archive', 'adr', 'health'):
                continue
            total, done = _count_tasks(path)
            interrupted, interrupted_task = _check_interrupted(self.specs_dir, entry)
            phase = _detect_phase(path)
            artifacts = [f for f in ARTIFACTS if os.path.exists(os.path.join(path, f))]
            artifacts += [f for f in os.listdir(path) if f.endswith('-SUMMARY.md')]
            changes.append(ChangeInfo(
                id=entry, phase=phase,
                progress=f'{done}/{total}',
                status='interrupted' if interrupted else 'normal',
                interrupted=interrupted, interrupted_task=interrupted_task,
                artifacts=sorted(artifacts),
            ))
        changes.sort(key=lambda c: (-c.interrupted, _phase_order(c.phase)))
        self._cache = changes
        self._cache_valid = True
        return changes

    def get_change(self, change_id: str) -> Optional[ChangeInfo]:
        for c in self.scan():
            if c.id == change_id:
                return c
        return None
