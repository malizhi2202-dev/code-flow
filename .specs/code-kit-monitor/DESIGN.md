# DESIGN: code-kit 工作流监控面板

- **Change ID**: `code-kit-monitor`
- **关联**: `@.specs/code-kit-monitor/REQUIREMENT.md`、`@.specs/CONTEXT.md`、`@code-kit/reference/tech-stacks.md`
- **作者**: AI（Architect 角色）+ 人工 review

---

## 0. 技术栈选定

> 由 2-design 步骤 0 锁定。变栈视为开新 CHANGE（R7.1）。

- **选定**：5️⃣ FastAPI + React（Python AI / 数据后端变体）
- **前端**：Vite 5 · React 18 · TypeScript 5
- **UI 组件**：Tremor 4（dashboard 专用组件库，内置暗色主题）· Tailwind CSS 4
- **图表**：Recharts（时序图/柱状图/饼图）· 备选 ECharts（如需复杂拓扑图）
- **状态管理**：Zustand（轻量，无 boilerplate）
- **HTTP 客户端**：fetch（内置）+ TanStack Query（服务端状态缓存）
- **后端**：FastAPI 0.110+ · Pydantic v2 · Python 3.10+
- **ORM**：SQLAlchemy 2.0（async）+ Alembic（迁移）
- **数据库**：MySQL 8.0
- **缓存**：Redis 7（仅文件元数据索引缓存，非必须——v1 可降级为内存 dict）
- **向量数据库**：❌ **本次不用**。监控面板是结构化数据查询（文件解析 + 字段匹配），无语义搜索/embedding 需求。如未来需要「自然语言查询 change 状态」再评估 Milvus / Qdrant
- **部署**：本地 uvicorn（后端）+ Vite dev server（前端）或 nginx 反代；v1 仅 localhost
- **关键依赖**：FastAPI · SQLAlchemy · Tremor · Recharts · Zustand · Tailwind
- **理由**：React 生态拥有最丰富的 dashboard 组件（Tremor 专为监控面板设计，暗色主题开箱即用）；FastAPI + Pydantic v2 做数据聚合层轻量高效；MySQL 存储文件元数据索引（可选，v1 可纯文件系统）；Redis 降级为可选
- **明确排除**：
  - Next.js — 本项目纯 SPA 无需 SSR/SEO，Next.js 的 Server Components 增加复杂度零收益
  - Vue/Svelte — dashboard 组件生态不如 React，Tremor/Recharts 无对应替代

---

## 0.5 既有架构对齐（brownfield 必填）

> N/A — 本项目为 greenfield 新建，无既有架构需要对齐。

---

## 1. 技术决策（ADR 格式）

### D1 · 数据源策略：文件解析 vs 运行时埋点

- **决策**：v1 采用**纯文件解析**（读取 `.specs/` + git log），不修改 code-kit 运行时
- **备选**：改造 code-kit 每个 prompt 输出结构化事件（JSON/WebSocket）
- **选择理由**：文件解析零侵入，code-kit 无需改一行代码。code-kit 本身的 prompt 已经严格控制了产物格式（XML task 块、markdown 段），解析稳定性可预期
- **取舍代价**：无法实时推送（v1 用 5s 轮询），状态更新有延迟；无法获取「正在执行中」的运行时状态（只能看已持久化的结果）

### D2 · 产物解析：正则/Markdown AST vs 结构化 Schema

- **决策**：**约定优于解析**——按 code-kit 产物的已知结构做 section-level 正则匹配，不做完整 markdown AST
- **备选**：要求每个阶段产物附带 JSON sidecar，或写完整的 markdown → JSON 转换器
- **选择理由**：code-kit 产物格式是受控的（TEMPLATE → prompt → 产物），section 标题和 XML 块结构固定。正则按 `## <section>` 切分 + XML parse（\<task\> 块）即可覆盖所有 AC
- **取舍代价**：如果 code-kit 模板升级导致格式变化，解析器需要同步更新。缓解：解析器与 code-kit 版本绑定，加格式版本检测

