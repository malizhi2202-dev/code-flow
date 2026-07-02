import { useState, useEffect } from 'react';
import { User, Check, Shield, LogOut, X } from 'lucide-react';
import { useAuth } from '../stores/auth';

const PERM_LABELS: Record<string, string> = {
  'project:read': '查看项目', 'project:write': '编辑项目',
  'project:delete': '删除产物', 'workflow:stop': '停止流程',
  'user:manage': '管理用户', 'audit:view': '查看审计',
};

export default function UserSelect({ collapsed }: { collapsed: boolean }) {
  const { currentUser, userList, isAdmin, fetchMe, fetchUsers, switchUser, loaded, rolePermissions } = useAuth();
  const [open, setOpen] = useState(false);
  const [showPerms, setShowPerms] = useState(false);

  useEffect(() => {
    fetchMe().then(() => {
      const state = useAuth.getState();
      if (state.isAdmin) fetchUsers();
    });
  }, []);

  const activeUsers = userList.filter(u => u.active);
  const curName = currentUser?.name || '...';

  const handleLogout = () => {
    localStorage.removeItem('current_user_id');
    window.location.reload();
  };

  // 权限面板
  const renderPermPanel = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }} onClick={() => setShowPerms(false)}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
        borderRadius: 'var(--r-lg)', padding: '20px 24px', maxWidth: 380, width: '90%',
        boxShadow: 'var(--shadow-md)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isAdmin ? <Shield size={18} style={{ color: 'var(--blue)' }} /> : <User size={18} />}
            <span style={{ fontWeight: 700, fontSize: 15 }}>{currentUser?.name}</span>
            <span className={`badge ${isAdmin ? 'badge-blue' : 'badge-green'}`}>{isAdmin ? '管理员' : '用户'}</span>
          </div>
          <button onClick={() => setShowPerms(false)} className="btn btn-ghost btn-xs"><X size={14} /></button>
        </div>

        {/* 权限列表 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.04 }}>
            当前权限
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {rolePermissions.map(p => (
              <span key={p} className={`badge ${p.includes('delete') || p === 'workflow:stop' || p === 'user:manage' ? 'badge-red' : p === 'audit:view' ? 'badge-orange' : 'badge-green'}`}>
                {PERM_LABELS[p] || p}
              </span>
            ))}
            {rolePermissions.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>无权限</span>
            )}
          </div>
        </div>

        {/* 归属项目 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.04 }}>
            归属项目
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {isAdmin ? (
              <span className="badge badge-blue">全部项目</span>
            ) : (currentUser?.project_ids || []).length > 0 ? (
              currentUser?.project_ids.map(p => <span key={p} className="badge badge-purple">{p}</span>)
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>未分配项目</span>
            )}
          </div>
        </div>

        <button onClick={handleLogout} className="btn btn-sm"
          style={{ width: '100%', color: 'var(--text-muted)', fontSize: 12 }}>
          <LogOut size={12} style={{ marginRight: 4 }} />重新选择用户
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'relative', marginBottom: 4 }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost btn-sm"
        style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', gap: 6 }}
        aria-label="切换用户"
      >
        {isAdmin ? <Shield size={13} style={{ color: 'var(--blue)' }} /> : <User size={13} style={{ color: 'var(--text-muted)' }} />}
        {!collapsed && (
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {curName}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, zIndex: 100,
            background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-md)', minWidth: 200,
            boxShadow: 'var(--shadow-md)', padding: 4,
          }}>
            <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.04 }}>
              {isAdmin ? '切换用户' : '当前用户'}
            </div>

            {/* Admin: 用户切换列表 */}
            {isAdmin && activeUsers.map(u => (
              <button
                key={u.id}
                onClick={() => switchUser(u.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '5px 8px', border: 'none', borderRadius: 'var(--r-sm)',
                  background: currentUser?.id === u.id ? 'var(--bg-selected)' : 'transparent',
                  color: currentUser?.id === u.id ? 'var(--blue)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)',
                }}
              >
                {u.role === 'admin' ? <Shield size={12} style={{ color: 'var(--blue)' }} /> : <User size={12} />}
                <span style={{ flex: 1, textAlign: 'left' }}>{u.name}</span>
                {currentUser?.id === u.id && <Check size={12} style={{ color: 'var(--blue)' }} />}
              </button>
            ))}

            {/* 非 admin: 只有自己 */}
            {!isAdmin && currentUser && (
              <div style={{ padding: '6px 8px', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={12} />
                <span>{currentUser.name}</span>
                <span className="badge badge-green" style={{ marginLeft: 'auto' }}>user</span>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
              {/* 查看权限 */}
              <button
                onClick={() => { setOpen(false); setShowPerms(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '5px 8px', border: 'none', borderRadius: 'var(--r-sm)',
                  background: 'transparent', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font)',
                }}
              >
                <Shield size={11} />
                <span>查看我的权限</span>
              </button>
              {/* 重新选择 */}
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '5px 8px', border: 'none', borderRadius: 'var(--r-sm)',
                  background: 'transparent', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font)',
                }}
              >
                <LogOut size={11} />
                <span>重新选择用户</span>
              </button>
            </div>
          </div>
        </>
      )}

      {showPerms && renderPermPanel()}
    </div>
  );
}
