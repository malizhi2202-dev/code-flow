import { create } from 'zustand';
const uid = () => localStorage.getItem('current_user_id') || 'admin';
export const useMetrics = create((set) => ({
    data: null, global: null, loading: false,
    fetchMetrics: async (entityType, entityId, minutes = 60) => {
        set({ loading: true });
        const res = await fetch(`/api/metrics/${entityType}/${entityId}?minutes=${minutes}`, { headers: { 'X-User-Id': uid() } });
        const data = await res.json();
        set({ data, loading: false });
    },
    fetchGlobal: async (minutes = 60) => {
        set({ loading: true });
        const res = await fetch(`/api/metrics/global?minutes=${minutes}`, { headers: { 'X-User-Id': uid() } });
        const data = await res.json();
        set({ global: data, loading: false });
    },
}));
