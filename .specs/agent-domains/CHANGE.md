# CHANGE: Agent 隔离域

- **Change ID**: `agent-domains`
- **创建日期**: 2026-07-06
- **路径建议**: 完整
- **状态**: draft

---

## Why（为什么做）

当前 17 个 Agent 全平台互相可见——没有隔离边界。DESIGN.md §12 已设计完整的隔离域方案，需要在管控面内落地第一波：让 Agent 按域归属，域间互不可见，域内自由组合。

## What（做什么）

新增 `domains` 表 + Agent 绑定 `domain_id`，管控面按域分层展示：

- 后端：`domains` 表（id, name, owner_id），`agents` 表加 `domain_id`，API 加 `?domain_id=` 过滤
- 前端：管控面改为递进式 UI——总览 → 域列表 → 域内 Agent 组（按 capability）→ 单 Agent 详情

## 视觉调性（前端项目）

- **选定**：工业（Industrial）— 沿用现有暗色主题
- **理由**：管控运维面板，数据密度优先

## What（做什么）

一次性落地隔离域完整方案：

- 后端：`domains` 表 + Agent 绑定 `domain_id` + API 按域过滤 + 域删除/创建 CRUD
- 前端：管控面递进式 UI（总览→域→Agent组→Agent）+ 域内路由策略配置
- Agent 归属：继承创建者默认域，可手动改域
- 默认域：系统自动创建，域删除时 Agent 回默认域

## 范围排除（这次不做）

- 弹性伸缩（副本自动创建）
- 记忆系统自动加载（v2）
- 网关路由组件（v2）
- 全栈机器监控（v2）
- 跨域 allow_outbound 配置（v2）

## 验收线

- 管控面显示域列表，每个域下有该域的 Agent（递进式 UI）
- API 支持 CRUD 域 + `?domain_id=` 过滤 Agent
- 未绑定域的 Agent 显示在「默认域」
- 域删除时 Agent 自动回默认域，不级联删除
- Agent 创建时自动归入创建者的默认域

## 风险与未知

- Agent 归属域的方式待定（手动选 vs 默认继承创建者的域）
- 域层级 v1 暂定平级，父子关系留 v2
