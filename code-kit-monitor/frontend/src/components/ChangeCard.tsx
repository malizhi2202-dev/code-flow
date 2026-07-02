import { AlertTriangle, Clock, CheckCircle, ListChecks, Shield } from 'lucide-react';
import type { ChangeItem } from '../stores/changes';

const STATUS_STYLE: Record<string, { border: string; bg: string; label: string }> = {
  interrupted: { border: 'var(--color-danger)', bg: 'var(--color-elevated)', label: '🔴 中断' },
  blocked: { border: 'var(--color-warning)', bg: 'var(--color-surface)', label: '⚠️ 阻塞' },
  normal: { border: 'transparent', bg: 'var(--color-surface)', label: '' },
};

const PRIORITY_LABEL: Record<string, string> = { '完整': '🟢 完整', '中等': '🟡 中等', '最短': '🔵 最短' };

export default function ChangeCard({ change, onSelect }: { change: ChangeItem; onSelect: (id: string) => void }) {
  const style = STATUS_STYLE[change.status] || STATUS_STYLE.normal;
  const [done, total] = change.progress.split('/').map(Number);
  const gs = change.gate_stats;

  return (
    <div
      onClick={() => onSelect(change.id)}
      className={change.status === 'interrupted' ? 'pulse-border' : ''}
      style={{
        background: style.bg, borderLeft: `3px solid ${style.border}`, borderRadius: 'var(--radius-md)',
        padding: 14, cursor: 'pointer', transition: 'transform var(--duration-micro) var(--easing-standard), box-shadow var(--duration-micro) var(--easing-standard)',
        boxShadow: 'var(--shadow-none)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-none)'; }}
      role="button" tabIndex={0} aria-label={`${change.id} - ${change.phase_name}`}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(change.id); }}
    >
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {change.interrupted && <AlertTriangle size={14} color="var(--color-danger)" />}
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>{change.id}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--color-text-secondary)', background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>{change.phase_name}</span>
      </div>

      {/* 进度条 */}
      {total > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 3 }}>
            <span>{change.progress} task</span>
            <span>{change.progress_pct}%</span>
          </div>
          <div style={{ height: 3, background: 'var(--color-grid)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${change.progress_pct}%`, background: change.interrupted ? 'var(--color-danger)' : 'var(--color-primary)', transition: 'width var(--duration-standard) var(--easing-standard)' }} />
          </div>
        </div>
      )}

      {/* 关键指标行 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--color-text-secondary)' }}>
        {change.total_days != null && <span title="已进行天数"><Clock size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />{change.total_days}d</span>}
        <span title="门禁通过/总数"><Shield size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />{gs.passed}/{gs.total} gate</span>
        <span title="自动化task"><ListChecks size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />{change.task_stats.auto}🤖 {change.task_stats.manual}👤</span>
        {change.v1_count > 0 && <span title="v1范围">{change.v1_count} v1</span>}
        {change.risk_count > 0 && <span title="风险数" style={{ color: 'var(--color-warning)' }}>⚠️ {change.risk_count}</span>}
      </div>

      {/* 下一步 */}
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-dim)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        → {change.next_action}
      </div>
    </div>
  );
}
