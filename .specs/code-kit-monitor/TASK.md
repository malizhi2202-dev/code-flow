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
```

---

## 任务清单

```xml
<task id="T01" parallel="true" status="pending">
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

<task id="T02" parallel="true" status="pending">
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

<task id="T03" parallel="true" status="pending">
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

<task id="T04" parallel="true" status="pending">
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

<task id="T05" parallel="true" status="pending">
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

<task id="T06" parallel="true" status="pending">
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

<task id="T07" parallel="true" status="pending">
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

<task id="T08" parallel="true" status="pending">
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

<task id="T09" parallel="true" status="pending">
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

<task id="T10" parallel="true" status="pending">
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

<task id="T11" parallel="true" status="pending">
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

<task id="T12" parallel="true" status="pending">
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

<task id="T13" parallel="true" status="pending">
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

<task id="T14" parallel="true" status="pending">
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

<task id="T15" parallel="true" status="pending">
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

<task id="T16" parallel="true" status="pending">
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

<task id="T17" parallel="true" status="pending">
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

<task id="T18" parallel="true" status="pending">
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

<task id="T19" parallel="true" status="pending">
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

<task id="T20" parallel="true" status="pending">
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

<task id="T21" parallel="true" status="pending">
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

<task id="T22" parallel="true" status="pending">
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

<task id="T23" parallel="true" status="pending">
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

<task id="T24" parallel="false" status="pending">
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

<task id="T25" parallel="false" status="pending">
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

<task id="T26" parallel="false" status="pending">
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
```
