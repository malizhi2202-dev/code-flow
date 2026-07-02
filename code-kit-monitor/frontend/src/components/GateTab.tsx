const ROLE_COLORS: Record<string, string> = {
  '🟫': 'var(--color-warning)',
  '🟦': 'var(--color-info)',
  '🟩': 'var(--color-success)',
  '🔴': 'var(--color-danger)',
};

const VOTE_MAP: Record<string, string> = { '✅': '✅', '❌': '❌', '⚪': '⚪' };

function resultBorder(result: string | undefined): string {
  if (!result || result.includes('等待')) return 'var(--color-grid)';
  if (result.includes('通过')) return 'var(--color-success)';
  if (result.includes('驳回') || result.includes('反对')) return 'var(--color-danger)';
  if (result.includes('平票') || result.includes('条件')) return 'var(--color-warning)';
  return 'var(--color-text-dim)';
}

export default function GateTab({ gates }: { gates: any[] }) {
  if (!gates.length) return <p style={{ color: 'var(--color-text-dim)' }}>暂无门禁数据</p>;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {gates.map((g: any, i: number) => (
        <details key={i} style={{ background: 'var(--color-surface)', border: `2px solid ${resultBorder(g.result)}`, borderRadius: 'var(--radius-md)', padding: 12 }}>
          <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{g.name}</span>
            <span style={{ fontSize: 12, color: resultBorder(g.result) }}>{g.result || '等待中'}</span>
          </summary>
          <div style={{ marginTop: 8 }}>
            {(g.votes || []).map((v: any, j: number) => (
              <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 0', borderBottom: '1px solid var(--color-grid)', fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: ROLE_COLORS[v.role_char] || 'var(--color-text-dim)', flexShrink: 0, marginTop: 3 }} />
                <span style={{ color: 'var(--color-text)', fontWeight: 500, minWidth: 100 }}>{v.role}</span>
                <span style={{ fontWeight: 700 }}>{VOTE_MAP[v.vote] || v.vote}</span>
                <span style={{ color: 'var(--color-text-secondary)', flex: 1 }}>{v.reason}</span>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
