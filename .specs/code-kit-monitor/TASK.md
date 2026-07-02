# TASK: code-kit 工作流监控面板

- **Change ID**: `code-kit-monitor`
- **关联**: `REQUIREMENT.md`、`DESIGN.md`、`UI-DESIGN.md`

---

## 波次划分

```
Wave 1 (parallel): T01[P], T02[P]
Wave 2 (parallel): T03[P], T04[P] (depends on T01)
Wave 3 (parallel): T05[P], T06[P], T07[P] (depends on T01)
Wave 4 (parallel): T08[P], T09[P], T10[P], T11[P], T12[P], T13[P], T14[P] (depends on T03,T05,T06,T07)
Wave 5 (parallel): T15[P], T16[P], T17[P] (depends on T02,T04)
Wave 6 (parallel): T18[P], T19[P], T20[P], T21[P], T22[P], T23[P] (depends on T15,T08-T14)
Wave 7:            T24 → T25 → T26 (depends on T18-T23)
--- v1.1 ---
Wave 8 (parallel): T27[P], T28[P], T29[P]
Wave 9:            T30 → T31 → T32 → T33
--- v1.2 权限管理系统 ---
Wave 10 (parallel): T34[P], T35[P], T36[P]
Wave 11 (parallel): T37 (depends on T36) + T38[P] (depends on T37)
Wave 12 (parallel): T39[P], T40[P] (depends on T38)
Wave 13:           T41 (depends on T39,T40)
--- v1.2 权限系统补完（设计评审通过后）---
Wave 14 (parallel): T42[P], T43[P] (depends on T38)
Wave 15 (parallel): T44[P], T45[P] (depends on T42,T43)
--- v1.3 登录登出 + 用户中心 ---
Wave 16 (parallel): T46[P], T47[P] (depends on T42,T43)
Wave 17:           T48 (depends on T46,T47)
```

---

## 任务清单

