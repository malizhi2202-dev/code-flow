import { useEffect, useState } from 'react';
import { Sun, Moon, AlertTriangle, Zap } from 'lucide-react';

export default function TopBar({ alerts, total }: { alerts: number; total: number }) {
  const [tokenToday, setTokenToday] = useState<number>(0);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');

  useEffect(() => {
    fetch('/api/token-usage').then((r) => r.json()).then((d) => setTokenToday(d.total_today || 0)).catch(() => {});
    const t = setInterval(() => {
      fetch('/api/token-usage').then((r) => r.json()).then((d) => setTokenToday(d.total_today || 0)).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-grid)', padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {alerts > 0 && <span style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={14} /> {alerts}</span>}
        <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={14} /> {total} 活跃</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>本日 Token: <span style={{ color: 'var(--color-text)' }}>{tokenToday.toLocaleString()}</span></span>
        <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }} aria-label="切换主题">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
}
