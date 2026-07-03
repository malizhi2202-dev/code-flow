import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { GitBranch, Users, ChevronLeft, PanelLeft, Shield, FileSearch, AlertCircle, Wrench, Bot, Network, FolderKanban, BarChart3, Link2 } from 'lucide-react';
import Home from './pages/Home';
import Detail from './pages/Detail';
import Roles from './pages/Roles';
import WorkflowEditor from './pages/WorkflowEditor';
import DocEditor from './pages/DocEditor';
import SpecsEditor from './pages/SpecsEditor';
import Runtime from './pages/Runtime';
import UserManagement from './pages/UserManagement';
import AuditLog from './pages/AuditLog';
import LoginPage from './pages/LoginPage';
import UserCenter from './pages/UserCenter';
import ToolMarket from './pages/ToolMarket';
import WorkflowList from './pages/WorkflowList';
import RoleMarket from './pages/RoleMarket';
import AssemblyView from './pages/AssemblyView';
import AgentBuilder from './pages/AgentBuilder';
import OrchestrationPage from './pages/OrchestrationPage';
import SecurityPage from './pages/SecurityPage';
import MonitoringDashboard from './pages/MonitoringDashboard';
import ProjectManager from './pages/ProjectManager';
import ProjectDetail from './pages/ProjectDetail';
import UserArea from './components/UserSelect';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './stores/auth';
function EmptyPerm() {
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 12 }, children: [_jsx(AlertCircle, { size: 40, style: { opacity: 0.3 } }), _jsx("p", { style: { fontSize: 14 }, children: "\u6682\u65E0\u6B64\u529F\u80FD\u6743\u9650" }), _jsx("p", { style: { fontSize: 11 }, children: "\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\u5206\u914D\u76F8\u5E94\u6743\u9650" })] }));
}
const NAV = [
    { id: 'tools', label: '工具库', icon: _jsx(Wrench, { size: 16 }) },
    { id: 'workflows', label: '工作流', icon: _jsx(GitBranch, { size: 16 }) },
    { id: 'roles-page', label: '角色', icon: _jsx(Users, { size: 16 }) },
    { id: 'assembly', label: '组装', icon: _jsx(Link2, { size: 16 }) },
    { id: 'agents', label: 'Agent', icon: _jsx(Bot, { size: 16 }) },
    { id: 'orchestration', label: '编排', icon: _jsx(Network, { size: 16 }) },
    { id: 'security', label: '安全', icon: _jsx(Shield, { size: 16 }) },
    { id: 'monitor', label: '监控', icon: _jsx(BarChart3, { size: 16 }) },
    { id: 'projects', label: '项目', icon: _jsx(FolderKanban, { size: 16 }) },
];
const ADMIN_NAV = [
    { id: 'users', label: '用户管理', icon: _jsx(Shield, { size: 16 }) },
    { id: 'audit', label: '审计日志', icon: _jsx(FileSearch, { size: 16 }) },
];
export default function App() {
    const [nav, setNav] = useState('projects');
    const [detailId, setDetailId] = useState(null);
    const [projectDetailId, setProjectDetailId] = useState(null);
    const [collapsed, setCollapsed] = useState(false);
    const { isAdmin, rolePermissions, fetchMe, fetchUsers, loaded } = useAuth();
    // 未登录 → 显示登录页
    const userId = localStorage.getItem('current_user_id');
    if (!userId) {
        return _jsx(LoginPage, {});
    }
    useEffect(() => {
        fetchMe().then(() => {
            const state = useAuth.getState();
            if (state.isAdmin)
                fetchUsers();
        });
    }, []);
    const perm = (p) => isAdmin || rolePermissions.includes(p);
    const visibleNav = NAV;
    const visibleAdminNav = ADMIN_NAV.filter(item => {
        switch (item.id) {
            case 'users': return perm('user:manage');
            case 'audit': return perm('audit:view');
            default: return false;
        }
    });
    const navigate = (id) => {
        setNav(id);
        setDetailId(null);
    };
    const openDetail = (changeId) => setDetailId(changeId);
    const renderContent = () => {
        if (projectDetailId)
            return _jsx(ProjectDetail, { projectId: projectDetailId, onBack: () => setProjectDetailId(null) });
        if (detailId)
            return _jsx(Detail, { changeId: detailId, onBack: () => setDetailId(null) });
        switch (nav) {
            case 'home': return _jsx(Home, { onSelect: openDetail });
            case 'workflow': return perm('project:write') ? _jsx(WorkflowEditor, {}) : _jsx(EmptyPerm, {});
            case 'roles': return perm('project:write') ? _jsx(Roles, {}) : _jsx(EmptyPerm, {});
            case 'specs': return perm('project:read') ? _jsx(SpecsEditor, { onSelect: (id) => setDetailId(id) }) : _jsx(EmptyPerm, {});
            case 'runtime': return perm('project:read') ? _jsx(Runtime, {}) : _jsx(EmptyPerm, {});
            case 'docs': return perm('project:write') ? _jsx(DocEditor, {}) : _jsx(EmptyPerm, {});
            case 'users': return perm('user:manage') ? _jsx(UserManagement, {}) : _jsx(EmptyPerm, {});
            case 'audit': return perm('audit:view') ? _jsx(AuditLog, {}) : _jsx(EmptyPerm, {});
            case 'tools': return perm('project:read') ? _jsx(ToolMarket, {}) : _jsx(EmptyPerm, {});
            case 'workflows': return perm('project:write') ? _jsx(WorkflowList, {}) : _jsx(EmptyPerm, {});
            case 'roles-page': return perm('project:read') ? _jsx(RoleMarket, {}) : _jsx(EmptyPerm, {});
            case 'assembly': return perm('project:write') ? _jsx(AssemblyView, {}) : _jsx(EmptyPerm, {});
            case 'agents': return perm('project:read') ? _jsx(AgentBuilder, {}) : _jsx(EmptyPerm, {});
            case 'orchestration': return perm('project:write') ? _jsx(OrchestrationPage, {}) : _jsx(EmptyPerm, {});
            case 'security': return perm('project:read') ? _jsx(SecurityPage, {}) : _jsx(EmptyPerm, {});
            case 'monitor': return perm('project:read') ? _jsx(MonitoringDashboard, {}) : _jsx(EmptyPerm, {});
            case 'projects': return perm('project:read') ? _jsx(ProjectManager, { onSelect: (id) => setProjectDetailId(id) }) : _jsx(EmptyPerm, {});
            case 'profile': return _jsx(UserCenter, { onBack: () => navigate('projects') });
            default: return _jsx(ProjectManager, { onSelect: (id) => setProjectDetailId(id) });
        }
    };
    return (_jsxs("div", { style: { display: 'flex', height: '100vh', width: '100vw' }, children: [_jsxs("aside", { style: {
                    width: collapsed ? 48 : 200,
                    background: 'var(--bg-sidebar)',
                    borderRight: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column',
                    transition: 'width var(--normal) var(--ease)',
                    flexShrink: 0, overflow: 'hidden',
                }, children: [_jsxs("div", { style: { padding: collapsed ? '12px 10px' : '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { color: 'var(--blue)', fontWeight: 800, fontSize: 16, flexShrink: 0 }, children: "\u25C8" }), !collapsed && _jsx("span", { style: { fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }, children: "AI \u5F00\u53D1\u5E73\u53F0" })] }), _jsxs("nav", { style: { flex: 1, padding: '8px' }, children: [visibleNav.map(item => (_jsxs("button", { onClick: () => navigate(item.id), "aria-label": item.label, style: {
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    width: '100%', padding: collapsed ? '8px 0' : '7px 10px',
                                    marginBottom: 2, borderRadius: 'var(--r-sm)',
                                    background: nav === item.id && !detailId ? 'var(--bg-selected)' : 'transparent',
                                    border: 'none', color: nav === item.id && !detailId ? 'var(--blue)' : 'var(--text-secondary)',
                                    cursor: 'pointer', fontSize: 13, fontWeight: nav === item.id && !detailId ? 600 : 400,
                                    transition: 'all var(--fast)',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                }, children: [item.icon, !collapsed && _jsx("span", { children: item.label })] }, item.id))), visibleAdminNav.length > 0 && (_jsxs(_Fragment, { children: [!collapsed && (_jsx("div", { style: { padding: '4px 10px', marginTop: 8, marginBottom: 4, fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.06 }, children: "\u7BA1\u7406" })), visibleAdminNav.map(item => (_jsxs("button", { onClick: () => navigate(item.id), "aria-label": item.label, style: {
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            width: '100%', padding: collapsed ? '8px 0' : '7px 10px',
                                            marginBottom: 2, borderRadius: 'var(--r-sm)',
                                            background: nav === item.id && !detailId ? 'var(--bg-selected)' : 'transparent',
                                            border: 'none', color: nav === item.id && !detailId ? 'var(--blue)' : 'var(--text-secondary)',
                                            cursor: 'pointer', fontSize: 13, fontWeight: nav === item.id && !detailId ? 600 : 400,
                                            transition: 'all var(--fast)',
                                            justifyContent: collapsed ? 'center' : 'flex-start',
                                        }, children: [item.icon, !collapsed && _jsx("span", { children: item.label })] }, item.id)))] }))] }), _jsxs("div", { style: { padding: '8px', borderTop: '1px solid var(--border)' }, children: [_jsx(UserArea, { collapsed: collapsed, onNavigateProfile: () => navigate('profile') }), _jsx("button", { onClick: () => setCollapsed(!collapsed), className: "btn btn-ghost btn-sm", style: { width: '100%', marginTop: 6, justifyContent: collapsed ? 'center' : 'flex-start' }, children: collapsed ? _jsx(PanelLeft, { size: 14 }) : _jsxs(_Fragment, { children: [_jsx(ChevronLeft, { size: 14 }), !collapsed && ' 收起'] }) })] })] }), _jsx("main", { style: { flex: 1, overflow: 'auto', background: 'var(--bg-main)' }, children: _jsx(ErrorBoundary, { children: renderContent() }) })] }));
}