### D3 · 前端组件策略：Tremor vs 自建

- **决策**：使用 **Tremor 4**（dashboard 专用组件库）
- **备选**：完全自建设计系统 / 用 shadcn/ui 组合
- **选择理由**：Tremor 4 内置暗色主题、提供 stat card / bar chart / area chart / table / badge / progress bar 等监控面板核心组件，直接对标 Grafana/Datadog 的视觉语言，与已锁定的「工业」调性高度一致。Tailwind CSS 做自定义样式 escape hatch
- **取舍代价**：Tremor 组件定制灵活性低于自建，如果设计需求偏离其默认风格较远可能需要 hack。本项目的工业风与 Tremor 默认风格接近，风险低

### D4 · 数据库使用策略：MySQL vs 纯文件系统

- **决策**：v1 **数据库可选**——MySQL 仅存储文件元数据索引（路径/mtime/size/change-id 映射），加速搜索和过滤；核心数据始终从文件实时读取
- **备选**：纯文件系统无数据库 / 全部数据入库
- **选择理由**：监控面板的核心数据源是 `.specs/` 的 markdown 文件，文件内容始终是 ground truth。MySQL 作为「索引层」加速搜索（AC-7），把 change-id→文件路径→mtime 的映射缓存起来，避免每次请求都 `ls -R`。Redis 进一步缓存热点元数据
- **取舍代价**：引入数据库增加部署复杂度。降级路径：如果 MySQL 不可用，服务端回退到纯文件系统扫描，功能不丢但搜索变慢

### D5 · 向量数据库评估

- **决策**：❌ **v1 不引入**，v2 按需评估
- **理由**：监控面板当前所有查询都是结构化字段匹配（change-id、阶段、状态、task 名），不涉及自然语言查询或语义相似度搜索。v2 如果做「自然语言问 change 状态」（如「哪个 change 卡在 review 最久」），再评估向量化方案（Milvus / Qdrant / Chroma）
- **取舍代价**：不引入零成本；未来若需要语义查询，需追加向量化 pipeline

## 2. 数据流 / 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (localhost)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │              React + Vite SPA                      │  │
│  │  Tremor Dashboard / Recharts / Zustand / Tailwind │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       │  HTTP REST (5s polling)          │
└───────────────────────┼──────────────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────────┐
│               Python FastAPI Server (localhost:8000)     │
│                       │                                   │
│  ┌────────────────────┴──────────────────────────────┐  │
│  │                   路由层                            │  │
│  │  GET /api/changes        — 活跃 change 列表        │  │
│  │  GET /api/changes/<id>   — 单个 change 详情        │  │
│  │  GET /api/changes/<id>/<artifact> — 产物内容        │  │
│  │  GET /api/health         — 数据一致性校验           │  │
│  │  GET /api/token-usage    — Token 聚合               │  │
│  │  GET /api/git/safety     — Git 安全网               │  │
│  │  GET /api/search?q=      — 搜索过滤                 │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       │                                   │
│  ┌────────────────────┴──────────────────────────────┐  │
│  │                 解析引擎                            │  │
│  │  · Section Parser  — 按 ## 切分 markdown           │  │
│  │  · XML Task Parser — 解析 <task> 块 → 结构化数据   │  │
│  │  · Gate Parser     — 解析 🗳️ 投票记录块           │  │
│  │  · Git Log Parser  — git log --oneline --grep      │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       │                                   │
│  ┌────────────────────┴──────────────────────────────┐  │
│  │              数据访问层                             │  │
│  │  · FileScanner   — 增量扫描 .specs/ (mtime)        │  │
│  │  · MySQL (可选)  — 文件元数据索引                   │  │
│  │  · Redis (可选)  — 热点元数据缓存                   │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────┐
         │     .specs/ 目录          │
         │  ├── <change-id>/         │
         │  │   ├── CHANGE.md        │
         │  │   ├── REQUIREMENT.md   │
         │  │   ├── DESIGN.md        │
         │  │   ├── UI-DESIGN.md     │
         │  │   ├── TASK.md          │
         │  │   ├── T01-SUMMARY.md   │
         │  │   ├── TEST.md          │
         │  │   └── REVIEW.md        │
         │  ├── CONTEXT.md           │
         │  ├── STATE.md             │
         │  └── archive/             │
         └──────────────────────────┘
