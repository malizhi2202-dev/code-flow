import { useState } from 'react';
import { Network, Code2, MessageSquare, Play } from 'lucide-react';
import YamlEditor from '../components/YamlEditor';

type Mode = 'visual' | 'yaml' | 'text';

export default function OrchestrationPage() {
  const [mode, setMode] = useState<Mode>('yaml');

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>Agent 编排</h1>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card, #181a1f)', borderRadius: 6, padding: 3 }}>
          {([
            { id: 'visual' as Mode, label: '可视化', icon: <Network size={13} /> },
            { id: 'yaml' as Mode, label: 'YAML配置', icon: <Code2 size={13} /> },
            { id: 'text' as Mode, label: '自然语言', icon: <MessageSquare size={13} /> },
          ]).map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 4, border: 'none', background: mode === m.id ? 'var(--color-primary)' : 'transparent', color: mode === m.id ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>{m.icon} {m.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {mode === 'yaml' && <YamlEditor />}
        {mode === 'visual' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', gap: 8 }}>
            <Network size={40} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: 14 }}>可视化编排画布</p>
            <p style={{ fontSize: 11 }}>拖拽 Agent 节点连线（需 React Flow 组件）</p>
            <p style={{ fontSize: 11, color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => setMode('yaml')}>→ 或使用 YAML 配置模式</p>
          </div>
        )}
        {mode === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
            <textarea
              placeholder="用自然语言描述 Agent 编排：&#10;&#10;Agent A（代码审查）先检查代码质量 → Agent B（安全分析）对 A 的结果做安全扫描&#10;→ Agent C（报告生成）汇总 A 和 B 的输出，生成最终报告&#10;&#10;A 和 B 可并行执行，C 等待两者都完成。"
              style={{ flex: 1, minHeight: 200, padding: 16, background: 'var(--bg-input, #0b0c10)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 13, border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 8, resize: 'vertical', lineHeight: 1.8 }}
            />
            <button style={{ alignSelf: 'flex-start', padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Play size={14} /> 解析并生成编排
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
