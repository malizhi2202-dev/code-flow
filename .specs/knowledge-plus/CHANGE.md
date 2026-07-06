# CHANGE: 知识库文件上传 + 文档嵌入进度

- **Change ID**: `knowledge-plus`
- **创建日期**: 2026-07-06
- **路径建议**: 完整
- **状态**: active

## Why

知识库已有 7 种资料源（RAG API / DB / Redis / HTTP / URL / 本地文件），唯独缺文件上传。竞品 Dify 支持拖拽 PDF/DOCX/TXT 直接嵌入。

## What

- 文件上传：multipart 上传 txt/md/pdf/docx/py/js/json，存入 knowledge_sources
- 嵌入进度：上传后异步提取文本→分块→存 agent_memories，进度 tracking
- 前端：拖拽上传区 + 进度条

## 范围排除

- 人工介入（P2）
- 向量数据库（v2）
- 音频/视频（不做）

## 验收线

- 上传 txt/pdf/md 文件后出现在知识库列表中
- 显示嵌入进度：uploading→processing→indexed
- 分块内容可通过 memory API 搜索到