```

### 关键状态机：change 生命周期

```
draft → 0-change → 1-requirement → 2-design → 2a-ui-design(前端)
     → 3-task → 4-dev(wave1...waveN) → 5-test → 6-review → 7-integration → archived

每个 → 表示一个 Gate 门禁通过。

阻塞状态：
- gate_blocked: 门禁未通过/平票
- task_blocked: task 被标 👤 人工等待确认
- interrupted: STATE.md 中断任务非空
```

## 3. ADR（不可逆决策）

### ADR-001 · 选择文件解析而非运行时埋点

- **Context**: 需要获取 code-kit 工作流状态。两个方案：(A) 修改 code-kit 每个 prompt 在运行时推送事件 (B) 事后解析 `.specs/` 产物文件
- **Decision**: 选择 (B) 事后文件解析
- **Consequences**:
  - ✅ 零侵入，code-kit 无需改动
  - ✅ code-kit 和 monitor 独立演进
  - ❌ 无法获取运行时状态（「正在执行中」看不到）
  - ❌ 状态更新有 5s 轮询延迟
  - 🔮 未来如果 code-kit 自身提供了 structured output hook，可以切换到 (A)

### ADR-002 · MySQL 作为可选索引层

- **Context**: 搜索和过滤需要遍历 `.specs/` 下所有文件。100+ change 时 `ls -R` + 多次 `read` 可能慢
- **Decision**: 引入 MySQL 存储文件元数据索引（change-id / 阶段 / 文件路径 / mtime / 关键字段）。MySQL 不可用时自动回退到纯文件扫描
- **Consequences**:
  - ✅ 搜索快（索引查询 vs 文件遍历）
  - ❌ 部署多了 MySQL 依赖
  - ❌ 数据一致性：文件是 ground truth，索引必须与文件同步（每次扫描更新）
  - 🔮 如果用户量始终是单人数十个 change，MySQL 可彻底砍掉

### ADR-003 · 前端状态管理用 Zustand

- **Context**: SPA 需要管理：change 列表、当前选中 change、搜索过滤条件、主题偏好
- **Decision**: 使用 Zustand（轻量状态管理），不用 Redux/Context
- **Consequences**:
  - ✅ 无 boilerplate，store 即 hook
  - ✅ 按需订阅避免不必要的 re-render
  - ❌ 无中间件生态（如需要 devtools/持久化需额外插件）

## 4. 风险

| # | 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|---|
| R1 | code-kit 产物格式变化导致解析失败 | 中 | 高 | 解析器加格式版本检测；维护与 code-kit 版本的兼容性映射表 |
| R2 | `.specs/` 下 change 积累过多（>200），文件扫描成为瓶颈 | 低 | 中 | 增量扫描（mtime）；默认只展示 90 天内活跃 change；MySQL 索引进一步加速 |
| R3 | Tremor 4 版本升级 breaking change | 中 | 低 | 锁定主版本；组件封装一层薄 adapter，不直接在业务代码 import Tremor |
| R4 | 工业风暗色主题下告警色（红/橙）对色盲用户不可辨识 | 中 | 中 | 5-test 阶段过色盲模拟；告警不仅靠颜色，加图标+文字双重标记 |
| R5 | 用户期望 v1 就能编辑产物（做了只读，可能不满意） | 中 | 低 | CHANGE.md 已声明 v2 才做编辑；面板批注功能作为轻量补偿 |

## 5. 不在范围内

- **不做**运行时埋点/WebSocket 推送（v2）
- **不做**产物在线编辑（v2）
- **不做**历史趋势图表（v2）
- **不做**向量化语义搜索（v2，且需先确认有真实需求）
- ~~**不做**多用户权限/认证系统~~ → v1.2 纳入（见 §6）
- **不做**公网部署/HTTPS/域名绑定
- **不做**移动端/响应式（桌面优先）

## 6. v1.2 用户体系 & 权限管理设计（⭐ 新增）

### 6.1 权限模型

```
                    ┌─────────────────────────────┐
                    │     effective_permissions    │
                    │  = role_base ∪ custom_extra  │
                    └─────────────┬───────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
     ┌──────▼──────┐     ┌───────▼───────┐     ┌───────▼───────┐
     │    admin     │     │     user      │     │   自定义叠加   │
     │ 全部 6 权限   │     │ read + write  │     │ admin 可单独给 │
     │ 全项目可见    │     │ 仅分配项目     │     │ user 加危险权限 │
     └─────────────┘     └───────────────┘     └───────────────┘
