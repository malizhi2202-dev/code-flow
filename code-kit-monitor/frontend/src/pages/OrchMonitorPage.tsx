import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import EntityBreakdownPanel from '../components/EntityBreakdownPanel';

export default function OrchMonitorPage({ orchId, onBack }: { orchId: number; onBack: () => void }) {
  const [name, setName] = useState('');
  useEffect(() => {
    fetch('/api/orchestration', { headers: { 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' } })
      .then(r => r.json()).then(d => {
        const orch = (Array.isArray(d) ? d : (d.instances || [])).find((o: any) => o.id === orchId);
        if (orch) setName(orch.name);
      }).catch(() => {});
  }, [orchId]);

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, margin: 0 }}>
          🔀 {name || '编排组'} 监控
        </h1>
      </div>
      <EntityBreakdownPanel entityType="orchestration" entityId={orchId} entityName={name || '编排组'} />
    </div>
  );
}
