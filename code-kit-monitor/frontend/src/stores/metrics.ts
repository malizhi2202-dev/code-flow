import { create } from 'zustand';

interface MetricsData {
  buckets: any[]; model_totals: Record<string, number>;
  total_tokens: number; total_hits: number; total_time_ms: number;
}

interface MetricsState {
  data: MetricsData | null; global: any | null; loading: boolean;
  fetchMetrics: (entityType: string, entityId: number, minutes?: number) => Promise<void>;
  fetchGlobal: (minutes?: number) => Promise<void>;
}

const uid = () => localStorage.getItem('current_user_id') || 'admin';

export const useMetrics = create<MetricsState>((set) => ({
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