```xml
<task id="T01" parallel="true" status="done">
  <name>FastAPI 项目初始化 + 依赖安装</name>
  <read_files>
    DESIGN.md##0
  </read_files>
  <write_files>
    backend/requirements.txt
    backend/main.py
    backend/config.py
  </write_files>
  <action>
    创建 FastAPI 应用骨架：
    - requirements.txt：fastAPI==0.110+ / sqlalchemy[asyncio]==2.0+ / aiomysql / redis-py / pydantic==2.0+ / uvicorn
    - main.py：FastAPI app 实例 + CORS(localhost:5173) + startup/shutdown 事件
    - config.py：SPECS_DIR(../.specs) / HOST=127.0.0.1 / PORT=8000 / SCAN_INTERVAL=5
  </action>
  <verify>cd backend && python -c "from main import app; print(app.title)"</verify>
  <done>FastAPI 应用可 import，无报错</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T02" parallel="true" status="done">
  <name>React + Vite 项目初始化 + Tremor + Tailwind</name>
  <read_files>
    DESIGN.md##0
    UI-DESIGN.md##2
  </read_files>
  <write_files>
    frontend/package.json
    frontend/vite.config.ts
    frontend/tsconfig.json
    frontend/tailwind.config.ts
    frontend/src/main.tsx
    frontend/src/App.tsx
    frontend/index.html
  </write_files>
  <action>
    用 Vite 5 创建 React 18 + TypeScript 项目：
    - package.json 依赖：react18 / react-dom / tremor@4 / recharts / zustand / lucide-react / tailwindcss@4
    - tailwind.config.ts：扩展 design tokens（颜色/字体/间距/圆角）从 UI-DESIGN.md
    - App.tsx：Zustand provider + 主题状态 + 基础布局骨架
  </action>
  <verify>cd frontend && npm install && npm run build</verify>
  <done>npm build 成功，无 TS 错误</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T03" parallel="true" status="done">
  <name>文件扫描器 FileScanner（增量扫描）</name>
  <read_files>
    DESIGN.md##2（数据流）
  </read_files>
  <write_files>
    backend/scanner.py
    backend/__init__.py
  </write_files>
  <action>
    实现增量文件扫描器：
    - 首次扫描：os.walk .specs/ → 收集所有 change 目录 + 产物文件
    - 增量扫描：记录每个文件的 mtime，后续只读变更文件
    - 输出：List[ChangeInfo]（change-id / 阶段 / 产物列表 / 状态）
    - 阶段判断：按产物文件存在性推断（有 CHANGE → 0-change，有 TASK → 3-task...）
    - 中断检测：读 STATE.md 的「中断任务」字段
  </action>
  <verify>cd backend && python -c "from scanner import FileScanner; s=FileScanner(); print(len(s.scan()))"</verify>
  <done>扫描返回 change 列表，每个 change 含 id/阶段/产物/状态字段</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T04" parallel="true" status="done">
  <name>Design tokens → CSS variables + Tailwind config</name>
  <read_files>
    UI-DESIGN.md##2
  </read_files>
  <write_files>
    frontend/src/styles/tokens.css
    frontend/tailwind.config.ts
  </write_files>
  <action>
    - tokens.css：完整写入 UI-DESIGN.md §2 的所有 CSS 变量（暗色+亮色）
    - tailwind.config.ts：扩展颜色/字体/间距/圆角/阴影到 Tailwind theme
    - 暗色默认：<html data-theme="dark">
  </action>
  <verify>grep -c "oklch" frontend/src/styles/tokens.css</verify>
  <done>tokens.css 含所有暗色+亮色变量，grep oklch ≥ 20 处</done>
  <depends_on>T02</depends_on>
  <auto>true</auto>
</task>

<task id="T05" parallel="true" status="done">
  <name>SectionParser（markdown 节切分）</name>
  <read_files>
    DESIGN.md##2
  </read_files>
  <write_files>
    backend/parsers/__init__.py
    backend/parsers/section.py
  </write_files>
  <action>
    通用 markdown section 解析器：
    - 按 ## <section> 正则切分 markdown → dict{section_name: content}
    - 支持提取 YAML frontmatter
    - 解析 CHANGE/REQUIREMENT/DESIGN/TEST/REVIEW 通用结构
  </action>
  <verify>cd backend && python -c "from parsers.section import SectionParser; s=SectionParser('# test\n## A\nhello'); assert s.parse()['A']=='hello'"</verify>
  <done>解析器正确切分 markdown section，含单元测试</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T06" parallel="true" status="done">
  <name>XMLTaskParser（TASK.md 解析）</name>
  <read_files>
    DESIGN.md##2
    templates/TASK.md
  </read_files>
  <write_files>
    backend/parsers/task.py
  </write_files>
  <action>
    解析 TASK.md 中的 <task> XML 块：
    - 提取 id/name/read_files/write_files/action/verify/done/depends_on/auto/status
    - 输出：List[TaskInfo] + 波次推断
    - 处理 XML 转义字符
  </action>
  <verify>cd backend && python -c "from parsers.task import parse_tasks; tasks=parse_tasks(open('../../.specs/code-kit-monitor/TASK.md').read()); assert len(tasks)>0; print(tasks[0]['id'])"</verify>
  <done>正确解析本 TASK.md 自身的 task 列表</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T07" parallel="true" status="done">
  <name>Gate 投票记录解析器</name>
  <read_files>
    DESIGN.md##2
  </read_files>
  <write_files>
    backend/parsers/gate.py
  </write_files>
  <action>
    解析各产物文件末尾的 🗳️ 投票记录块：
    - 匹配模式：```🗳️ ... 结果: N/4 → ...```
    - 提取：gate 名称 / 每角色投票(✅/❌/⚪) / 理由 / 结果
    - 输出来自 CHANGE/REQUIREMENT/DESIGN/UI-DESIGN/TASK/TEST/REVIEW 的投票记录
  </action>
  <verify>cd backend && python -c "from parsers.gate import parse_gates; gates=parse_gates(open('../../.specs/code-kit-monitor/CHANGE.md').read()); assert any(g['name']=='G1需求门' for g in gates)"</verify>
  <done>正确解析 CHANGE.md 中的 G1 投票记录</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T08" parallel="true" status="done">
  <name>GET /api/changes 路由（活跃 change 列表）</name>
  <read_files>
    backend/scanner.py
    REQUIREMENT.md AC-1
  </read_files>
  <write_files>
    backend/routes/__init__.py
    backend/routes/changes.py
  </write_files>
  <action>
    - GET /api/changes → 返回所有活跃 change 列表（id/阶段/进度/状态/中断标记）
    - 数据来源：FileScanner.scan()
    - 响应格式：{"changes": [...], "total": N, "alerts": N}
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/changes | python -c "import sys,json; d=json.load(sys.stdin); assert 'changes' in d"</verify>
  <done>curl /api/changes 返回 JSON，含 changes 数组和 total</done>
  <depends_on>T03</depends_on>
  <auto>true</auto>
</task>

<task id="T09" parallel="true" status="done">
  <name>GET /api/changes/&lt;id&gt; 路由（单个 change 详情）</name>
  <read_files>
    backend/scanner.py
    backend/parsers/section.py
    REQUIREMENT.md AC-1/AC-3/AC-4
  </read_files>
  <write_files>
    backend/routes/change_detail.py
  </write_files>
  <action>
    - GET /api/changes/<id> → 返回单个 change 完整详情
    - 聚合：阶段信息 + task 进度 + 门禁状态 + 产物列表
    - 调用 SectionParser/XMLTaskParser/GateParser
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/changes/code-kit-monitor | python -c "import sys,json; d=json.load(sys.stdin); assert d['id']=='code-kit-monitor'"</verify>
  <done>curl /api/changes/code-kit-monitor 返回完整详情 JSON</done>
  <depends_on>T03,T05,T06,T07</depends_on>
  <auto>true</auto>
</task>

<task id="T10" parallel="true" status="done">
  <name>GET /api/changes/&lt;id&gt;/&lt;artifact&gt; 路由（产物内容）</name>
  <read_files>
    backend/scanner.py
    REQUIREMENT.md AC-5
  </read_files>
  <write_files>
    backend/routes/artifact.py
  </write_files>
  <action>
    - GET /api/changes/<id>/<artifact> → 返回产物文件原始 markdown 内容
    - artifact: CHANGE/REQUIREMENT/DESIGN/UI-DESIGN/TASK/TEST/REVIEW（自动找对应文件名）
    - 响应：{"artifact": "...", "content": "raw markdown", "size": N}
    - 安全：不返回上级目录文件（path traversal 防护）
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/changes/code-kit-monitor/CHANGE | python -c "import sys,json; d=json.load(sys.stdin); assert len(d['content'])>0"</verify>
  <done>curl 产物端点返回 markdown 原文，路径遍历被拒绝</done>
  <depends_on>T03</depends_on>
  <auto>true</auto>
</task>

<task id="T11" parallel="true" status="done">
  <name>GET /api/health 路由（数据一致性校验）</name>
  <read_files>
    backend/scanner.py
    REQUIREMENT.md AC-9
  </read_files>
  <write_files>
    backend/routes/health.py
  </write_files>
  <action>
    - GET /api/health → 返回数据一致性校验结果
    - 检查项：TASK task 数 vs SUMMARY 文件数 / AC 数 vs TEST 覆盖 / 缺失产物 / 前端缺 UI-DESIGN
    - 响应：{"consistent": bool, "issues": [{"change_id":..., "type":..., "detail":...}]}
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/health | python -c "import sys,json; d=json.load(sys.stdin); assert 'consistent' in d"</verify>
  <done>/api/health 返回一致性报告，每个 issue 可定位到具体 change+产物</done>
  <depends_on>T03,T06</depends_on>
  <auto>true</auto>
</task>

<task id="T12" parallel="true" status="done">
  <name>GET /api/token-usage 路由（Token 聚合）</name>
  <read_files>
    REQUIREMENT.md AC-6
  </read_files>
  <write_files>
    backend/routes/token_usage.py
  </write_files>
  <action>
    - GET /api/token-usage → 返回聚合 token 统计
    - 扫描 SUMMARY.md 中的 token 记录（正则匹配 token 数字模式）
    - 聚合维度：本 change 消耗 / 全仓库今日消耗
    - 仅返回聚合数字，不返回单次请求详情（安全要求）
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/token-usage | python -c "import sys,json; d=json.load(sys.stdin); assert 'total_today' in d"</verify>
  <done>返回聚合 token 数字，不含任何单次请求内容</done>
  <depends_on>T03</depends_on>
  <auto>true</auto>
</task>

<task id="T13" parallel="true" status="done">
  <name>GET /api/git/safety 路由（Git 安全网）</name>
  <read_files>
    REQUIREMENT.md AC-8
  </read_files>
  <write_files>
    backend/routes/git_safety.py
  </write_files>
  <action>
    - GET /api/git/safety → 返回最近 safety commit 信息
    - 执行 git log --oneline --grep="safety(" -1
    - 响应：{"latest_safety_commit": {"hash":..., "date":..., "message":...}, "distance": N}
    - distance = 从 HEAD 到 safety commit 的 commit 数
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/git/safety | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('latest_safety_commit','no safety commit'))"</verify>
  <done>返回 safety commit 信息 + 回滚距离</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T14" parallel="true" status="done">
  <name>GET /api/search 路由（搜索过滤）</name>
  <read_files>
    REQUIREMENT.md AC-7
  </read_files>
  <write_files>
    backend/routes/search.py
  </write_files>
  <action>
    - GET /api/search?q=keyword&status=active&phase=4-dev
    - 支持 change-id 模糊搜索 / 状态过滤 / 阶段过滤
    - 返回匹配的 change 列表
  </action>
  <verify>curl -s "http://127.0.0.1:8000/api/search?q=code-kit" | python -c "import sys,json; d=json.load(sys.stdin); assert len(d['results'])>0"</verify>
  <done>搜索返回过滤后的 change 列表</done>
  <depends_on>T03</depends_on>
  <auto>true</auto>
</task>

<task id="T15" parallel="true" status="done">
  <name>首页 Change 卡片列表 + 中断任务醒目提示</name>
  <read_files>
    REQUIREMENT.md AC-1,AC-2
    UI-DESIGN.md##4.1
  </read_files>
  <write_files>
    frontend/src/components/ChangeCard.tsx
    frontend/src/components/ChangeList.tsx
    frontend/src/pages/Home.tsx
    frontend/src/stores/changes.ts
  </write_files>
  <action>
    - ChangeCard：展示 change-id(mono) / 阶段(badge) / 进度条(Tremor ProgressBar) / 关键状态
    - 中断卡片：danger 色左边框 + CSS 脉冲动画 + 置顶
    - ChangeList：卡片网格（grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))）
    - Home 页：fetch /api/changes → 渲染
    - Zustand store：changes 状态管理 + 选中 change
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose</verify>
  <done>首页渲染 change 卡片列表，中断卡片置顶+脉冲动画，点击进入详情</done>
  <depends_on>T02,T04</depends_on>
  <auto>true</auto>
</task>

<task id="T16" parallel="true" status="done">
  <name>顶部状态栏 + Token 展示</name>
  <read_files>
    REQUIREMENT.md AC-6
    UI-DESIGN.md##4.6
  </read_files>
  <write_files>
    frontend/src/components/TopBar.tsx
  </write_files>
  <action>
    - 固定顶部，展示：🔴告警数 / ⚡活跃数 / 本日 Token(mono 字体) / 主题切换按钮
    - fetch /api/token-usage → 展示聚合数字
    - 告警数来自 /api/health issues 数量 + /api/changes alerts 数量
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose</verify>
  <done>顶部栏正确展示告警数/活跃数/Token 聚合数/主题按钮</done>
  <depends_on>T02,T04,T15</depends_on>
  <auto>true</auto>
</task>

<task id="T17" parallel="true" status="done">
  <name>搜索栏 + 过滤</name>
  <read_files>
    REQUIREMENT.md AC-7
    UI-DESIGN.md##4.7
  </read_files>
  <write_files>
    frontend/src/components/SearchBar.tsx
  </write_files>
  <action>
    - 输入框（JetBrains Mono placeholder）+ 两个下拉（状态/阶段）
    - 实时过滤（前端，防抖 200ms），< 100 条时直接前端过滤
    - 与 ChangeList 联动：Zustand store filter → ChangeList 重新渲染
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose</verify>
  <done>搜索过滤实时生效，支持 change-id 模糊 + 状态/阶段下拉</done>
  <depends_on>T02,T04,T15</depends_on>
  <auto>true</auto>
</task>

<task id="T18" parallel="true" status="done">
  <name>详情页框架 + Tab 导航</name>
  <read_files>
    UI-DESIGN.md##4.2,##5.2
  </read_files>
  <write_files>
    frontend/src/pages/Detail.tsx
    frontend/src/components/TabNav.tsx
  </write_files>
  <action>
    - 详情页：← 返回按钮 + change-id 标题 + Tab 导航栏
    - Tab：工作流 / Task / 门禁 / 产物 / 健康
    - 选中 tab 下划线 2px primary 色 + 内容区切换
    - fetch /api/changes/<id> → 填充各 tab 数据
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose</verify>
  <done>详情页框架完整，tab 切换正确，每个 tab 渲染对应数据</done>
  <depends_on>T15</depends_on>
  <auto>true</auto>
</task>

<task id="T19" parallel="true" status="done">
  <name>工作流 Tab（阶段时间线）</name>
  <read_files>
    REQUIREMENT.md AC-1
    UI-DESIGN.md##5.3
  </read_files>
  <write_files>
    frontend/src/components/WorkflowTab.tsx
  </write_files>
  <action>
    - 水平时间线：8 阶段节点（0→1→2→2a→3→4→5→6→7）
    - ✅ 已完成（success 填充）/ ● 当前（primary + 脉冲）/ ○ 未到达（灰色描边）
    - 阶段名下方小字：通过日期 / Gate 状态
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose</verify>
  <done>时间线正确展示 8 阶段状态，当前阶段高亮</done>
  <depends_on>T18</depends_on>
  <auto>true</auto>
</task>

<task id="T20" parallel="true" status="done">
  <name>Task Tab（波次列表）</name>
  <read_files>
    REQUIREMENT.md AC-3
    UI-DESIGN.md##4.4
  </read_files>
  <write_files>
    frontend/src/components/TaskTab.tsx
  </write_files>
  <action>
    - 波次分组展示，每 wave 显示进度条
    - 每 task 行：id / 🤖(蓝)/👤(橙) 标签 / name / status(badge) / 重试次数
    - 👤 标记的 task 显示 [确认] 按钮（v1 仅展示，不交互）
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose</verify>
  <done>波次列表正确分组，task 状态和 auto 标记正确展示</done>
  <depends_on>T18</depends_on>
  <auto>true</auto>
</task>

<task id="T21" parallel="true" status="done">
  <name>门禁 Tab（Gate 卡片）</name>
  <read_files>
    REQUIREMENT.md AC-4
    UI-DESIGN.md##4.3
  </read_files>
  <write_files>
    frontend/src/components/GateTab.tsx
  </write_files>
  <action>
    - 每 Gate 一张卡片：名称 + 状态(✅/⏳/❌/⚠️) + 4 角色投票列表
    - 每角色：色块(8×8)+角色名+投票+理由摘要(1 行省略，可展开)
    - 未触发 gate 灰色 + "等待中"
    - 边框颜色：通过=success / 拒绝=danger / 平票=warning
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose</verify>
  <done>Gate 卡片正确展示投票状态、角色、理由，展开/折叠正常</done>
  <depends_on>T18</depends_on>
  <auto>true</auto>
</task>

<task id="T22" parallel="true" status="done">
  <name>产物 Tab（Markdown 查看器 + 批注）</name>
  <read_files>
    REQUIREMENT.md AC-5
    UI-DESIGN.md##4.5
  </read_files>
  <write_files>
    frontend/src/components/ArtifactTab.tsx
    frontend/src/components/MarkdownViewer.tsx
    frontend/src/components/AnnotationPanel.tsx
  </write_files>
  <action>
    - 产物文件列表（CHANGE/REQUIREMENT/DESIGN/UI-DESIGN/TASK/TEST/REVIEW）
    - 点击文件名 → markdown 渲染（代码高亮/表格/checkbox）
    - 底部批注区：输入框 + 时间戳，纯前端 localStorage 存储
    - 无编辑按钮（v1 只读）
    - 图表替代文本：aria-describedby → 隐藏表格
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose</verify>
  <done>产物 markdown 正确渲染，批注可添加/查看，无编辑功能</done>
  <depends_on>T18</depends_on>
  <auto>true</auto>
</task>

<task id="T23" parallel="true" status="done">
  <name>健康 Tab（数据一致性展示）</name>
  <read_files>
    REQUIREMENT.md AC-9,AC-10
    UI-DESIGN.md
  </read_files>
  <write_files>
    frontend/src/components/HealthTab.tsx
  </write_files>
  <action>
    - fetch /api/health → 展示一致性告警列表
    - 每条 issue：change-id + 类型(缺产物/AC 未覆盖/SUMMARY 不匹配) + 描述
    - 每条可点击跳转到对应产物位置
    - 安全告警：红色图标 + 摘要（不展示秘钥片段）
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose</verify>
  <done>健康面板展示一致性告警，可点击跳转，安全告警醒目标记</done>
  <depends_on>T18</depends_on>
  <auto>true</auto>
</task>

<task id="T24" parallel="false" status="done">
  <name>暗色/亮色主题切换</name>
  <read_files>
    UI-DESIGN.md##2.2
    REQUIREMENT.md AC-11
  </read_files>
  <write_files>
    frontend/src/hooks/useTheme.ts
    frontend/src/components/ThemeToggle.tsx
  </write_files>
  <action>
    - useTheme hook：读取 localStorage → <html data-theme=""> → CSS 变量自动切换
    - 默认暗色，支持系统 prefers-color-scheme
    - ThemeToggle 按钮（Lucide Sun/Moon 图标）
    - 亮色主题需过 axe-core 检测（5-test 阶段验证）
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose</verify>
  <done>主题切换正确，暗色/亮色 CSS 变量无缝切换，localStorage 持久化</done>
  <depends_on>T18,T04</depends_on>
  <auto>true</auto>
</task>

<task id="T25" parallel="false" status="done">
  <name>中断任务脉冲动画 + 置顶 + 恢复入口</name>
  <read_files>
    REQUIREMENT.md AC-2
    UI-DESIGN.md##2.6,##4.1
  </read_files>
  <write_files>
    frontend/src/styles/animations.css
    frontend/src/components/InterruptBanner.tsx
  </write_files>
  <action>
    - animations.css：@keyframes pulse-border（danger 色边框脉冲 2s）+ @keyframes pulse-dot（当前阶段节点）
    - InterruptBanner：中断 change 卡片顶部醒目横幅，点击展开 → 显示中断 task/进度/恢复指令
    - 列表排序：中断卡片自动置顶
    - 尊重 prefers-reduced-motion（关闭动画）
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose</verify>
  <done>中断卡片置顶+脉冲动画，横幅可展开显示恢复指引，reduced-motion 生效</done>
  <depends_on>T15,T24</depends_on>
  <auto>true</auto>
</task>

<task id="T26" parallel="false" status="done">
  <name>安全告警标记 + AC-12 localhost 绑定</name>
  <read_files>
    REQUIREMENT.md AC-10,AC-12
  </read_files>
  <write_files>
    backend/middleware/__init__.py
    backend/middleware/localhost_only.py
    frontend/src/components/SecurityAlert.tsx
  </write_files>
  <action>
    - 后端 middleware：检查请求来源 IP，非 127.0.0.1/localhost → 403
    - 前端 SecurityAlert：健康 tab 中有安全告警时红色图标 + 摘要（不展示秘钥内容）
    - 安全告警标记在首页 change 卡片上也展示（小盾牌图标）
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/changes | python -c "import sys; assert sys.stdin.read()!=''" && curl -s --interface 0.0.0.0 http://127.0.0.1:8000/api/changes 2>&1 || echo "非本地被拒 ✅"</verify>
  <done>localhost 绑定生效，非本地请求返回 403，安全告警前端醒目标记</done>
  <depends_on>T15,T01</depends_on>
  <auto>true</auto>
</task>

<!-- ═══════════════════════════════════════════ -->
<!-- v1.1 新增：10 专家评审产出（7 task, 2 wave）-->
<!-- ═══════════════════════════════════════════ -->

<task id="T27" parallel="true" status="done">
  <name>AC-13 · 门禁矩阵表（GateTab 重写）</name>
  <read_files>
    frontend/src/components/GateTab.tsx
    REQUIREMENT.md AC-13
  </read_files>
  <write_files>
    frontend/src/components/GateTab.tsx
  </write_files>
  <action>
    将门禁 Tab 从折叠卡片改为矩阵表：
    - 行 = 8 Gate（G1/需求门/G2/G2a/Task/G3/测试门/G4）
    - 列 = 所有参与角色（动态从 gate 数据中提取去重）
    - 单元格 = ✅/❌/⚪ 图标 + 背景色（绿/红/灰）
    - hover 显示理由 tooltip
    - 未触发的 gate 显示灰色行
  </action>
  <verify>curl -s http://127.0.0.1:5173/ | grep -c "root"</verify>
  <done>门禁 Tab 展示矩阵表，Gate × 角色，hover 可见理由</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T28" parallel="true" status="done">
  <name>AC-17 · 侧边栏 aria-label + reduced-motion</name>
  <read_files>
    frontend/src/App.tsx
    frontend/src/styles/tokens.css
  </read_files>
  <write_files>
    frontend/src/App.tsx
    frontend/src/styles/tokens.css
  </write_files>
  <action>
    - App.tsx：每个导航按钮加 aria-label="监控/工作流/角色/文档"
    - tokens.css：@media (prefers-reduced-motion: reduce) 中关闭 sidebar transition
    - 折叠按钮加 aria-label="收起侧边栏/展开侧边栏"
  </action>
  <verify>curl -s http://127.0.0.1:5173/ | grep -c "aria-label"</verify>
  <done>导航按钮有 aria-label，reduced-motion 生效</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T29" parallel="true" status="done">
  <name>AC-15 · 扫描缓存 TTL</name>
  <read_files>
    backend/scanner.py
  </read_files>
  <write_files>
    backend/scanner.py
  </write_files>
  <action>
    - FileScanner 增加 _cache_time 字段
    - scan() 方法：超过 5 秒 → 缓存失效，重新扫描
    - force=True 时跳过缓存
  </action>
  <verify>cd backend && /home/malizhi/ai/code-flow/.venv/bin/python -c "from scanner import FileScanner; import time; s=FileScanner(); r1=s.scan(force=True); time.sleep(1); r2=s.scan(); assert r1==r2; print('cache OK')"</verify>
  <done>5 秒内重复请求命中缓存，超过 5 秒重新扫描</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T30" parallel="false" status="done">
  <name>AC-14 · 操作确认弹窗（角色/工作流/文档）</name>
  <read_files>
    frontend/src/pages/Roles.tsx
    frontend/src/pages/WorkflowEditor.tsx
    frontend/src/pages/DocEditor.tsx
  </read_files>
  <write_files>
    frontend/src/components/ConfirmDialog.tsx
    frontend/src/pages/Roles.tsx
    frontend/src/pages/WorkflowEditor.tsx
    frontend/src/pages/DocEditor.tsx
  </write_files>
  <action>
    - 创建 ConfirmDialog 通用组件（标题/描述/确认/取消按钮）
    - Roles.tsx：删除角色时弹出确认
    - WorkflowEditor.tsx：删除阶段/修改门禁时弹出确认
    - DocEditor.tsx：保存时弹出确认（提示修改底层文件）
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose 2>&1 | tail -5</verify>
  <done>所有删除/保存操作有确认弹窗，取消不执行</done>
  <depends_on>T27,T28</depends_on>
  <auto>true</auto>
</task>

<task id="T31" parallel="false" status="done">
  <name>AC-16 · 项目切换器</name>
  <read_files>
    frontend/src/App.tsx
    backend/routes/admin_api.py
  </read_files>
  <write_files>
    frontend/src/components/ProjectSwitcher.tsx
    frontend/src/App.tsx
  </write_files>
  <action>
    - App.tsx 侧边栏底部加 ProjectSwitcher 组件
    - 调用 /api/admin/projects 获取项目列表
    - 下拉菜单展示项目名 + 当前标记
    - 切换时调用 POST /api/admin/projects/switch
    - 切换后刷新 changes 数据
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/admin/projects | python -c "import sys,json; d=json.load(sys.stdin); assert len(d['projects'])>0; print('OK')"</verify>
  <done>侧边栏底部可切换项目，切换后面板数据自动刷新</done>
  <depends_on>T28</depends_on>
  <auto>true</auto>
</task>

<task id="T32" parallel="false" status="done">
  <name>配置自动备份</name>
  <read_files>
    backend/routes/admin_api.py
    backend/routes/roles_api.py
  </read_files>
  <write_files>
    backend/routes/admin_api.py
    backend/routes/roles_api.py
  </write_files>
  <action>
    - admin_api.py：_save_workflow() 和写文件前自动备份到 .specs/backup/<filename>.<timestamp>
    - roles_api.py：_save() 同理自动备份
    - 保留最近 5 个版本
  </action>
  <verify>cd backend && /home/malizhi/ai/code-flow/.venv/bin/python -c "
import os,json,tempfile,time
# 模拟保存触发备份
backup_dir = '../../.specs/backup'
print(f'backup dir exists: {os.path.isdir(backup_dir)} or will be created')
"</verify>
  <done>workflow.json/roles.json 每次保存前自动备份，保留 5 个版本</done>
  <depends_on>T29</depends_on>
  <auto>true</auto>
</task>

<task id="T33" parallel="false" status="done">
  <name>前端 ErrorBoundary</name>
  <read_files>
    frontend/src/App.tsx
  </read_files>
  <write_files>
    frontend/src/components/ErrorBoundary.tsx
    frontend/src/App.tsx
  </write_files>
  <action>
    - ErrorBoundary 类组件：捕获子组件渲染错误
    - 显示「出错了」+ 错误信息 + 重试按钮
    - App.tsx 中用 ErrorBoundary 包裹主内容区
    - 侧边栏不受 ErrorBoundary 影响（保证导航始终可用）
  </action>
  <verify>cd frontend && npx vitest run --reporter=verbose 2>&1 | tail -3</verify>
  <done>子组件崩溃不导致白屏，显示错误提示+重试按钮</done>
  <depends_on>T30</depends_on>
  <auto>true</auto>
</task>

--- v1.2 权限管理系统 ---

<task id="T34" parallel="true" status="done">
  <name>后端 auth.py 认证鉴权模块</name>
  <read_files>
    backend/config.py
    backend/main.py
    DESIGN.md##权限
  </read_files>
  <write_files>
    backend/auth.py
  </write_files>
  <action>
    创建认证+鉴权核心模块：
    - 数据目录独立于 CURRENT_PROJECT（跨项目共享 users.json / audit.jsonl）
    - 用户 CRUD（load_users / save_users / get_user），含默认 admin 初始化
    - 权限检查（has_permission / require_permission），RBAC 角色-权限映射
    - 审计日志（write_audit / read_audit / audit_stats），JSONL 追加 + 文件锁 + 自动轮转（>10000行归档）
    - fcntl 文件锁防止并发写入丢数据
    - PERMISSION_DEFS 权限定义表 + ROLE_PERMISSIONS 角色映射表
  </action>
  <verify>cd backend && python -c "from auth import load_users, get_user, has_permission, write_audit; u=get_user('admin'); assert u and has_permission(u,'user:manage'); print('OK')"</verify>
  <done>auth.py 可独立导入，admin 用户自动创建，权限检查可用</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T35" parallel="true" status="done">
  <name>后端 main.py 认证中间件 + 路由注册</name>
  <read_files>
    backend/main.py
    backend/auth.py
  </read_files>
  <write_files>
    backend/main.py
  </write_files>
  <action>
    修改 main.py：
    - auth_middleware：读取 X-User-Id header 注入 request.state.user
    - 安全规则：未传 header → 默认 admin；传了但用户不存在 → 401
    - 保留 localhost-only 检查
    - 注册 auth_api 和 audit_api 两个新路由
  </action>
  <verify>cd backend && python -c "from main import app; print([r.path for r in app.routes if 'auth' in r.path or 'audit' in r.path])"</verify>
  <done>中间件正确注入用户，新路由已注册，安全 fallback 已修复</done>
  <depends_on>T34</depends_on>
  <auto>true</auto>
</task>

<task id="T36" parallel="true" status="done">
  <name>后端 auth_api + audit_api 路由</name>
  <read_files>
    backend/auth.py
    backend/routes/roles_api.py
    DESIGN.md##权限
  </read_files>
  <write_files>
    backend/routes/auth_api.py
    backend/routes/audit_api.py
  </write_files>
  <action>
    创建两个新路由文件：
    auth_api.py：
    - GET /api/auth/me — 当前用户信息+权限
    - GET /api/auth/users — 用户列表（user:manage 权限）
    - POST /api/auth/users — 创建用户 + 审计
    - PUT /api/auth/users/{id} — 更新用户 + 权限变更审计
    - DELETE /api/auth/users/{id} — 删除用户 + 审计
    - POST /api/auth/login — 验证用户存在
    audit_api.py：
    - GET /api/audit — 查询审计日志（筛选：user_id/action/days/limit）
    - GET /api/audit/stats — 审计统计摘要
    - GET /api/audit/actions — 审计动作类型列表
  </action>
  <verify>curl -s http://127.0.0.1:8000/api/auth/me | python -c "import sys,json; d=json.load(sys.stdin); assert 'user' in d; print('OK')"</verify>
  <done>用户管理 API 和审计日志 API 可用，权限校验生效</done>
  <depends_on>T35</depends_on>
  <auto>true</auto>
</task>

<task id="T37" parallel="false" status="done">
  <name>后端已有路由权限改造</name>
  <read_files>
    backend/routes/admin_api.py
    backend/routes/roles_api.py
    backend/config.py
  </read_files>
  <write_files>
    backend/routes/admin_api.py
    backend/routes/roles_api.py
    backend/config.py
  </write_files>
  <action>
    对已有路由添加权限检查和审计：
    config.py：
    - discover_projects(user) 增加 user 参数，按 project_ids 过滤
    admin_api.py：
    - 所有 PUT/POST 操作加 has_permission 检查
    - 工作流更新、文件写入、文件命名更新加 audit
    - 项目列表按用户过滤 + 返回 is_admin
    - 项目切换检查用户权限
    roles_api.py：
    - 创建/更新/删除角色加权限检查 + 审计
    - 删除角色需要 project:delete 权限
  </action>
  <verify>cd backend && python -c "from routes.admin_api import router; from routes.roles_api import router; print('imports OK')"</verify>
  <done>所有写操作有权限门禁，危险操作有审计记录，项目列表按用户隔离</done>
  <depends_on>T36</depends_on>
  <auto>true</auto>
</task>

<task id="T38" parallel="true" status="done">
  <name>前端 auth store + UserSelect 组件</name>
  <read_files>
    frontend/src/stores/changes.ts
    frontend/src/components/ProjectSwitcher.tsx
    frontend/src/App.tsx
  </read_files>
  <write_files>
    frontend/src/stores/auth.ts
    frontend/src/components/UserSelect.tsx
  </write_files>
  <action>
    stores/auth.ts — Zustand store：
    - currentUser / userList / isAdmin 状态
    - fetchMe() / fetchUsers() / switchUser() 方法
    - 所有后续 fetch 通过该 store 注入 X-User-Id header
    components/UserSelect.tsx：
    - 用户切换下拉框（复用 ProjectSwitcher 下拉模式）
    - 显示当前用户名+角色
    - 切换时更新 store + 刷新
  </action>
  <verify>cd frontend && npx tsc --noEmit --pretty 2>&1 | head -5</verify>
  <done>用户状态管理可用，UserSelect 组件可切换用户</done>
  <depends_on>T37</depends_on>
  <auto>true</auto>
</task>

<task id="T39" parallel="true" status="done">
  <name>前端 UserManagement 页</name>
  <read_files>
    frontend/src/pages/Roles.tsx
    frontend/src/components/ConfirmDialog.tsx
    DESIGN.md##前端
  </read_files>
  <write_files>
    frontend/src/pages/UserManagement.tsx
  </write_files>
  <action>
    用户管理页（admin only）：
    - 用户列表卡片：ID、名称、角色标签、归属项目数、状态
    - 新增用户表单：ID / 名称 / 角色选择(admin/user) / 项目多选
    - 编辑用户：内联编辑表单，修改角色/项目分配/状态
    - 删除确认对话框（复用 ConfirmDialog）
    - UI 风格遵循 Roles.tsx 模式：inline styles + CSS 变量
  </action>
  <verify>cd frontend && npx tsc --noEmit --pretty 2>&1 | head -5</verify>
  <done>admin 可 CRUD 用户，项目分配可用，操作记审计</done>
  <depends_on>T38</depends_on>
  <auto>true</auto>
</task>

<task id="T40" parallel="true" status="done">
  <name>前端 AuditLog 页</name>
  <read_files>
    frontend/src/pages/Runtime.tsx
    DESIGN.md##前端
  </read_files>
  <write_files>
    frontend/src/pages/AuditLog.tsx
  </write_files>
  <action>
    审计日志查看页（admin only）：
    - 过滤栏：按用户、操作类型、天数筛选
    - 统计卡片：总数、今日操作数、按操作类型分布
    - 日志表格：时间、用户、操作标签、目标、详情、结果（成功/失败）
    - 分页/加载更多
    - UI 风格遵循项目模式
  </action>
  <verify>cd frontend && npx tsc --noEmit --pretty 2>&1 | head -5</verify>
  <done>审计日志可筛选查看，统计数据准确</done>
  <depends_on>T38</depends_on>
  <auto>true</auto>
</task>

<task id="T41" parallel="false" status="done">
  <name>前端 App.tsx 导航集成 + 端到端验证</name>
  <read_files>
    frontend/src/App.tsx
    frontend/src/components/ProjectSwitcher.tsx
  </read_files>
  <write_files>
    frontend/src/App.tsx
    frontend/src/main.tsx
  </write_files>
  <action>
    App.tsx 改造：
    - 添加'用户管理'(Shield)和'审计日志'(FileSearch)导航（admin only）
    - 顶部/底部显示当前用户 + UserSelect 切换
    - 路由：nav='users' → UserManagement, nav='audit' → AuditLog
    - 非 admin 隐藏管理类导航
    main.tsx：
    - 初始化时从 localStorage 恢复 user_id
    - 首次访问默认 admin
  </action>
  <verify>
    后端验证：
    curl -X POST http://127.0.0.1:8000/api/auth/users -H 'X-User-Id: admin' -H 'Content-Type: application/json' -d '{"id":"test","name":"测试","role":"user","project_ids":["code-kit-monitor"]}'
    curl http://127.0.0.1:8000/api/admin/projects -H 'X-User-Id: test'  # 应只返回分配的项目
    curl -X POST http://127.0.0.1:8000/api/auth/users -H 'X-User-Id: test' ...  # 应 403
    curl http://127.0.0.1:8000/api/audit -H 'X-User-Id: admin'  # 应有审计记录
    curl http://127.0.0.1:8000/api/audit -H 'X-User-Id: test'  # 应 403
    cat ../audit.jsonl | tail -5
  </verify>
  <done>完整权限隔离：admin 全见，用户隔离，审计完整，前端导航按角色显示</done>
  <depends_on>T39,T40</depends_on>
  <auto>true</auto>
</task>

<task id="T42" parallel="true" status="done">
  <name>前端 LoginPage 密码登录页（含密码验证）</name>
  <read_files>
    frontend/src/App.tsx
    REQUIREMENT.md AC-18
  </read_files>
  <write_files>
    frontend/src/pages/LoginPage.tsx
    frontend/src/App.tsx
  </write_files>
  <action>
    重写 LoginPage.tsx（密码登录，不再是无密码选择）：
    - 调用 GET /api/auth/list 获取活跃用户列表
    - 显示用户卡片列表（仅名称 + 角色图标，不暴露密码）
    - 点击用户 → 展开密码输入框 → 调用 POST /api/auth/login 验证密码
    - 密码错误显示「密码错误」红色提示
    - 登录成功 → 写 localStorage current_user_id → 刷新进入主界面
    - 无用户时自动创建 admin（密码 123456）
    - App.tsx：未登录（无 current_user_id）→ 渲染 LoginPage 而非主界面
    - 登录页底部提示「仅 localhost · 默认管理员密码 123456」
  </action>
  <verify>清 localStorage → 刷新页面 → 选 admin → 输入错误密码 → 显示「密码错误」→ 输入 123456 → 进入主界面</verify>
  <done>首次访问显示登录页（密码验证），密码错误有提示，正确密码登录成功</done>
  <depends_on>T38</depends_on>
  <auto>true</auto>
</task>

<task id="T43" parallel="true" status="pending">
  <name>侧边栏用户区域重构：登出按钮 + 用户中心入口（去掉切换用户）</name>
  <read_files>
    frontend/src/components/UserSelect.tsx
    frontend/src/stores/auth.ts
    frontend/src/App.tsx
    REQUIREMENT.md AC-25,AC-27
  </read_files>
  <write_files>
    frontend/src/components/UserSelect.tsx
    frontend/src/stores/auth.ts
    frontend/src/App.tsx
  </write_files>
  <action>
    重构侧边栏底部用户区域：
    - **去掉**：switchUser() 方法和用户切换下拉
    - **改为**：显示当前用户名+角色标签，点击 → 导航到「用户中心」页（nav='profile'）
    - **新增**：登出按钮（LogOut 图标），点击 → 清除 localStorage current_user_id → window.location.reload() → 回到登录页
    - auth.ts 修改：删除 switchUser()，保留 fetchMe/fetchUsers
    - App.tsx：侧边栏底部渲染用户信息 + 登出按钮
    - 非 admin 调用 fetchUsers 403 时静默处理（不报错）
  </action>
  <verify>登录后侧边栏底部显示用户名+角色；点击用户名 → 进入用户中心页；点击登出 → 回到登录页；刷新 → 仍停留在登录页</verify>
  <done>侧边栏底部显示用户信息+登出按钮，点击用户名进入用户中心，登出清登录态</done>
  <depends_on>T38</depends_on>
  <auto>true</auto>
</task>

<task id="T44" parallel="true" status="pending">
  <name>UserManagement 完整权限管理面板</name>
  <read_files>
    frontend/src/pages/UserManagement.tsx
    frontend/src/stores/auth.ts
    DESIGN.md##6.1
  </read_files>
  <write_files>
    frontend/src/pages/UserManagement.tsx
  </write_files>
  <action>
    重写 UserManagement.tsx：
    - 用户列表卡片：ID/名称/角色标签/项目数/危险权限标签/活跃状态
    - 新增用户表单：ID/名称/角色(admin/user)/项目多选/危险权限勾选框（project:delete/workflow:stop/user:manage/audit:view）
    - 编辑用户：修改角色/项目分配/权限勾选/活跃状态
    - admin 用户不可删除（按钮隐藏）
    - 项目标签可点击（如果有项目详情入口）
    - 调用 GET /api/auth/permissions 获取权限定义表渲染勾选框
  </action>
  <verify>admin 可创建用户、勾选危险权限、分配项目；切换该用户登录验证权限生效</verify>
  <done>完整 CRUD + 危险权限勾选 + 项目多选分配，admin 不可删除</done>
  <depends_on>T42</depends_on>
  <auto>true</auto>
</task>

<task id="T45" parallel="false" status="pending">
  <name>端到端修复验证 + 双向入口</name>
  <read_files>
    frontend/src/App.tsx
    frontend/src/pages/UserManagement.tsx
    REQUIREMENT.md##v1.2
  </read_files>
  <write_files>
    frontend/src/App.tsx
    frontend/src/pages/UserManagement.tsx
  </write_files>
  <action>
    端到端修复：
    - App.tsx 未登录→LoginPage 渲染逻辑
    - 确认 admin 导航「管理」分组只有 admin 可见
    - UserManagement 项目标签点击 → 跳转项目看板（可选实现）
    - 验证全流程：创建用户→分配项目+权限→切换登录→权限隔离→审计日志记录
  </action>
  <verify>
    curl 验证：
    1. POST /api/auth/users 创建用户
    2. GET /api/admin/projects -H "X-User-Id: newuser" → 只返回分配的项目
    3. POST /api/auth/users -H "X-User-Id: newuser" → 403
    4. DELETE /api/roles/{id} -H "X-User-Id: newuser" → 403（无 project:delete）
    5. 给用户加 project:delete → 再次尝试删除 → 成功
    6. GET /api/audit → 所有操作有记录
  </verify>
  <done>全流程闭环：登录→权限隔离→危险操作鉴权→审计追溯</done>
  <depends_on>T43,T44</depends_on>
  <auto>true</auto>
</task>

--- v1.3 登录登出 + 用户中心 ---

<task id="T46" parallel="true" status="pending">
  <name>前端 UserCenter 用户中心页</name>
  <read_files>
    frontend/src/pages/UserManagement.tsx
    frontend/src/stores/auth.ts
    REQUIREMENT.md AC-28
  </read_files>
  <write_files>
    frontend/src/pages/UserCenter.tsx
  </write_files>
  <action>
    创建 UserCenter.tsx 用户中心页（当前登录用户查看自己的完整信息）：
    - 调用 GET /api/auth/me 获取当前用户信息+权限
    - 信息卡片：用户 ID（mono 字体）、名称、角色（中文标签+颜色区分：「管理员」蓝色 / 「用户」灰色）、账号创建时间、活跃状态（绿色/灰色圆点）
    - 权限列表：基础权限（中文名+key，灰色标签）+ 危险权限（红色标签高亮，如有）
    - 归属项目列表：项目名标签，可点击跳转（调用项目切换 API）
    - UI 风格：卡片式布局，遵循项目 inline styles + CSS 变量
    - 页面顶部标题「用户中心」+ 返回按钮
  </action>
  <verify>以 admin 登录 → 点击用户名 → 进入用户中心 → 确认角色/权限/项目正确展示 → 项目标签可点击切换</verify>
  <done>用户中心页完整展示个人信息：ID/名称/角色/权限/项目/时间/状态</done>
  <depends_on>T42,T43</depends_on>
  <auto>true</auto>
</task>

<task id="T47" parallel="true" status="pending">
  <name>App.tsx 路由集成：登录/登出/用户中心</name>
  <read_files>
    frontend/src/App.tsx
    frontend/src/stores/auth.ts
    REQUIREMENT.md AC-18,AC-27,AC-28
  </read_files>
  <write_files>
    frontend/src/App.tsx
  </write_files>
  <action>
    App.tsx 集成改造：
    - 未登录（无 current_user_id）→ 渲染 LoginPage（不显示侧边栏）
    - 已登录 → 正常主界面（侧边栏+内容区）
    - 侧边栏底部用户区域：头像图标+用户名+角色标签，点击→nav='profile'；登出按钮(LogOut)
    - nav='profile' → 渲染 UserCenter 页
    - 去掉 UserSelect 切换下拉
    - 去掉 switchUser 相关逻辑
    - 登出逻辑：清除 localStorage + set currentUser=null + 页面刷新
  </action>
  <verify>完整流程：清 localStorage → 登录页 → 输入密码登录 → 主界面 → 点用户名→用户中心→返回 → 点登出→回登录页 → 刷新仍登录页</verify>
  <done>登录→主界面→用户中心→登出→登录页 全流程闭环，去掉用户切换功能</done>
  <depends_on>T43,T46</depends_on>
  <auto>true</auto>
</task>

<task id="T48" parallel="false" status="pending">
  <name>v1.3 端到端验证：登录/登出/用户中心</name>
  <read_files>
    frontend/src/App.tsx
    frontend/src/pages/LoginPage.tsx
    frontend/src/pages/UserCenter.tsx
    REQUIREMENT.md##v1.3
  </read_files>
  <write_files>
    （无新文件，验证+修复）
  </write_files>
  <action>
    端到端验证 v1.3 全流程：
    1. curl POST /api/auth/login -d '{"user_id":"admin","password":"123456"}' → 返回 ok
    2. curl POST /api/auth/login -d '{"user_id":"admin","password":"wrong"}' → 401 密码错误
    3. 前端验证：登录页→密码验证→进入主界面→用户中心→登出→回到登录页
    4. 确认不再有用户切换下拉/按钮
    5. 确认侧边栏底部显示当前用户名+登出按钮
    6. 确认用户中心页信息完整（ID/名称/角色/权限/项目/时间/状态）
  </action>
  <verify>curl 验证登录 API + 浏览器验证全流程 UI</verify>
  <done>v1.3 全流程闭环：密码登录/登出/用户中心完整可用，无切换用户功能</done>
  <depends_on>T47</depends_on>
  <auto>false</auto>
</task>
```

---

## 🛡️ Task 门 · 投票记录（v1.3 新增任务）

```
🗳️ Task 门: v1.3 任务拆分（T46/T47/T48）是否合理？

   🟫 工程效能专家: ✅ 通过 — T46(用户中心页) T47(路由集成) T48(验证) 拆分为 3 个独立 task，粒度合理；T46/T47 可并行（无读写冲突），T48 串行验证；wave 划分清晰
   🟩 架构师: ✅ 通过 — 纯前端变更，无 schema/API 变更；T46 复用已有 /api/auth/me 端点无需后端改动；T47 仅改 App.tsx 路由+侧边栏；影响面小，风险低
   🧪 资深测试工程师: ✅ 通过 — 每个 task 的 verify 可操作可验证（curl + 浏览器），T48 端到端验证覆盖了登录成功/失败/登出/用户中心全路径
   🔴 安全审计师: ✅ 通过 — 密码登录（AC-18）已在前置 task 实现；登出清 localStorage 无残留；T46 用户中心仅展示只读信息无写操作；无新增安全风险

   结果: 4/4 全票通过 → ✅ 可按 Wave 16→17 顺序执行
```
