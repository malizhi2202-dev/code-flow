/** 连线配置侧面板 — 创建/编辑连线时从右侧滑入. */
import { useState, useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import type { EdgeConfig, EdgeType, TriggerType, IoFilterType } from '../lib/orchestration-sync';
import { defaultEdgeConfig } from '../lib/orchestration-sync';

interface Props {
  edgeId: string | null;
  source: string;
  target: string;
  config: EdgeConfig | null;
  onSave: (config: EdgeConfig) => void;
  onDelete: (edgeId: string) => void;
  onClose: () => void;
  agentNames: string[];
}

const EDGE_TYPES: { value: EdgeType; label: string; desc: string }[] = [
  { value: 'sequential', label: '顺序 (sequential)', desc: 'A 完成 → B 开始' },
  { value: 'parallel', label: '并发 (parallel)', desc: 'A 和 B 同时启动' },
  { value: 'fork', label: '分叉 (fork)', desc: '按条件分支到 B 或 C' },
  { value: 'master-slave', label: '主从 (master-slave)', desc: 'Master 调度多个 Slave' },
  { value: 'event-trigger', label: '时机触发 (event-trigger)', desc: '等待外部事件再启动' },
  { value: 'retry-fallback', label: '重试降级 (retry-fallback)', desc: '失败重试 N 次后降级' },
];

const TRIGGER_TYPES: { value: TriggerType; label: string }[] = [
  { value: 'auto', label: '自动 (上节点完成)' },
  { value: 'event', label: '事件 (等待外部事件)' },
  { value: 'schedule', label: '定时 (cron)' },
  { value: 'manual', label: '人工确认' },
];

const GATE_RULES = ['noop', 'validate_sql_injection', 'mask_pii', 'validate_output_schema', 'check_param_type'];
const IO_FILTERS: { value: IoFilterType; label: string }[] = [
  { value: 'none', label: '不过滤' },
  { value: 'mask_pii', label: '脱敏 (mask_pii)' },
  { value: 'schema_only', label: '仅保留 Schema 字段' },
];

const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 };
const inp: React.CSSProperties = { width: '100%', padding: '6px 8px', background: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 12, boxSizing: 'border-box' };
const sel: React.CSSProperties = { ...inp, cursor: 'pointer' };
const tx: React.CSSProperties = { ...inp, resize: 'vertical', minHeight: 48, fontFamily: 'var(--font-mono)' };

