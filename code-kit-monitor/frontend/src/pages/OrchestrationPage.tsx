import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, Save, Plus, Trash2, X, Play, GitFork, ArrowRight, GitBranch, Clock, AlertTriangle } from 'lucide-react';
import { useAgents } from '../stores/agents';

interface AgentNode { id: string; agentId: number; agentName: string; model: string; x: number; y: number; }
interface EdgeData { id: string; from: string; to: string; strategy: string; inputDesc: string; outputDesc: string; endCondition: string; constraint: string; }

var STRATEGIES = [
  { id: 'sequential', label: '顺序调用', icon: <ArrowRight size={12} />, desc: 'A完成→B开始，A输出→B输入' },
  { id: 'subagent', label: '子Agent', icon: <GitBranch size={12} />, desc: 'B作为A的子任务执行' },
  { id: 'mixed', label: '混合模式', icon: <GitFork size={12} />, desc: 'A和B并行→C汇聚' },
  { id: 'conditional', label: '条件调用', icon: <AlertTriangle size={12} />, desc: '满足条件时调用B' },
  { id: 'constrained', label: '约束调用', icon: <Clock size={12} />, desc: '在约束下调用B' },
];

export default function OrchestrationPage() {
  var { agents, fetchAgents } = useAgents();
  var [nodes, setNodes] = useState<AgentNode[]>([]);
  var [edges, setEdges] = useState<EdgeData[]>([]);
  var [selectedEdge, setSelectedEdge] = useState<EdgeData | null>(null);
  var [dragging, setDragging] = useState<string | null>(null);
  var [connecting, setConnecting] = useState<{ from: string; x: number; y: number } | null>(null);
  var [saved, setSaved] = useState(false);
  var [showYaml, setShowYaml] = useState(false);
  var svgRef = useRef<SVGSVGElement>(null);
  var containerRef = useRef<HTMLDivElement>(null);

  useEffect(function() { fetchAgents(); }, []);

  // 拖拽 Agent 到画布
  var handleDrop = function(e: React.DragEvent) {
    e.preventDefault();
    var agentId = parseInt(e.dataTransfer.getData('agentId'));
    var agent = agents.find(function(a) { return a.id === agentId; });
    if (!agent) return;
    var rect = containerRef.current?.getBoundingClientRect();
    var x = (e.clientX - (rect?.left || 0)) - 80;
    var y = (e.clientY - (rect?.top || 0)) - 30;
    setNodes(nodes.concat([{ id: 'n' + Date.now(), agentId: agent.id, agentName: agent.name, model: agent.model_name || '', x: Math.max(0, x), y: Math.max(0, y) }]));
  };

  // 节点拖拽
  var handleMouseDown = function(nodeId: string) { setDragging(nodeId); };
  var handleMouseMove = function(e: React.MouseEvent) {
    if (!dragging || connecting) return;
    var rect = containerRef.current?.getBoundingClientRect();
    var x = e.clientX - (rect?.left || 0) - 80;
    var y = e.clientY - (rect?.top || 0) - 30;
    setNodes(nodes.map(function(n) { return n.id === dragging ? Object.assign({}, n, { x: Math.max(0, x), y: Math.max(0, y) }) : n; }));
  };
  var handleMouseUp = function() { setDragging(null); };

  // 连线
  var startConnect = function(nodeId: string, e: React.MouseEvent) {
    e.stopPropagation();
    var node = nodes.find(function(n) { return n.id === nodeId; });
    if (!node) return;
    setConnecting({ from: nodeId, x: node.x + 80, y: node.y + 30 });
  };
  var handleCanvasClick = function(e: React.MouseEvent) {
    if (!connecting) return;
    var rect = containerRef.current?.getBoundingClientRect();
    var x = e.clientX - (rect?.left || 0);
    var y = e.clientY - (rect?.top || 0);
    // 检测点击了哪个节点
    var target = nodes.find(function(n) {
      return x >= n.x && x <= n.x + 160 && y >= n.y && y <= n.y + 72;
    });
    if (target && target.id !== connecting.from) {
      setEdges(edges.concat([{
        id: 'e' + Date.now(), from: connecting.from, to: target.id,
        strategy: 'sequential', inputDesc: '', outputDesc: '', endCondition: '', constraint: ''
      }]));
    }
    setConnecting(null);
  };

  var deleteNode = function(nodeId: string) {
    setNodes(nodes.filter(function(n) { return n.id !== nodeId; }));
    setEdges(edges.filter(function(e) { return e.from !== nodeId && e.to !== nodeId; }));
  };

  var deleteEdge = function(edgeId: string) { setEdges(edges.filter(function(e) { return e.id !== edgeId; })); setSelectedEdge(null); };

  var updateEdge = function(field: string, value: string) {
    if (!selectedEdge) return;
    setEdges(edges.map(function(e) { return e.id === selectedEdge.id ? Object.assign({}, e, { [field]: value }) : e; }));
    setSelectedEdge(function(prev: any) { return prev ? Object.assign({}, prev, { [field]: value }) : null; });
  };

  var handleSave = function() {
    var uid = localStorage.getItem('current_user_id') || 'admin';
    var yaml = buildYaml();
    fetch('/api/orchestration/validate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid }, body: JSON.stringify({ yaml_raw: yaml }) })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.valid) { setSaved(true); setTimeout(function() { setSaved(false); }, 1500); }
      });
  };

  var buildYaml = function() {
    var lines = ['apiVersion: ai-platform/v1', 'kind: AgentOrchestration', 'metadata:', '  name: my-orchestration', 'spec:', '  agents:'];
    nodes.forEach(function(n) {
      lines.push('    - name: ' + n.agentName.replace(/\s/g, '-').toLowerCase());
      lines.push('      kind: Agent');
      lines.push('      spec:');
      lines.push('        model:');
      lines.push('          provider: ollama');
      lines.push('          name: ' + (n.model || 'qwen2:0.5b'));
    });
    lines.push('  routes:');
    edges.forEach(function(e) {
      var fn = nodes.find(function(n) { return n.id === e.from; });
      var tn = nodes.find(function(n) { return n.id === e.to; });
      if (fn && tn) {
        lines.push('    - from: ' + fn.agentName.replace(/\s/g, '-').toLowerCase());
        lines.push('      to: ' + tn.agentName.replace(/\s/g, '-').toLowerCase());
        lines.push('      type: ' + e.strategy);
      }
    });
    return lines.join('\n');
  };

  var getStrategyLabel = function(s: string) { var st = STRATEGIES.find(function(x) { return x.id === s; }); return st ? st.label : s; };
  var getStrategyColor = function(s: string) { var colors: Record<string, string> = { sequential: 'var(--blue)', subagent: 'var(--green)', mixed: 'var(--purple)', conditional: 'var(--orange)', constrained: 'var(--red)' }; return colors[s] || 'var(--text-dim)'; };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-app)' }}>
      {/* 顶部工具栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: 0 }}>Agent 编排</h1>
          {saved && <span style={{ fontSize: 11, color: 'var(--green)', padding: '4px 8px', background: 'var(--green-bg)', borderRadius: 4 }}>已保存</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={function() { setShowYaml(!showYaml); }} style={{ padding: '8px 14px', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            {showYaml ? '画布' : 'YAML'}
          </button>
          <button onClick={handleSave} style={{ padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={14} /> 保存编排
          </button>
        </div>
      </div>

      {showYaml ? (
        <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
          <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text)', background: 'var(--bg-card)', padding: 20, borderRadius: 8, border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>{buildYaml()}</pre>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 左侧 Agent 列表 */}
          <div style={{ width: 220, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, margin: '0 0 10px 0' }}>可用 Agent</h3>
            {agents.filter(function(a) { return a.status === 'standby'; }).map(function(a) {
              return (
                <div key={a.id} draggable onDragStart={function(e) { e.dataTransfer.setData('agentId', String(a.id)); }}
                  style={{ padding: '10px 12px', marginBottom: 6, background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)', cursor: 'grab', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🤖</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{a.model_name}</div>
                  </div>
                </div>
              );
            })}
            {agents.filter(function(a) { return a.status === 'standby'; }).length === 0 && <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>暂无待命 Agent</p>}
          </div>

          {/* 画布 */}
          <div ref={containerRef} onDrop={handleDrop} onDragOver={function(e) { e.preventDefault(); }}
            onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onClick={handleCanvasClick}
            style={{ flex: 1, position: 'relative', background: 'radial-gradient(circle, var(--border) 1px, transparent 1px)', backgroundSize: '20px 20px', overflow: 'auto', minHeight: 500 }}>

            <svg ref={svgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
              {edges.map(function(e) {
                var fn = nodes.find(function(n) { return n.id === e.from; });
                var tn = nodes.find(function(n) { return n.id === e.to; });
                if (!fn || !tn) return null;
                return (
                  <g key={e.id}>
                    <line x1={fn.x + 160} y1={fn.y + 36} x2={tn.x} y2={tn.y + 36}
                      stroke={selectedEdge?.id === e.id ? 'var(--color-warning)' : getStrategyColor(e.strategy)}
                      strokeWidth={selectedEdge?.id === e.id ? 3 : 2}
                      markerEnd="url(#arrowhead)" style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                      onClick={function(ev) { ev.stopPropagation(); setSelectedEdge(e); }} />
                    <text x={(fn.x + tn.x + 160) / 2} y={(fn.y + tn.y) / 2 + 20}
                      fill={getStrategyColor(e.strategy)} fontSize={9} textAnchor="middle" style={{ pointerEvents: 'none' }}>
                      {getStrategyLabel(e.strategy)}
                    </text>
                  </g>
                );
              })}
              {connecting && (
                <line x1={connecting.x} y1={connecting.y} x2={connecting.x + 100} y2={connecting.y}
                  stroke="var(--color-warning)" strokeWidth={2} strokeDasharray="5,5" />
              )}
              <defs>
                <marker id="arrowhead" viewBox="0 0 10 7" refX={9} refY={3.5} markerWidth={8} markerHeight={6} orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="var(--blue)" />
                </marker>
              </defs>
            </svg>

            {/* 节点 */}
            {nodes.map(function(node) {
              return (
                <div key={node.id} onMouseDown={function() { handleMouseDown(node.id); }}
                  style={{ position: 'absolute', left: node.x, top: node.y, width: 160, background: 'var(--bg-card)', borderRadius: 8, border: dragging === node.id ? '2px solid var(--color-primary)' : '1px solid var(--border)', padding: 10, cursor: dragging ? 'grabbing' : 'grab', zIndex: 10, boxShadow: dragging === node.id ? '0 4px 12px rgba(0,0,0,0.3)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🤖</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{node.agentName}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{node.model}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button onClick={function(e) { e.stopPropagation(); startConnect(node.id, e); }} title="连线" style={{ padding: 2, background: 'var(--blue-bg)', border: 'none', borderRadius: 3, cursor: 'pointer', color: 'var(--blue)', fontSize: 10, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
                      <button onClick={function(e) { e.stopPropagation(); deleteNode(node.id); }} style={{ padding: 2, background: 'none', border: 'none', borderRadius: 3, cursor: 'pointer', color: 'var(--color-danger)' }}><X size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {nodes.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', flexDirection: 'column', gap: 8 }}>
                <GitFork size={40} style={{ opacity: 0.2 }} />
                <p style={{ fontSize: 14 }}>从左侧拖拽 Agent 到画布开始编排</p>
                <p style={{ fontSize: 11 }}>点击节点 → 按钮连线 | 点击连线配置策略</p>
              </div>
            )}
          </div>

          {/* 右侧连线配置面板 */}
          {selectedEdge && (
            <div style={{ width: 300, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', padding: 16, overflowY: 'auto', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>连线配置</h3>
                <button onClick={function() { setSelectedEdge(null); }} style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--blue)' }}>{(nodes.find(function(n) { return n.id === selectedEdge.from; }) || {}).agentName || selectedEdge.from}</span>
                <span style={{ color: 'var(--text-dim)' }}>→</span>
                <span style={{ color: 'var(--green)' }}>{(nodes.find(function(n) { return n.id === selectedEdge.to; }) || {}).agentName || selectedEdge.to}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={lbl}>调用策略</label>
                  <select value={selectedEdge.strategy} onChange={function(e) { updateEdge('strategy', e.target.value); }} style={inp}>
                    {STRATEGIES.map(function(s) { return <option key={s.id} value={s.id}>{s.label} — {s.desc}</option>; })}
                  </select>
                </div>

                {selectedEdge.strategy === 'conditional' && (
                  <div>
                    <label style={lbl}>条件表达式</label>
                    <textarea value={selectedEdge.constraint || ''} onChange={function(e) { updateEdge('constraint', e.target.value); }} rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 11 }} placeholder="例: risk_level > 3 AND code_lines < 1000" />
                  </div>
                )}

                {selectedEdge.strategy === 'constrained' && (
                  <div>
                    <label style={lbl}>约束条件</label>
                    <textarea value={selectedEdge.constraint || ''} onChange={function(e) { updateEdge('constraint', e.target.value); }} rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 11 }} placeholder="例: token_limit=50000, timeout=30s, max_retries=3" />
                  </div>
                )}

                <div>
                  <label style={lbl}>数据输入约定</label>
                  <textarea value={selectedEdge.inputDesc || ''} onChange={function(e) { updateEdge('inputDesc', e.target.value); }} rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 11 }} placeholder="例: { code: string, language: string, file_path: string }" />
                </div>
                <div>
                  <label style={lbl}>数据输出约定</label>
                  <textarea value={selectedEdge.outputDesc || ''} onChange={function(e) { updateEdge('outputDesc', e.target.value); }} rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 11 }} placeholder="例: { issues: Issue[], score: number, summary: string }" />
                </div>
                <div>
                  <label style={lbl}>结束条件</label>
                  <input value={selectedEdge.endCondition || ''} onChange={function(e) { updateEdge('endCondition', e.target.value); }} style={inp} placeholder="例: 所有 Agent 完成 OR token > 500k" />
                </div>

                <button onClick={function() { deleteEdge(selectedEdge.id); }} style={{ padding: '8px 12px', background: 'none', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Trash2 size={12} /> 删除连线
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

var lbl: React.CSSProperties = { fontSize: 10, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 3 };
var inp: React.CSSProperties = { width: '100%', padding: '6px 8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, boxSizing: 'border-box' };
