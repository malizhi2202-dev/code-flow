import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  Node, Edge, useNodesState, useEdgesState,
  MarkerType, Handle, Position, Connection, useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Bot, ArrowRight, Circle, ExternalLink } from 'lucide-react';
import { customEdgeTypes } from './edges';

const STATUS_COLORS: Record<string, string> = {
  healthy: '#5cb878', running: '#5cb878', success: '#5cb878',
  failed: '#e05555', crashed: '#e05555', error: '#e05555',
  degraded: '#e8a450', waiting: '#e8a450', pending: '#e8a450',
  not_started: '#5d6068', standby: '#5d6068',
};

const RUNTIME_ICONS: Record<string, string> = {
  langgraph: '#548cf0', langchain: '#5cb878', default: '#9699a0',
};
const RUNTIME_LABELS: Record<string, string> = {
  langgraph: 'LangGraph', langchain: 'LangChain', default: 'Agent',
};

// ── 节点组件（定义在组件外，避免 React Flow 警告）──

function StartNode({ data }: { data: any }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: '50%',
      background: 'var(--bg-card)', border: '2px solid #5cb878',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 12px rgba(92,184,120,0.2)',
    }}>
      <ArrowRight size={20} color="#5cb878" />
      <Handle type="source" position={Position.Right} style={{
        width: 14, height: 14, background: '#5cb878', border: '3px solid var(--bg-card)',
        right: -7,
      }} />
      <div style={{ position: 'absolute', bottom: -22, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {data.label || 'START'}
      </div>
    </div>
  );
}

function EndNode({ data }: { data: any }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: '50%',
      background: 'var(--bg-card)', border: '2px solid #e05555',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 12px rgba(224,85,85,0.2)',
    }}>
      <Circle size={20} color="#e05555" fill="#e05555" fillOpacity={0.2} />
      <Handle type="target" position={Position.Left} style={{
        width: 14, height: 14, background: '#e05555', border: '3px solid var(--bg-card)',
        left: -7,
      }} />
      <div style={{ position: 'absolute', bottom: -22, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {data.label || 'END'}
      </div>
    </div>
  );
}

