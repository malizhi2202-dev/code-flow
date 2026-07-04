---
name: code-kit
description: code-kit 统一入口 — 每次会话必须首先调用。路由到 0-change / 1-requirement / 2-design / 3-task / 4-dev / 5-test / 6-review / 7-integration。
---

# code-kit 入口技能

**本技能是项目级强制入口。每次会话开始，AI 必须：**

1. 第一步：读取 `@code-kit/GO.md`，按其完整流程执行
2. 严格遵循 GO.md 中的路由表、Token 预算、Artifact Preflight Gate、第三步老项目检测、第四步自动准备、第五步路由声明、第六步执行
3. **不允许**跳过任何步骤（尤其是第三步项目状态读取和 Artifact Preflight Gate）
4. **不允许**在不读 GO.md 的情况下直接开始写代码

## 触发条件

- 用户发送任何与开发相关的请求
- 用户 `@code-kit/GO.md` 或 `/code-kit`
- 会话开始时，如果用户未显式指定其他流程

## 行为

加载 `code-kit/GO.md` 并按其指令执行完整路由流程。
