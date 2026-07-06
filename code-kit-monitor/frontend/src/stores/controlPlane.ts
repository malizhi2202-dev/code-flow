import { create } from 'zustand';

export interface AgentStatus {
  agent_id: number;
  agent_name: string;
  status: string;
  health: string;
  last_heartbeat: string;
  runtime: string;
  model_name: string;
  tokens_used: number;
  token_soft_limit: number;
  token_hard_limit: number;
  probes: ProbeRecord[];
}

export interface ProbeRecord {
  probe_type: string;
  status: string;
  detail: string;
  consecutive_failures: number;
  created_at: string;
}

export interface QueueItem {
  id: number;
  orchestration_id: number;
  orchestration_name: string;
  agent_id: number;
  agent_name: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface ReconcileEntry {
  id: number;
  orchestration_id: number;
  orchestration_name: string;
  status: string;
  drift_detected: boolean;
  message: string;
  created_at: string;
}

interface ControlPlaneState {
  probes: AgentStatus[];
  queue: QueueItem[];
  reconcile: ReconcileEntry[];
  selectedAgent: number | null;
  loading: boolean;

  fetchProbes: () => Promise<void>;
  fetchQueue: () => Promise<void>;
  fetchReconcile: () => Promise<void>;
  restartAgent: (agentId: number) => Promise<any>;
  rescheduleAgent: (agentId: number) => Promise<any>;
  pauseAgent: (agentId: number) => Promise<any>;
  setSelectedAgent: (agentId: number | null) => void;
}

export const useControlPlane = create<ControlPlaneState>((set, get) => ({
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

  restartAgent: async (agentId: number) => {
    const res = await fetch(`/api/control-plane/agent/${agentId}/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  rescheduleAgent: async (agentId: number) => {
    const res = await fetch(`/api/control-plane/agent/${agentId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  pauseAgent: async (agentId: number) => {
    const res = await fetch(`/api/control-plane/agent/${agentId}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  setSelectedAgent: (agentId: number | null) => set({ selectedAgent: agentId }),
}));