function OrchestrationNode({ data }: { data: any }) {
  const statusColor = STATUS_COLORS[data.status] || '#5d6068';
  const isFailed = data.status === 'failed' || data.status === 'crashed' || data.status === 'error';
  const runtime = data.runtime || 'default';
  const accentColor = RUNTIME_ICONS[runtime] || RUNTIME_ICONS.default;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderTop: `3px solid ${accentColor}`,
      borderRadius: 12, width: 220,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      transition: 'box-shadow 150ms var(--ease), border-color 150ms var(--ease)',
      cursor: 'pointer',
    }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px ${accentColor}40, 0 4px 16px rgba(0,0,0,0.3)`;
        (e.currentTarget as HTMLElement).style.borderColor = accentColor;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
    >
      <Handle type="target" position={Position.Left} style={{
        width: 14, height: 14, background: 'var(--text-muted)',
        border: '3px solid var(--bg-card)', left: -7, top: '50%',
      }} />
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 6px', borderBottom: isFailed ? 'none' : '1px solid var(--border)' }}>
        <Bot size={18} color={accentColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 13, color: 'var(--text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.label || 'Agent'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
            {RUNTIME_LABELS[runtime] || data.badge || 'Agent'}
          </div>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: '8px 14px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.model && (
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-input)', color: 'var(--text-secondary)', display: 'inline-block', width: 'fit-content' }}>
            {data.model}
          </span>
        )}
      </div>
      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 8px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor, boxShadow: data.status === 'running' ? `0 0 6px ${statusColor}80` : undefined }} />
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{data.status || 'not_started'}</span>
        </div>
        {data.onDetailClick && (
          <button onClick={(e) => { e.stopPropagation(); data.onDetailClick(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 6px', borderRadius: 4, background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 9 }}>
            <ExternalLink size={10} /> 详情
          </button>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{
        width: 14, height: 14, background: accentColor,
        border: '3px solid var(--bg-card)', right: -7, top: '50%',
      }} />
    </div>
  );
}

// ── 定义在组件外避免 React Flow #002 警告 ──
const nodeTypes = { orchestrationNode: OrchestrationNode, startNode: StartNode, endNode: EndNode };
const edgeTypes = { ...customEdgeTypes };

// ── FlowCanvas 内层组件（使用 useReactFlow）──
function FlowCanvas({ nodes, edges, onNodesChange, onEdgesChange, onConnect, onNodeClick, onEdgeClick, readOnly }: {
  nodes: Node[]; edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (nodeId: string) => void;
  onEdgeClick: (edgeId: string) => void;
  readOnly?: boolean;
}) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodes.length > 0) {
      const t = setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 300);
      return () => clearTimeout(t);
    }
  }, [nodes.length]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={(_, node) => onNodeClick(node.id)}
      onEdgeClick={(_, edge) => onEdgeClick(edge.id)}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      elementsSelectable={!readOnly}
      deleteKeyCode={readOnly ? null : 'Delete'}
      connectionLineStyle={{ stroke: 'var(--blue)', strokeWidth: 2 }}
      defaultEdgeOptions={{ type: 'sequential', animated: false }}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="rgba(255,255,255,0.04)" gap={24} size={2} />
      <Controls style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }} />
      <MiniMap style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} nodeColor={(n) => STATUS_COLORS[(n.data as any)?.status] || '#5d6068'} maskColor="rgba(0,0,0,0.6)" />
    </ReactFlow>
  );
}

// ── Props ──
interface Props {
  nodes: Node[];
  edges: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onConnect?: (connection: Connection) => void;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onNodeDetailClick?: (nodeId: string) => void;
  onDrop?: (agent: any, position: { x: number; y: number }) => void;
  readOnly?: boolean;
}

// ── 外层组件 ──
export default function OrchestrationCanvas({
  nodes: initialNodes, edges: initialEdges, onNodesChange, onEdgesChange,
  onConnect, onNodeClick, onEdgeClick, onNodeDetailClick, onDrop, readOnly,
}: Props) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(
    initialNodes.map((n: any) => ({ ...n, data: { ...n.data, onDetailClick: onNodeDetailClick ? () => onNodeDetailClick(n.id) : undefined } })) as any
  );
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges.map((e: any) => ({
    ...e,
    type: e.type || 'sequential',
    animated: e.type === 'pipeline',
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'rgba(84,140,240,0.6)' },
    style: { stroke: 'rgba(255,255,255,0.12)', strokeWidth: 2 },
  })));

  const handleNodesChange = useCallback((changes: any) => {
    onNodesChangeInternal(changes);
    onNodesChange?.(nodes);
  }, [nodes, onNodesChange, onNodesChangeInternal]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChangeInternal(changes);
    onEdgesChange?.(edges);
  }, [edges, onEdgesChange, onEdgesChangeInternal]);

  const handleConnect = useCallback((connection: Connection) => { onConnect?.(connection); }, [onConnect]);
  const handleEdgeClick = useCallback((edgeId: string) => { onEdgeClick?.(edgeId); }, [onEdgeClick]);
  const handleNodeClick = useCallback((nodeId: string) => { onNodeClick?.(nodeId); }, [onNodeClick]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    try {
      const agent = JSON.parse(e.dataTransfer.getData('application/json'));
      const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
      onDrop?.(agent, { x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    } catch {}
  }, [onDrop]);

  const bgColor = '#0b0c10';
  const wrapperRef = useRef<HTMLDivElement>(null);

  return (
    <ReactFlowProvider>
      <div ref={wrapperRef} style={{ width: '100%', height: '100%', minHeight: 400, background: bgColor, borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }} onDragOver={handleDragOver} onDrop={handleDrop}>
        <FlowCanvas
          nodes={nodes} edges={edges}
          onNodesChange={handleNodesChange} onEdgesChange={handleEdgesChange}
          onConnect={handleConnect} onNodeClick={handleNodeClick} onEdgeClick={handleEdgeClick}
          readOnly={readOnly}
        />
      </div>
    </ReactFlowProvider>
  );
}
