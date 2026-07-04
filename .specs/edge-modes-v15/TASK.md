# TASK: 连线模式 6→15 + 补全字段

- **Change ID**: edge-modes-v15

## 波次

```
Wave 1 (parallel): T01[P], T02[P], T03[P]
Wave 2:            T04 (depends on T01, T02, T03)
```

## 任务清单

```xml
<task id="T01" parallel="true" status="pending">
  <name>EdgeConfig 类型扩展 6→15 模式 + 新字段</name>
  <read_files>frontend/src/lib/orchestration-sync.ts</read_files>
  <write_files>frontend/src/lib/orchestration-sync.ts</write_files>
  <action>
    1. EdgeType 从 6 种扩展到 15 种：sequential | parallel | fork | master-slave |
       fan-out | fan-in | pipeline | map-reduce | event-trigger | retry-fallback |
       condition | dead-letter | human-approval (sub-orch/dynamic-router 标 v2)
    2. EdgeConfig 新增 5 字段：
       - wait_strategy: 'wait_all'|'wait_any'|'wait_first'|'wait_n'|'no_wait'
       - wait_n_count: number
       - merge_strategy: 'merge_all'|'merge_first'|'merge_concat'|'merge_pick'|'no_merge'
       - data_scope: 'all'|'subset'|'masked'
       - subset_fields: string[]
       - transform_expr: string
       - max_invocations: number (default 1)
    3. defaultEdgeConfig() 补全新字段默认值
  </action>
  <verify>npx tsc --noEmit src/lib/orchestration-sync.ts 2>&1 | grep -c "error TS"</verify>
  <done>EdgeType 15 种 + EdgeConfig 18 字段 + TypeScript 编译通过</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T02" parallel="true" status="pending">
  <name>EdgeEditor 表单补全新增字段</name>
  <read_files>frontend/src/components/EdgeEditor.tsx</read_files>
  <write_files>frontend/src/components/EdgeEditor.tsx</write_files>
  <action>
    EdgeEditor 面板新增字段 UI：
    1. 模式下拉框从 6→13 option（去除 v2 的 sub-orch/dynamic-router，标注灰色不可选）
    2. 新增「等待策略」区：wait_strategy 下拉 + wait_n_count number input（仅 wait_n 时显示）+ timeout_seconds + timeout_action
    3. 新增「数据范围」区：data_scope 下拉（all/subset/masked）+ subset_fields 多选（仅 subset 时显示，用 tag 选择器）
    4. 新增「数据转换」区：transform_expr textarea（JSON path 映射表达式）
    5. 新增「循环防护」区：max_invocations number input（默认 1）
    6. 合并策略放在连线配置顶部（当连线指向有多条入边的节点时显示 merge_strategy）
  </action>
  <verify>npx tsc --noEmit src/components/EdgeEditor.tsx 2>&1 | grep -c "error TS"</verify>
  <done>EdgeEditor 含全部新增字段控件，可编辑保存</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T03" parallel="true" status="pending">
  <name>13 种 Edge 组件样式扩展</name>
  <read_files>frontend/src/components/edges/</read_files>
  <write_files>
    frontend/src/components/edges/FanOutEdge.tsx
    frontend/src/components/edges/FanInEdge.tsx
    frontend/src/components/edges/PipelineEdge.tsx
    frontend/src/components/edges/MapReduceEdge.tsx
    frontend/src/components/edges/ConditionEdge.tsx
    frontend/src/components/edges/DeadLetterEdge.tsx
    frontend/src/components/edges/HumanApprovalEdge.tsx
    frontend/src/components/edges/index.ts
  </write_files>
  <action>
    新增 7 种 Edge 组件（6 已有 + 7 新 = 13）：
    - FanOutEdge: 蓝色扇形箭头 ⇶ 标签「扇出」
    - FanInEdge: 绿色汇聚箭头 ⇷ 标签「扇入」
    - PipelineEdge: 蓝色流线型 ↣ 标签「流水线」
    - MapReduceEdge: 紫色 M→R 标签「映射归约」
    - ConditionEdge: 橙色多分支 ⇢ 标签「条件:...」
    - DeadLetterEdge: 灰色虚线 ↪ 标签「死信」
    - HumanApprovalEdge: 黄色 ⏸ 标签「人工确认」
    更新 edges/index.ts 注册全部 13 种 edgeTypes。
  </action>
  <verify>npx tsc --noEmit src/components/edges/index.ts 2>&1 | grep -c "error TS"</verify>
  <done>13 种 Edge 组件可 import，视觉样式各异</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T04" parallel="false" status="pending">
  <name>集成验证：编译 + API 测试</name>
  <read_files>
    frontend/src/pages/OrchestrationPage.tsx
    backend/models/orchestration.py
    backend/routes/orchestration_api.py
  </read_files>
  <write_files></write_files>
  <action>
    1. 全量 tsc --noEmit 验证
    2. curl POST apply 含新字段的 edges_config
    3. EdgeEditor 表单手动 UAT（打开画布→创建连线→填新字段→保存）
  </action>
  <verify>npx tsc --noEmit --pretty 2>&1 | grep -E "EdgeEditor|orchestration-sync|edges/" | head -5 && echo "OK"</verify>
  <done>全量编译通过 + API 接受新字段</done>
  <depends_on>T01, T02, T03</depends_on>
  <auto>false</auto>
</task>
```
