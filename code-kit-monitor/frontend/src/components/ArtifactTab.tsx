import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ArtifactTab({ changeId, artifacts }: { changeId: string; artifacts: string[] }) {
  const [selected, setSelected] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [annotations, setAnnotations] = useState<Record<string, string[]>>({});
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(`annotations-${changeId}`);
    if (saved) setAnnotations(JSON.parse(saved));
  }, [changeId]);

  const loadArtifact = async (name: string) => {
    setSelected(name); setLoading(true);
    try {
      const res = await fetch(`/api/changes/${changeId}/${name.replace('.md', '')}`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content);
      } else { setContent('*无法加载此产物*'); }
    } catch { setContent('*加载失败*'); }
    setLoading(false);
  };

  const addAnnotation = () => {
    if (!newNote.trim() || !selected) return;
    const updated = { ...annotations, [selected]: [...(annotations[selected] || []), `${new Date().toLocaleTimeString()} — ${newNote}`] };
    setAnnotations(updated);
    localStorage.setItem(`annotations-${changeId}`, JSON.stringify(updated));
    setNewNote('');
  };

  const mdFiles = artifacts.filter((a) => a.endsWith('.md') && !a.endsWith('-SUMMARY.md'));
  const summaryFiles = artifacts.filter((a) => a.endsWith('-SUMMARY.md'));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, minHeight: 400 }}>
      <div style={{ borderRight: '1px solid var(--color-grid)', paddingRight: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-display)', marginBottom: 8, textTransform: 'uppercase' }}>产物</div>
        {mdFiles.map((f) => (
          <button key={f} onClick={() => loadArtifact(f)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px', background: selected === f ? 'var(--color-elevated)' : 'none', border: 'none', color: selected === f ? 'var(--color-text)' : 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 12, borderRadius: 'var(--radius-sm)', marginBottom: 2 }}>
            {f}
          </button>
        ))}
        {summaryFiles.length > 0 && <div style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-display)', margin: '12px 0 8px', textTransform: 'uppercase' }}>SUMMARY</div>}
        {summaryFiles.map((f) => (
          <button key={f} onClick={() => loadArtifact(f)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '2px 8px', background: selected === f ? 'var(--color-elevated)' : 'none', border: 'none', color: selected === f ? 'var(--color-text)' : 'var(--color-text-dim)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 11, borderRadius: 'var(--radius-sm)', marginBottom: 1 }}>
            {f}
          </button>
        ))}
      </div>
      <div>
        {!selected && <p style={{ color: 'var(--color-text-dim)' }}>← 选择产物文件查看</p>}
        {loading && <p style={{ color: 'var(--color-text-dim)' }}>加载中...</p>}
        {content && (
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 16, fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)' }}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
        {selected && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--color-grid)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginBottom: 8, fontFamily: 'var(--font-display)' }}>💬 批注（仅本地存储）</div>
            {(annotations[selected] || []).map((n, i) => <p key={i} style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '2px 0', margin: 0 }}>{n}</p>)}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addAnnotation(); }}
                placeholder="添加批注..." style={{ flex: 1, padding: '4px 8px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 12 }} />
              <button onClick={addAnnotation} style={{ padding: '4px 12px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12 }}>添加</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
