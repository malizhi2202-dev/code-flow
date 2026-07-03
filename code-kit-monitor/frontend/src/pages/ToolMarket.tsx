import { useEffect, useState } from 'react';
import { Plus, Download, Trash2, Wrench, Zap, Link, Search, FileText, Sparkles, Upload, Eye, Edit3, Save, BarChart3 } from 'lucide-react';
import { useTools, Tool } from '../stores/tools';
import ConfirmDialog from '../components/ConfirmDialog';
import EntityMonitor from '../components/EntityMonitor';

const TYPE_ICONS: Record<string, React.ReactNode> = { plugin: <Wrench size={16} />, skill: <Zap size={16} />, mcp: <Link size={16} /> };
const TYPE_LABELS: Record<string, string> = { plugin: 'Plugin', skill: 'Skill', mcp: 'MCP' };

export default function ToolMarket() {
  const { tools, fetchTools, createTool, deleteTool, loading } = useTools();
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [monitorTool, setMonitorTool] = useState<Tool | null>(null);

  // 自然语言生成
  const [showNL, setShowNL] = useState(false);
  const [nlDesc, setNlDesc] = useState('');
  const [nlType, setNlType] = useState('plugin');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<any>(null);

  useEffect(() => { fetchTools(typeFilter || undefined); }, [typeFilter]);

  const filtered = tools.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async (data?: any) => {
    await createTool(data || { type: nlType, name: generated?.name || '新工具', description: '', content_md: generated?.content_md || '', token_soft_limit: 80000, token_hard_limit: 100000, permissions: ['read'] });
    setShowCreate(false); setShowNL(false); setGenerated(null); setNlDesc('');
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await fetch('/api/tools/generate-from-text', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' }, body: JSON.stringify({ description: nlDesc, type: nlType }) });
    const data = await res.json();
    setGenerated(data);
    setGenerating(false);
  };

  const handleSaveContent = async (toolId: number) => {
    setSaving(true);
    await fetch(`/api/tools/${toolId}/content`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' }, body: JSON.stringify({ content_md: editContent }) });
    setSaving(false);
    setEditId(null);
    fetchTools(typeFilter || undefined);
  };

  const startEdit = (tool: Tool) => {
    setEditId(tool.id);
    setEditContent(tool.content_md || `# ${tool.name}\n\n**类型**: ${tool.type}\n**描述**: ${tool.description || ''}\n\n## 配置\n- token软限制: ${tool.token_soft_limit}\n- token硬限制: ${tool.token_hard_limit}\n- 权限: ${(tool.permissions || []).join(', ')}\n`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setGenerated({ name: file.name.replace('.md', ''), content_md: text, type: 'plugin' });
    setShowCreate(true);
    setShowNL(false);
  };

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>工具库</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', background: 'var(--bg-card, #181a1f)', color: 'var(--text-secondary)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            <Upload size={13} /> 上传 MD
            <input type="file" accept=".md,.markdown" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          <button onClick={() => { setShowNL(true); setNlDesc(''); setGenerated(null); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', background: 'var(--bg-card, #181a1f)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            <Sparkles size={13} /> 自然语言生成
          </button>
          <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
            <Plus size={14} /> 创建工具
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'plugin', 'skill', 'mcp'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid var(--border-normal, #2a2d35)', background: typeFilter === t ? 'var(--color-primary)' : 'var(--bg-card)', color: typeFilter === t ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>{t || '全部'}</button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', borderRadius: 4, padding: '0 8px', border: '1px solid var(--border-normal, #2a2d35)' }}>
          <Search size={14} color="var(--text-dim)" />
          <input placeholder="搜索..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'none', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 0', outline: 'none', width: 160 }} />
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--text-dim)' }}>加载中...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {filtered.map(tool => (
            <div key={tool.id} style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: editId === tool.id ? '1px solid var(--color-primary)' : '1px solid var(--border-normal, #2a2d35)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--color-primary)' }}>{TYPE_ICONS[tool.type]}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{TYPE_LABELS[tool.type]}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: tool.status === 'active' ? 'var(--green-bg)' : 'var(--red-bg)', color: tool.status === 'active' ? 'var(--green)' : 'var(--red)' }}>{tool.status === 'active' ? '已发布' : '已禁用'}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {editId === tool.id ? (
                    <button onClick={() => handleSaveContent(tool.id)} disabled={saving} style={{ padding: 3, background: 'var(--green-bg)', border: 'none', borderRadius: 3, cursor: 'pointer', color: 'var(--green)' }} title="保存"><Save size={14} /></button>
                  ) : (
                    <button onClick={() => startEdit(tool)} style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="编辑 Markdown"><Edit3 size={14} /></button>
                  )}
                  <button onClick={() => setMonitorTool(tool)} style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="监控"><BarChart3 size={14} /></button>
                  <button onClick={() => window.open(`/api/tools/${tool.id}/demo`)} style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="下载 demo"><Download size={14} /></button>
                  <button onClick={() => setDeleteId(tool.id)} style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} title="删除"><Trash2 size={14} /></button>
                </div>
              </div>

              {editId === tool.id ? (
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ width: '100%', minHeight: 200, padding: 10, background: 'var(--bg-input, #0b0c10)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 12, border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} placeholder="# 工具名称\n\n**类型**: plugin\n**描述**: ...\n\n## 配置\n- token软限制: 80000\n- token硬限制: 100000\n- 权限: [read]" />
              ) : tool.content_md ? (
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', maxHeight: 100, overflow: 'hidden', whiteSpace: 'pre-wrap', lineHeight: 1.5, opacity: 0.8, marginBottom: 8 }}>
                  {tool.content_md.slice(0, 300)}{tool.content_md.length > 300 ? '...' : ''}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{tool.description || '暂无描述 — 点击 ✏️ 编辑 Markdown'}</div>
              )}

              <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                <span>软限制: {tool.token_soft_limit?.toLocaleString()}</span>
                <span>硬限制: {tool.token_hard_limit?.toLocaleString()}</span>
                <span>权限: {(tool.permissions || []).join(', ') || 'read'}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: 'var(--text-dim)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>暂无工具，点击「创建工具」或「自然语言生成」开始</p>}
        </div>
      )}

      {/* 自然语言生成对话框 */}
      {showNL && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-elevated, #22242a)', borderRadius: 8, padding: 24, width: 560, maxHeight: '85vh', overflow: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Sparkles size={18} color="var(--color-primary)" /> 自然语言生成工具</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={lbl}>工具类型</label><select value={nlType} onChange={e => setNlType(e.target.value)} style={inp}><option value="plugin">Plugin</option><option value="skill">Skill</option><option value="mcp">MCP</option></select></div>
              <div><label style={lbl}>描述你想要的工具</label><textarea value={nlDesc} onChange={e => setNlDesc(e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' }} placeholder="例：我需要一个查询天气的 MCP 接口，输入城市名，返回温度、湿度、天气描述" /></div>
              <button onClick={handleGenerate} disabled={!nlDesc.trim() || generating} style={{ padding: '10px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: nlDesc.trim() ? 'pointer' : 'not-allowed', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: nlDesc.trim() ? 1 : 0.5 }}>
                {generating ? '⏳ 生成中...' : <><Sparkles size={14} /> 调用 qwen2:0.5b 生成</>}
              </button>
            </div>
            {generated && (
              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-card)', borderRadius: 6, border: '1px solid var(--green)', maxHeight: 300, overflow: 'auto' }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{generated.content_md}</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowNL(false)} style={btn2}>取消</button>
              {generated && <button onClick={() => handleCreate()} style={btn1}>保存为工具</button>}
            </div>
          </div>
        </div>
      )}

      {/* 简单创建对话框 */}
      {showCreate && !showNL && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-elevated, #22242a)', borderRadius: 8, padding: 24, width: 480 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 0 }}>创建工具</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={lbl}>类型</label><select onChange={e => setGenerated((g: any) => g ? { ...g, type: e.target.value } : { name: '', content_md: '', type: e.target.value })} style={inp}>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label style={lbl}>名称</label><input placeholder="工具名称" onChange={e => setGenerated((g: any) => ({ ...(g || { type: 'plugin', content_md: '' }), name: e.target.value }))} style={inp} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} style={btn2}>取消</button>
              <button onClick={() => handleCreate()} style={btn1}>创建</button>
            </div>
          </div>
        </div>
      )}
      {deleteId && <ConfirmDialog open={true} title="确认删除" message="确定删除此工具？" onConfirm={async () => { await deleteTool(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
      {monitorTool && <EntityMonitor entityType="tool" entityId={monitorTool.id} entityName={monitorTool.name} onClose={() => setMonitorTool(null)} />}
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 };
const inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input, #0b0c10)', color: 'var(--color-text)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' };
const btn1: React.CSSProperties = { padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btn2: React.CSSProperties = { padding: '8px 16px', background: 'var(--bg-card)', color: 'var(--color-text)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
