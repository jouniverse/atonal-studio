import { create } from 'zustand';

interface UIState {
  docsOpen: boolean;
  setDocsOpen: (open: boolean) => void;
  sysOpen: boolean;
  setSysOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  docsOpen: false,
  setDocsOpen: (open) => set({ docsOpen: open }),
  sysOpen: false,
  setSysOpen: (open) => set({ sysOpen: open }),
}));
