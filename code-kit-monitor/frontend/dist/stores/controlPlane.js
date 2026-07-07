import { create } from 'zustand';
export const useControlPlane = create((set, get) => ({
    probes: [],
    queue: [],
    reconcile: [],
    selectedAgent: null,
    loading: false,
    fetchProbes: async () => {
        set({ loading: true });
        const res = await fetch('/api/control-plane/probes');
        const data = await res.json();
        set({ probes: Array.isArray(data) ? data : (data.probes || []), loading: false });
    },
    fetchQueue: async () => {
        set({ loading: true });
        const res = await fetch('/api/control-plane/queue');
        const data = await res.json();
        set({ queue: Array.isArray(data) ? data : (data.queue || []), loading: false });
    },
    fetchReconcile: async () => {
        set({ loading: true });
        const res = await fetch('/api/control-plane/reconcile');
        const data = await res.json();
        set({ reconcile: Array.isArray(data) ? data : (data.entries || []), loading: false });
    },
    restartAgent: async (agentId) => {
        const res = await fetch(`/api/control-plane/agent/${agentId}/restart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        return await res.json();
    },
    rescheduleAgent: async (agentId) => {
        const res = await fetch(`/api/control-plane/agent/${agentId}/reschedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        return await res.json();
    },
    pauseAgent: async (agentId) => {
        const res = await fetch(`/api/control-plane/agent/${agentId}/pause`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        return await res.json();
    },
    setSelectedAgent: (agentId) => set({ selectedAgent: agentId }),
}));
