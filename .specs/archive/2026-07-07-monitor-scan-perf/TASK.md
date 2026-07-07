# TASK — code-kit-monitor 数据获取性能优化

> Change: `monitor-scan-perf` | 路径: 最短 | 波次数: 1

## 波次图

```
Wave 1 (parallel): T01[P], T02[P]
```

所有 task 互不依赖，可并行执行。

---

<task id="T01" parallel="true">
  <auto>true</auto>
  <name>Scanner 单例化 + 去除 force=True</name>
  <read_files>
    code-kit-monitor/backend/scanner.py
    code-kit-monitor/backend/runtime/scanner.py
    code-kit-monitor/backend/routes/changes.py
    code-kit-monitor/backend/routes/change_detail.py
    code-kit-monitor/backend/routes/health.py
    code-kit-monitor/backend/routes/search.py
    code-kit-monitor/backend/routes/runtime_api.py
  </read_files>
  <write_files>
    code-kit-monitor/backend/scanner.py
    code-kit-monitor/backend/runtime/scanner.py
    code-kit-monitor/backend/routes/changes.py
    code-kit-monitor/backend/routes/change_detail.py
    code-kit-monitor/backend/routes/health.py
    code-kit-monitor/backend/routes/search.py
    code-kit-monitor/backend/routes/runtime_api.py
  </write_files>
  <action>
    1. scanner.py: _count_tasks 签名改为接受 content 参数避免重复读文件；scan() 循环中 TASK.md 只读一次，门禁统计只扫 SUMMARY/REVIEW/TEST；末尾加 get_file_scanner() 单例
    2. runtime/scanner.py: 末尾加 get_runtime_scanner() 单例
    3. changes.py/change_detail.py/health.py/search.py: 替换 FileScanner() → get_file_scanner()，去除 force=True
    4. runtime_api.py: 替换 RuntimeScanner() → get_runtime_scanner()
    5. _next_action 中 _count_tasks 调用适配新签名（change_dir= 关键字）
  </action>
  <verify>
    curl -s http://localhost:8000/api/changes | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'changes' in d and 'summary' in d, 'FAIL'"
    curl -s http://localhost:8000/api/health | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'consistent' in d, 'FAIL'"
    curl -s http://localhost:8000/api/search?q=test | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'results' in d, 'FAIL'"
    curl -s http://localhost:8000/api/runtime/summary | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'sessions' in d, 'FAIL'"
  </verify>
  <done>4 个核心接口正常返回，缓存命中 < 5ms，首次请求 < 50ms</done>
  <depends_on></depends_on>
</task>

<task id="T02" parallel="true">
  <auto>true</auto>
  <name>全接口回归测试</name>
  <read_files>
    code-kit-monitor/backend/routes/*.py
  </read_files>
  <write_files>
  </write_files>
  <action>
    验证所有受影响接口功能正常：
    - GET /api/ping
    - GET /api/changes（cold + warm cache）
    - GET /api/changes/<id>（详情含 tasks/gates/timeline）
    - GET /api/runtime/summary（cold + warm）
    - GET /api/runtime/sessions
    - GET /api/runtime/stats
    - GET /api/health
    - GET /api/search
    确认缓存命中时响应 < 5ms
  </action>
  <verify>
    python3 -c "
import urllib.request, json, time
BASE='http://localhost:8000'
# 1. ping
r=json.loads(urllib.request.urlopen(f'{BASE}/api/ping').read()); assert r['status']=='ok'
# 2. changes
r=json.loads(urllib.request.urlopen(f'{BASE}/api/changes').read()); assert 'changes' in r
cid=r['changes'][0]['id']
# 3. detail
r=json.loads(urllib.request.urlopen(f'{BASE}/api/changes/{cid}').read()); assert 'tasks' in r
# 4. runtime
r=json.loads(urllib.request.urlopen(f'{BASE}/api/runtime/summary').read()); assert 'sessions' in r
r=json.loads(urllib.request.urlopen(f'{BASE}/api/runtime/sessions').read()); assert 'sessions' in r
r=json.loads(urllib.request.urlopen(f'{BASE}/api/runtime/stats').read()); assert 'summary' in r
# 5. health
r=json.loads(urllib.request.urlopen(f'{BASE}/api/health').read()); assert 'consistent' in r
# 6. search
r=json.loads(urllib.request.urlopen(f'{BASE}/api/search?q=code').read()); assert 'results' in r
print('ALL 8 ENDPOINTS PASSED')
"
  </verify>
  <done>全部 8 个接口返回正常，数据完整</done>
  <depends_on></depends_on>
</task>