```

**权限分级**：

| 级别 | 权限 | 说明 | 默认谁有 |
|------|------|------|----------|
| 🟢 基础 | `project:read` | 查看项目、变更、文档 | admin + user |
| 🟢 基础 | `project:write` | 修改配置、文件、门禁 | admin + user |
| 🔴 危险 | `project:delete` | 删除变更/产物/角色 | admin only |
| 🔴 危险 | `workflow:stop` | 停止流程 | admin only |
| 🔴 危险 | `user:manage` | 创建/编辑/删除用户 | admin only |
| 🟡 敏感 | `audit:view` | 查看审计日志 | admin only |

### 6.2 用户数据模型

**存储位置**：`<scan_root>/users.json`（跨项目共享，独立于 CURRENT_PROJECT）

```json
{
  "users": [{
    "id": "zhangsan",              // 唯一标识（英文）
    "name": "张三",                 // 显示名称
    "role": "admin|user",          // 基础角色
    "project_ids": ["proj-a"],     // 归属项目（admin 留空=全部）
    "custom_permissions": [        // 额外授予的危险权限
      "project:delete",
      "workflow:stop"
    ],
    "active": true,
    "created_at": "2026-07-02T..."
  }]
}
```

### 6.3 审计日志模型

**存储位置**：`<scan_root>/audit.jsonl`（JSONL 追加 + 文件锁 + 10000 行自动归档）

```json
{
  "timestamp": "2026-07-02T15:30:00",
  "user_id": "zhangsan",
  "user_name": "张三",
  "action": "project:delete|user:create|workflow:stop|...",
  "target": "change-abc/CHANGE.md",
  "target_type": "change|user|role|config|file|project",
  "detail": "删除变更产物 CHANGE.md",
  "ip": "127.0.0.1",
  "result": "success|failure"
}
```

### 6.4 认证方案

**ADR-004 · X-User-Id Header 认证（仅 localhost）**

- **选型**：HTTP Header `X-User-Id: <user_id>`（无密码，localhost 信任边界）
- **理由**：
  - 服务端已有 localhost-only 中间件（只接受 127.0.0.1）
  - 本机信任边界内不需要密码/RBAC token
  - 极简实现，零外部依赖
- **安全规则**：
  - 未传 Header → 默认 admin（向后兼容）
  - 传了 Header 但用户不存在 → 401
  - 切换用户 → 前端刷新页面（清除缓存状态）

### 6.5 API 路由设计

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/auth/list` | 公开 | 活跃用户列表（登录页用） |
| GET | `/api/auth/me` | 登录用户 | 当前用户 + 权限信息 |
| POST | `/api/auth/login` | 公开 | 验证用户存在 |
| GET | `/api/auth/users` | `user:manage` | 用户列表 |
| POST | `/api/auth/users` | `user:manage` | 创建用户 + 审计 |
| PUT | `/api/auth/users/{id}` | `user:manage` | 更新用户 + 审计 |
| DELETE | `/api/auth/users/{id}` | `user:manage` | 删除用户 + 审计 |
| GET | `/api/auth/users/{id}/permissions` | `user:manage` | 用户权限详情 |
| GET | `/api/auth/users/{id}/projects` | `user:manage` | 用户项目列表 |
| GET | `/api/auth/permissions` | 公开 | 权限定义表 |
| GET | `/api/audit` | `audit:view` | 审计日志查询 |
| GET | `/api/audit/stats` | `audit:view` | 审计统计 |
| GET | `/api/audit/actions` | `audit:view` | 操作类型列表 |

