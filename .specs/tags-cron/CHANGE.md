# CHANGE: 知识库标签 + 定时触发器

- **Change ID**: `tags-cron`
- **创建日期**: 2026-07-06
- **路径建议**: 完整
- **状态**: active

## Why

知识库有 7 种资料源 + 文件上传，但缺少分类筛选手段。Agent 任务全靠手动触发，无法自动化。竞品 Dify 有标签管理，n8n 有 Cron 触发器。

## What

A. 知识库标签：knowledge_tags 表 + 标签云筛选 + 绑定/解绑
B. 定时触发器：cron 表达式 + asyncio 轮询 + Agent 自动执行

## 影响面

- [x] 新增 knowledge_tags / knowledge_source_tags / scheduled_tasks 表
- [x] 前端 KnowledgeBase.tsx + AgentDetail.tsx

## 范围排除

- 复杂 cron（只支持 5 字段标准格式）
- 标签颜色自定义（v1 默认色）

## 验收线

- 创建标签 → 绑定到知识源 → 按标签筛选
- 创建 cron 任务 → 到时间自动执行 Agent
