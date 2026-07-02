"""TASK.md XML 解析器."""
import re
import xml.etree.ElementTree as ET
from typing import Optional


def _extract_waves(content: str) -> list[list[str]]:
    """提取波次划分."""
    waves = []
    for line in content.split('\n'):
        m = re.match(r'Wave \d+.*?:\s*(.+)', line)
        if m:
            ids = re.findall(r'T\d+(?:-?\d+)?', m.group(1))
            if ids:
                waves.append(ids)
    return waves


def parse_tasks(content: str) -> list[dict]:
    """解析 <task> 块 → 结构化数据."""
    tasks = []
    pattern = re.compile(r'<task\b[^>]*>(.*?)</task>', re.DOTALL)
    for match in pattern.finditer(content):
        block = match.group(0)
        try:
            root = ET.fromstring(block)
        except ET.ParseError:
            cleaned = re.sub(r'<!--.*?-->', '', block, flags=re.DOTALL)
            cleaned = re.sub(r'&(?!amp;|lt;|gt;|quot;)', '&amp;', cleaned)
            try:
                root = ET.fromstring(cleaned)
            except ET.ParseError:
                continue
        task = {
            'id': root.get('id', ''),
            'parallel': root.get('parallel', 'false') == 'true',
            'status': root.get('status', 'pending'),
            'name': '',
            'read_files': [], 'write_files': [],
            'action': '', 'verify': '', 'done': '', 'auto': True,
            'depends_on': [],
        }
        for child in root:
            tag = child.tag
            text = (child.text or '').strip()
            if tag in ('read_files', 'write_files'):
                task[tag] = [l.strip() for l in text.split('\n') if l.strip()]
            elif tag == 'depends_on':
                task['depends_on'] = [d.strip() for d in text.split(',') if d.strip()]
            elif tag == 'auto':
                task['auto'] = text.lower() == 'true'
            elif tag in ('name', 'action', 'verify', 'done'):
                task[tag] = text
        if task['id']:
            tasks.append(task)
    return tasks


def get_wave_for_task(task_id: str, content: str) -> Optional[int]:
    """返回 task 所属 wave 编号."""
    waves = _extract_waves(content)
    for i, wave_ids in enumerate(waves, 1):
        if task_id in wave_ids:
            return i
    return None