export default function EdgeEditor({ edgeId, source, target, config: initialConfig, onSave, onDelete, onClose, agentNames }: Props) {
  const [config, setConfig] = useState<EdgeConfig>(initialConfig || defaultEdgeConfig(edgeId || '', source, target));

  useEffect(() => {
    if (initialConfig) setConfig(initialConfig);
    else setConfig(defaultEdgeConfig(edgeId || '', source, target));
  }, [edgeId, source, target, initialConfig]);

  if (!edgeId) return null;

  const update = (patch: Partial<EdgeConfig>) => setConfig((prev: EdgeConfig) => ({ ...prev, ...patch }));
  const section: React.CSSProperties = { marginBottom: 14 };
  const sectionHdr: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid var(--border)' };

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 340,
      background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
      boxShadow: 'var(--shadow-md)', zIndex: 50, overflow: 'auto',
      transition: 'transform 200ms var(--ease)',
      padding: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>
          ═ {source} → {target}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
          <X size={16} />
        </button>
      </div>

      {/* Strategy */}
      <div style={section}>
        <div style={sectionHdr}>策略</div>
        <div style={{ marginBottom: 6 }}>
          <div style={lbl}>策略类型</div>
          <select value={config.type} onChange={(e) => update({ type: e.target.value as EdgeType })} style={sel}>
            {EDGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{EDGE_TYPES.find((t) => t.value === config.type)?.desc}</div>
        </div>
        <div style={{ marginBottom: 6 }}>
          <div style={lbl}>触发方式</div>
          <select value={config.trigger_type} onChange={(e) => update({ trigger_type: e.target.value as TriggerType })} style={sel}>
            {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <div style={lbl}>触发条件 (JSON path / 事件名)</div>
          <input value={config.trigger_condition} onChange={(e) => update({ trigger_condition: e.target.value })} placeholder="$.output.score < 0.7" style={inp} />
        </div>
      </div>

      {/* Description */}
      <div style={section}>
        <div style={lbl}>这条线是干什么的</div>
        <textarea value={config.description} onChange={(e) => update({ description: e.target.value })} rows={2} placeholder="例：代码审查通过后通知部署" style={tx} />
      </div>

      {/* Security Gate */}
      <div style={section}>
        <div style={sectionHdr}>安全栅栏</div>
        <div style={{ marginBottom: 6 }}>
          <div style={lbl}>前置校验 (gate_pre)</div>
          <select value={config.gate_pre} onChange={(e) => update({ gate_pre: e.target.value })} style={sel}>
            {GATE_RULES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 6 }}>
          <div style={lbl}>后置校验 (gate_post)</div>
          <select value={config.gate_post} onChange={(e) => update({ gate_post: e.target.value })} style={sel}>
            {GATE_RULES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <div style={lbl}>数据过滤 (io_filter)</div>
          <select value={config.io_filter} onChange={(e) => update({ io_filter: e.target.value as IoFilterType })} style={sel}>
            {IO_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Token */}
      <div style={section}>
        <div style={sectionHdr}>Token 限制</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={lbl}>软限制</div>
            <input type="number" value={config.token_soft_limit} onChange={(e) => update({ token_soft_limit: parseInt(e.target.value) || 0 })} style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={lbl}>硬限制</div>
            <input type="number" value={config.token_hard_limit} onChange={(e) => update({ token_hard_limit: parseInt(e.target.value) || 0 })} style={inp} />
          </div>
        </div>
      </div>

      {/* IO Schema */}
      <div style={section}>
        <div style={sectionHdr}>出入口数据结构</div>
        <div style={{ marginBottom: 6 }}>
          <div style={lbl}>Input Schema (JSON)</div>
          <textarea value={JSON.stringify(config.input_schema, null, 2)} onChange={(e) => { try { update({ input_schema: JSON.parse(e.target.value) }); } catch {} }} rows={4} style={{ ...tx, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }} />
        </div>
        <div>
          <div style={lbl}>Output Schema (JSON)</div>
          <textarea value={JSON.stringify(config.output_schema, null, 2)} onChange={(e) => { try { update({ output_schema: JSON.parse(e.target.value) }); } catch {} }} rows={4} style={{ ...tx, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }} />
        </div>
      </div>

      {/* Retry Policy */}
      <div style={section}>
        <div style={sectionHdr}>重试策略</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={lbl}>重试次数</div>
            <input type="number" value={config.retry_policy.max_retries} onChange={(e) => update({ retry_policy: { ...config.retry_policy, max_retries: parseInt(e.target.value) || 0 } })} style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={lbl}>退避策略</div>
            <select value={config.retry_policy.backoff} onChange={(e) => update({ retry_policy: { ...config.retry_policy, backoff: e.target.value as 'fixed' | 'exponential' } })} style={sel}>
              <option value="fixed">fixed</option>
              <option value="exponential">exponential</option>
            </select>
          </div>
        </div>
        <div>
          <div style={lbl}>降级节点</div>
          <select value={config.retry_policy.fallback_node || ''} onChange={(e) => update({ retry_policy: { ...config.retry_policy, fallback_node: e.target.value || null } })} style={sel}>
            <option value="">无</option>
            {agentNames.filter((n) => n !== source).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <button onClick={() => { onDelete(edgeId); onClose(); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 12px', background: 'var(--bg-card)', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 12 }}>
          <Trash2 size={12} /> 删除连线
        </button>
        <button onClick={() => onSave(config)} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 12px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 12 }}>
          保存
        </button>
      </div>
    </div>
  );
}
