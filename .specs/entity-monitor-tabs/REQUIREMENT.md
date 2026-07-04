# REQUIREMENT: 各实体维度监控 Tab

- **Change ID**: entity-monitor-tabs
- **关联**: `@.specs/entity-monitor-tabs/CHANGE.md`

---

## 用户故事

- **US-1**: 作为用户，查看编排组详情时能看到「📊 监控」tab，展示 token 消耗、成功率、Agent 状态分布、调度队列深度。
- **US-2**: 作为用户，查看 Agent 详情时 monitor tab 展示完整统计（全量 token、工具命中、工作流分布）。
- **US-3**: 作为用户，查看工作流详情时能看到监控 tab（token 消耗、工具命中排行）。
- **US-4**: 作为用户，查看工具/Skill 详情时能看到消耗统计。

## AC

### AC-1 · 编排组监控 tab
- **Given** 编排组详情页
- **When** 点击「📊 监控」tab
- **Then** 展示 token 消耗趋势 + 成功率 + Agent 数量/状态 + 调度队列
- **验证**: 手动 UAT

### AC-2 · Agent 监控 tab（增强已有）
- **Given** Agent 详情页已有 monitor tab
- **When** 点击「📊 监控」tab
- **Then** 全量 token + 工具命中 + 工作流分布 + 模型分布（复用 EntityMonitor）
- **验证**: 手动 UAT

### AC-3 · 工作流监控 tab
- **Given** 工作流详情页
- **When** 点击「📊 监控」tab
- **Then** token 消耗 + 工具命中排行 + 执行时长
- **验证**: 手动 UAT

### AC-4 · 工具/Skill 消耗
- **Given** 工具/Skill 实体
- **When** 查看消耗统计
- **Then** 调用次数 + token 消耗 + 成功率
- **验证**: 手动 UAT

---

## 范围切分

### v1
- 编排组监控 tab
- Agent 监控增强
- 工作流监控 tab
- 工具消耗统计

### v2
- 实时推送
- 告警阈值

### out
- 新建独立监控页面

---

## 非功能性

- **性能**: 复用已有 API，响应 < 1s
- **安全**: 复用 owner_id 过滤
