import React, { useCallback } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  Node, Edge, useNodesState, useEdgesState,
  MarkerType, Handle, Position, Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ExternalLink } from 'lucide-react';
import { customEdgeTypes } from './edges';

const STATUS_COLORS: Record<string, string> = {
  healthy: '#5cb878', running: '#5cb878', success: '#5cb878',
  failed: '#e05555', crashed: '#e05555', error: '#e05555',
  degraded: '#e8a450', waiting: '#e8a450', pending: '#e8a450',
  not_started: '#5d6068', standby: '#5d6068',
};

function OrchestrationNode({ data }: { data: any }) {
  const statusColor = STATUS_COLORS[data.status] || '#5d6068';
  const isFailed = data.status === 'failed' || data.status === 'crashed' || data.status === 'error';

  return (
    <div style={{
      position: 'relative',
      background: 'var(--bg-card)',
      border: `1px solid ${isFailed ? statusColor : 'var(--border)'}`,
      borderLeft: `3px solid ${statusColor}`,
      borderRadius: 'var(--r-md)', padding: '10px 14px', minWidth: 160, fontSize: 12,
      boxShadow: isFailed ? `0 0 8px ${statusColor}40` : undefined,
      animation: isFailed ? 'pulse-red 2s infinite' : undefined,
      transition: 'border-color var(--fast), background var(--fast)',
    }}>
      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, background: 'var(--text-muted)', border: '2px solid var(--bg-card)', opacity: 0.5 }} />
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
        {data.label || 'Agent'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {data.model && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{data.model}</span>}
        {data.badge && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: 'var(--blue-bg)', color: 'var(--blue)' }}>{data.badge}</span>}
      </div>
      <div style={{ position: 'absolute', bottom: 4, right: 6, display: 'flex', gap: 4, alignItems: 'center' }}>
        {data.onDetailClick && (
          <button
            onClick={(e) => { e.stopPropagation(); data.onDetailClick(); }}
            title="查看 Agent 详情"
            style={{ opacity: 0.4, transition: 'opacity var(--fast)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 1 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.4'; }}
          >
            <ExternalLink size={11} />
          </button>
        )}
        <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: statusColor, boxShadow: data.status === 'running' ? `0 0 6px ${statusColor}50` : undefined }} title={data.status} />
      </div>
      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: 'var(--text-muted)', border: '2px solid var(--bg-card)', opacity: 0.5 }} />
    </div>
  );
}

const nodeTypes = { orchestrationNode: OrchestrationNode };

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

export default function OrchestrationCanvas({
  nodes: initialNodes, edges: initialEdges, onNodesChange, onEdgesChange,
  onConnect, onNodeClick, onEdgeClick, onNodeDetailClick, onDrop, readOnly,
}: Props) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(
    initialNodes.map((n: any) => ({ ...n, data: { ...n.data, onDetailClick: onNodeDetailClick ? () => onNodeDetailClick(n.id) : undefined } })) as any
  );
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges.map((e: any) => ({
    ...e,
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: 'rgba(84,140,240,0.5)' },
    style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 },
  })));

  const handleNodesChange = useCallback((changes: any) => {
    onNodesChangeInternal(changes);
    onNodesChange?.(nodes);
  }, [nodes, onNodesChange, onNodesChangeInternal]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChangeInternal(changes);
    onEdgesChange?.(edges);
  }, [edges, onEdgesChange, onEdgesChangeInternal]);

  const handleConnect = useCallback((connection: Connection) => {
    onConnect?.(connection);
  }, [onConnect]);

  const handleEdgeClick = useCallback((_: any, edge: Edge) => {
    onEdgeClick?.(edge.id);
  }, [onEdgeClick]);

  const handleNodeClick = useCallback((_: any, node: Node) => {
    onNodeClick?.(node.id);
  }, [onNodeClick]);

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

  return (
    <div style={{ width: '100%', height: '100%', background: bgColor, borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }} onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes as any}
        edgeTypes={customEdgeTypes as any}
        fitView
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        deleteKeyCode={readOnly ? null : 'Delete'}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={32} size={4} />
        <Controls style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }} />
        <MiniMap style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} nodeColor={(n) => STATUS_COLORS[(n.data as any)?.status] || '#5d6068'} maskColor="rgba(0,0,0,0.6)" />
      </ReactFlow>
    </div>
  );
}
