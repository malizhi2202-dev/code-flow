import { create } from 'zustand';
function getUserId() {
    return localStorage.getItem('current_user_id') || '';
}
export const useAuth = create((set, get) => ({
    currentUser: null,
    userList: [],
    isAdmin: false,
    loaded: false,
    rolePermissions: [],
    permissionDefs: {},
    fetchMe: async () => {
        const uid = getUserId();
        if (!uid) {
            set({ loaded: true });
            return;
        }
        try {
            const res = await fetch('/api/auth/me', { headers: { 'X-User-Id': uid } });
            if (res.status === 401) {
                // 用户已被删除，清除本地缓存
                localStorage.removeItem('current_user_id');
                set({ loaded: true });
                return;
            }
            const data = await res.json();
            const u = data.user;
            set({
                currentUser: u,
                isAdmin: u?.role === 'admin',
                loaded: true,
                rolePermissions: data.role_permissions || [],
                permissionDefs: data.permissions || {},
            });
        }
        catch {
            set({ loaded: true });
        }
    },
    fetchUsers: async () => {
        const uid = getUserId();
        if (!uid)
            return;
        try {
            const res = await fetch('/api/auth/users', { headers: { 'X-User-Id': uid } });
            if (res.status === 403) {
                // 非 admin 用户无权限获取用户列表，正常
                set({ userList: [] });
                return;
            }
            const data = await res.json();
            set({ userList: data.users || [] });
        }
        catch { /* silently ignore */ }
    },
    logout: () => {
        localStorage.removeItem('current_user_id');
        set({ currentUser: null, isAdmin: false, loaded: false, rolePermissions: [], userList: [] });
        window.location.reload();
    },
}));
export function authHeaders() {
    const uid = localStorage.getItem('current_user_id') || 'admin';
    return { 'X-User-Id': uid, 'Content-Type': 'application/json' };
}
