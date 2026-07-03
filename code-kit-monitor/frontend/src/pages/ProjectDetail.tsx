import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Square, RefreshCw, BarChart3, FileText, GitBranch, Bot, Clock } from 'lucide-react';
import { useProjects } from '../stores/projects';
import { useAgents } from '../stores/agents';
import { useWorkflows } from '../stores/workflows';
import { useMetrics } from '../stores/metrics';

interface Props { projectId: number; onBack: () => void; }

export default function ProjectDetail({ projectId, onBack }: Props) {
  const { projects, fetchProjects, executeProject, stopProject } = useProjects();
  const { agents, fetchAgents } = useAgents();
  const { workflows, fetchWorkflows } = useWorkflows();
  const { data: metrics, fetchMetrics } = useMetrics();

  const [tab, setTab] = useState<'overview' | 'monitor' | 'history'>('overview');
  const [bindAgent, setBindAgent] = useState<number>(0);
  const [bindWorkflow, setBindWorkflow] = useState<number>(0);

  useEffect(() => { fetchProjects(); fetchAgents(); fetchWorkflows(); }, []);
  useEffect(() => { if (projectId) fetchMetrics('project', projectId, 60); }, [projectId, tab]);

  const project = projects.find(p => p.id === projectId);
  if (!project) return <div style={{ padding: 40, color: 'var(--text-weak)' }}>加载中...</div>;

  const boundAgent = agents.find(a => a.id === project.agent_id);
  const boundWorkflow = workflows.find(w => w.id === project.workflow_id);

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><ArrowLeft size={18} /></button>
        <FileText size={20} color="var(--color-primary)" />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0, flex: 1 }}>{project.name}</h1>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, background: project.status === 'running' ? 'var(--color-warning)' : project.status === 'completed' ? 'var(--color-success)' : 'var(--color-text-dim)', color: '#fff' }}>{project.status}</span>
        {project.status === 'pending' && <button onClick={() => executeProject(project.id)} style={btn1}><Play size={12} /> 执行</button>}
        {project.status === 'running' && <button onClick={() => stopProject(project.id)} style={btnDanger}><Square size={12} /> 停止</button>}
      </div>

      {/* Tab 导航——项目维度全部模块 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border-normal, #2a2d35)', overflowX: 'auto' }}>
        {(['overview','tools','workflows','roles','agent','security','monitor','history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 14px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent', color: tab === t ? 'var(--color-primary)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
            {t === 'overview' ? '📋 概览' : t === 'tools' ? '🔧 工具' : t === 'workflows' ? '🔀 工作流' : t === 'roles' ? '👥 角色' : t === 'agent' ? '🤖 Agent' : t === 'security' ? '🛡️ 安全' : t === 'monitor' ? '📊 监控' : '📜 历史'}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
          {/* 需求 */}
          <div style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> 需求文档</h3>
            <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
              {project.parsed_summary || project.requirement_raw || '暂无需求'}
            </div>
          </div>

          {/* 绑定 Agent */}
          <div style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}><Bot size={14} /> 绑定 Agent</h3>
            {boundAgent ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text)' }}>{boundAgent.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{boundAgent.model_name} · {boundAgent.runtime} · token: {boundAgent.token_hard_limit?.toLocaleString()}</div>
                </div>
                <button onClick={() => setBindAgent(0)} style={{ padding: '4px 8px', fontSize: 11, background: 'var(--bg-input, #0b0c10)', color: 'var(--color-text-secondary)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, cursor: 'pointer' }}>更换</button>
              </div>
            ) : (
              <select value={bindAgent} onChange={e => { const v = +e.target.value; setBindAgent(v); if (v) fetch(`/api/projects/${project.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' }, body: JSON.stringify({ agent_id: v }) }).then(() => fetchProjects()); }} style={inp}>
                <option value={0}>-- 选择已有 Agent --</option>
                {agents.filter(a => a.status === 'standby').map(a => <option key={a.id} value={a.id}>{a.name} ({a.model_name})</option>)}
              </select>
            )}
          </div>

          {/* 绑定工作流 */}
          <div style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}><GitBranch size={14} /> 绑定工作流</h3>
            {boundWorkflow ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text)' }}>{boundWorkflow.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{boundWorkflow.status} · {(boundWorkflow.spec_json?.nodes || []).length} 节点 · {boundWorkflow.definition_mode === 'visual' ? '可视化' : '文本'}</div>
                </div>
                <button onClick={() => setBindWorkflow(0)} style={{ padding: '4px 8px', fontSize: 11, background: 'var(--bg-input, #0b0c10)', color: 'var(--color-text-secondary)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, cursor: 'pointer' }}>更换</button>
              </div>
            ) : (
              <select value={bindWorkflow} onChange={e => { const v = +e.target.value; setBindWorkflow(v); if (v) fetch(`/api/projects/${project.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' }, body: JSON.stringify({ workflow_id: v }) }).then(() => fetchProjects()); }} style={inp}>
                <option value={0}>-- 选择已有工作流 --</option>
                {workflows.filter(w => w.status === 'published').map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            )}
          </div>

          {/* 时间 */}
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> 创建于 {project.created_at?.slice(0, 19)}</div>
        </div>
      )}

      {tab === 'monitor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div style={card}><span style={cardVal}>{(metrics?.total_tokens || 0).toLocaleString()}</span><span style={cardLbl}>Token 消耗</span></div>
            <div style={card}><span style={cardVal}>{(metrics?.total_hits || 0).toLocaleString()}</span><span style={cardLbl}>工具命中</span></div>
            <div style={card}><span style={cardVal}>{((metrics?.total_time_ms || 0) / 1000).toFixed(1)}s</span><span style={cardLbl}>执行时间</span></div>
            <div style={card}><span style={cardVal}>{Object.keys(metrics?.model_totals || {}).length}</span><span style={cardLbl}>使用模型</span></div>
          </div>
          {metrics?.model_totals && Object.keys(metrics.model_totals).length > 0 && (
            <div style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} /> 模型 Token 分布</h3>
              {Object.entries(metrics.model_totals).map(([name, val], i) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text)', width: 130 }}>{name}</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((val as number) / (metrics.total_tokens || 1) * 100)}%`, background: 'var(--color-primary)', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)', width: 80, textAlign: 'right' }}>{(val as number).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => fetchMetrics('project', projectId, 60)} style={{ padding: '6px 12px', background: 'var(--bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, cursor: 'pointer', fontSize: 11, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw size={12} /> 刷新</button>
        </div>
      )}

      {tab === 'history' && (
        <div style={{ color: 'var(--color-text-dim)', fontSize: 13, padding: 20, textAlign: 'center' }}>
          执行历史将在 Agent 运行后自动记录
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 };
const cardVal: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center' };
const cardLbl: React.CSSProperties = { fontSize: 11, color: 'var(--color-text-dim)' };
const inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input, #0b0c10)', color: 'var(--color-text)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, fontSize: 13 };
const btn1: React.CSSProperties = { padding: '6px 14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 };
const btnDanger: React.CSSProperties = { padding: '6px 14px', background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 };
