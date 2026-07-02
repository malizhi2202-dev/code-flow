import { useState, useEffect } from 'react';
import { Layers, Check } from 'lucide-react';

interface Project { name: string; root: string; has_specs: boolean; is_current: boolean; }

export default function ProjectSwitcher({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [current, setCurrent] = useState('');

  const fetchProjects = () => {
    fetch('/api/admin/projects').then(r => r.json()).then(d => {
      setProjects(d.projects || []); setCurrent(d.current || '');
    });
  };

  useEffect(() => { fetchProjects(); }, []);

  const switchProject = async (root: string) => {
    await fetch('/api/admin/projects/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ root }) });
    setOpen(false); fetchProjects();
    window.location.reload();
  };

  const curName = current.split('/').pop() || '?';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost btn-sm"
        style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', gap: 6 }}
        aria-label="切换项目"
      >
        <Layers size={13} style={{ color: 'var(--text-muted)' }} />
        {!collapsed && <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{curName}</span>}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
            background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-md)', minWidth: 180, zIndex: 100,
            boxShadow: 'var(--shadow-md)', padding: 4,
          }}>
            <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.04 }}>项目</div>
            {projects.map(p => (
              <button
                key={p.root}
                onClick={() => switchProject(p.root)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '5px 8px', border: 'none', borderRadius: 'var(--r-sm)',
                  background: p.is_current ? 'var(--bg-selected)' : 'transparent',
                  color: p.is_current ? 'var(--blue)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)',
                }}
              >
                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                {p.has_specs && <span className="dot dot-green" title="含 .specs/" />}
                {p.is_current && <Check size={12} style={{ color: 'var(--blue)' }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
