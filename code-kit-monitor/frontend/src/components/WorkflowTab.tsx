const STAGES = ['0-change', '1-requirement', '2-design', '2a-ui-design', '3-task', '4-dev', '5-test', '6-review', '7-integration'];

export default function WorkflowTab({ data }: { data: any }) {
  const currentIdx = STAGES.indexOf(data.phase);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '20px 0' }} role="list" aria-label="工作流阶段">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        const fill = done ? 'var(--color-success)' : current ? 'var(--color-primary)' : 'var(--color-grid)';
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} role="listitem">
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: fill, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: done || current ? '#fff' : 'var(--color-text-dim)', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, animation: current ? 'pulse-dot 2s ease-in-out infinite' : 'none' }}>
                {done ? '✓' : i}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: current ? 'var(--color-text)' : 'var(--color-text-dim)', marginTop: 4 }}>{s.split('-')[0]}</div>
            </div>
            {i < STAGES.length - 1 && <div style={{ width: 40, height: 2, background: i < currentIdx ? 'var(--color-success)' : 'var(--color-grid)', margin: '0 2px', flexShrink: 0 }} />}
          </div>
        );
      })}
    </div>
  );
}
