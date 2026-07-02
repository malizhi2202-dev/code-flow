"""Gate 投票记录解析器."""
import re
from typing import Optional


def parse_gates(content: str) -> list[dict]:
    """解析 🗳️ 投票记录块."""
    gates = []
    pattern = re.compile(r'🗳️\s*(.+?)[:：]\s*(.+?)(?=\n\n|$)(.*?)(?:结果[:：]\s*(.+?)(?:\n|$))?', re.DOTALL)
    for match in pattern.finditer(content):
        gate_name = match.group(1).strip()
        question = match.group(2).strip()
        votes_block = match.group(3).strip()
        result = match.group(4).strip() if match.group(4) else None
        votes = []
        for line in votes_block.split('\n'):
            vm = re.match(r'\s*(🟫|🟦|🟩|🔴)\s*(.+?)[:：]\s*(✅|❌|⚪)\s*(.*)', line)
            if vm:
                votes.append({'role': vm.group(2).strip(), 'vote': vm.group(3).strip(), 'reason': vm.group(4).strip()})
        if votes:
            gates.append({'name': gate_name, 'question': question, 'votes': votes, 'result': result})
    return gates


def change_has_gate_approved(content: str, gate_name: str) -> Optional[bool]:
    """检查某个 change 的 gate 是否通过."""
    gates = parse_gates(content)
    for g in gates:
        if gate_name in g['name']:
            result = g.get('result', '')
            return '通过' in result
    return None
