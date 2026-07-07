import { create } from 'zustand';
export const useChanges = create((set, get) => ({
    changes: [], summary: null, loading: false,
    filter: { q: '', status: 'all', phase: 'all' },
    fetchChanges: async () => {
        set({ loading: true });
        try {
            const res = await fetch('/api/changes');
            const data = await res.json();
            set({ changes: data.changes || [], summary: data.summary || null, loading: false });
        }
        catch {
            set({ loading: false });
        }
    },
    setFilter: (f) => set((s) => ({ filter: { ...s.filter, ...f } })),
}));
export function filteredChanges(changes, f) {
    return changes.filter((c) => {
        if (f.q && !c.id.toLowerCase().includes(f.q.toLowerCase()))
            return false;
        if (f.status !== 'all' && c.status !== f.status)
            return false;
        if (f.phase !== 'all' && c.phase !== f.phase)
            return false;
        return true;
    });
}
