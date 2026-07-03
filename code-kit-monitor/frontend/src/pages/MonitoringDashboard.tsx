import { useEffect, useState, useCallback } from 'react';
import { BarChart3, TrendingUp, Clock, RefreshCw, Activity, Zap, Wrench, Bot, FolderKanban } from 'lucide-react';

interface SessionItem {
  session_id: string; entity_type: string; entity_id: number;
  model_name: string; total_tokens: number; prompt_tokens: number; completion_tokens: number;
  duration_ms: number; tool_name: string; tool_calls: number;
  status: string; timestamp: string;
}
interface LiveData { total_sessions: number; total_tokens: number; by_model: Record<string,number>; by_entity: Record<string,number>; by_tool: Record<string,number>; minutes: number; }
interface Bucket { ts: number; token_count: number; tool_hit_count: number; execution_time_ms: number; count: number; }

const ENTITY_TABS = [
  { id: 'all', label: '全部', icon: <Activity size={12} /> },
  { id: 'tool', label: '工具', icon: <Wrench size={12} /> },
  { id: 'workflow', label: '工作流', icon: <Zap size={12} /> },
  { id: 'agent', label: 'Agent', icon: <Bot size={12} /> },
  { id: 'project', label: '项目', icon: <FolderKanban size={12} /> },
] as const;

const TIME_RANGES = [
  { m: 60, label: '1h' }, { m: 360, label: '6h' }, { m: 1440, label: '24h' },
] as const;

const MODEL_COLORS = ['oklch(0.65 0.18 230)', 'oklch(0.55 0.16 150)', 'oklch(0.70 0.15 85)', 'oklch(0.55 0.22 25)', 'oklch(0.60 0.10 200)', 'oklch(0.50 0.12 300)'];

