import { useEffect, useState } from 'react';
import { ArrowLeft, Save, FileText, RefreshCw } from 'lucide-react';

interface FileInfo { path: string; size: number; type: string; }

export default function DocEditor() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/files').then(r => r.json()).then(d => setFiles(d.files || []));
  }, []);

  const openFile = async (path: string) => {
    setLoading(true); setSelected(path);
    const res = await fetch(`/api/admin/files/${encodeURIComponent(path)}`);
    const data = await res.json();
    setContent(data.content); setOriginal(data.content); setLoading(false); setSaved(false);
  };

  const saveFile = async () => {
    await fetch(`/api/admin/files/${encodeURIComponent(selected)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setOriginal(content); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const isModified = content !== original;
  const isMd = selected.endsWith('.md');

  // 按目录分组
  const groups: Record<string, FileInfo[]> = {};
  files.forEach(f => {
    const dir = f.path.includes('/') ? f.path.split('/')[0] : 'root';
    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(f);
  });

  return (
    
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)' }}>文档编辑器</h1>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{files.length} 文件</span>
          </div>
          {selected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isModified && <span style={{ fontSize: 11, color: 'var(--orange)' }}>已修改</span>}
              {saved && <span className="badge badge-green">已保存</span>}
              <button className="btn btn-sm" onClick={() => openFile(selected)} disabled={loading}>还原</button>
              <button className="btn btn-primary btn-sm" onClick={saveFile} disabled={!isModified}><Save size={12} /> 保存</button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, height: 'calc(100vh - 100px)' }}>
          {/* 文件树 */}
          <div style={{ overflow: 'auto', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-weak)', padding: 8 }}>
            {Object.entries(groups).map(([group, items]) => (
              <div key={group} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-weak)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: 0.03 }}>
                  <FileText size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />{group}/
                </div>
                {items.map(f => (
                  <div key={f.path}
                    onClick={() => openFile(f.path)}
                    style={{
                      padding: '4px 8px 4px 20px', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                      fontSize: 12, fontFamily: 'var(--font-mono)',
                      color: selected === f.path ? 'var(--blue)' : 'var(--text-secondary)',
                      background: selected === f.path ? 'var(--blue-bg)' : 'transparent',
                    }}
                  >{f.path.split('/').pop()}</div>
                ))}
              </div>
            ))}
          </div>

          {/* 编辑器 */}
          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-weak)' }}>
            {selected ? (
              <>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-weak)', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-weak)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--blue)' }}>{selected}</span>
                  <span style={{ marginLeft: 'auto' }}>{content.length.toLocaleString()} 字符</span>
                </div>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  style={{
                    flex: 1, width: '100%', resize: 'none', border: 'none', borderRadius: 0,
                    background: 'var(--bg-input)', color: 'var(--text-primary)',
                    fontFamily: isMd ? 'var(--font-mono)' : 'var(--font-ui)',
                    fontSize: 13, lineHeight: 1.6, padding: '12px 16px', outline: 'none',
                    tabSize: 2,
                  }}
                  spellCheck={false}
                />
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-weak)' }}>
                <div style={{ textAlign: 'center' }}>
                  <FileText size={40} style={{ marginBottom: 12, opacity: 0.15 }} />
                  <p>← 选择文件开始编辑</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>可直接修改 code-kit 的 prompts / templates / rules</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
