# T01-SUMMARY — AgentProbeLatest 模型

## 做了什么
新建 `agent_probe_latest` 表，复合主键 `(agent_id, probe_type)`，每 agent 只存最新一条探针状态。

## 改动文件
- `models/agent_probe_latest.py`（新增，20 行）
- `models/__init__.py`（+1 行 import）

## verify
```
import OK
probe tables: ['agent_probe_latest', 'agent_probes']
```

## 越界检查 ✅ 0 越界
