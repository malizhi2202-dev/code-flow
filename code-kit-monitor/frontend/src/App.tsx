import { useState, useCallback, useEffect } from 'react';
import { Activity, GitBranch, Users, FileText, Settings, Layers, ChevronLeft, PanelLeft } from 'lucide-react';
import Home from './pages/Home';
import Detail from './pages/Detail';
import Roles from './pages/Roles';
import WorkflowEditor from './pages/WorkflowEditor';
import DocEditor from './pages/DocEditor';
import SpecsEditor from './pages/SpecsEditor';
import Runtime from './pages/Runtime';
import ProjectSwitcher from './components/ProjectSwitcher';
import ErrorBoundary from './components/ErrorBoundary';

type NavItem = { id: string; label: string; icon: React.ReactNode };
const NAV: NavItem[] = [
  { id: 'home', label: '项目看板', icon: <Activity size={16} /> },
  { id: 'specs', label: '文档中心', icon: <Layers size={16} /> },
  { id: 'runtime', label: '消耗统计', icon: <Activity size={16} /> },
  { id: 'workflow', label: '流程配置', icon: <GitBranch size={16} /> },
  { id: 'roles', label: '专家管理', icon: <Users size={16} /> },
  { id: 'docs', label: '规则引擎', icon: <FileText size={16} /> },
];

type View =
  | { page: 'home' }
  | { page: 'detail'; changeId: string }
  | { page: 'specs' }
  | { page: 'runtime' }
  | { page: 'workflow' }
  | { page: 'roles' }
  | { page: 'docs' };

export default function App() {
  const [nav, setNav] = useState('home');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetch('/api/changes').then(r => r.json()).then(d => setSummary(d.summary)).catch(() => {});
    const t = setInterval(() => {
      fetch('/api/changes').then(r => r.json()).then(d => setSummary(d.summary)).catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const navigate = (id: string) => {
    setNav(id);
    setDetailId(null);
  };

  const openDetail = (changeId: string) => setDetailId(changeId);

  const renderContent = () => {
    if (detailId) return <Detail changeId={detailId} onBack={() => setDetailId(null)} />;
    switch (nav) {
      case 'home': return <Home onSelect={openDetail} />;
      case 'workflow': return <WorkflowEditor />;
      case 'roles': return <Roles />;
      case 'specs': return <SpecsEditor onSelect={(id) => setDetailId(id)} />;
      case 'runtime': return <Runtime />;
      case 'docs': return <DocEditor />;
      default: return <Home onSelect={openDetail} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* ── 左侧边栏 ── */}
      <aside style={{
        width: collapsed ? 48 : 200,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width var(--normal) var(--ease)',
        flexShrink: 0, overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '12px 10px' : '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--blue)', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>◈</span>
          {!collapsed && <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>code-kit</span>}
        </div>

        {/* 项目切换 */}
        <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
          <ProjectSwitcher collapsed={collapsed} />
        </div>

        {/* 导航 */}
        <nav style={{ flex: 1, padding: '8px' }}>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-label={item.label}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: collapsed ? '8px 0' : '7px 10px',
                marginBottom: 2, borderRadius: 'var(--r-sm)',
                background: nav === item.id && !detailId ? 'var(--bg-selected)' : 'transparent',
                border: 'none', color: nav === item.id && !detailId ? 'var(--blue)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 13, fontWeight: nav === item.id && !detailId ? 600 : 400,
                transition: 'all var(--fast)',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* 底部：状态 + 折叠 */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
          {!collapsed && summary && (
            <div style={{ padding: '4px 8px', marginBottom: 6, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <div><span className="dot dot-green" style={{ marginRight: 4 }} />{summary.active_changes} active</div>
              <div style={{ marginTop: 2 }}>{summary.done_tasks}/{summary.total_tasks} tasks</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            {collapsed ? <PanelLeft size={14} /> : <><ChevronLeft size={14} />{!collapsed && ' 收起'}</>}
          </button>
        </div>
      </aside>

      {/* ── 右侧内容区 ── */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-main)' }}>
        <ErrorBoundary>{renderContent()}</ErrorBoundary>
      </main>
    </div>
  );
}
