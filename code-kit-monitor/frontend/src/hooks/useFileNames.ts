import { useEffect } from 'react';
import { create } from 'zustand';

interface FileNameState {
  map: Record<string, string>;
  loaded: boolean;
  fetch: () => Promise<void>;
}

export const useFileNames = create<FileNameState>((set) => ({
  map: {},
  loaded: false,
  fetch: async () => {
    try {
      const res = await fetch('/api/admin/file-names');
      const data = await res.json();
      set({ map: data || {}, loaded: true });
    } catch { set({ loaded: true }); }
  },
}));

// 便捷函数：路径 → 中文名，无映射返回原名
export function cn(path: string, map: Record<string, string>): string {
  return map[path] || path;
}

// 产物文件名 → 中文映射（内置，不需要 API）
const ARTIFACT_NAMES: Record<string, string> = {
  'CHANGE.md': '变更提案',
  'REQUIREMENT.md': '需求文档',
  'DESIGN.md': '技术设计',
  'UI-DESIGN.md': 'UI设计',
  'TASK.md': '任务清单',
  'TEST.md': '测试文档',
  'REVIEW.md': '审查报告',
};

export function artifactName(fname: string): string {
  if (ARTIFACT_NAMES[fname]) return ARTIFACT_NAMES[fname];
  if (fname.includes('-SUMMARY')) return `任务总结 (${fname.replace('-SUMMARY.md', '')})`;
  return fname;
}
