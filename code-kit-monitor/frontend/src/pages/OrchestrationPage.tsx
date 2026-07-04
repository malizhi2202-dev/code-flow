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
      // Prepend Start + append End（跳过yaml里已经叫start/end的）
      const hasStart = agentNodes.some((n: any) => n.id === 'start');
      const hasEnd = agentNodes.some((n: any) => n.id === 'end');
      const allNodes = [
        ...(hasStart ? [] : [{ id: 'start', type: 'startNode', position: { x: 80, y: 250 }, data: { label: 'START' } }]),
        ...agentNodes.filter((n: any) => n.id !== 'start' && n.id !== 'end'),
        ...(hasEnd ? [] : [{ id: 'end', type: 'endNode', position: { x: 80 + agentNodes.length * 260 + 200, y: 250 }, data: { label: 'END' } }]),
      ];
      setTopologyState({ nodes: allNodes as any, edges });
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

  // Canvas handlers — 仅本地更新状态，不自动回写YAML（避免死循环）
  const handleNodesChange = useCallback((nodes: any[]) => {
    setTopologyState({ nodes, edges: topologyState.edges });
  }, [topologyState.edges]);
  const handleEdgesChange = useCallback((edges: any[]) => {
    setTopologyState({ nodes: topologyState.nodes, edges });
  }, [topologyState.nodes]);

  // 手动同步：画布 → YAML
  const syncToYaml = () => {
    const yaml = topologyToYaml(topologyState.nodes, topologyState.edges, edgeConfigs, orchName);
    setYamlContent(yaml);
  };

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const edgeId = `edge-${Date.now()}`;
    const sourceNode = topologyState.nodes.find((n: any) => n.id === connection.source);
    const targetNode = topologyState.nodes.find((n: any) => n.id === connection.target);
    const sourceName = sourceNode?.data?.label || connection.source;
    const targetName = targetNode?.data?.label || connection.target;

    const newEdge = {
      id: edgeId, source: connection.source, target: connection.target,
      type: 'sequential', label: '顺序',
      markerEnd: { type: 'arrowclosed' as const, width: 14, height: 14, color: 'rgba(84,140,240,0.5)' },
      style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 },
    };
    setTopologyState({ nodes: topologyState.nodes, edges: [...topologyState.edges, newEdge] });
    setEdgeConfig(edgeId, defaultEdgeConfig(edgeId, sourceName, targetName));
    setSelectedEdge(edgeId);
  }, [topologyState.nodes]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    setSelectedEdge(edgeId);
  }, []);

  const handleEdgeSave = useCallback((config: EdgeConfig) => {
    setEdgeConfig(config.id, config);
  }, []);
  const handleEdgeDelete = useCallback((edgeId: string) => {
    removeEdgeConfig(edgeId);
    const newEdges = topologyState.edges.filter((e: any) => e.id !== edgeId);
    setTopologyState({ nodes: topologyState.nodes, edges: newEdges });
  }, [topologyState]);

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
    setTopologyState({ nodes: newNodes, edges: topologyState.edges });
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
        <button onClick={syncToYaml} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }} title="画布改动同步到YAML">
          <Save size={12} /> 同步
        </button>
        <button onClick={() => setShowYaml(!showYaml)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: showYaml ? 'var(--blue-bg)' : 'var(--bg-card)', border: `1px solid ${showYaml ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 'var(--r-sm)', color: showYaml ? 'var(--blue)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }}>
          <FileCode size={12} /> YAML
        </button>
        <button className="btn" onClick={handleValidate} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }}>
          <Eye size={12} /> Validate
        </button>
        <button className="btn btn-primary" onClick={handleApply} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 11 }}>
          {loading ? 'Deploying...' : <><RotateCcw size={12} /> Apply</>}
        </button>
      </div>

      {/* Main area — Dify 风格: NodePool + Canvas 全宽 + 底部YAML抽屉 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* NodePool sidebar */}
        <AgentNodePool
          agents={nodePool}
          existingNames={agentNames}
          onDragStart={() => {}}
          onAddAgent={() => window.open('/agents/new', '_blank')}
        />

        {/* Canvas — 占满剩余宽度 */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {topologyState.nodes.length === 0 && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
              <p style={{ fontSize: 14 }}>⏳ 正在加载编排拓扑...</p>
              <p style={{ fontSize: 10 }}>如果持续显示，请检查 YAML 中是否有 agents 定义</p>
            </div>
          )}
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
          {/* EdgeEditor 右侧滑出 */}
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
          {/* 结果提示浮层 */}
          {(validateResult || applyResult) && (
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {validateResult && (
                <div style={{ padding: '6px 12px', borderRadius: 'var(--r-sm)', background: validateResult.valid ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${validateResult.valid ? '#5cb878' : '#e05555'}`, fontSize: 10, color: validateResult.valid ? '#5cb878' : '#e05555' }}>
                  {validateResult.valid ? '✅ 校验通过' : `❌ ${validateResult.errors?.[0]?.message || '校验失败'}`}
                </div>
              )}
              {applyResult && (
                <div style={{ padding: '6px 12px', borderRadius: 'var(--r-sm)', background: applyResult.ok ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${applyResult.ok ? '#5cb878' : '#e05555'}`, fontSize: 10, color: applyResult.ok ? '#5cb878' : '#e05555' }}>
                  {applyResult.ok ? `✅ 部署成功 — ID: ${applyResult.orchestration_id}` : `❌ ${applyResult.detail || '部署失败'}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom YAML/MD 抽屉 — Dify 风格，点击顶栏按钮展开 */}
      <div style={{
        height: showYaml ? 240 : 0,
        overflow: showYaml ? 'auto' : 'hidden',
        transition: 'height 200ms var(--ease)',
        borderTop: showYaml ? '1px solid var(--border)' : 'none',
        background: 'var(--bg-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>📝 YAML 配置</span>
            <button onClick={handleToggleMode} style={{ fontSize: 9, padding: '1px 6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {showYaml ? 'MD' : 'YAML'}
            </button>
          </div>
          <button onClick={() => setShowYaml(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ height: 200, padding: 8 }}>
          {showYaml ? (
            <YamlEditor value={yamlContent} onChange={setYamlContent} minHeight="100%" />
          ) : (
            <textarea value={yamlContent} onChange={(e) => setYamlContent(e.target.value)}
              style={{ width: '100%', height: '100%', background: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", resize: 'none', boxSizing: 'border-box' }} />
          )}
        </div>
      </div>
    </div>
  );
}
