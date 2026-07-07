# TASK — agent_probes 探针大表性能优化

| 字段 | 值 |
|---|---|
| **Change ID** | `fix-probe-bloat` |
| **波次数** | 2 |

## 波次图

```
Wave 1 (parallel): T01[P]
Wave 2:            T02 (depends on T01)
```

---

<task id="T01" parallel="true">
  <name>新建 agent_probe_latest 模型 + 表</name>
  <read_files>
    backend/models/agent_probe.py
    backend/models/__init__.py
    backend/database.py
  </read_files>
  <write_files>
    backend/models/agent_probe_latest.py
    backend/models/__init__.py
  </write_files>
  <action>
    新建 AgentProbeLatest 模型，字段同 AgentProbe 但无自增 ID，
    用 agent_id 做主键（每个 agent 只存最新一条探针状态）。
    在 models/__init__.py 中导入。
  </action>
  <verify>python -c "from models.agent_probe_latest import AgentProbeLatest; print('OK')"; python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine); from sqlalchemy import inspect; print([t for t in inspect(engine).get_table_names() if 'probe' in t])"</verify>
  <done>agent_probe_latest 表创建成功，出现在数据库表列表中</done>
  <depends_on></depends_on>
</task>

<task id="T02" parallel="false">
  <name>probe service upsert + API 改读状态表</name>
  <read_files>
    backend/services/agent_probe_service.py
    backend/routes/control_plane_api.py
  </read_files>
  <write_files>
    backend/services/agent_probe_service.py
    backend/routes/control_plane_api.py
  </write_files>
  <action>
    _save_probe: INSERT agent_probes（保留历史）+ upsert agent_probe_latest（只留最新）。
    control_plane_api.py probes 端点：从 agent_probe_latest JOIN agents 查询，
    去掉 GROUP BY/MAX/subquery。agent_probes 表加 created_at 索引。
  </action>
  <verify>curl -s -o /dev/null -w "%{http_code} %{time_total}s" --max-time 3 http://localhost:8000/api/control-plane/probes | awk '$1==200 && $2<0.1 {print "PASS"; exit} {print "FAIL: "$0}'</verify>
  <done>probes API 响应 200 且耗时 <100ms</done>
  <depends_on>T01</depends_on>
</task>
