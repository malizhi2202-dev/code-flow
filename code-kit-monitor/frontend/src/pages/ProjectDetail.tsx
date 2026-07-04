import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Square, RefreshCw, BarChart3, FileText, GitBranch, Bot, Clock, MessageSquare } from 'lucide-react';
import { useProjects } from '../stores/projects';
import { useAgents } from '../stores/agents';
import { useWorkflows } from '../stores/workflows';
import { useMetrics } from '../stores/metrics';
import ChatWindow from '../components/ChatWindow';

interface Props { projectId: number; onBack: () => void; }

export default function ProjectDetail({ projectId, onBack }: Props) {
  const { projects, fetchProjects, executeProject, stopProject } = useProjects();
  const { agents, fetchAgents } = useAgents();
  const { workflows, fetchWorkflows } = useWorkflows();
  const { data: metrics, fetchMetrics } = useMetrics();

  const [tab, setTab] = useState<'overview' | 'chat' | 'monitor' | 'history'>('overview');

  // 项目对话
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatConversationId, setChatConversationId] = useState<number | null>(null);

  useEffect(() => { fetchProjects(); fetchAgents(); fetchWorkflows(); }, []);
  useEffect(() => { if (projectId) fetchMetrics('project', projectId, 60); }, [projectId, tab]);

  const uid = () => localStorage.getItem('current_user_id') || 'admin';

  const sendChatMessage = (content: string) => {
    if (!boundAgent) { setChatError('请先绑定 Agent'); return; }
    setChatLoading(true); setChatError(null);
    const tempMsg = { id: Date.now(), role: 'user', content, status: 'done', created_at: new Date().toISOString() };
    setChatMessages(prev => [...prev, tempMsg]);
    fetch('/api/agents/' + boundAgent.id + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ content, conversation_id: chatConversationId, project_id: projectId }),
    }).then(r => r.json()).then(d => {
      if (d.ok) {
        setChatMessages(prev => prev.filter(m => m.id !== tempMsg.id).concat([d.user_message, d.agent_message]));
        setChatConversationId(d.conversation_id);
        if (d.agent_message?.status === 'error') setChatError(d.agent_message.content);
      } else {
        setChatMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        setChatError(d.detail || '发送失败');
      }
      setChatLoading(false);
    }).catch(() => { setChatLoading(false); setChatError('网络错误'); });
  };

  const project = projects.find(p => p.id === projectId);
  if (!project) return <div style={{ padding: 40, color: 'var(--text-weak)' }}>加载中...</div>;

  const boundAgent = agents.find(a => a.id === project.agent_id);

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

      {/* Tab 导航 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border-normal, #2a2d35)', overflowX: 'auto' }}>
        {(['overview','chat','monitor','history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 14px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent', color: tab === t ? 'var(--color-primary)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
            {t === 'overview' ? '📋 概览' : t === 'chat' ? '💬 对话' : t === 'monitor' ? '📊 监控' : '📜 历史'}
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

          {/* 绑定 Agent（创建时已选定，此处只读展示） */}
          <div style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}><Bot size={14} /> 绑定 Agent</h3>
            {boundAgent ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Bot size={16} color="var(--color-primary)" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{boundAgent.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{boundAgent.model_name} · {boundAgent.runtime} · token 上限: {(boundAgent.token_hard_limit || 0).toLocaleString()}</div>
                  </div>
                </div>

                {/* Agent 绑定的工作流（只读） */}
                <div style={{ borderTop: '1px solid var(--border-normal, #2a2d35)', paddingTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}><GitBranch size={12} /> 工作流</div>
                  {(() => {
                    const wfIds: number[] = boundAgent.workflow_ids || (boundAgent.workflow_id ? [boundAgent.workflow_id] : []);
                    const wfs = wfIds.map((id: number) => workflows.find(w => w.id === id)).filter(Boolean);
                    return wfs.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {wfs.map((wf: any) => (
                          <span key={wf.id} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, background: 'var(--bg-input)', border: '1px solid var(--border-normal, #2a2d35)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <GitBranch size={11} /> {wf.name}
                            <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{(wf.spec_json?.nodes || []).length} 节点</span>
                          </span>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>未绑定工作流</span>;
                  })()}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: 12 }}>创建项目时未选择 Agent · <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} style={{ color: 'var(--color-primary)' }}>返回列表重新创建</a></div>
            )}
          </div>

          {/* 时间 */}
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> 创建于 {project.created_at?.slice(0, 19)}</div>
        </div>
      )}

      {tab === 'chat' && (
        <div style={{ height: 'calc(100vh - 200px)', minHeight: 400 }}>
          {boundAgent ? (
            <ChatWindow
              agentId={boundAgent.id}
              agentName={boundAgent.name}
              messages={chatMessages}
              loading={chatLoading}
              error={chatError}
              onSend={sendChatMessage}
              onRetry={() => setChatError(null)}
              extraHeader={
                <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MessageSquare size={12} /> 项目专属对话 · Agent: {boundAgent.name}
                </span>
              }
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
              <MessageSquare size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: '0 0 8px' }}>暂未绑定 Agent</p>
              <p style={{ fontSize: 12, margin: 0 }}>请先在「📋 概览」中绑定一个 Agent，再使用对话功能</p>
            </div>
          )}
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
