const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  done: { text: '✅ done', color: 'var(--color-success)' },
  in_progress: { text: '● 进行中', color: 'var(--color-primary)' },
  pending: { text: '○ pending', color: 'var(--color-text-dim)' },
  blocked: { text: '🚫 blocked', color: 'var(--color-danger)' },
};

const AUTO_LABEL = { true: { text: '🤖', color: 'var(--color-info)' }, false: { text: '👤', color: 'var(--color-warning)' } } as const;

export default function TaskTab({ tasks }: { tasks: any[] }) {
  if (!tasks.length) return <p style={{ color: 'var(--color-text-dim)' }}>暂无 task 数据</p>;
  const waves = new Map<number, any[]>();
  tasks.forEach((t: any) => {
    // 有 depends_on 的是后续 wave，简化处理
    const wave = t.depends_on?.length > 0 ? 2 : 1;
    if (!waves.has(wave)) waves.set(wave, []);
    waves.get(wave)!.push(t);
  });

  return (
    <div aria-live="polite">
      {[...waves.entries()].map(([wave, items]) => {
        const doneCount = items.filter((t: any) => t.status === 'done').length;
        return (
          <div key={wave} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>Wave {wave}</span>
              <div style={{ flex: 1, height: 4, background: 'var(--color-grid)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%`, background: 'var(--color-primary)', transition: 'width var(--duration-standard) var(--easing-standard)' }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-display)' }}>{doneCount}/{items.length}</span>
            </div>
            {items.map((t: any) => {
              const status = STATUS_LABEL[t.status] || STATUS_LABEL.pending;
              const auto = AUTO_LABEL[t.auto !== false ? 'true' as const : 'false' as const];
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid var(--color-grid)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--color-text-dim)', minWidth: 40 }}>{t.id}</span>
                  <span style={{ color: auto.color, fontSize: 14 }} title={t.auto ? '自动化' : '人工确认'}>{auto.text}</span>
                  <span style={{ flex: 1, color: 'var(--color-text)' }}>{t.name}</span>
                  <span style={{ fontSize: 11, color: status.color }}>{status.text}</span>
                  {t.retries > 0 && <span style={{ fontSize: 11, color: 'var(--color-danger)', fontFamily: 'var(--font-display)' }}>🔄×{t.retries}</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
