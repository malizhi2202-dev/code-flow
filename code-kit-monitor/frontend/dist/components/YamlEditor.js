import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
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
export default function YamlEditor({ initialValue, onValidate, onExecute }) {
    const [yaml, setYaml] = useState(initialValue || DEFAULT_YAML);
    const [result, setResult] = useState(null);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(false);
    const handleValidate = async () => {
        setLoading(true);
        const res = await fetch('/api/orchestration/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ yaml_raw: yaml }) });
        const data = await res.json();
        setResult(data);
        setErrors(data.errors || []);
        setLoading(false);
        if (data.valid && onValidate)
            onValidate(yaml);
    };
    const handleExecute = async () => {
        setLoading(true);
        const res = await fetch('/api/orchestration/execute', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' }, body: JSON.stringify({ yaml_raw: yaml }) });
        const data = await res.json();
        setResult(data);
        setLoading(false);
        if (onExecute)
            onExecute(yaml);
    };
    const errorLines = new Set(errors.map((e) => {
        const m = e.match(/line (\d+)/);
        return m ? parseInt(m[1]) : -1;
    }));
    return (_jsxs("div", { style: { display: 'flex', gap: 16, height: '100%' }, children: [_jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: [_jsx("span", { style: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }, children: "YAML \u914D\u7F6E" }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("button", { onClick: handleValidate, disabled: loading, style: btn3, children: "\u6821\u9A8C" }), _jsx("button", { onClick: handleExecute, disabled: loading, style: btn1, children: "\u6267\u884C" })] })] }), _jsxs("div", { style: { flex: 1, position: 'relative', background: 'var(--color-bg)', borderRadius: 4, border: '1px solid var(--color-border)', overflow: 'hidden' }, children: [_jsx("div", { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 32, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 8, paddingTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-dim)', userSelect: 'none', overflow: 'hidden' }, children: yaml.split('\n').map((_, i) => (_jsx("div", { style: { lineHeight: '20px', height: 20, color: errorLines.has(i + 1) ? 'var(--color-danger)' : undefined }, children: i + 1 }, i))) }), _jsx("textarea", { value: yaml, onChange: (e) => { setYaml(e.target.value); setErrors([]); setResult(null); }, spellCheck: false, style: { width: '100%', height: '100%', padding: '10px 10px 10px 42px', background: 'transparent', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: '20px', border: 'none', outline: 'none', resize: 'none', tabSize: 2, boxSizing: 'border-box' } })] }), errors.length > 0 && (_jsx("div", { style: { marginTop: 8, padding: '10px 12px', background: 'oklch(0.20 0.02 25)', borderRadius: 4, border: '1px solid var(--color-danger)' }, children: errors.map((e, i) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }, children: [_jsx(AlertTriangle, { size: 12 }), " ", e] }, i))) })), result?.valid && !errors.length && (_jsxs("div", { style: { marginTop: 8, padding: '8px 12px', background: 'oklch(0.20 0.02 150)', borderRadius: 4, border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-success)' }, children: [_jsx(Check, { size: 12 }), " YAML \u6821\u9A8C\u901A\u8FC7 \u2014 ", result.dag?.nodes?.length || 0, " \u4E2A Agent \u8282\u70B9"] }))] }), _jsxs("div", { style: { width: 320, background: 'var(--color-surface)', borderRadius: 8, padding: 16, border: '1px solid var(--color-border)', overflow: 'auto' }, children: [_jsx("h3", { style: { fontFamily: 'var(--font-display)', fontSize: 14, margin: '0 0 12px 0' }, children: "\u7F16\u6392\u9884\u89C8" }), result?.dag?.nodes ? (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [result.dag.nodes.map((n, i) => (_jsxs("div", { style: { padding: '8px 10px', background: 'var(--color-bg)', borderRadius: 4, border: '1px solid var(--color-border)' }, children: [_jsx("div", { style: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }, children: n.id }), _jsxs("div", { style: { fontSize: 10, color: 'var(--color-text-dim)' }, children: ["\u6A21\u578B: ", n.model, " | \u5DE5\u4F5C\u6D41: ", n.workflow] })] }, i))), result.dag.edges?.length > 0 && (_jsxs("div", { style: { marginTop: 4, fontSize: 10, color: 'var(--color-text-secondary)' }, children: ["\u8FDE\u7EBF: ", result.dag.edges.map((e, i) => _jsxs("span", { style: { display: 'block', fontFamily: 'var(--font-mono)' }, children: [e.from, " \u2192 ", e.to, " (", e.type, ")"] }, i))] }))] })) : (_jsx("p", { style: { fontSize: 12, color: 'var(--color-text-dim)' }, children: "\u70B9\u51FB\u300C\u6821\u9A8C\u300D\u67E5\u770B Agent \u7F16\u6392\u62D3\u6251" }))] })] }));
}
const btn1 = { padding: '6px 14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btn3 = { padding: '6px 14px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
