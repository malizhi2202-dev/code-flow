/** 编排画布 v2: YAML ↔ 画布 双向同步 + MD 转换工具函数. */
import type { Node, Edge } from '@xyflow/react';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

// ── 15 种连线模式（v1 实现 13 种，v2 补 sub-orch / dynamic-router）──
export type EdgeType =
  // 顺序型
  | 'sequential' | 'pipeline'
  // 并发型
  | 'parallel' | 'fan-out'
  // 聚合型
  | 'fan-in' | 'map-reduce'
  // 路由型
  | 'fork' | 'condition'  // v2: 'dynamic-router'
  // 层级型
  | 'master-slave'  // v2: 'sub-orch'
  // 事件/人工型
  | 'event-trigger' | 'human-approval'
  // 容错/归档型
  | 'retry-fallback' | 'dead-letter';

export type TriggerType = 'auto' | 'event' | 'schedule' | 'manual' | 'human';
export type BackoffType = 'fixed' | 'exponential';
export type IoFilterType = 'none' | 'mask_pii' | 'schema_only';
export type WaitStrategy = 'wait_all' | 'wait_any' | 'wait_first' | 'wait_n' | 'no_wait';
export type MergeStrategy = 'merge_all' | 'merge_first' | 'merge_concat' | 'merge_pick' | 'no_merge';
export type DataScope = 'all' | 'subset' | 'masked';
export type TimeoutAction = 'degrade' | 'skip' | 'fail' | 'retry';

export interface RetryPolicy {
  max_retries: number;
  backoff: BackoffType;
  fallback_node: string | null;
}

export interface EdgeConfig {
  id: string;
  source: string;
  target: string;
  // 路由
  type: EdgeType;
  description: string;
  // 触发
  trigger_type: TriggerType;
  trigger_condition: string;
  // 数据
  data_scope: DataScope;
  subset_fields: string[];
  transform_expr: string;
  // IO Schema
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  // 等待与合并
  wait_strategy: WaitStrategy;
  wait_n_count: number;
  merge_strategy: MergeStrategy;
  timeout_seconds: number;
  timeout_action: TimeoutAction;
  // 安全
  gate_pre: string;
  gate_post: string;
  io_filter: IoFilterType;
  // 资源
  token_soft_limit: number;
  token_hard_limit: number;
  // 容错
  retry_policy: RetryPolicy;
  // 循环防护
  max_invocations: number;
}

export function defaultEdgeConfig(id: string, source: string, target: string): EdgeConfig {
  return {
    id, source, target,
    type: 'sequential',
    description: '',
    trigger_type: 'auto',
    trigger_condition: '',
    data_scope: 'all',
    subset_fields: [],
    transform_expr: '',
    input_schema: { type: 'object', properties: {} },
    output_schema: { type: 'object', properties: {} },
    wait_strategy: 'wait_all',
    wait_n_count: 1,
    merge_strategy: 'merge_all',
    timeout_seconds: 60,
    timeout_action: 'degrade',
    gate_pre: 'noop',
    gate_post: 'noop',
    io_filter: 'none',
    token_soft_limit: 80000,
    token_hard_limit: 100000,
    retry_policy: { max_retries: 3, backoff: 'exponential', fallback_node: null },
    max_invocations: 1,
  };
}

export interface TopologyState {
  nodes: Node[];
  edges: Edge[];
}

// ═══════════════════════════════════════════
// YAML → Topology
// ═══════════════════════════════════════════

interface YamlAgent {
  name: string;
  kind?: string;
  spec?: {
    runtime?: string;
    model?: { provider?: string; name?: string };
    workflow_id?: number;
  };
  position?: { x: number; y: number };
}

interface YamlRoute {
  from: string;
  to: string;
  type?: string;
  trigger_condition?: string;
  trigger_type?: string;
  description?: string;
}

