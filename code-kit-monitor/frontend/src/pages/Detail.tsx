import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import TabNav from '../components/TabNav';
import WorkflowTab from '../components/WorkflowTab';
import TaskTab from '../components/TaskTab';
import GateTab from '../components/GateTab';
import ArtifactTab from '../components/ArtifactTab';
import HealthTab from '../components/HealthTab';

const TABS = ['工作流', 'Task', '门禁', '产物', '健康'];

export default function Detail({ changeId, onBack }: { changeId: string; onBack: () => void }) {
  const [tab, setTab] = useState('工作流');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/changes/${changeId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [changeId]);

  const tabContent = () => {
    if (!data) return <p style={{ color: 'var(--color-text-dim)' }}>加载中...</p>;
    switch (tab) {
      case '工作流': return <WorkflowTab data={data} />;
      case 'Task': return <TaskTab tasks={data.tasks || []} />;
      case '门禁': return <GateTab gates={data.gates || []} />;
      case '产物': return <ArtifactTab changeId={changeId} artifacts={data.artifacts || []} />;
      case '健康': return <HealthTab changeId={changeId} />;
      default: return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: 14, marginBottom: 16 }}
        >
          <ArrowLeft size={16} /> 返回
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '0 0 16px' }}>{changeId}</h1>
        <TabNav tabs={TABS} active={tab} onSelect={setTab} />
        <div style={{ marginTop: 20 }}>{tabContent()}</div>
      </div>
    </div>
  );
}
