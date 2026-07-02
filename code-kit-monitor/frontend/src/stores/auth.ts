import { create } from 'zustand';

export interface UserInfo {
  id: string; name: string; role: string;
  project_ids: string[]; created_at: string; active: boolean;
}

interface AuthState {
  currentUser: UserInfo | null;
  userList: UserInfo[];
  isAdmin: boolean;
  loaded: boolean;
  rolePermissions: string[];
  permissionDefs: Record<string, { name: string; description: string; dangerous: boolean }>;
  fetchMe: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  switchUser: (userId: string) => void;
}

function getUserId(): string {
  return localStorage.getItem('current_user_id') || '';
}

export const useAuth = create<AuthState>((set, get) => ({
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
    } catch {
      set({ loaded: true });
    }
  },

  fetchUsers: async () => {
    const uid = getUserId();
    if (!uid) return;
    try {
      const res = await fetch('/api/auth/users', { headers: { 'X-User-Id': uid } });
      if (res.status === 403) {
        // 非 admin 用户无权限获取用户列表，正常
        set({ userList: [] });
        return;
      }
      const data = await res.json();
      set({ userList: data.users || [] });
    } catch { /* silently ignore */ }
  },

  switchUser: (userId: string) => {
    localStorage.setItem('current_user_id', userId);
    window.location.reload();
  },
}));

export function authHeaders(): Record<string, string> {
  const uid = localStorage.getItem('current_user_id') || 'admin';
  return { 'X-User-Id': uid, 'Content-Type': 'application/json' };
}