export function yamlToTopology(yamlText: string): {
  nodes: Node[];
  edges: Edge[];
  edgeConfigs: Map<string, EdgeConfig>;
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const edgeConfigs = new Map<string, EdgeConfig>();

  if (!yamlText.trim()) return { nodes, edges, edgeConfigs };

  const doc = parseYamlSafe(yamlText);
  if (!doc || !doc.spec) return { nodes, edges, edgeConfigs };

  const agents: YamlAgent[] = doc.spec.agents || [];
  const routes: YamlRoute[] = doc.spec.routes || [];

  agents.forEach((agent, i) => {
    nodes.push({
      id: `agent-${i}`,
      type: 'orchestrationNode',
      position: agent.position || { x: 50 + i * 250, y: 100 + (i % 2) * 150 },
      data: {
        label: agent.name,
        model: agent.spec?.model?.name || '',
        runtime: agent.spec?.runtime || 'langgraph',
        status: 'not_started',
        badge: agent.spec?.runtime || 'langgraph',
        agentId: agent.spec?.workflow_id,
      },
    });
  });

  routes.forEach((route, i) => {
    const edgeId = `edge-${i}`;
    const sourceIdx = agents.findIndex((a) => a.name === route.from);
    const targetIdx = agents.findIndex((a) => a.name === route.to);
    const source = `agent-${sourceIdx >= 0 ? sourceIdx : 0}`;
    const target = `agent-${targetIdx >= 0 ? targetIdx : 0}`;

    edges.push({
      id: edgeId,
      source,
      target,
      type: route.type || 'sequential',
      label: route.type || '顺序',
    });

    edgeConfigs.set(edgeId, {
      ...defaultEdgeConfig(edgeId, route.from, route.to),
      type: (route.type as EdgeType) || 'sequential',
      trigger_condition: route.trigger_condition || '',
      trigger_type: (route.trigger_type as TriggerType) || 'auto',
      description: route.description || '',
    });
  });

  return { nodes, edges, edgeConfigs };
}

// ═══════════════════════════════════════════
// Topology → YAML
// ═══════════════════════════════════════════

export function topologyToYaml(
  nodes: Node[],
  edges: Edge[],
  edgeConfigs: Map<string, EdgeConfig>,
  name: string = 'my-orchestration',
): string {
  const agents = nodes.map((node) => ({
    name: node.data.label || 'agent',
    kind: 'Agent',
    spec: {
      runtime: node.data.runtime || 'langgraph',
      model: {
        provider: 'openai',
        name: node.data.model || 'gpt-4o',
      },
      workflow_id: node.data.agentId || 1,
    },
    position: node.position,
  }));

  const routes = edges.map((edge) => {
    const fromNode = nodes.find((n) => n.id === edge.source);
    const toNode = nodes.find((n) => n.id === edge.target);
    const config = edgeConfigs.get(edge.id);
    return {
      from: fromNode?.data?.label || edge.source,
      to: toNode?.data?.label || edge.target,
      type: config?.type || 'sequential',
      trigger_condition: config?.trigger_condition || undefined,
      trigger_type: config?.trigger_type || undefined,
      description: config?.description || undefined,
    };
  });

  const doc = {
    apiVersion: 'ai-platform/v1',
    kind: 'AgentOrchestration',
    metadata: { name },
    spec: { agents, routes },
  };

  return dumpYamlSafe(doc);
}

// ═══════════════════════════════════════════
// YAML ↔ MD
// ═══════════════════════════════════════════

export function yamlToMd(yamlText: string): string {
  const doc = parseYamlSafe(yamlText);
  if (!doc) return `# 编排\n\n> 无法解析 YAML`;

  const meta = doc.metadata || {};
  const spec = doc.spec || {};
  const agents: YamlAgent[] = spec.agents || [];
  const routes: YamlRoute[] = spec.routes || [];

  const lines: string[] = [];
  lines.push(`# 编排: ${meta.name || '未命名'}`);
  lines.push('');
  lines.push('## Agent 列表');
  lines.push('');
  lines.push('| # | 名称 | Runtime | 模型 | Workflow ID |');
  lines.push('|---|---|---|---|---|');
  agents.forEach((a, i) => {
    const s = a.spec || {};
    lines.push(`| ${i + 1} | ${a.name} | ${s.runtime || '-'} | ${s.model?.name || '-'} | ${s.workflow_id || '-'} |`);
  });
  lines.push('');
  if (routes.length > 0) {
    lines.push('## 路由表');
    lines.push('');
    lines.push('| # | From | To | 类型 | 触发条件 | 描述 |');
    lines.push('|---|---|---|---|---|---|');
    routes.forEach((r, i) => {
      lines.push(`| ${i + 1} | ${r.from} | ${r.to} | ${r.type || 'sequential'} | ${r.trigger_condition || '-'} | ${r.description || '-'} |`);
    });
  }
  return lines.join('\n');
}

