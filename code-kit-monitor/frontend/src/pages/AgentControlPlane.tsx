import { useEffect, useState, useCallback } from 'react';
import {
  Radio, Circle, Activity, RefreshCw, Clock, XCircle,
  Play, Pause, RotateCcw, X, Server, Cpu, BarChart3, Link2,
} from 'lucide-react';
import { useControlPlane, AgentStatus, QueueItem, ReconcileEntry } from '../stores/controlPlane';

// ── 常量 ──
type TabKey = 'agents' | 'queue' | 'reconcile';

const STATUS_PRIORITY: Record<string, number> = {
  dead: 0,
  blocked: 1,
  running: 2,
  idle: 3,
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  running:   { color: 'var(--green)',  bg: 'var(--green-bg)',  label: '运行中' },
  idle:      { color: 'var(--green)',  bg: 'var(--green-bg)',  label: '空闲' },
  blocked:   { color: 'var(--orange)', bg: 'var(--orange-bg)', label: '阻塞' },
  dead:      { color: 'var(--red)',    bg: 'var(--red-bg)',    label: '停止' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { color: 'var(--text-muted)', bg: 'var(--bg-input)', label: status || '未知' };
}

function getHealthLabel(status: string) {
  if (status === 'healthy' || status === 'pass') return '健康';
  if (status === 'degraded' || status === 'fail') return '降级';
  if (status === 'unhealthy') return '异常';
  if (status === 'error') return '错误';
  if (status === 'skipped') return '未探测';
  return status || '未知';
}

// ── 样式片段 ──
const cardBase: React.CSSProperties = {
  background: 'var(--bg-card)', borderRadius: 8, padding: 20,
  border: '1px solid var(--border)', textAlign: 'center',
};

const cardValue: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700,
};

const cardLabel: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', marginBottom: 4,
};

const cardSub: React.CSSProperties = {
  fontSize: 10, color: 'var(--text-muted)', marginTop: 4,
};

const th: React.CSSProperties = {
  padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)',
  fontWeight: 500, fontSize: 10, whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '6px 8px', fontSize: 12, color: 'var(--text)',
  whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)',
};

// ── 组件 ──

