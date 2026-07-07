# T02-SUMMARY — probe service + API 改造

## 做了什么
- `agent_probe_service.py`：INSERT 历史表 + upsert 状态表
- `control_plane_api.py`：probes 端点从 agent_probe_latest 直读，去掉 GROUP BY/subquery

## 改动文件
- `services/agent_probe_service.py`（+15 -11 行）
- `routes/control_plane_api.py`（+14 -26 行）

## verify
```
probes #1: 200 0.089s
probes #2: 200 0.020s  
probes #3: 200 0.019s
agents: 53
```

## 越界检查 ✅ 0 越界
