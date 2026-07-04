import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const STATUS_COLORS: Record<string, string> = {
  healthy: '#5cb878',
  running: '#5cb878',
  success: '#5cb878',
  failed: '#e05555',
  crashed: '#e05555',
  error: '#e05555',
  degraded: '#e8a450',
  waiting: '#e8a450',
  pending: '#e8a450',
  not_started: '#5d6068',
  standby: '#5d6068',
};

function OrchestrationNode({ data }: { data: any }) {
  const statusColor = STATUS_COLORS[data.status] || '#5d6068';
  const isHealthy = data.status === 'healthy' || data.status === 'running';
  const isFailed = data.status === 'failed' || data.status === 'crashed' || data.status === 'error';

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isFailed ? statusColor : 'var(--border)'}`,
        borderLeft: `3px solid ${statusColor}`,
        borderRadius: 'var(--r-md)',
        padding: '10px 14px',
        minWidth: 160,
        fontSize: 12,
        boxShadow: isFailed ? `0 0 8px ${statusColor}40` : undefined,
        animation: isFailed ? 'pulse-red 2s infinite' : undefined,
        transition: 'border-color var(--fast), background var(--fast)',
      }}
    >
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
        {data.label || 'Agent'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {data.model && (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{data.model}</span>
        )}
        {data.badge && (
          <span
            style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 3,
              background: 'var(--blue-bg)', color: 'var(--blue)',
            }}
          >
            {data.badge}
          </span>
        )}
      </div>
      <div
        style={{
          position: 'absolute', bottom: 6, right: 8,
          width: 7, height: 7, borderRadius: '50%',
          backgroundColor: statusColor,
          boxShadow: isHealthy ? `0 0 6px ${statusColor}50` : undefined,
        }}
        title={data.status}
      />
    </div>
  );
}

const nodeTypes = { orchestrationNode: OrchestrationNode };

interface Props {
  nodes: Node[];
  edges: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onNodeClick?: (nodeId: string) => void;
  readOnly?: boolean;
}

export default function OrchestrationCanvas({ nodes: initialNodes, edges: initialEdges, onNodesChange, onEdgesChange, onNodeClick, readOnly }: Props) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes as any);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges.map((e: any) => ({
    ...e,
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: 'rgba(84,140,240,0.5)' },
    style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 },
  })));

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChangeInternal(changes);
      onNodesChange?.(nodes);
    },
    [nodes, onNodesChange, onNodesChangeInternal],
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChangeInternal(changes);
      onEdgesChange?.(edges);
    },
    [edges, onEdgesChange, onEdgesChangeInternal],
  );

  const handleNodeClick = useCallback(
    (_: any, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

  const bgColor = '#0b0c10';
  const dotColor = 'rgba(255,255,255,0.03)';

  return (
    <div style={{ width: '100%', height: '100%', background: bgColor, borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes as any}
        fitView
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        deleteKeyCode={readOnly ? null : 'Delete'}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color={dotColor}
          gap={32}
          size={4}
        />
        <Controls
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
          }}
        />
        <MiniMap
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          nodeColor={(n) => STATUS_COLORS[(n.data as any)?.status] || '#5d6068'}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