export function mdToYaml(mdText: string): string {
  // 简易 MD table → YAML parser
  const nameMatch = mdText.match(/^# 编排:\s*(.+)/m);
  const name = nameMatch ? nameMatch[1].trim() : 'imported-orchestration';

  const agents: YamlAgent[] = [];
  const routes: YamlRoute[] = [];

  let inAgentTable = false;
  let inRouteTable = false;

  for (const rawLine of mdText.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('## Agent')) { inAgentTable = true; inRouteTable = false; continue; }
    if (line.startsWith('## 路由')) { inRouteTable = true; inAgentTable = false; continue; }
    if (line.startsWith('##')) { inAgentTable = false; inRouteTable = false; continue; }
    if (line.startsWith('|---') || line.startsWith('| #')) continue;

    if (inAgentTable && line.startsWith('|') && !line.includes('---')) {
      const cols = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 4) {
        agents.push({
          name: cols[1],
          spec: { runtime: cols[2], model: { provider: 'openai', name: cols[3] }, workflow_id: parseInt(cols[4]) || 1 },
        });
      }
    }
    if (inRouteTable && line.startsWith('|') && !line.includes('---')) {
      const cols = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 4) {
        routes.push({
          from: cols[1], to: cols[2],
          type: cols[3] || 'sequential',
          trigger_condition: cols[4] !== '-' ? cols[4] : undefined,
          description: cols[5] !== '-' ? cols[5] : undefined,
        });
      }
    }
  }

  return dumpYamlSafe({
    apiVersion: 'ai-platform/v1',
    kind: 'AgentOrchestration',
    metadata: { name },
    spec: { agents, routes },
  });
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function parseYamlSafe(text: string): Record<string, any> | null {
  try {
    const jsyaml = (window as any).jsyaml;
    if (jsyaml?.load) return jsyaml.load(text);
    return null;
  } catch {
    return null;
  }
}

function dumpYamlSafe(obj: Record<string, any>): string {
  try {
    const jsyaml = (window as any).jsyaml;
    if (jsyaml?.dump) return jsyaml.dump(obj, { indent: 2 });
  } catch {
    // js-yaml not available, use fallback
  }
  // fallback: simple YAML dump
  let y = '';
  y += `apiVersion: ${obj.apiVersion || 'ai-platform/v1'}\n`;
  y += `kind: ${obj.kind || 'AgentOrchestration'}\n`;
  y += `metadata:\n  name: ${obj.metadata?.name || 'unnamed'}\n`;
  y += 'spec:\n  agents:\n';
  for (const a of obj.spec?.agents || []) {
    y += `    - name: ${a.name}\n      kind: Agent\n      spec:\n        runtime: ${a.spec?.runtime || 'langgraph'}\n        model:\n          provider: ${a.spec?.model?.provider || 'openai'}\n          name: ${a.spec?.model?.name || 'gpt-4o'}\n        workflow_id: ${a.spec?.workflow_id || 1}\n`;
    if (a.position) y += `        position: {x: ${a.position.x}, y: ${a.position.y}}\n`;
  }
  y += '  routes:\n';
  for (const r of obj.spec?.routes || []) {
    y += `    - from: ${r.from}\n      to: ${r.to}\n      type: ${r.type || 'sequential'}\n`;
    if (r.trigger_condition) y += `      trigger_condition: "${r.trigger_condition}"\n`;
    if (r.trigger_type) y += `      trigger_type: ${r.trigger_type}\n`;
    if (r.description) y += `      description: "${r.description}"\n`;
  }
  return y;
}
