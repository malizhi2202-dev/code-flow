import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, ShieldAlert, Plus, X, ChartBarIncreasing, RefreshCw, Database, Link2, Wifi, WifiOff } from 'lucide-react';

var lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
var inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' };
var th: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 500, fontSize: 10, whiteSpace: 'nowrap' };
var td: React.CSSProperties = { padding: '4px 8px', fontSize: 11, color: 'var(--color-text)', whiteSpace: 'nowrap' };

export default function AgentDetail({ agent, onBack, onSave, onDelete }: {
  agent: any; onBack: () => void; onSave: (data: any) => void; onDelete?: () => void;
}) {
  var isNew = !agent || !agent.id;
  var [data, setData] = useState<any>(Object.assign({
    name: '', description: '', runtime: 'langgraph', model_provider: 'ollama', model_name: 'qwen2:0.5b',
    api_key: '', workflow_ids: [], token_soft_limit: 800000, token_hard_limit: 1000000,
    gate_pre: '', gate_post: '', io_filter: 'none', system_prompt: '', role_def: '', sop: '',
  }, agent || {}));
  var [saved, setSaved] = useState(false);
  var [workflows, setWorkflows] = useState<any[]>([]);
  var [monData, setMonData] = useState<any>(null);
  var [tab, setTab] = useState('edit');
  // 资料源
  var [knowledgeSources, setKnowledgeSources] = useState<any[]>([]);
  var [showSourceForm, setShowSourceForm] = useState(false);
  var [sourceForm, setSourceForm] = useState<any>({ source_type: 'http_api', url: '', name: '', description: '', config_json: {} });
  // 记忆
  var [memories, setMemories] = useState<any[]>([]);
  var [memoryChannels, setMemoryChannels] = useState<any>({});
  var [showMemForm, setShowMemForm] = useState(false);
  var [memForm, setMemForm] = useState<any>({ channel: 'web', key: '', value: '', memory_type: 'fact', priority: 5 });

  var uid = function() { return localStorage.getItem('current_user_id') || 'admin'; };

  useEffect(function() {
    fetch('/api/workflows', { headers: { 'X-User-Id': uid() } }).then(function(r) { return r.json(); }).then(function(d) { setWorkflows(d.workflows || []); });
    // 加载资料源 + 记忆
    if (agent?.id) {
      fetch('/api/agents/' + agent.id + '/knowledge-sources', { headers: { 'X-User-Id': uid() } }).then(function(r) { return r.json(); }).then(function(d) { if (Array.isArray(d)) setKnowledgeSources(d); });
      loadMemories();
      loadMemoryStats();
    }
    if (agent?.id) {
      fetch('/api/metrics/sessions?limit=500&entity_type=agent', { headers: { 'X-User-Id': uid() } }).then(function(r) { return r.json(); }).then(function(d) {
        var all = (d.sessions || []).filter(function(s: any) { return s.entity_id === agent.id || s.entity_type === 'agent'; });
        // 时间分桶
        var bm: Record<number, any> = {};
        all.forEach(function(s: any) {
          var dt = new Date(s.timestamp); var ts = Math.floor(dt.getTime() / 1000 / 300) * 300;
          if (!bm[ts]) bm[ts] = { ts, time: dt.getHours().toString().padStart(2,'0')+':'+dt.getMinutes().toString().padStart(2,'0'), tokens: 0, count: 0 };
          bm[ts].tokens += s.total_tokens || 0; bm[ts].count += 1;
        });
        setMonData({ sessions: all.slice(0, 50), buckets: Object.values(bm).sort(function(a: any, b: any) { return a.ts - b.ts; }) });
      });
    }
  }, [agent]);

  var handleSave = function() { onSave(Object.assign({}, data, { knowledge_sources: knowledgeSources })); setSaved(true); setTimeout(function() { setSaved(false); }, 1500); };

  // 资料源 CRUD
  var saveSource = function() {
    if (!agent?.id) return; // 需要先保存 Agent
    var url = '/api/agents/' + agent.id + '/knowledge-sources';
    var method = sourceForm.id ? 'PUT' : 'POST';
    var apiUrl = sourceForm.id ? url + '/' + sourceForm.id : url;
    fetch(apiUrl, { method: method, headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() }, body: JSON.stringify(sourceForm) })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.ok || d.source) {
          var ks = d.source || sourceForm;
          if (sourceForm.id) {
            setKnowledgeSources(knowledgeSources.map(function(s: any) { return s.id === ks.id ? ks : s; }));
          } else {
            setKnowledgeSources([ks].concat(knowledgeSources));
          }
          setShowSourceForm(false);
          setSourceForm({ source_type: 'http_api', url: '', name: '', description: '', config_json: {} });
        }
      });
  };

  var deleteSource = function(sourceId: number) {
    if (!agent?.id) return;
    fetch('/api/agents/' + agent.id + '/knowledge-sources/' + sourceId, { method: 'DELETE', headers: { 'X-User-Id': uid() } })
      .then(function() { setKnowledgeSources(knowledgeSources.filter(function(s: any) { return s.id !== sourceId; })); });
  };

  // 记忆 CRUD
  var loadMemories = function() {
    if (!agent?.id) return;
    fetch('/api/agents/' + agent.id + '/memory?limit=100', { headers: { 'X-User-Id': uid() } })
      .then(function(r) { return r.json(); }).then(function(d) { if (Array.isArray(d)) setMemories(d); });
  };
  var loadMemoryStats = function() {
    if (!agent?.id) return;
    fetch('/api/agents/' + agent.id + '/memory/channels', { headers: { 'X-User-Id': uid() } })
      .then(function(r) { return r.json(); }).then(function(d) { setMemoryChannels(d.channels || {}); });
  };
  var saveMemory = function() {
    if (!agent?.id) return;
    fetch('/api/agents/' + agent.id + '/memory', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify(Object.assign({}, memForm, { value: (function() { try { return JSON.parse(memForm.value); } catch(e) { return memForm.value; } })() })),
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d.ok) { setShowMemForm(false); setMemForm({ channel: 'web', key: '', value: '', memory_type: 'fact', priority: 5 }); loadMemories(); loadMemoryStats(); }
    });
  };
  var deleteMemory = function(mid: number) {
    if (!agent?.id) return;
    fetch('/api/agents/' + agent.id + '/memory/' + mid, { method: 'DELETE', headers: { 'X-User-Id': uid() } })
      .then(function() { loadMemories(); loadMemoryStats(); });
  };

  var testSource = function(sourceId: number) {
    if (!agent?.id) return;
    fetch('/api/agents/' + agent.id + '/knowledge-sources/' + sourceId + '/test', { method: 'POST', headers: { 'X-User-Id': uid() } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var newList = knowledgeSources.map(function(s: any) {
          if (s.id === sourceId) return Object.assign({}, s, { last_test_ok: d.ok, last_test_at: new Date().toISOString() });
          return s;
        });
        setKnowledgeSources(newList);
      });
  };
  var toggleWf = function(wfId: number) {
    var ids = (data.workflow_ids || []).slice();
    var idx = ids.indexOf(wfId);
    if (idx >= 0) ids.splice(idx, 1); else ids.push(wfId);
    setData(Object.assign({}, data, { workflow_ids: ids }));
  };

  // 工作流消耗统计
  var wfStats: Record<number, any> = {};
  if (monData) {
    monData.sessions.forEach(function(s: any) {
      var wfId = s.entity_id; if (!wfStats[wfId]) wfStats[wfId] = { tokens: 0, calls: 0 };
      wfStats[wfId].tokens += s.total_tokens || 0; wfStats[wfId].calls += 1;
    });
  }

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ArrowLeft size={18} /></button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0, flex: 1 }}>{isNew ? '创建 Agent' : data.name}</h1>
        {saved && <span style={{ fontSize: 11, color: 'var(--green)', padding: '4px 10px', background: 'var(--green-bg)', borderRadius: 4 }}>已保存</span>}
      </div>

      {!isNew && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
          {['edit', 'memory', 'monitor'].map(function(t) { return <button key={t} onClick={function() { setTab(t); }} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent', color: tab === t ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>{t === 'edit' ? '✏️ 编辑' : t === 'memory' ? '🧠 记忆' : '📊 监控'}</button>; })}
        </div>
      )}

      {tab === 'edit' && (
        <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>名称</label><input value={data.name} onChange={function(e) { setData(Object.assign({}, data, { name: e.target.value })); }} style={inp} /></div>
            <div><label style={lbl}>运行时</label><select value={data.runtime} onChange={function(e) { setData(Object.assign({}, data, { runtime: e.target.value })); }} style={inp}><option value="langgraph">LangGraph</option><option value="langchain">LangChain</option></select></div>
          </div>
          <div><label style={lbl}>描述</label><input value={data.description} onChange={function(e) { setData(Object.assign({}, data, { description: e.target.value })); }} style={inp} /></div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <label style={{ ...lbl, fontSize: 13 }}>📝 系统 Prompt</label>
            <textarea value={data.system_prompt || ''} onChange={function(e) { setData(Object.assign({}, data, { system_prompt: e.target.value })); }} rows={6} style={{ ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, minHeight: 120 }} placeholder={'你是一个资深的代码审查员。\n\n核心原则：\n- 逐行审查代码质量和安全性\n- 引用具体行号给出建议\n- 区分 blocking 和 suggestion'} />
          </div>
          <div>
            <label style={{ ...lbl, fontSize: 13 }}>👤 角色定义</label>
            <textarea value={data.role_def || ''} onChange={function(e) { setData(Object.assign({}, data, { role_def: e.target.value })); }} rows={4} style={{ ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, minHeight: 80 }} placeholder={'性情: 严谨、边界思维\n\n职责: 代码审查、安全扫描\n\n不能做: 不直接修改代码'} />
          </div>
          <div>
            <label style={{ ...lbl, fontSize: 13 }}>📋 SOP / 调用方式</label>
            <textarea value={data.sop || ''} onChange={function(e) { setData(Object.assign({}, data, { sop: e.target.value })); }} rows={3} style={{ ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, minHeight: 60 }} placeholder={'触发: on_project_create\n输入: requirement_doc\n输出: review_report'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div><label style={lbl}>模型 Provider</label><select value={data.model_provider} onChange={function(e) { setData(Object.assign({}, data, { model_provider: e.target.value })); }} style={inp}><option value="ollama">Ollama</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select></div>
            <div><label style={lbl}>模型名称</label><input value={data.model_name} onChange={function(e) { setData(Object.assign({}, data, { model_name: e.target.value })); }} style={inp} /></div>
            <div><label style={lbl}>API Key</label><input type="password" value={data.api_key || ''} onChange={function(e) { setData(Object.assign({}, data, { api_key: e.target.value })); }} style={inp} /></div>
          </div>

          <div>
            <label style={lbl}>🔀 绑定工作流（多选）</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {workflows.map(function(w) {
                var isBound = (data.workflow_ids || []).indexOf(w.id) >= 0;
                return (
                  <div key={w.id} onClick={function() { toggleWf(w.id); }} style={{ padding: '8px 12px', borderRadius: 6, border: isBound ? '2px solid var(--color-primary)' : '1px solid var(--border)', background: isBound ? 'var(--blue-bg)' : 'var(--bg-card)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{isBound ? '✅' : '○'}</span>
                    <span>{w.name}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{(w.spec_json?.nodes || []).length}节点</span>
                  </div>
                );
              })}
              {workflows.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>暂无工作流</span>}
            </div>
          </div>

          <details style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><ShieldAlert size={14} /> 🛡️ 安全闸门 & Token 限制</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <input value={data.gate_pre || ''} onChange={function(e) { setData(Object.assign({}, data, { gate_pre: e.target.value })); }} style={inp} placeholder="前置校验规则" />
              <input value={data.gate_post || ''} onChange={function(e) { setData(Object.assign({}, data, { gate_post: e.target.value })); }} style={inp} placeholder="后置校验规则" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <select value={data.io_filter || 'none'} onChange={function(e) { setData(Object.assign({}, data, { io_filter: e.target.value })); }} style={inp}><option value="none">I/O不过滤</option><option value="sanitize">基础</option><option value="strict">严格</option></select>
                <input type="number" value={data.token_soft_limit} onChange={function(e) { setData(Object.assign({}, data, { token_soft_limit: parseInt(e.target.value) || 0 })); }} style={inp} placeholder="软限制" />
                <input type="number" value={data.token_hard_limit} onChange={function(e) { setData(Object.assign({}, data, { token_hard_limit: parseInt(e.target.value) || 0 })); }} style={inp} placeholder="硬限制" />
              </div>
            </div>
          </details>

          {/* 资料源接入 */}
          <details open style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Database size={14} /> 📡 资料源接入（RAG / DB / API）</summary>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {knowledgeSources.map(function(ks: any) {
                return (
                  <div key={ks.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: ks.source_type === 'rag_api' ? 'var(--purple-bg, #7c3aed20)' : ks.source_type === 'mysql' ? 'var(--blue-bg)' : 'var(--bg-card)', color: ks.source_type === 'rag_api' ? '#a78bfa' : 'var(--blue)', fontWeight: 500 }}>{ks.source_type}</span>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{ks.name || ks.url}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{ks.url}</span>
                    {ks.last_test_ok === true && <span title="连接正常"><Wifi size={12} color="var(--green)" /></span>}
                    {ks.last_test_ok === false && <span title="连接失败"><WifiOff size={12} color="var(--red)" /></span>}
                    <button onClick={function() { testSource(ks.id); }} style={{ padding: '2px 8px', fontSize: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', color: 'var(--text-secondary)' }}>测试</button>
                    <button onClick={function() { setSourceForm(ks); setShowSourceForm(true); }} style={{ padding: '2px 8px', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>✏️</button>
                    <button onClick={function() { deleteSource(ks.id); }} style={{ padding: '2px 4px', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }} title="删除"><X size={12} /></button>
                  </div>
                );
              })}
              {!showSourceForm && (
                <button onClick={function() { setShowSourceForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: 'none', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12 }}>
                  <Plus size={12} /> 添加资料源
                </button>
              )}

              {showSourceForm && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div>
                      <label style={lbl}>类型</label>
                      <select value={sourceForm.source_type} onChange={function(e) { setSourceForm(Object.assign({}, sourceForm, { source_type: e.target.value })); }} style={inp}>
                        <option value="rag_api">RAG API</option>
                        <option value="mysql">MySQL</option>
                        <option value="postgres">PostgreSQL</option>
                        <option value="redis">Redis</option>
                        <option value="http_api">HTTP API</option>
                        <option value="url_crawl">URL 爬取</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>名称</label>
                      <input value={sourceForm.name} onChange={function(e) { setSourceForm(Object.assign({}, sourceForm, { name: e.target.value })); }} style={inp} placeholder="知识库/内部文档/用户数据" />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>连接地址 (URL)</label>
                    <input value={sourceForm.url} onChange={function(e) { setSourceForm(Object.assign({}, sourceForm, { url: e.target.value })); }} style={inp} placeholder={sourceForm.source_type === 'mysql' ? 'mysql://user:pass@host:3306/db' : sourceForm.source_type === 'postgres' ? 'postgresql://user:pass@host:5432/db' : sourceForm.source_type === 'redis' ? 'redis://host:6379/0' : 'https://my-rag-api.example.com/query'} />
                  </div>
                  <div>
                    <label style={lbl}>描述</label>
                    <input value={sourceForm.description} onChange={function(e) { setSourceForm(Object.assign({}, sourceForm, { description: e.target.value })); }} style={inp} placeholder="这个资料源包含什么内容" />
                  </div>
                  {(sourceForm.source_type === 'mysql' || sourceForm.source_type === 'postgres' || sourceForm.source_type === 'redis') && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div><label style={lbl}>用户名（可选）</label><input value={(sourceForm.config_json || {}).user || ''} onChange={function(e) { setSourceForm(Object.assign({}, sourceForm, { config_json: Object.assign({}, sourceForm.config_json || {}, { user: e.target.value }) })); }} style={inp} /></div>
                      <div><label style={lbl}>密码/Token（可选）</label><input type="password" value={(sourceForm.config_json || {}).password || ''} onChange={function(e) { setSourceForm(Object.assign({}, sourceForm, { config_json: Object.assign({}, sourceForm.config_json || {}, { password: e.target.value }) })); }} style={inp} /></div>
                    </div>
                  )}
                  {(sourceForm.source_type === 'rag_api' || sourceForm.source_type === 'http_api') && (
                    <div>
                      <label style={lbl}>API Key（可选）</label>
                      <input type="password" value={(sourceForm.config_json || {}).api_key || ''} onChange={function(e) { setSourceForm(Object.assign({}, sourceForm, { config_json: Object.assign({}, sourceForm.config_json || {}, { api_key: e.target.value }) })); }} style={inp} placeholder="Bearer Token / API Key" />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={saveSource} style={{ padding: '6px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>保存</button>
                    <button onClick={function() { setShowSourceForm(false); setSourceForm({ source_type: 'http_api', url: '', name: '', description: '', config_json: {} }); }} style={{ padding: '6px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>取消</button>
                  </div>
                </div>
              )}
            </div>
          </details>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} style={{ padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Save size={14} /> 保存</button>
            {onDelete && <button onClick={onDelete} style={{ padding: '10px 16px', background: 'none', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={14} /> 删除</button>}
          </div>
        </div>
      )}

      {tab === 'memory' && (
        <div style={{ maxWidth: 900 }}>
          {/* 跨渠道统计卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
            {Object.keys(memoryChannels).map(function(ch: string) {
              var s = memoryChannels[ch];
              return (
                <div key={ch} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>{ch === 'web' ? '🌐' : ch === 'feishu' ? '🐦' : ch === 'dingtalk' ? '📌' : ch === 'wechat_work' ? '💬' : ch === 'slack' ? '💎' : ch === 'telegram' ? '✈️' : '🔌'}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>{s.total}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{ch}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>{Object.keys(s.types || {}).join(', ')}</div>
                </div>
              );
            })}
            {Object.keys(memoryChannels).length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-dim)', padding: 20 }}>暂无记忆数据</div>}
          </div>

          {/* 记忆列表 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>📝 记忆条目（{memories.length}）</span>
            {!showMemForm && <button onClick={function() { setShowMemForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}><Plus size={14} /> 添加记忆</button>}
          </div>

          {/* 添加记忆表单 */}
          {showMemForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>
                  <label style={lbl}>渠道</label>
                  <select value={memForm.channel} onChange={function(e) { setMemForm(Object.assign({}, memForm, { channel: e.target.value })); }} style={inp}>
                    <option value="web">🌐 Web</option><option value="feishu">🐦 飞书</option><option value="dingtalk">📌 钉钉</option><option value="wechat_work">💬 企微</option><option value="slack">💎 Slack</option><option value="telegram">✈️ Telegram</option><option value="api">🔌 API</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>类型</label>
                  <select value={memForm.memory_type} onChange={function(e) { setMemForm(Object.assign({}, memForm, { memory_type: e.target.value })); }} style={inp}>
                    <option value="fact">📋 事实</option><option value="preference">⭐ 偏好</option><option value="conversation">💬 对话</option><option value="context">📎 上下文</option>
                  </select>
                </div>
              </div>
              <div><label style={lbl}>Key</label><input value={memForm.key} onChange={function(e) { setMemForm(Object.assign({}, memForm, { key: e.target.value })); }} style={inp} placeholder="user_preference / project_context" /></div>
              <div><label style={lbl}>Value (JSON)</label><textarea value={memForm.value} onChange={function(e) { setMemForm(Object.assign({}, memForm, { value: e.target.value })); }} rows={3} style={{ ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 11 }} placeholder='{"language":"zh","tone":"formal"}' /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div><label style={lbl}>优先级 (1-10)</label><input type="number" value={memForm.priority} onChange={function(e) { setMemForm(Object.assign({}, memForm, { priority: parseInt(e.target.value) || 5 })); }} style={inp} min={1} max={10} /></div>
                <div><label style={lbl}>TTL (秒, 空=永久)</label><input type="number" value={memForm.ttl_seconds || ''} onChange={function(e) { setMemForm(Object.assign({}, memForm, { ttl_seconds: e.target.value ? parseInt(e.target.value) : null })); }} style={inp} placeholder="86400 = 1天" /></div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={saveMemory} style={{ padding: '6px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>保存</button>
                <button onClick={function() { setShowMemForm(false); }} style={{ padding: '6px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>取消</button>
              </div>
            </div>
          )}

          {/* 记忆条目列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {memories.map(function(m: any) {
              var channelIcon = m.channel === 'web' ? '🌐' : m.channel === 'feishu' ? '🐦' : m.channel === 'dingtalk' ? '📌' : m.channel === 'wechat_work' ? '💬' : m.channel === 'slack' ? '💎' : m.channel === 'telegram' ? '✈️' : '🔌';
              var typeColor = m.memory_type === 'preference' ? '#a78bfa' : m.memory_type === 'fact' ? '#5cb878' : m.memory_type === 'conversation' ? '#548cf0' : '#e8a450';
              return (
                <div key={m.id} style={{ background: 'var(--bg-card)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{channelIcon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{m.key}</span>
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: typeColor + '20', color: typeColor }}>{m.memory_type}</span>
                      {m.priority >= 8 && <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--red-bg)', color: 'var(--red)' }}>高优先级</span>}
                      {m.expires_at && <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>⏰ {new Date(m.expires_at).toLocaleString()}</span>}
                    </div>
                    <pre style={{ margin: 0, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 80, overflow: 'auto' }}>{JSON.stringify(m.value, null, 2)}</pre>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 4 }}>
                      {m.channel} · {m.session_id || '无会话'} · {m.updated_at ? new Date(m.updated_at).toLocaleString() : ''}
                    </div>
                  </div>
                  <button onClick={function() { deleteMemory(m.id); }} style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }} title="删除"><X size={14} /></button>
                </div>
              );
            })}
            {memories.length === 0 && !showMemForm && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                <p style={{ fontSize: 28, margin: '0 0 8px' }}>🧠</p>
                <p style={{ fontSize: 13, margin: 0 }}>暂无记忆数据</p>
                <p style={{ fontSize: 11, margin: '4px 0' }}>Agent 运行时会自动记录跨渠道记忆</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'monitor' && monData && (
        <div>
          {/* 看板 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={card}><div style={cardV}>{monData.sessions.reduce(function(s: number, x: any) { return s + (x.total_tokens || 0); }, 0).toLocaleString()}</div><div style={cardL}>总 Token 消耗</div></div>
            <div style={card}><div style={cardV}>{monData.sessions.length}</div><div style={cardL}>会话数</div></div>
            <div style={card}><div style={cardV}>{(monData.sessions.reduce(function(s: number, x: any) { return s + (x.duration_ms || 0); }, 0) / 1000).toFixed(1)}s</div><div style={cardL}>总执行时间</div></div>
            <div style={card}><div style={cardV}>{(data.workflow_ids || []).length}</div><div style={cardL}>绑定工作流</div></div>
          </div>

          {/* 折线图 */}
          {monData.buckets.length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>📈 Token 消耗趋势</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 140, gap: 2 }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 140, paddingRight: 4, fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                  <span>{Math.max.apply(null, monData.buckets.map(function(b: any) { return b.tokens; })).toLocaleString()}</span><span>0</span>
                </div>
                {monData.buckets.map(function(b: any, i: number) {
                  var max = Math.max.apply(null, monData.buckets.map(function(x: any) { return x.tokens; })) || 1;
                  return <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 140 }}>
                    <div title={b.time + ': ' + b.tokens.toLocaleString()} style={{ width: '70%', height: Math.max(4, b.tokens / max * 135), background: 'var(--color-primary)', borderRadius: '2px 2px 0 0', opacity: 0.8, minWidth: 4 }} />
                  </div>;
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                <span>{monData.buckets[0]?.time}</span><span>{monData.buckets[monData.buckets.length - 1]?.time}</span>
              </div>
            </div>
          )}

          {/* 每个工作流的消耗 */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>🔀 各工作流消耗明细</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={th}>工作流</th><th style={{ ...th, textAlign: 'right' }}>Token 消耗</th><th style={{ ...th, textAlign: 'right' }}>调用次数</th><th style={th}>占比</th>
              </tr></thead>
              <tbody>
                {(data.workflow_ids || []).map(function(wfId: number) {
                  var wf = workflows.find(function(w) { return w.id === wfId; });
                  var stats = wfStats[wfId] || { tokens: 0, calls: 0 };
                  var totalTokens = monData.sessions.reduce(function(s: number, x: any) { return s + (x.total_tokens || 0); }, 0) || 1;
                  return (
                    <tr key={wfId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={td}>{wf?.name || '工作流 #' + wfId}</td>
                      <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{stats.tokens.toLocaleString()}</td>
                      <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{stats.calls}</td>
                      <td style={td}>
                        <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, width: 80 }}>
                          <div style={{ height: '100%', width: Math.round(stats.tokens / totalTokens * 100) + '%', background: 'var(--color-primary)', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{Math.round(stats.tokens / totalTokens * 100)}%</span>
                      </td>
                    </tr>
                  );
                })}
                {(data.workflow_ids || []).length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>未绑定工作流</td></tr>}
              </tbody>
            </table>
          </div>

          {/* 会话列表 */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>📜 会话消耗（{monData.sessions.length} 条）</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}><th style={th}>时间</th><th style={th}>模型</th><th style={th}>工具</th><th style={{ ...th, textAlign: 'right' }}>Token</th><th style={th}>耗时</th><th style={th}>状态</th></tr></thead>
              <tbody>
                {monData.sessions.map(function(s: any, i: number) {
                  return <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={td}>{s.timestamp?.slice(11, 19) || '-'}</td><td style={{ ...td, fontFamily: 'var(--font-mono)' }}>{s.model_name}</td><td style={td}>{s.tool_name || '-'}</td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{s.total_tokens?.toLocaleString()}</td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)' }}>{s.duration_ms ? (s.duration_ms / 1000).toFixed(1) + 's' : '-'}</td>
                    <td style={td}><span style={{ padding: '2px 6px', borderRadius: 2, fontSize: 9, background: s.status === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: s.status === 'success' ? 'var(--green)' : 'var(--red)' }}>{s.status === 'success' ? 'OK' : 'ERR'}</span></td>
                  </tr>;
                })}
                {monData.sessions.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>暂无会话</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

var card: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', textAlign: 'center' };
var cardV: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' };
var cardL: React.CSSProperties = { fontSize: 10, color: 'var(--text-dim)', marginTop: 4 };
