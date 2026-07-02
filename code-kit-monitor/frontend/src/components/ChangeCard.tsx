import { AlertTriangle, Clock } from 'lucide-react';
import type { ChangeItem } from '../stores/changes';

const STATUS_STYLE: Record<string, { border: string; bg: string }> = {
  interrupted: { border: 'var(--color-danger)', bg: 'var(--color-elevated)' },
  blocked: { border: 'var(--color-warning)', bg: 'var(--color-surface)' },
  normal: { border: 'transparent', bg: 'var(--color-surface)' },
};

export default function ChangeCard({ change, onSelect }: { change: ChangeItem; onSelect: (id: string) => void }) {
  const style = STATUS_STYLE[change.status] || STATUS_STYLE.normal;
  const [done, total] = change.progress.split('/').map(Number);

  return (
    <div
      onClick={() => onSelect(change.id)}
      className={change.status === 'interrupted' ? 'pulse-border' : ''}
      style={{
        background: style.bg, borderLeft: `3px solid ${style.border}`, borderRadius: 'var(--radius-md)',
        padding: 16, cursor: 'pointer', transition: 'transform var(--duration-micro) var(--easing-standard), box-shadow var(--duration-micro) var(--easing-standard)',
        boxShadow: 'var(--shadow-none)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-none)'; }}
      role="button" tabIndex={0} aria-label={`${change.id} - ${change.phase}`}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(change.id); }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {change.interrupted && <AlertTriangle size={14} color="var(--color-danger)" />}
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{change.id}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--color-text-secondary)', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>{change.phase}</span>
      </div>
      {total > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 2 }}>
            <span>{change.progress} task</span>
            <span>{total > 0 ? Math.round((done / total) * 100) : 0}%</span>
          </div>
          <div style={{ height: 3, background: 'var(--color-grid)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${total > 0 ? (done / total) * 100 : 0}%`, background: change.interrupted ? 'var(--color-danger)' : 'var(--color-primary)', transition: 'width var(--duration-standard) var(--easing-standard)' }} />
          </div>
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {change.interrupted && <><Clock size={12} /> 中断: {change.interrupted_task}</>}
        {change.status === 'blocked' && '⚠️ 阻塞等待中'}
        {change.status === 'normal' && `${change.artifacts.length} 个产物`}
      </div>
    </div>
  );
}