export default function MonitoringDashboard() {
  const [live, setLive] = useState<LiveData | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [minutes, setMinutes] = useState(60);
  const [entityTab, setEntityTab] = useState<string>('all');
  const [chartMode, setChartMode] = useState<'bar'|'line'|'pie'>('bar');

  const fetchAll = useCallback(() => {
    setLoading(true);
    const uid = localStorage.getItem('current_user_id') || 'admin';
    Promise.all([
      fetch(`/api/metrics/live?minutes=${minutes}`, { headers: { 'X-User-Id': uid } }).then(r => r.json()),
      fetch(`/api/metrics/sessions?limit=50${entityTab !== 'all' ? '&entity_type=' + entityTab : ''}`, { headers: { 'X-User-Id': uid } }).then(r => r.json()),
      entityTab !== 'all' ? fetch(`/api/metrics/${entityTab}/1?minutes=${minutes}`, { headers: { 'X-User-Id': uid } }).then(r => r.json()) : Promise.resolve({ buckets: [] }),
    ]).then(([l, s, b]) => {
      setLive(l); setSessions(s.sessions || []); setBuckets((b as any).buckets || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [minutes, entityTab]);

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 30000); return () => clearInterval(t); }, [fetchAll]);

  const modelEntries = live?.by_model ? Object.entries(live.by_model).sort((a, b) => b[1] - a[1]) : [];
  const maxBucket = Math.max(1, ...buckets.map(b => b.token_count));
  const bucketTimes = buckets.slice(-24).map(b => {
    const d = new Date(b.ts * 1000);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  });

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={22} color="var(--color-primary)" /> 监控
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--green-bg)', color: 'var(--green)' }}>🟢 实时</span>
        </h1>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {TIME_RANGES.map(t => (
            <button key={t.m} onClick={() => setMinutes(t.m)} style={timeBtn(minutes === t.m)}>{t.label}</button>
          ))}
          <button onClick={fetchAll} style={{ padding: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-secondary)' }} title="刷新"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* 总览卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { v: live?.total_tokens?.toLocaleString() || '0', l: '总 Token', c: 'var(--color-primary)' },
          { v: live?.total_sessions?.toString() || '0', l: '会话数', c: 'var(--color-success)' },
          { v: Object.keys(live?.by_model || {}).length.toString(), l: '活跃模型', c: 'var(--color-warning)' },
          { v: Object.values(live?.by_tool || {}).reduce((a,b) => a+b, 0).toString(), l: '工具调用', c: 'var(--blue)' },
        ].map((card, i) => (
          <div key={i} style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 14, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: card.c }}>{card.v}</span>
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{card.l}</span>
          </div>
        ))}
      </div>

      {/* 筛选: 实体类型 + 图表类型 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {ENTITY_TABS.map(e => (
            <button key={e.id} onClick={() => setEntityTab(e.id)} style={tabBtn(entityTab === e.id)}>{e.icon} {e.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['bar','line','pie'] as const).map(m => (
            <button key={m} onClick={() => setChartMode(m)} style={tabBtn(chartMode === m)}>
              {m === 'bar' ? '▊ 柱状图' : m === 'line' ? '▁ 折线图' : '◔ 饼图'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 40 }}>加载中...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 图表区域 */}
          {chartMode !== 'pie' && buckets.length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)' }} role="img" aria-label={`Token 消耗${chartMode === 'bar' ? '柱状图' : '折线图'}`}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 16px 0' }}>Token 消耗趋势（{minutes >= 1440 ? '24h' : minutes >= 360 ? '6h' : '1h'}）</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: chartMode === 'bar' ? 2 : 0, height: 180, position: 'relative' }}>
                {/* Y轴刻度 */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 180, paddingRight: 8, fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', flexShrink: 0 }}>
                  <span>{maxBucket.toLocaleString()}</span><span>{Math.round(maxBucket/2).toLocaleString()}</span><span>0</span>
                </div>
                {/* 柱状图 */}
                {chartMode === 'bar' && bucketTimes.map((t, i) => {
                  const h = Math.max(4, (buckets[i]?.token_count || 0) / maxBucket * 170);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 180, gap: 2 }}>
                      <div title={`${t}: ${(buckets[i]?.token_count || 0).toLocaleString()} tokens`}
                        style={{ width: '80%', height: h, background: 'var(--color-primary)', borderRadius: '2px 2px 0 0', opacity: 0.8, transition: 'height 300ms', minWidth: 6 }} />
                      <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap', marginTop: 2 }}>{t}</span>
                    </div>
                  );
                })}
                {/* 折线图 */}
                {chartMode === 'line' && (
                  <svg width="100%" height={180} style={{ flex: 1 }}>
                    <polyline fill="none" stroke="var(--color-primary)" strokeWidth={2}
                      points={buckets.slice(-24).map((b, i) => {
                        const x = (i / Math.max(1, buckets.length - 1)) * 100;
                        const y = 180 - (b.token_count / maxBucket * 170);
                        return `${x},${y}`;
                      }).join(' ')} />
                    {buckets.slice(-24).map((b, i) => {
                      const x = (i / Math.max(1, buckets.length - 1)) * 100;
                      const y = 180 - (b.token_count / maxBucket * 170);
                      return <circle key={i} cx={x + '%'} cy={y} r={3} fill="var(--color-primary)" />;
                    })}
                  </svg>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                <span>{bucketTimes[0]}</span><span>{bucketTimes[Math.floor(bucketTimes.length/2)]}</span><span>{bucketTimes[bucketTimes.length-1]}</span>
              </div>
            </div>
          )}

          {/* 饼图: 模型分布 */}
          {chartMode === 'pie' && modelEntries.length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }} role="img" aria-label="模型分布饼图">
              <div style={{ width: 160, height: 160, borderRadius: '50%', background: `conic-gradient(${modelEntries.map(([, val], i, arr) => {
                const total = arr.reduce((s, [, v]) => s + v, 0) || 1;
                const startPct = arr.slice(0, i).reduce((s, [, v]) => s + v, 0) / total * 100;
                const endPct = (arr.slice(0, i).reduce((s, [, v]) => s + v, 0) + val) / total * 100;
                return `${MODEL_COLORS[i % MODEL_COLORS.length]} ${startPct}% ${endPct}%`;
              }).join(',')})`, flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>模型 Token 分布</h3>
                {modelEntries.map(([name, val], i) => {
                  const total = modelEntries.reduce((s, [, v]) => s + v, 0) || 1;
                  const pct = Math.round(val / total * 100);
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: MODEL_COLORS[i % MODEL_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)', minWidth: 120 }}>{name}</span>
                      <div style={{ width: 80, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: MODEL_COLORS[i % MODEL_COLORS.length], borderRadius: 3 }} />
                      </div>
                      <span style={{ color: 'var(--text-dim)', minWidth: 80, textAlign: 'right' }}>{val.toLocaleString()} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 空状态 */}
          {buckets.length === 0 && modelEntries.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
              <BarChart3 size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p>暂无监控数据</p>
              <p style={{ fontSize: 11 }}>运行时数据每 3 分钟自动注入</p>
            </div>
          )}

          {/* 工具调用排行 */}
          {live?.by_tool && Object.keys(live.by_tool).length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px 0' }}>🔧 工具调用排行</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {Object.entries(live.by_tool).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => (
                  <div key={name} style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 4, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{count}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 会话列表 */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px 0' }}>📜 最近会话</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['时间','模型','实体','工具','Token','耗时','状态'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 20).map((s, i) => (
                    <tr key={s.session_id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 8px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 10, whiteSpace: 'nowrap' }}>{s.timestamp?.slice(11, 19) || '-'}</td>
                      <td style={{ padding: '5px 8px', fontFamily: 'var(--font-mono)', color: 'var(--color-text)', fontSize: 11 }}>{s.model_name}</td>
                      <td style={{ padding: '5px 8px', fontSize: 10, color: 'var(--text-secondary)' }}>{ENTITY_TABS.find(e => e.id === s.entity_type)?.label || s.entity_type}</td>
                      <td style={{ padding: '5px 8px', fontSize: 11, color: 'var(--color-text)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.tool_name || '-'}</td>
                      <td style={{ padding: '5px 8px', fontFamily: 'var(--font-mono)', color: 'var(--color-text)', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>{s.total_tokens?.toLocaleString()}</td>
                      <td style={{ padding: '5px 8px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 10, whiteSpace: 'nowrap' }}>{(s.duration_ms / 1000).toFixed(1)}s</td>
                      <td style={{ padding: '5px 8px' }}>
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 2, background: s.status === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: s.status === 'success' ? 'var(--green)' : 'var(--red)' }}>
                          {s.status === 'success' ? 'OK' : 'ERR'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>暂无会话数据</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const timeBtn = (active: boolean): React.CSSProperties => ({
  padding: '5px 10px', borderRadius: 4, border: '1px solid var(--border)',
  background: active ? 'var(--color-primary)' : 'var(--bg-card)',
  color: active ? '#fff' : 'var(--text-secondary)',
  cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)',
});

const tabBtn = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)',
  background: active ? 'var(--color-primary)' : 'var(--bg-card)',
  color: active ? '#fff' : 'var(--text-secondary)',
  cursor: 'pointer', fontSize: 11,
});