### 6.6 前端组件树

```
App.tsx
├── [未登录] LoginPage.tsx          🆕 用户选择页
│   └── 用户列表（从 /api/auth/list）
└── [已登录] 主界面
    ├── 侧边栏
    │   ├── NAV 导航（现有 6 项）
    │   ├── [admin] 「管理」分组     🆕
    │   │   ├── 用户管理 → UserManagement.tsx 🆕
    │   │   └── 审计日志 → AuditLog.tsx       🆕
    │   └── UserSelect.tsx          🆕 用户切换（底部）
    ├── Home.tsx（项目看板）
    │   └── [admin] 项目归属用户标签 🆕
    ├── UserManagement.tsx           🆕
    │   ├── 用户列表卡片
    │   ├── 新增/编辑表单
    │   │   ├── 角色选择（admin/user）
    │   │   ├── 项目多选
    │   │   └── 危险权限勾选框
    │   └── 点击项目标签 → 跳转项目
    └── AuditLog.tsx                 🆕
        ├── 统计卡片
        ├── 筛选栏（操作类型/天数）
        └── 日志表格
```

### 6.7 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 存储 | 纯 JSON 文件（非 MySQL） | 用户量小（<50），无需数据库；与现有文件式架构一致 |
| 认证 | X-User-Id Header | localhost 信任边界内最简方案 |
| 权限模型 | RBAC + custom_permissions 叠加 | 灵活性 + 简单性平衡 |
| 审计存储 | JSONL 追加 | 不可变追加 + 易 grep 分析 |
| 文件并发 | fcntl.flock | 防并发写丢数据 |
| 审计轮转 | 10000 行自动归档 | 防止文件无限增长 |

## 9. 架构沉淀建议

### 9.1 新增可复用抽象

| 抽象 | 位置 | 复用场景假设 | 判定 |
|---|---|---|---|
| `SectionParser` — 按 `## <section>` 切分 markdown 的通用解析器 | `src/parsers/section.py` | 未来其他工具需要解析 code-kit 产物；任何 markdown section 级提取 | 入选 |
| `XMLTaskParser` — 解析 `<task>` 块为结构化 dict | `src/parsers/task.py` | 任何需要读取 TASK.md 的工具 | 入选 |
| `FileScanner` — 增量扫描 `.specs/` 的通用工具 | `src/scanner.py` | 任何需要遍历 `.specs/` 变化的工具 | 入选 |

### 9.2 项目级技术决策

- **数据源策略**：code-kit 产物的 ground truth 始终在 `.specs/` 文件系统（非数据库）。数据库只做索引缓存，可随时从文件重建 → 后续所有与 code-kit 交互的工具都遵守此原则
- **前端组件策略**：监控/仪表盘类项目默认用 Tremor + Recharts + Tailwind。后续类似需求不重新评估

### 9.3 跨模块契约

- 本 change 不修改 code-kit 自身，无跨模块契约变更
- 隐式契约：code-kit 产物格式是 monitor 的「上游 API」，格式变化需同步

### 9.4 依赖变动

- 新增依赖：FastAPI · SQLAlchemy · redis-py · Tremor · Recharts · Zustand · Tailwind CSS（具体版本号在 package.json/requirements.txt 中锁定）

### 9.5 禁动清单变动

- N/A（greenfield 项目，无既有禁动清单）
