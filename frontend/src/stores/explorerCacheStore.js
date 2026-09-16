import { create } from 'zustand';

export const useExplorerCacheStore = create((set, get) => ({
  currentLevel: null,
  breadcrumb: { district: null, region: null, dept: null },
  selDist: null,
  selReg: null,
  selDept: null,
  center: null,
  zoom: null,

  save: (state) => set(state),

  restore: () => {
    const s = get();
    const hasCache = s.currentLevel && s.currentLevel !== 'district';
    if (!hasCache) return null;
    return {
      currentLevel: s.currentLevel,
      breadcrumb: s.breadcrumb,
      selDist: s.selDist,
      selReg: s.selReg,
      selDept: s.selDept,
      center: s.center,
      zoom: s.zoom,
    };
  },

  clear: () => set({
    currentLevel: null,
    breadcrumb: { district: null, region: null, dept: null },
    selDist: null,
    selReg: null,
    selDept: null,
    center: null,
    zoom: null,
  }),
}));
