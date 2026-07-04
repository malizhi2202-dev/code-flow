/** 编排画布编辑页 — 三栏布局 + YAML/MD↔画布 双向同步. */
import { useState, useEffect, useCallback, useRef } from 'react';
import YamlEditor from '../components/YamlEditor';
import OrchestrationCanvas from '../components/OrchestrationCanvas';
import EdgeEditor from '../components/EdgeEditor';
import AgentNodePool from '../components/AgentNodePool';
import TopologyMonitor from '../components/TopologyMonitor';
import { useOrchestration, AgentPoolItem } from '../stores/orchestration';
import { yamlToTopology, topologyToYaml, defaultEdgeConfig, EdgeConfig } from '../lib/orchestration-sync';
import { Save, RotateCcw, Eye, FileText, FileCode } from 'lucide-react';
import type { Connection } from '@xyflow/react';

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

const uid = () => localStorage.getItem('current_user_id') || 'admin';

export default function OrchestrationPage() {
  const store = useOrchestration();
  const {
    yamlContent, setYamlContent, applyYaml, validateYaml,
    topologyState, setTopologyState, edgeConfigs, setEdgeConfig, removeEdgeConfig,
    nodePool, fetchNodePool, selectedEdgeId, setSelectedEdge,
  } = store;

  const [showYaml, setShowYaml] = useState(true); // true=yaml, false=md
  const [splitRatio, setSplitRatio] = useState(40);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [validateResult, setValidateResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeOrchId, setActiveOrchId] = useState<number | null>(null);
  const [orchName, setOrchName] = useState('my-orchestration');

  const canvasDirtyRef = useRef(false);
  const yamlDirtyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load existing orchestration or init default
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/orchestration\/(\d+)\/edit/);
    if (match) {
      const id = parseInt(match[1]);
      fetch(`/api/orchestration/${id}`, { headers: { 'X-User-Id': uid() } })
        .then((r) => r.json())
        .then((d) => {
          setYamlContent(d.yaml_raw || '');
          setActiveOrchId(id);
          setOrchName(d.name || 'my-orchestration');
          if (d.edges_json) {
            d.edges_json.forEach((ec: EdgeConfig) => setEdgeConfig(ec.id, ec));
          }
        });
    } else if (!yamlContent) {
      setYamlContent(DEFAULT_YAML);
    }
    fetchNodePool();
  }, []);

  // YAML → Canvas sync
  useEffect(() => {
    if (canvasDirtyRef.current) { canvasDirtyRef.current = false; return; }
    yamlDirtyRef.current = true;
    clearTimeout(debounceRef.current!);
    debounceRef.current = setTimeout(() => {
      const text = showYaml ? yamlContent : '';
      if (!text) return;
      const { nodes: agentNodes, edges, edgeConfigs: ecs } = yamlToTopology(text);
      // Prepend Start + append End nodes (Dify style)
      const startNode = { id: 'start', type: 'startNode', position: { x: 80, y: 200 }, data: { label: 'START' } };
      const endNode = { id: 'end', type: 'endNode', position: { x: 80 + agentNodes.length * 260 + 200, y: 200 }, data: { label: 'END' } };
      const allNodes = [startNode, ...agentNodes, endNode];
      setTopologyState({ nodes: allNodes, edges });
      ecs.forEach((ec, id) => setEdgeConfig(id, ec));
      yamlDirtyRef.current = false;
    }, 300);
  }, [yamlContent, showYaml]);

  // Editor mode toggle → regenerate YAML from canvas if switching to YAML
  const handleToggleMode = () => {
    if (!showYaml) {
      // switching from MD to YAML → regenerate
      const yaml = topologyToYaml(topologyState.nodes, topologyState.edges, edgeConfigs, orchName);
      setYamlContent(yaml);
    }
    setShowYaml(!showYaml);
  };

  // Canvas handlers
  const handleNodesChange = useCallback((nodes: any[]) => {
    if (yamlDirtyRef.current) return;
    canvasDirtyRef.current = true;
    setTopologyState({ ...topologyState, nodes });
    clearTimeout(debounceRef.current!);
    debounceRef.current = setTimeout(() => {
      const yaml = topologyToYaml(nodes, topologyState.edges, edgeConfigs, orchName);
      setYamlContent(yaml);
      canvasDirtyRef.current = false;
    }, 300);
  }, [topologyState, edgeConfigs, orchName]);

  const handleEdgesChange = useCallback((edges: any[]) => {
    if (yamlDirtyRef.current) return;
    canvasDirtyRef.current = true;
    setTopologyState({ ...topologyState, edges });
    clearTimeout(debounceRef.current!);
    debounceRef.current = setTimeout(() => {
      const yaml = topologyToYaml(topologyState.nodes, edges, edgeConfigs, orchName);
      setYamlContent(yaml);
      canvasDirtyRef.current = false;
    }, 300);
  }, [topologyState, edgeConfigs, orchName]);

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const edgeId = `edge-${Date.now()}`;
    const sourceNode = topologyState.nodes.find((n) => n.id === connection.source);
    const targetNode = topologyState.nodes.find((n) => n.id === connection.target);
    const sourceName = sourceNode?.data?.label || connection.source;
    const targetName = targetNode?.data?.label || connection.target;

    // Create edge
    const newEdge = {
      id: edgeId, source: connection.source, target: connection.target,
      type: 'sequential', label: '顺序',
      markerEnd: { type: 'arrowclosed' as const, width: 14, height: 14, color: 'rgba(84,140,240,0.5)' },
      style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 },
    };
    const newEdges = [...topologyState.edges, newEdge];
    setTopologyState({ ...topologyState, edges: newEdges });

    // Create default edge config
    setEdgeConfig(edgeId, defaultEdgeConfig(edgeId, sourceName, targetName));

    // Open editor
    setSelectedEdge(edgeId);

    // Trigger YAML sync
    canvasDirtyRef.current = true;
    clearTimeout(debounceRef.current!);
    debounceRef.current = setTimeout(() => {
      const yaml = topologyToYaml(topologyState.nodes, newEdges, edgeConfigs, orchName);
      setYamlContent(yaml);
      canvasDirtyRef.current = false;
    }, 300);
  }, [topologyState, edgeConfigs, orchName]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    setSelectedEdge(edgeId);
  }, []);

  const handleEdgeSave = useCallback((config: EdgeConfig) => {
    setEdgeConfig(config.id, config);
    // sync to YAML
    const yaml = topologyToYaml(topologyState.nodes, topologyState.edges, edgeConfigs, orchName);
    setYamlContent(yaml);
  }, [topologyState, edgeConfigs, orchName]);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    removeEdgeConfig(edgeId);
    const newEdges = topologyState.edges.filter((e) => e.id !== edgeId);
    setTopologyState({ ...topologyState, edges: newEdges });
    const yaml = topologyToYaml(topologyState.nodes, newEdges, edgeConfigs, orchName);
    setYamlContent(yaml);
  }, [topologyState, edgeConfigs, orchName]);

  const handleNodeDetailClick = useCallback((nodeId: string) => {
    const node = topologyState.nodes.find((n) => n.id === nodeId);
    const agentId = node?.data?.agentId;
    if (agentId) window.open(`/agents/${agentId}`, '_blank');
  }, [topologyState]);

  const handleDrop = useCallback((agent: AgentPoolItem, position: { x: number; y: number }) => {
    const nodeId = `agent-${Date.now()}`;
    const newNode = {
      id: nodeId, type: 'orchestrationNode', position,
      data: { label: agent.name, model: agent.model_name, runtime: agent.runtime, badge: agent.runtime, status: 'not_started', agentId: agent.id },
    };
    const newNodes = [...topologyState.nodes, newNode];
    setTopologyState({ ...topologyState, nodes: newNodes });
    const yaml = topologyToYaml(newNodes, topologyState.edges, edgeConfigs, orchName);
    setYamlContent(yaml);
  }, [topologyState, edgeConfigs, orchName]);

  const handleApply = async () => {
    setLoading(true);
    const ecArr: EdgeConfig[] = [];
    edgeConfigs.forEach((v) => ecArr.push(v));
    const result = await applyYaml(yamlContent, ecArr);
    setApplyResult(result);
    setLoading(false);
    if (result?.orchestration_id) setActiveOrchId(result.orchestration_id);
  };

  const handleValidate = async () => {
    const result = await validateYaml(yamlContent);
    setValidateResult(result);
  };

  const selectedEdge = selectedEdgeId ? edgeConfigs.get(selectedEdgeId) : null;
  const selectedEdgeObj = selectedEdgeId ? topologyState.edges.find((e) => e.id === selectedEdgeId) : null;
  const agentNames = topologyState.nodes.map((n) => n.data?.label || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-card)',
      }}>
        <a href="/orchestration" style={{ fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'none' }}>← 列表</a>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14 }}>Agent 编排</span>
        <input
          style={{ width: 180, padding: '4px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text)', fontSize: 12 }}
          value={orchName}
          onChange={(e) => setOrchName(e.target.value)}
          placeholder="编排名称"
        />
        <div style={{ flex: 1 }} />
        <button onClick={handleToggleMode} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }}>
          {showYaml ? <><FileText size={12} /> MD</> : <><FileCode size={12} /> YAML</>}
        </button>
        <button className="btn" onClick={handleValidate} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }}>
          <Eye size={12} /> Validate
        </button>
        <button className="btn btn-primary" onClick={handleApply} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 11 }}>
          {loading ? 'Deploying...' : <><RotateCcw size={12} /> Apply</>}
        </button>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* NodePool sidebar */}
        <AgentNodePool
          agents={nodePool}
          existingNames={agentNames}
          onDragStart={() => {}}
          onAddAgent={() => window.open('/agents/new', '_blank')}
        />

        {/* YAML/MD Panel */}
        <div style={{ width: `${splitRatio}%`, minWidth: 250, padding: 12, borderRight: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {showYaml ? '📝 YAML 配置' : '📄 Markdown'}
          </div>
          <div style={{ flex: 1 }}>
            {showYaml ? (
              <YamlEditor value={yamlContent} onChange={setYamlContent} minHeight="100%" />
            ) : (
              <textarea
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                style={{ width: '100%', height: '100%', background: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", resize: 'none', boxSizing: 'border-box' }}
              />
            )}
          </div>
          {validateResult && (
            <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 'var(--r-sm)', background: validateResult.valid ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${validateResult.valid ? '#5cb878' : '#e05555'}`, fontSize: 10, color: validateResult.valid ? '#5cb878' : '#e05555' }}>
              {validateResult.valid ? '✅ 校验通过' : `❌ ${validateResult.errors?.[0]?.message || '校验失败'}`}
            </div>
          )}
          {applyResult && (
            <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 'var(--r-sm)', background: applyResult.ok ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${applyResult.ok ? '#5cb878' : '#e05555'}`, fontSize: 10, color: applyResult.ok ? '#5cb878' : '#e05555' }}>
              {applyResult.ok ? `✅ 部署成功 — ID: ${applyResult.orchestration_id}` : `❌ ${applyResult.detail || '部署失败'}`}
            </div>
          )}
        </div>

        {/* Resizer */}
        <div style={{ width: 4, cursor: 'col-resize', background: 'var(--border)', flexShrink: 0 }}
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startRatio = splitRatio;
            const onMove = (ev: MouseEvent) => {
              const containerWidth = (e.target as HTMLElement).parentElement?.offsetWidth || window.innerWidth;
              setSplitRatio(Math.max(20, Math.min(70, startRatio + ((ev.clientX - startX) / containerWidth) * 100)));
            };
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        />

        {/* Canvas */}
        <div style={{ flex: 1, padding: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ flex: 1 }}>
            <OrchestrationCanvas
              nodes={topologyState.nodes}
              edges={topologyState.edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={handleConnect}
              onEdgeClick={handleEdgeClick}
              onNodeDetailClick={handleNodeDetailClick}
              onDrop={handleDrop}
            />
          </div>
          {selectedEdgeId && selectedEdgeObj && (
            <EdgeEditor
              edgeId={selectedEdgeId}
              source={selectedEdgeObj.source}
              target={selectedEdgeObj.target}
              config={selectedEdge || null}
              onSave={handleEdgeSave}
              onDelete={handleEdgeDelete}
              onClose={() => setSelectedEdge(null)}
              agentNames={agentNames}
            />
          )}
          {activeOrchId && (
            <div style={{ marginTop: 6 }}>
              <TopologyMonitor instanceId={activeOrchId} collapsed />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
