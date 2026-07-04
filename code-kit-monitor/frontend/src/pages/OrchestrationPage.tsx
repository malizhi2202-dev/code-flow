import React, { useState, useEffect, useCallback } from 'react';
import YamlEditor from '../components/YamlEditor';
import OrchestrationCanvas from '../components/OrchestrationCanvas';
import TopologyMonitor from '../components/TopologyMonitor';
import TraceViewer from '../components/TraceViewer';
import { useOrchestration } from '../stores/orchestration';
import { Save, RotateCcw, Eye, ChevronLeft } from 'lucide-react';

const DEFAULT_YAML = `apiVersion: ai-platform/v1
kind: AgentOrchestration
metadata:
  name: my-orchestration
spec:
  agents:
    - name: reviewer
      kind: Agent
      spec:
        runtime: langgraph
        model:
          provider: openai
          name: gpt-4o
        workflow_id: 1
  routes:
    - from: reviewer
      to: reviewer
      type: sequential
`;

export default function OrchestrationPage() {
  const { yamlContent, setYamlContent, applyYaml, validateYaml, topologyState, setTopologyState } = useOrchestration();
  const [activeOrchId, setActiveOrchId] = useState<number | null>(null);
  const [splitRatio, setSplitRatio] = useState(40);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [validateResult, setValidateResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Initialize with default YAML if empty
  useEffect(() => {
    if (!yamlContent) setYamlContent(DEFAULT_YAML);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Migrate old spec_json data
  useEffect(() => {
    const oldData = localStorage.getItem('orchestration_spec_json');
    if (oldData) {
      try {
        const parsed = JSON.parse(oldData);
        if (parsed.nodes?.length) {
          const yaml = convertSpecJsonToYaml(parsed);
          setYamlContent(yaml);
          localStorage.removeItem('orchestration_spec_json');
        }
      } catch (_) {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync YAML → topology state
  useEffect(() => {
    try {
      const parsed = (window as any).jsyaml?.load(yamlContent);
      if (parsed?.spec?.agents) {
        const nodes = parsed.spec.agents.map((a: any, i: number) => ({
          id: `agent-${i}`,
          type: 'orchestrationNode',
          position: { x: 50 + i * 250, y: 100 + (i % 2) * 150 },
          data: { label: a.name, model: a.spec?.model?.name, status: 'not_started', badge: a.spec?.runtime },
        }));
        const edges = (parsed.spec.routes || []).map((r: any, i: number) => {
          const fromIdx = parsed.spec.agents.findIndex((a: any) => a.name === r.from);
          const toIdx = parsed.spec.agents.findIndex((a: any) => a.name === r.to);
          return {
            id: `edge-${i}`,
            source: `agent-${fromIdx >= 0 ? fromIdx : 0}`,
            target: `agent-${toIdx >= 0 ? toIdx : 0}`,
            label: r.type,
            type: 'smoothstep',
          };
        });
        setTopologyState({ nodes, edges });
      }
    } catch (_) {}
  }, [yamlContent]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = async () => {
    setLoading(true);
    const result = await applyYaml(yamlContent);
    setApplyResult(result);
    setLoading(false);
    if (result?.orchestration_id) setActiveOrchId(result.orchestration_id);
  };

  const handleValidate = async () => {
    const result = await validateYaml(yamlContent);
    setValidateResult(result);
  };

  const handleNodesChange = useCallback((nodes: any[]) => {
    setTopologyState({ ...topologyState, nodes });
  }, [topologyState, setTopologyState]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setShowTrace(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-card)',
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14 }}>Agent 编排</span>
        <input
          style={{ width: 200, padding: '4px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text)', fontSize: 12 }}
          placeholder="编排名称"
          value={yamlContent.match(/name:\s*(.+)/)?.[1] || ''}
          readOnly
        />
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={handleValidate} disabled={loading}>
          <Eye size={12} /> Validate
        </button>
        <button className="btn btn-primary" onClick={handleApply} disabled={loading}>
          {loading ? 'Deploying...' : <><RotateCcw size={12} /> Apply</>}
        </button>
      </div>

      {/* Main area: YAML + Canvas */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* YAML Panel */}
        <div style={{ width: `${splitRatio}%`, minWidth: 280, padding: 12, borderRight: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            📝 YAML 配置
          </div>
          <div style={{ flex: 1 }}>
            <YamlEditor value={yamlContent} onChange={setYamlContent} minHeight="100%" />
          </div>
          {validateResult && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 'var(--r-sm)',
              background: validateResult.valid ? 'var(--green-bg)' : 'var(--red-bg)',
              border: `1px solid ${validateResult.valid ? '#5cb878' : '#e05555'}`,
              fontSize: 11,
              color: validateResult.valid ? '#5cb878' : '#e05555',
            }}>
              {validateResult.valid ? '✅ YAML 校验通过' : `❌ ${validateResult.errors?.[0]?.message || '校验失败'}`}
            </div>
          )}
          {applyResult && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 'var(--r-sm)',
              background: applyResult.ok ? 'var(--green-bg)' : 'var(--red-bg)',
              border: `1px solid ${applyResult.ok ? '#5cb878' : '#e05555'}`,
              fontSize: 11,
              color: applyResult.ok ? '#5cb878' : '#e05555',
            }}>
              {applyResult.ok ? `✅ 部署成功 — ID: ${applyResult.orchestration_id}` : `❌ ${applyResult.detail || '部署失败'}`}
            </div>
          )}
        </div>

        {/* Resizer */}
        <div
          style={{ width: 4, cursor: 'col-resize', background: 'var(--border)', flexShrink: 0 }}
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startRatio = splitRatio;
            const onMove = (ev: MouseEvent) => {
              const containerWidth = (e.target as HTMLElement).parentElement?.offsetWidth || window.innerWidth;
              const newRatio = startRatio + ((ev.clientX - startX) / containerWidth) * 100;
              setSplitRatio(Math.max(25, Math.min(75, newRatio)));
            };
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        />

        {/* Canvas Panel */}
        <div style={{ flex: 1, padding: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <OrchestrationCanvas
              nodes={topologyState.nodes}
              edges={topologyState.edges}
              onNodesChange={handleNodesChange}
              onNodeClick={handleNodeClick}
            />
          </div>
          {activeOrchId && (
            <div style={{ marginTop: 8 }}>
              <TopologyMonitor instanceId={activeOrchId} collapsed />
            </div>
          )}
        </div>
      </div>

      {/* Trace side panel */}
      {showTrace && activeOrchId && (
        <div style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 380,
          background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>调用链: {selectedNodeId}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowTrace(false)}>
              <ChevronLeft size={14} />
            </button>
          </div>
          <TraceViewer instanceId={activeOrchId} />
        </div>
      )}
    </div>
  );
}

function convertSpecJsonToYaml(specJson: any): string {
  const agents = (specJson.nodes || []).map((n: any) =>
    `    - name: ${n.agentName || n.label || 'agent'}\n      kind: Agent\n      spec:\n        runtime: langgraph\n        model:\n          provider: openai\n          name: gpt-4o\n        workflow_id: ${n.agentId || 1}`
  ).join('\n');
  const routes = (specJson.edges || []).map((e: any) =>
    `    - from: ${e.from}\n      to: ${e.to}\n      type: ${e.strategy || 'sequential'}`
  ).join('\n');
  return `apiVersion: ai-platform/v1\nkind: AgentOrchestration\nmetadata:\n  name: migrated-orchestration\nspec:\n  agents:\n${agents}\n  routes:\n${routes}\n`;
}
