import { create } from 'zustand';

export interface ChangeItem {
  id: string; phase: string; progress: string; status: string;
  interrupted: boolean; interrupted_task?: string; artifacts: string[];
}
interface ChangeState {
  changes: ChangeItem[]; alerts: number; loading: boolean;
  filter: { q: string; status: string; phase: string };
  fetchChanges: () => Promise<void>;
  setFilter: (f: Partial<ChangeState['filter']>) => void;
}

export const useChanges = create<ChangeState>((set, get) => ({
  changes: [], alerts: 0, loading: false,
  filter: { q: '', status: 'all', phase: 'all' },
  fetchChanges: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/changes');
      const data = await res.json();
      set({ changes: data.changes || [], alerts: data.alerts || 0, loading: false });
    } catch { set({ loading: false }); }
  },
  setFilter: (f) => set((s) => ({ filter: { ...s.filter, ...f } })),
}));

// 客户端过滤
export function filteredChanges(changes: ChangeItem[], f: { q: string; status: string; phase: string }) {
  return changes.filter((c) => {
    if (f.q && !c.id.toLowerCase().includes(f.q.toLowerCase())) return false;
    if (f.status !== 'all' && c.status !== f.status) return false;
    if (f.phase !== 'all' && c.phase !== f.phase) return false;
    return true;
  });
}