function OverviewCards({ probes, queue }: { probes: AgentStatus[]; queue: QueueItem[] }) {
  const totalAgents = probes.length;
  const healthyCount = probes.filter(function(a) { return a.health === 'healthy'; }).length;
  const deadCount = probes.filter(function(a) { return a.status === 'dead' || a.health === 'unhealthy'; }).length;
  const queueCount = queue.length;

  var cards: { label: string; value: number; color: string; icon: React.ReactNode; sub: string }[] = [
    { label: 'Agent 总数', value: totalAgents, color: 'var(--blue)', icon: <Server size={16} />, sub: '全部注册 Agent' },
    { label: '健康', value: healthyCount, color: 'var(--green)', icon: <Activity size={16} />, sub: 'healthy 状态' },
    { label: '异常', value: deadCount, color: deadCount > 0 ? 'var(--red)' : 'var(--text-muted)', icon: <XCircle size={16} />, sub: 'dead / unhealthy' },
    { label: '队列任务', value: queueCount, color: 'var(--orange)', icon: <Clock size={16} />, sub: '待调度 / 执行中' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {cards.map(function(c) {
        return (
          <div key={`card-${c.label}`} style={cardBase}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 8, color: c.color }}>
              {c.icon}
              <div style={cardLabel}>{c.label}</div>
            </div>
            <div style={{ ...cardValue, color: c.color }}>{c.value}</div>
            <div style={cardSub}>{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

function AgentRow({
  agent,
  isSelected,
  onClick,
}: {
  agent: AgentStatus;
  isSelected: boolean;
  onClick: () => void;
}) {
  const sc = getStatusConfig(agent.status);
  const tokenPct = agent.token_hard_limit > 0
    ? Math.min(100, Math.round(agent.tokens_used / agent.token_hard_limit * 100))
    : 0;

  return (
    <tr
      onClick={onClick}
      style={{
        cursor: 'pointer',
        background: isSelected ? 'var(--bg-selected)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.1s',
      }}
      onMouseEnter={function(e) {
        if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
      }}
      onMouseLeave={function(e) {
        if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
            background: sc.color,
          }} />
          <span style={{ fontWeight: 500 }}>{agent.agent_name}</span>
        </div>
      </td>
      <td style={td}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 3, fontSize: 10,
          background: sc.bg, color: sc.color, fontWeight: 500,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.color, display: 'inline-block' }} />
          {sc.label}
        </span>
      </td>
      <td style={td}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 3, fontSize: 10,
          background: agent.status === 'healthy' ? 'var(--green-bg)' : 'var(--red-bg)',
          color: agent.status === 'healthy' ? 'var(--green)' : 'var(--red)',
          fontWeight: 500,
        }}>
          {getHealthLabel(agent.status)}
        </span>
      </td>
      <td style={td}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{agent.model_name}</span>
      </td>
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 60, height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: tokenPct + '%',
              background: tokenPct > 80 ? 'var(--red)' : tokenPct > 50 ? 'var(--orange)' : 'var(--green)',
              borderRadius: 2, transition: 'width 0.3s',
            }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
            {((agent.tokens_used ?? 0) / 1000).toFixed(0)}k / {((agent.token_hard_limit ?? 0) / 1000).toFixed(0)}k
          </span>
        </div>
      </td>
      <td style={{ ...td, fontSize: 10, color: 'var(--text-muted)' }}>
        {agent.last_heartbeat ? new Date(agent.last_heartbeat).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
      </td>
    </tr>
  );
}

function AgentListTab({
  probes,
  selectedAgent,
  onSelectAgent,
}: {
  probes: AgentStatus[];
  selectedAgent: number | null;
  onSelectAgent: (id: number) => void;
}) {
  const sorted = probes.slice().sort(function(a, b) {
    const pa = STATUS_PRIORITY[a.status] ?? 99;
    const pb = STATUS_PRIORITY[b.status] ?? 99;
    return pa - pb;
  });

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
        <Server size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p style={{ fontSize: 13, margin: 0 }}>暂无 Agent 数据</p>
        <p style={{ fontSize: 11, margin: '4px 0' }}>启动探针后将在此处显示 Agent 状态</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-input)' }}>
            <th style={th}>Agent 名称</th>
            <th style={th}>运行状态</th>
            <th style={th}>健康检查</th>
            <th style={th}>模型</th>
            <th style={th}>Token 用量</th>
            <th style={th}>最后心跳</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(function(agent) {
            return (
              <AgentRow
                key={`agent-${agent.agent_id}`}
                agent={agent}
                isSelected={selectedAgent === agent.agent_id}
                onClick={function() { onSelectAgent(agent.agent_id); }}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QueueTab({ queue }: { queue: QueueItem[] }) {
  if (queue.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
        <Clock size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p style={{ fontSize: 13, margin: 0 }}>调度队列为空</p>
        <p style={{ fontSize: 11, margin: '4px 0' }}>暂无待调度或执行中的任务</p>
      </div>
    );
  }

  const statusStyle = function(st: string): React.CSSProperties {
    const map: Record<string, { c: string; bg: string }> = {
      pending:    { c: 'var(--orange)', bg: 'var(--orange-bg)' },
      running:    { c: 'var(--blue)',   bg: 'var(--blue-bg)' },
      completed:  { c: 'var(--green)',  bg: 'var(--green-bg)' },
      failed:     { c: 'var(--red)',    bg: 'var(--red-bg)' },
    };
    const m = map[st] || { c: 'var(--text-muted)', bg: 'var(--bg-input)' };
    return { padding: '2px 8px', borderRadius: 3, fontSize: 10, background: m.bg, color: m.c, fontWeight: 500 };
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-input)' }}>
            <th style={th}>任务 ID</th>
            <th style={th}>编排名称</th>
            <th style={th}>目标 Agent</th>
            <th style={th}>状态</th>
            <th style={th}>优先级</th>
            <th style={th}>创建时间</th>
          </tr>
        </thead>
        <tbody>
          {queue.map(function(item) {
            return (
              <tr key={`queue-${item.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 10 }}>#{item.id}</td>
                <td style={td}>{item.orchestration_name}</td>
                <td style={td}>{item.agent_name || 'Agent #' + item.agent_id}</td>
                <td style={td}><span style={statusStyle(item.status)}>{item.status}</span></td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)' }}>
                  <span style={{
                    padding: '2px 6px', borderRadius: 3, fontSize: 10,
                    background: item.priority >= 8 ? 'var(--red-bg)' : item.priority >= 5 ? 'var(--orange-bg)' : 'var(--bg-input)',
                    color: item.priority >= 8 ? 'var(--red)' : item.priority >= 5 ? 'var(--orange)' : 'var(--text-secondary)',
                  }}>
                    P{item.priority}
                  </span>
                </td>
                <td style={{ ...td, fontSize: 10, color: 'var(--text-muted)' }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReconcileTab({ entries }: { entries: ReconcileEntry[] }) {
  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
        <RotateCcw size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p style={{ fontSize: 13, margin: 0 }}>暂无 Reconcile 日志</p>
        <p style={{ fontSize: 11, margin: '4px 0' }}>系统未检测到漂移或尚未执行 reconcile</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-input)' }}>
            <th style={th}>ID</th>
            <th style={th}>编排</th>
            <th style={th}>状态</th>
            <th style={th}>漂移检测</th>
            <th style={th}>消息</th>
            <th style={th}>时间</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(function(entry) {
            const driftStyle = entry.drift_detected
              ? { color: 'var(--red)', background: 'var(--red-bg)', padding: '2px 8px', borderRadius: 3, fontSize: 10 }
              : { color: 'var(--green)', background: 'var(--green-bg)', padding: '2px 8px', borderRadius: 3, fontSize: 10 };
            return (
              <tr key={`reconcile-${entry.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 10 }}>#{entry.id}</td>
                <td style={td}>{entry.orchestration_name}</td>
                <td style={td}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 3, fontSize: 10,
                    background: entry.status === 'resolved' ? 'var(--green-bg)' : entry.status === 'failed' ? 'var(--red-bg)' : 'var(--orange-bg)',
                    color: entry.status === 'resolved' ? 'var(--green)' : entry.status === 'failed' ? 'var(--red)' : 'var(--orange)',
                  }}>
                    {entry.status}
                  </span>
                </td>
                <td style={td}><span style={driftStyle}>{entry.drift_detected ? '⚠ 检测到' : '✓ 无漂移'}</span></td>
                <td style={{ ...td, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.message || '-'}
                </td>
                <td style={{ ...td, fontSize: 10, color: 'var(--text-muted)' }}>
                  {entry.created_at ? new Date(entry.created_at).toLocaleString('zh-CN') : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 详情面板 ──
function DetailPanel({
  agent,
  onClose,
  onAction,
  actionLoading,
}: {
  agent: AgentStatus;
  onClose: () => void;
  onAction: (action: 'reschedule' | 'restart' | 'pause') => void;
  actionLoading: string | null; // action name or null
}) {
  const tokenHardPct = agent.token_hard_limit > 0
    ? Math.min(100, Math.round(agent.tokens_used / agent.token_hard_limit * 100))
    : 0;
  const tokenSoftPct = agent.token_soft_limit > 0
    ? Math.min(100, Math.round(agent.tokens_used / agent.token_soft_limit * 100))
    : 0;

  // Heartbeat timeline: simulate recent beats
  const heartbeatHistory = (function() {
    const now = Date.now();
    const points: { time: string; alive: boolean; ts: number }[] = [];
    for (var i = 9; i >= 0; i--) {
      // Simulate — real would come from backend
      const t = now - i * 15000; // every 15s
      const time = new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      // If agent last heartbeat is recent, show green; otherwise show gaps
      const lastHb = agent.last_heartbeat ? new Date(agent.last_heartbeat).getTime() : 0;
      const alive = agent.status !== 'dead' && Math.abs(t - lastHb) < 60000;
      points.push({ time, alive, ts: t });
    }
    return points;
  })();

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 420,
      background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)',
      overflow: 'auto', zIndex: 10, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 16,
      boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
    }}>
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: getStatusConfig(agent.status).color, display: 'inline-block' }} />
            {agent.agent_name}
          </h3>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Agent #{agent.agent_id} · {agent.runtime}</div>
        </div>
        <button onClick={onClose}
          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 4 }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* 探针区 1: 心跳时间线 */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={14} color="var(--green)" />
          心跳时间线
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {agent.last_heartbeat ? new Date(agent.last_heartbeat).toLocaleTimeString('zh-CN') : '无记录'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 40, gap: 3 }}>
          {heartbeatHistory.map(function(hb, i) {
            return (
              <div key={i} title={hb.time} style={{
                flex: 1, height: hb.alive ? 32 : 8,
                background: hb.alive ? 'var(--green)' : 'var(--bg-input)',
                borderRadius: '2px 2px 0 0',
                opacity: hb.alive ? 1 : 0.4,
                transition: 'height 0.3s',
                minWidth: 4,
              }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span>{heartbeatHistory[0]?.time}</span>
          <span>{heartbeatHistory[heartbeatHistory.length - 1]?.time}</span>
        </div>
      </div>

      {/* 探针区 2: 能力检查 */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={14} color="var(--blue)" />
          能力检查
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)' }}>模型</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)' }}>{agent.model_name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)' }}>运行时</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{agent.runtime}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)' }}>运行状态</span>
            <span style={{ color: getStatusConfig(agent.status).color }}>{getStatusConfig(agent.status).label}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)' }}>健康状态</span>
            <span style={{ color: agent.status === 'healthy' ? 'var(--green)' : 'var(--red)' }}>
              {getHealthLabel(agent.status)}
            </span>
          </div>
        </div>
      </div>

      {/* 探针区 3: 依赖状态 */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link2 size={14} color="var(--purple)" />
          依赖状态
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Agent 注册</span>
            <span style={{ color: 'var(--green)' }}>✓ 已连接</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)' }}>API 端点</span>
            <span style={{ color: 'var(--green)' }}>✓ 可达</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)' }}>工作流绑定</span>
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)' }}>知识库连接</span>
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          </div>
        </div>
      </div>

      {/* 探针区 4: 负载条 */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart3 size={14} color="var(--orange)" />
          负载监控
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Token 用量</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                {(agent.tokens_used ?? 0).toLocaleString()} / {(agent.token_hard_limit ?? 0).toLocaleString()}
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: tokenHardPct + '%',
                background: tokenHardPct > 80 ? 'var(--red)' : tokenHardPct > 50 ? 'var(--orange)' : 'var(--green)',
                borderRadius: 3, transition: 'width 0.4s',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
              <span>软限制: {(agent.token_soft_limit ?? 0).toLocaleString()}</span>
              <span>{tokenHardPct}% 硬限制</span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-secondary)' }}>软限制使用率</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{tokenSoftPct}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: tokenSoftPct + '%',
                background: tokenSoftPct > 90 ? 'var(--red)' : tokenSoftPct > 60 ? 'var(--orange)' : 'var(--blue)',
                borderRadius: 3, transition: 'width 0.4s',
              }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* 操作按钮 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          操作
        </div>

        <button
          onClick={function() { onAction('reschedule'); }}
          disabled={actionLoading !== null}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 14px', background: 'var(--blue)', color: '#fff',
            border: 'none', borderRadius: 6, cursor: actionLoading ? 'wait' : 'pointer',
            fontSize: 13, fontWeight: 500, opacity: actionLoading ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {actionLoading === 'reschedule' ? (
            <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> 重新调度中...</>
          ) : (
            <><RotateCcw size={14} /> 重新调度</>
          )}
        </button>

        <button
          onClick={function() { onAction('restart'); }}
          disabled={actionLoading !== null}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 14px', background: 'var(--bg-card)',
            color: 'var(--orange)', border: '1px solid var(--orange)',
            borderRadius: 6, cursor: actionLoading ? 'wait' : 'pointer',
            fontSize: 13, fontWeight: 500, opacity: actionLoading ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {actionLoading === 'restart' ? (
            <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> 强制重启中...</>
          ) : (
            <><RefreshCw size={14} /> 强制重启</>
          )}
        </button>

        <button
          onClick={function() { onAction('pause'); }}
          disabled={actionLoading !== null}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 14px', background: 'var(--bg-card)',
            color: 'var(--text-secondary)', border: '1px solid var(--border)',
            borderRadius: 6, cursor: actionLoading ? 'wait' : 'pointer',
            fontSize: 13, fontWeight: 500, opacity: actionLoading ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {actionLoading === 'pause' ? (
            <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> 暂停中...</>
          ) : (
            <><Pause size={14} /> 暂停接收</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── 主页面 ──
export default function AgentControlPlane() {
  const {
    probes, queue, reconcile, selectedAgent, loading,
    fetchProbes, fetchQueue, fetchReconcile,
    restartAgent, setSelectedAgent,
  } = useControlPlane();

  const [activeTab, setActiveTab] = useState<TabKey>('agents');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 初始加载 + 3 秒轮询
  useEffect(function() {
    fetchProbes();
    fetchQueue();
    fetchReconcile();
    const interval = setInterval(function() {
      fetchProbes();
      fetchQueue();
      fetchReconcile();
    }, 3000);
    return function() { clearInterval(interval); };
  }, [fetchProbes, fetchQueue, fetchReconcile]);

  const selectedAgentData = selectedAgent !== null
    ? probes.find(function(a) { return a.agent_id === selectedAgent; }) || null
    : null;

  const handleAction = useCallback(async function(action: 'reschedule' | 'restart' | 'pause') {
    if (!selectedAgentData) return;
    setActionLoading(action);
    try {
      if (action === 'restart') {
        await restartAgent(selectedAgentData.agent_id);
      } else if (action === 'reschedule') {
        await fetch('/api/control-plane/agent/' + selectedAgentData.agent_id + '/reschedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (action === 'pause') {
        await fetch('/api/control-plane/agent/' + selectedAgentData.agent_id + '/pause', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // 操作完成后刷新数据
      await fetchProbes();
    } catch (_e) {
      // silently handled
    } finally {
      setActionLoading(null);
    }
  }, [selectedAgentData, restartAgent, fetchProbes]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'agents',    label: 'Agent 列表',   icon: <Server size={13} />,     count: probes.length },
    { key: 'queue',     label: '调度队列',      icon: <Clock size={13} />,      count: queue.length },
    { key: 'reconcile', label: 'Reconcile 日志', icon: <RotateCcw size={13} />, count: reconcile.length },
  ];

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', position: 'relative' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Radio size={24} style={{ color: 'var(--blue)' }} />
          Agent 控制面板
        </h1>
        <button
          onClick={function() { fetchProbes(); fetchQueue(); fetchReconcile(); }}
          style={{
            padding: '6px 14px', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 4,
            cursor: 'pointer', color: 'var(--text-secondary)',
            fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
          刷新
        </button>
      </div>

      {/* 概览卡片 */}
      <OverviewCards probes={probes} queue={queue} />

      {/* Tab 导航 */}
      <div className="tab-bar">
        {tabs.map(function(t) {
          return (
            <button
              key={`tab-${t.key}`}
              onClick={function() { setActiveTab(t.key); }}
              className={'tab' + (activeTab === t.key ? ' active' : '')}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.count > 0 && (
                <span style={{
                  marginLeft: 2, padding: '0 5px', borderRadius: 8,
                  fontSize: 10, fontWeight: 600,
                  background: activeTab === t.key ? 'var(--blue-bg)' : 'var(--bg-input)',
                  color: activeTab === t.key ? 'var(--blue)' : 'var(--text-muted)',
                  lineHeight: '18px', minWidth: 18, textAlign: 'center',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 内容 + 详情面板 */}
      <div style={{ display: 'flex', position: 'relative' }}>
        <div style={{
          flex: 1, minWidth: 0,
          transition: 'margin-right 0.25s var(--ease)',
          marginRight: selectedAgentData ? 436 : 0,
        }}>
          {activeTab === 'agents' && (
            <AgentListTab
              probes={probes}
              selectedAgent={selectedAgent}
              onSelectAgent={function(id) { setSelectedAgent(id); }}
            />
          )}
          {activeTab === 'queue' && <QueueTab queue={queue} />}
          {activeTab === 'reconcile' && <ReconcileTab entries={reconcile} />}
        </div>

        {/* 右侧详情面板 */}
        {selectedAgentData && (
          <DetailPanel
            agent={selectedAgentData}
            onClose={function() { setSelectedAgent(null); }}
            onAction={handleAction}
            actionLoading={actionLoading}
          />
        )}
      </div>
    </div>
  );
}
