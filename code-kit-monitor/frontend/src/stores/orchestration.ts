import { create } from 'zustand';

export interface OrchestrationInstance {
  id: number; name: string; status: string;
  transition_status?: string; agent_count: number; priority: number;
  created_at: string;
}

export interface OrchestrationDetail extends OrchestrationInstance {
  yaml_raw: string; agent_ids: number[];
  token_soft_limit: number; token_hard_limit: number;
  max_retries: number; retry_backoff: string; on_failure: string;
  snapshot?: { node_count: number; edge_count: number; created_at: string };
  updated_at: string;
}

export interface OrchestrationTemplate {
  id: number; name: string; description: string;
  params: string[]; published: boolean; deploy_count: number; owner_id: string;
}

interface OrchestrationState {
  orchestrations: OrchestrationInstance[];
  loading: boolean;
  yamlContent: string;
  topologyState: { nodes: any[]; edges: any[] };
  reconcileStatus: any;
  queue: any[];
  templates: OrchestrationTemplate[];
  traceSpans: any[];
  metricData: any;

  fetchOrchestrations: () => Promise<void>;
  fetchDetail: (id: number) => Promise<OrchestrationDetail | null>;
  applyYaml: (yaml: string) => Promise<any>;
  validateYaml: (yaml: string) => Promise<any>;
  fetchQueue: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  deployTemplate: (id: number, values: Record<string, string>) => Promise<any>;
  fetchTrace: (id: number) => Promise<void>;
  fetchMetrics: (id: number, minutes?: number) => Promise<void>;
  setYamlContent: (yaml: string) => void;
  setTopologyState: (state: { nodes: any[]; edges: any[] }) => void;
}

const uid = () => localStorage.getItem('current_user_id') || 'admin';

export const useOrchestration = create<OrchestrationState>((set) => ({
  orchestrations: [], loading: false,
  yamlContent: '',
  topologyState: { nodes: [], edges: [] },
  reconcileStatus: null,
  queue: [],
  templates: [],
  traceSpans: [],
  metricData: null,

  fetchOrchestrations: async () => {
    set({ loading: true });
    const res = await fetch('/api/orchestration', { headers: { 'X-User-Id': uid() } });
    const data = await res.json();
    set({ orchestrations: Array.isArray(data) ? data : [], loading: false });
  },

  fetchDetail: async (id: number) => {
    const res = await fetch(`/api/orchestration/${id}`, { headers: { 'X-User-Id': uid() } });
    if (!res.ok) return null;
    return await res.json();
  },

  applyYaml: async (yaml: string) => {
    const res = await fetch('/api/orchestration/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ yaml_raw: yaml }),
    });
    return await res.json();
  },

  validateYaml: async (yaml: string) => {
    const res = await fetch('/api/orchestration/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ yaml_raw: yaml }),
    });
    return await res.json();
  },

  fetchQueue: async () => {
    const res = await fetch('/api/orchestration/queue/list', { headers: { 'X-User-Id': uid() } });
    const data = await res.json();
    set({ queue: Array.isArray(data) ? data : [] });
  },

  fetchTemplates: async () => {
    const res = await fetch('/api/orchestration/templates', { headers: { 'X-User-Id': uid() } });
    const data = await res.json();
    set({ templates: Array.isArray(data) ? data : [] });
  },

  deployTemplate: async (id: number, values: Record<string, string>) => {
    const res = await fetch(`/api/orchestration/templates/${id}/deploy`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ values }),
    });
    return await res.json();
  },

  fetchTrace: async (id: number) => {
    const res = await fetch(`/api/metrics/orchestration/${id}/trace`, { headers: { 'X-User-Id': uid() } });
    const data = await res.json();
    set({ traceSpans: Array.isArray(data) ? data : [] });
  },

  fetchMetrics: async (id: number, minutes: number = 60) => {
    const res = await fetch(`/api/metrics/orchestration/${id}?minutes=${minutes}`, { headers: { 'X-User-Id': uid() } });
    const data = await res.json();
    set({ metricData: data });
  },

  setYamlContent: (yaml: string) => set({ yamlContent: yaml }),
  setTopologyState: (state: { nodes: any[]; edges: any[] }) => set({ topologyState: state }),
}));
