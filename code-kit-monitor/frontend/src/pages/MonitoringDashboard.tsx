import { useEffect, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';

interface EntityItem { name: string; tokens: number; calls: number; total_ms: number; }

const nameMap = (n: string) => n.replace('code-kit:', '').replace('code-kit:角色:', '角色·').replace('code-kit:模板:', '模板·').replace('code-kit:参考:', '参考·');

const th: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 500, fontSize: 10, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '4px 8px', fontSize: 11, color: 'var(--color-text)', whiteSpace: 'nowrap' };

function EntityTable({ title, items, color }: { title: string; items?: EntityItem[]; color: string }) {
  const list = items || [];
  const totalTokens = list.reduce((s, i) => s + i.tokens, 0);
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)', marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', color }}>
        {title}（{list.length} 个，{totalTokens.toLocaleString()} tokens）
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={th}>名称</th>
            <th style={{ ...th, textAlign: 'right' }}>Token 消耗</th>
            <th style={{ ...th, textAlign: 'right' }}>调用次数</th>
            <th style={{ ...th, textAlign: 'right' }}>平均耗时</th>
          </tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>暂无数据</td></tr>}
            {list.map(function(item, i) {
              const pct = Math.min(100, item.tokens / Math.max(1, totalTokens) * 100);
              const avgMs = (item.total_ms / Math.max(1, item.calls) / 1000).toFixed(2);
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={td}>{nameMap(item.name)}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                    <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, marginBottom: 3 }}>
                      <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 2 }} />
                    </div>
                    {item.tokens.toLocaleString()}
                  </td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{item.calls}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{avgMs}s</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MonitoringDashboard() {
  const [breakdown, setBreakdown] = useState<{ tools: EntityItem[]; workflows: EntityItem[]; agents: EntityItem[]; projects: EntityItem[] } | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [live, setLive] = useState<any>({});
  const [rankings, setRankings] = useState<any[]>([]);
  const [rankDim, setRankDim] = useState('agent');

  const fetchAll = function() {
    var uid = localStorage.getItem('current_user_id') || 'admin';
    Promise.all([
      fetch('/api/metrics/entity-breakdown?minutes=1440', { headers: { 'X-User-Id': uid } }).then(function(r) { return r.json(); }),
      fetch('/api/metrics/sessions?limit=200', { headers: { 'X-User-Id': uid } }).then(function(r) { return r.json(); }),
      fetch('/api/metrics/live?minutes=1440', { headers: { 'X-User-Id': uid } }).then(function(r) { return r.json(); }),
      fetch('/api/metrics/rankings?dimension=' + rankDim + '&top=10&minutes=1440', { headers: { 'X-User-Id': uid } }).then(function(r) { return r.json(); }),
    ]).then(function(results) {
      setBreakdown(results[0]);
      setSessions(results[1].sessions || []);
      setLive(results[2]);
      setRankings(Array.isArray(results[3]) ? results[3] : []);
    }).catch(function() {});
  };

  useEffect(function() { fetchAll(); var t = setInterval(fetchAll, 30000); return function() { clearInterval(t); }; }, [rankDim]);

  // 汇总计算
  var allItems = (breakdown?.tools || []).concat(breakdown?.workflows || []).concat(breakdown?.agents || []).concat(breakdown?.projects || []);
  var totalTokens = allItems.reduce(function(s, i) { return s + i.tokens; }, 0);
  var totalCalls = allItems.reduce(function(s, i) { return s + i.calls; }, 0);
  var totalMs = allItems.reduce(function(s, i) { return s + i.total_ms; }, 0);
  var avgMs = totalCalls > 0 ? Math.round(totalMs / totalCalls) : 0;

  // 模型消耗统计（从 live.by_model）
  var modelItems: EntityItem[] = [];
  if (live.by_model) {
    var modelKeys = Object.keys(live.by_model);
    for (var mk = 0; mk < modelKeys.length; mk++) {
      var mn = modelKeys[mk];
      modelItems.push({ name: mn, tokens: live.by_model[mn], calls: 0, total_ms: 0 });
    }
  }
  // 从 sessions 补全模型调用次数
  for (var mi = 0; mi < modelItems.length; mi++) {
    var mc = 0; var mm = 0;
    for (var si = 0; si < sessions.length; si++) {
      if (sessions[si].model_name === modelItems[mi].name) { mc++; mm += sessions[si].duration_ms || 0; }
    }
    modelItems[mi].calls = mc;
    modelItems[mi].total_ms = mm;
  }

  // 命中率统计（工具命中次数 / 总调用次数）
  var hitItems: EntityItem[] = [];
  var toolHitMap: Record<string, { hits: number; total: number; ms: number }> = {};
  for (var si2 = 0; si2 < sessions.length; si2++) {
    var s = sessions[si2];
    var tn = s.tool_name || 'unknown';
    if (!toolHitMap[tn]) toolHitMap[tn] = { hits: 0, total: 0, ms: 0 };
    toolHitMap[tn].total++;
    toolHitMap[tn].ms += s.duration_ms || 0;
    if (s.status === 'success') toolHitMap[tn].hits++;
  }
  var hitKeys = Object.keys(toolHitMap);
  for (var hi = 0; hi < hitKeys.length; hi++) {
    var hk = hitKeys[hi];
    var hd = toolHitMap[hk];
    hitItems.push({ name: hk, tokens: hd.total, calls: hd.hits, total_ms: hd.ms });
  }
  hitItems.sort(function(a, b) { return b.tokens - a.tokens; });

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>
          <BarChart3 size={22} style={{ verticalAlign: -4, marginRight: 8 }} />监控
        </h1>
        <button onClick={fetchAll} style={{ padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={13} /> 刷新
        </button>
      </div>

      {/* 顶部看板卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>📊 总 Token 消耗</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: '#548cf0' }}>{totalTokens.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{allItems.length} 个实体</div>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>⏱ 平均执行时间</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: '#5cb878' }}>{(avgMs / 1000).toFixed(2)}s</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>总 {totalCalls.toLocaleString()} 次调用</div>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>🎯 工具命中数</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: '#e8a450' }}>{totalCalls.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{hitItems.length} 种工具</div>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>🤖 活跃模型</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: '#b47cd8' }}>{modelItems.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{sessions.length} 条会话</div>
        </div>
      </div>

      <EntityTable title="🔧 工具消耗排行" items={breakdown?.tools} color="#548cf0" />
      <EntityTable title="🔀 工作流消耗排行" items={breakdown?.workflows} color="#5cb878" />
      <EntityTable title="🤖 Agent 消耗排行" items={breakdown?.agents} color="#e8a450" />
      <EntityTable title="🎯 模型消耗统计" items={modelItems} color="#b47cd8" />
      <EntityTable title="📈 命中率统计（成功次数/总调用）" items={hitItems} color="#5dade2" />
      <EntityTable title="📁 项目消耗排行" items={breakdown?.projects} color="#e05555" />

      <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>📜 最近会话审计日志（{sessions.length} 条）</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={th}>时间</th><th style={th}>模型</th><th style={th}>实体</th><th style={th}>工具</th><th style={{ ...th, textAlign: 'right' }}>Token</th><th style={th}>状态</th>
            </tr></thead>
            <tbody>
              {sessions.length === 0 && <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>暂无会话</td></tr>}
              {sessions.map(function(s, i) {
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={td}>{s.timestamp ? s.timestamp.slice(11, 19) : '-'}</td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)' }}>{s.model_name}</td>
                    <td style={td}>{s.entity_type}</td>
                    <td style={{ ...td, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{nameMap(s.tool_name || '-')}</td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{s.total_tokens ? s.total_tokens.toLocaleString() : '0'}</td>
                    <td style={td}><span style={{ padding: '2px 6px', borderRadius: 2, fontSize: 9, background: s.status === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: s.status === 'success' ? 'var(--green)' : 'var(--red)' }}>{s.status === 'success' ? 'OK' : 'ERR'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 排行榜 */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>🔥 消耗排行榜（24h）</h2>
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg-input)', borderRadius: 4, padding: 2 }}>
            {['agent','workflow','tool','project'].map(d => (
              <button key={d} onClick={() => setRankDim(d)} style={{
                padding: '3px 10px', fontSize: 11, border: 'none', borderRadius: 3, cursor: 'pointer',
                background: rankDim === d ? 'var(--color-primary)' : 'transparent',
                color: rankDim === d ? '#fff' : 'var(--text-secondary)',
              }}>{d === 'agent' ? '🤖 Agent' : d === 'workflow' ? '🔀 工作流' : d === 'tool' ? '🔧 工具' : '📁 项目'}</button>
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-input)' }}>
              <th style={{ ...th, width: 40, textAlign: 'center' }}>#</th>
              <th style={th}>名称</th>
              <th style={{ ...th, textAlign: 'right' }}>Token</th>
              <th style={{ ...th, textAlign: 'right' }}>调用次数</th>
            </tr></thead>
            <tbody>
              {rankings.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: i < 3 ? '#f59e0b' : 'var(--text-dim)' }}>{i + 1}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)' }}>{item.name}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right', color: '#5cb878' }}>{item.tokens?.toLocaleString()}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{item.calls}</td>
                </tr>
              ))}
              {rankings.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>暂无排行数据</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
