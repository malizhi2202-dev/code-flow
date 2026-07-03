import { useEffect, useState } from 'react';
import { Plus, Play, Square, Trash2, Eye, EyeOff, Bot } from 'lucide-react';
import { useAgents } from '../stores/agents';
import { useWorkflows } from '../stores/workflows';
import ConfirmDialog from '../components/ConfirmDialog';

export default function AgentBuilder() {
  const { agents, fetchAgents, createAgent, deleteAgent, runAgent, stopAgent, loading } = useAgents();
  const { workflows, fetchWorkflows } = useWorkflows();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState({ name: '', runtime: 'langgraph', model_provider: 'openai', model_name: 'gpt-4o', api_key: '', workflow_id: 0, token_soft_limit: 800000, token_hard_limit: 1000000, description: '' });

  useEffect(() => { fetchAgents(); fetchWorkflows(); }, []);

  const handleCreate = async () => {
    await createAgent({ ...form, model_config_json: { temperature: 0.3 } });
    setShowCreate(false);
    setForm({ name: '', runtime: 'langgraph', model_provider: 'openai', model_name: 'gpt-4o', api_key: '', workflow_id: 0, token_soft_limit: 800000, token_hard_limit: 1000000, description: '' });
  };

  const statusColor = (s: string) => s === 'standby' ? 'var(--color-success)' : s === 'running' ? 'var(--color-warning)' : s === 'error' ? 'var(--color-danger)' : 'var(--color-text-dim)';
  const statusLabel = (s: string) => ({ standby: '待命', running: '运行中', completed: '已完成', error: '错误', disabled: '已禁用' } as Record<string, string>)[s] || s;

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>Agent</h1>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
          <Plus size={14} /> 创建 Agent
        </button>
      </div>
      {loading ? <p style={{ color: 'var(--color-text-dim)' }}>加载中...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {agents.map((a) => (
            <div key={a.id} style={{ background: 'var(--color-surface)', borderRadius: 8, padding: 16, border: '1px solid var(--color-border)', cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bot size={18} color="var(--color-primary)" />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{a.name}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: statusColor(a.status), color: '#fff' }}>{statusLabel(a.status)}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {a.status === 'standby' && <button onClick={() => runAgent(a.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-success)' }} title="运行"><Play size={14} /></button>}
                  {a.status === 'running' && <button onClick={() => stopAgent(a.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} title="停止"><Square size={14} /></button>}
                  {a.status !== 'running' && <button onClick={() => setDeleteId(a.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} title="删除"><Trash2 size={14} /></button>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                <span>运行时: {a.runtime}</span>
                <span>模型: {a.model_name}</span>
                <span>软限制: {a.token_soft_limit?.toLocaleString()}</span>
                <span>硬限制: {a.token_hard_limit?.toLocaleString()}</span>
                {a.workflow_summary && <span style={{ gridColumn: '1/-1' }}>工作流: {a.workflow_summary.name} ({a.workflow_summary.node_count} 节点)</span>}
              </div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)' }}>
                Token 已用: {a.total_tokens_used?.toLocaleString()} | 项目: {a.project_count}
              </div>
            </div>
          ))}
          {agents.length === 0 && <p style={{ color: 'var(--color-text-dim)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>暂无 Agent，点击「创建 Agent」开始</p>}
        </div>
      )}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--color-elevated)', borderRadius: 8, padding: 24, width: 520, maxHeight: '85vh', overflow: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 0 }}>创建 Agent</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={lbl}>名称</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inp} placeholder="我的 Agent" /></div>
              <div><label style={lbl}>描述</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Agent 用途描述" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><label style={lbl}>运行时</label><select value={form.runtime} onChange={(e) => setForm({ ...form, runtime: e.target.value })} style={inp}><option value="langchain">LangChain</option><option value="langgraph">LangGraph</option></select></div>
                <div><label style={lbl}>模型提供商</label><select value={form.model_provider} onChange={(e) => setForm({ ...form, model_provider: e.target.value })} style={inp}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="local">Local</option></select></div>
              </div>
              <div><label style={lbl}>模型名称</label><input value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} style={inp} placeholder="gpt-4o / claude-sonnet-5" /></div>
              <div><label style={lbl}>API Key</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input type={showKey ? 'text' : 'password'} value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} style={{ ...inp, flex: 1 }} placeholder="sk-..." />
                  <button onClick={() => setShowKey(!showKey)} style={{ padding: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer' }}>{showKey ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                </div>
                <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>🔒 AES-256-GCM 加密存储 · 前端脱敏展示</span>
              </div>
              <div><label style={lbl}>绑定工作流</label><select value={form.workflow_id} onChange={(e) => setForm({ ...form, workflow_id: +e.target.value })} style={inp}><option value={0}>-- 选择工作流 --</option>{workflows.filter(w => w.status === 'published').map(w => <option key={w.id} value={w.id}>{w.name} ({w.spec_json?.nodes?.length || 0} 节点)</option>)}</select></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><label style={lbl}>Token 软限制</label><input type="number" value={form.token_soft_limit} onChange={(e) => setForm({ ...form, token_soft_limit: +e.target.value })} style={inp} /></div>
                <div><label style={lbl}>Token 硬限制</label><input type="number" value={form.token_hard_limit} onChange={(e) => setForm({ ...form, token_hard_limit: +e.target.value })} style={inp} /></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} style={btn2}>取消</button>
              <button onClick={handleCreate} disabled={!form.name || !form.api_key} style={{ ...btn1, opacity: form.name && form.api_key ? 1 : 0.5 }}>创建</button>
            </div>
          </div>
        </div>
      )}
      {deleteId && <ConfirmDialog open={true} title="确认删除" message="确定删除此 Agent？" onConfirm={async () => { await deleteAgent(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 };
const inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' };
const btn1: React.CSSProperties = { padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btn2: React.CSSProperties = { padding: '8px 16px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
