import { useEffect, useState } from 'react';
import { Plus, Download, Trash2, Wrench, Zap, Link, Search, BarChart3, Sparkles, Upload } from 'lucide-react';
import { useTools, Tool } from '../stores/tools';
import ConfirmDialog from '../components/ConfirmDialog';
import EntityMonitor from '../components/EntityMonitor';

var TYPE_ICONS: Record<string, any> = { plugin: <Wrench size={16} />, skill: <Zap size={16} />, mcp: <Link size={16} /> };
var TYPE_LABELS: Record<string, string> = { plugin: 'Plugin', skill: 'Skill', mcp: 'MCP' };

interface Props { onSelect?: (tool: any) => void; }

export default function ToolMarket({ onSelect }: Props) {
  var { tools, fetchTools, deleteTool, loading } = useTools();
  var [typeFilter, setTypeFilter] = useState('');
  var [search, setSearch] = useState('');
  var [deleteId, setDeleteId] = useState<number | null>(null);
  var [monitorTool, setMonitorTool] = useState<Tool | null>(null);
  var [showNL, setShowNL] = useState(false);
  var [nlDesc, setNlDesc] = useState('');
  var [nlType, setNlType] = useState('plugin');
  var [generating, setGenerating] = useState(false);
  var [generated, setGenerated] = useState<any>(null);

  useEffect(function() { fetchTools(typeFilter || undefined); }, [typeFilter]);

  var filtered = tools.filter(function(t) { return !search || t.name.toLowerCase().indexOf(search.toLowerCase()) >= 0; });

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>工具库</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            <Upload size={13} /> 上传 MD
            <input type="file" accept=".md,.markdown" onChange={function(e) { var f = e.target.files?.[0]; if (f) { var r = new FileReader(); r.onload = function() { if (onSelect) onSelect({ name: f.name.replace('.md',''), type: 'plugin', description: '', content_md: r.result as string, token_soft_limit: 80000, token_hard_limit: 100000, permissions: ['read'], gate_pre: '', gate_post: '', io_filter: 'none' }); }; r.readAsText(f); } }} style={{ display: 'none' }} />
          </label>
          <button onClick={function() { setShowNL(true); setNlDesc(''); setGenerated(null); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', background: 'var(--bg-card)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            <Sparkles size={13} /> 自然语言生成
          </button>
          <button onClick={function() { if (onSelect) onSelect({ name: '', type: 'plugin', description: '', content_md: '', token_soft_limit: 80000, token_hard_limit: 100000, permissions: ['read'], gate_pre: '', gate_post: '', io_filter: 'none' }); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
            <Plus size={14} /> 创建工具
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'plugin', 'skill', 'mcp'].map(function(t) {
          return <button key={t} onClick={function() { setTypeFilter(t); }} style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid var(--border)', background: typeFilter === t ? 'var(--color-primary)' : 'var(--bg-card)', color: typeFilter === t ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>{t || '全部'}</button>;
        })}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', borderRadius: 4, padding: '0 8px', border: '1px solid var(--border)' }}>
          <Search size={14} color="var(--text-dim)" />
          <input placeholder="搜索..." value={search} onChange={function(e) { setSearch(e.target.value); }} style={{ border: 'none', background: 'none', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 0', outline: 'none', width: 160 }} />
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--text-dim)' }}>加载中...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {filtered.map(function(tool) {
            return (
              <div key={tool.id} onClick={function() { if (onSelect) onSelect(tool); }} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--color-primary)' }}>{TYPE_ICONS[tool.type]}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{TYPE_LABELS[tool.type]}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: tool.status === 'active' ? 'var(--green-bg)' : 'var(--red-bg)', color: tool.status === 'active' ? 'var(--green)' : 'var(--red)' }}>{tool.status === 'active' ? '已发布' : '已禁用'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={function(e: any) { e.stopPropagation(); setMonitorTool(tool); }} style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="监控"><BarChart3 size={14} /></button>
                    <button onClick={function(e: any) { e.stopPropagation(); window.open('/api/tools/' + tool.id + '/demo'); }} style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="下载 demo"><Download size={14} /></button>
                    <button onClick={function(e: any) { e.stopPropagation(); setDeleteId(tool.id); }} style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} title="删除"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{tool.name}</div>
                {tool.content_md ? (
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', maxHeight: 60, overflow: 'hidden', whiteSpace: 'pre-wrap', lineHeight: 1.5, opacity: 0.7, marginBottom: 8 }}>{tool.content_md.slice(0, 200)}{tool.content_md.length > 200 ? '...' : ''}</div>
                ) : <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{tool.description || '点击进入详情编辑'}</div>}
                <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                  <span>软: {tool.token_soft_limit?.toLocaleString()}</span>
                  <span>硬: {tool.token_hard_limit?.toLocaleString()}</span>
                  <span>权限: {(tool.permissions || []).join(', ') || 'read'}</span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p style={{ color: 'var(--text-dim)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>暂无工具，点击「创建工具」开始</p>}
        </div>
      )}
      {showNL && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 24, width: 560, maxHeight: '85vh', overflow: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Sparkles size={18} color="var(--color-primary)" /> 自然语言生成工具</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={lbl}>工具类型</label><select value={nlType} onChange={function(e) { setNlType(e.target.value); }} style={inp}><option value="plugin">Plugin</option><option value="skill">Skill</option><option value="mcp">MCP</option></select></div>
              <div><label style={lbl}>描述你想要的工具</label><textarea value={nlDesc} onChange={function(e) { setNlDesc(e.target.value); }} rows={4} style={{ ...inp, resize: 'vertical' }} placeholder="例：我需要一个查询天气的 MCP 接口，输入城市名，返回温度、湿度、天气描述" /></div>
              <button onClick={async function() { setGenerating(true); var r = await fetch('/api/tools/generate-from-text', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' }, body: JSON.stringify({ description: nlDesc, type: nlType }) }); var d = await r.json(); setGenerated(d); setGenerating(false); }} disabled={!nlDesc.trim() || generating} style={{ padding: '10px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: nlDesc.trim() ? 'pointer' : 'not-allowed', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: nlDesc.trim() ? 1 : 0.5 }}>
                {generating ? '⏳ 生成中...' : <><Sparkles size={14} /> 调用 qwen2:0.5b 生成</>}
              </button>
            </div>
            {generated && <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-card)', borderRadius: 6, border: '1px solid var(--green)', maxHeight: 300, overflow: 'auto' }}><div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{generated.content_md}</div></div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={function() { setShowNL(false); }} style={btn2}>取消</button>
              {generated && <button onClick={function() { setShowNL(false); if (onSelect) onSelect({ name: generated.name || 'AI生成工具', type: nlType, description: '', content_md: generated.content_md || '', token_soft_limit: 80000, token_hard_limit: 100000, permissions: ['read'], gate_pre: '', gate_post: '', io_filter: 'none' }); }} style={btn1}>保存为工具</button>}
            </div>
          </div>
        </div>
      )}
      {deleteId && <ConfirmDialog open={true} title="确认删除" message="确定删除此工具？" onConfirm={async function() { await deleteTool(deleteId); setDeleteId(null); }} onCancel={function() { setDeleteId(null); }} />}
      {monitorTool && <EntityMonitor entityType="tool" entityId={monitorTool.id} entityName={monitorTool.name} onClose={function() { setMonitorTool(null); }} />}
    </div>
  );
}

var lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
var inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' };
var btn1: React.CSSProperties = { padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
var btn2: React.CSSProperties = { padding: '8px 16px', background: 'var(--bg-card)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
