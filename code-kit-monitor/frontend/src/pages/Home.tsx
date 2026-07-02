import { useEffect } from 'react';
import { useChanges, filteredChanges } from '../stores/changes';
import TopBar from '../components/TopBar';
import SearchBar from '../components/SearchBar';
import ChangeCard from '../components/ChangeCard';

export default function Home({ onSelect }: { onSelect: (id: string) => void }) {
  const { changes, filter, fetchChanges } = useChanges();

  useEffect(() => { fetchChanges(); const t = setInterval(fetchChanges, 5000); return () => clearInterval(t); }, [fetchChanges]);

  const list = filteredChanges(changes, filter);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <TopBar />
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 24px' }}>
        <SearchBar />
        {loading && list.length === 0 && <p style={{ color: 'var(--color-text-dim)', textAlign: 'center', marginTop: 48 }}>扫描中...</p>}
        {!loading && list.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 64, color: 'var(--color-text-secondary)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>暂无活跃 change</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>运行 @code-kit/GO.md 开始第一个需求</p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }} aria-live="polite" aria-atomic="false">
          {list.map((c) => <ChangeCard key={c.id} change={c} onSelect={onSelect} />)}
        </div>
      </div>
    </div>
  );
}
