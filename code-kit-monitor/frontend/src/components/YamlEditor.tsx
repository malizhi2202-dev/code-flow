import { useState } from 'react';
import { Check, AlertTriangle, Upload } from 'lucide-react';

interface Props {
  initialValue?: string;
  onValidate?: (yaml: string) => void;
  onExecute?: (yaml: string) => void;
}

const DEFAULT_YAML = `apiVersion: ai-platform/v1
kind: AgentOrchestration
metadata:
  name: my-orchestration
  description: 我的多 Agent 编排
spec:
  agents:
    - name: code-reviewer
      kind: Agent
      spec:
        tools:
          workflow: my-workflow
        model:
          provider: openai
          name: gpt-4o
          config:
            temperature: 0.3
        sop:
          trigger: on_project_create
          input: project_requirement_doc
          output: review_report
        monitoring:
          - metric: token_consumption
            interval: 5m
  routes:
    - from: code-reviewer
      to: report-aggregator
      type: sequential
  parallelism:
    strategy: fork
    max_concurrency: 2
  security:
    default_hard_limit: 1000000
    default_soft_limit: 800000
`;

export default function YamlEditor({ initialValue, onValidate, onExecute }: Props) {
  const [yaml, setYaml] = useState(initialValue || DEFAULT_YAML);
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    setLoading(true);
    const res = await fetch('/api/orchestration/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ yaml_raw: yaml }) });
    const data = await res.json();
    setResult(data);
    setErrors(data.errors || []);
    setLoading(false);
    if (data.valid && onValidate) onValidate(yaml);
  };

  const handleExecute = async () => {
    setLoading(true);
    const res = await fetch('/api/orchestration/execute', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' }, body: JSON.stringify({ yaml_raw: yaml }) });
    const data = await res.json();
    setResult(data);
    setLoading(false);
    if (onExecute) onExecute(yaml);
  };

  const errorLines = new Set(errors.map((e) => {
    const m = e.match(/line (\d+)/);
    return m ? parseInt(m[1]) : -1;
  }));

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* 编辑区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>YAML 配置</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleValidate} disabled={loading} style={btn3}>校验</button>
            <button onClick={handleExecute} disabled={loading} style={btn1}>执行</button>
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative', background: 'var(--color-bg)', borderRadius: 4, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 32, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 8, paddingTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-dim)', userSelect: 'none', overflow: 'hidden' }}>
            {yaml.split('\n').map((_, i) => (
              <div key={i} style={{ lineHeight: '20px', height: 20, color: errorLines.has(i + 1) ? 'var(--color-danger)' : undefined }}>{i + 1}</div>
            ))}
          </div>
          <textarea value={yaml} onChange={(e) => { setYaml(e.target.value); setErrors([]); setResult(null); }} spellCheck={false} style={{ width: '100%', height: '100%', padding: '10px 10px 10px 42px', background: 'transparent', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: '20px', border: 'none', outline: 'none', resize: 'none', tabSize: 2, boxSizing: 'border-box' }} />
        </div>
        {errors.length > 0 && (
          <div style={{ marginTop: 8, padding: '10px 12px', background: 'oklch(0.20 0.02 25)', borderRadius: 4, border: '1px solid var(--color-danger)' }}>
            {errors.map((e, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}><AlertTriangle size={12} /> {e}</div>))}
          </div>
        )}
        {result?.valid && !errors.length && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'oklch(0.20 0.02 150)', borderRadius: 4, border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-success)' }}>
            <Check size={12} /> YAML 校验通过 — {result.dag?.nodes?.length || 0} 个 Agent 节点
          </div>
        )}
      </div>
      {/* 预览区 */}
      <div style={{ width: 320, background: 'var(--color-surface)', borderRadius: 8, padding: 16, border: '1px solid var(--color-border)', overflow: 'auto' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, margin: '0 0 12px 0' }}>编排预览</h3>
        {result?.dag?.nodes ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.dag.nodes.map((n: any, i: number) => (
              <div key={i} style={{ padding: '8px 10px', background: 'var(--color-bg)', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{n.id}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>模型: {n.model} | 工作流: {n.workflow}</div>
              </div>
            ))}
            {result.dag.edges?.length > 0 && (
              <div style={{ marginTop: 4, fontSize: 10, color: 'var(--color-text-secondary)' }}>
                连线: {result.dag.edges.map((e: any, i: number) => <span key={i} style={{ display: 'block', fontFamily: 'var(--font-mono)' }}>{e.from} → {e.to} ({e.type})</span>)}
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>点击「校验」查看 Agent 编排拓扑</p>
        )}
      </div>
    </div>
  );
}

const btn1: React.CSSProperties = { padding: '6px 14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btn3: React.CSSProperties = { padding: '6px 14px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
