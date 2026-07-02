import { useEffect, useState } from 'react';
import { Sun, Moon, AlertTriangle, Zap, CheckCircle, Clock } from 'lucide-react';
import { useChanges } from '../stores/changes';

export default function TopBar() {
  const { summary, fetchChanges } = useChanges();
  const [tokenToday, setTokenToday] = useState<number>(0);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');

  useEffect(() => {
    fetch('/api/token-usage').then(r => r.json()).then(d => setTokenToday(d.total_today || 0)).catch(() => {});
    const t = setInterval(() => {
      fetch('/api/token-usage').then(r => r.json()).then(d => setTokenToday(d.total_today || 0)).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [fetchChanges]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  const s = summary;
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-grid)', padding: '6px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {s && (s.alerts > 0 || s.blocked > 0) && (
          <span style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={14} /> {s.alerts + s.blocked}</span>
        )}
        {s && <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={14} /> {s.active_changes} 活跃</span>}
        {s && <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} /> {s.gates_passed} gate</span>}
        {s && <span style={{ color: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: 4 }}>{s.done_tasks}/{s.total_tasks} tasks</span>}
        {s && <span style={{ color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> {s.avg_days}d</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>Token: <span style={{ color: 'var(--color-text)' }}>{tokenToday.toLocaleString()}</span></span>
        <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }} aria-label="切换主题">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
}
