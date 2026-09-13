import { create } from 'zustand';
import { api } from '../services/api';

export const useMapStore = create((set, get) => ({
  currentLevel: 'country',
  currentFeature: null,
  currentParent: null,

  bottomSheetOpen: true,
  bottomSheetContent: null,

  filters: {
    collect_status: [],
    milieu: [],
    niveau: [],
    statut: [],
    sans_toilettes: false,
    sans_eau: false,
    sans_electricite: false,
    manque_bancs: false,
    manque_enseignants: false,
    materiaux_precaires: false,
    taux_filles_min: null,
    taux_filles_max: null,
  },

  advancedFiltersOpen: false,
  isPremium: false,

  schoolsData: null,
  schoolsLoading: false,

  setCurrentLevel: (level) => set({ currentLevel: level }),
  setCurrentFeature: (feature) => set({ currentFeature: feature }),
  setCurrentParent: (parent) => set({ currentParent: parent }),

  openBottomSheet: (content) => set({ bottomSheetOpen: true, bottomSheetContent: content }),
  closeBottomSheet: () => set({ bottomSheetOpen: false }),

  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),

  toggleAdvancedFilters: () => set((state) => ({ advancedFiltersOpen: !state.advancedFiltersOpen })),
  setIsPremium: (v) => set({ isPremium: v }),

  resetFilters: () => set({
    filters: {
      collect_status: [], milieu: [], niveau: [], statut: [],
      sans_toilettes: false, sans_eau: false, sans_electricite: false,
      manque_bancs: false, manque_enseignants: false, materiaux_precaires: false,
      taux_filles_min: null, taux_filles_max: null,
    }
  }),

  setSchoolsData: (data) => set({ schoolsData: data }),
  setSchoolsLoading: (loading) => set({ schoolsLoading: loading }),

  refreshSchools: async () => {
    set({ schoolsLoading: true });
    try {
      const d = await api.getSchools();
      set({ schoolsData: d, schoolsLoading: false });
      return d;
    } catch {
      set({ schoolsLoading: false });
      return null;
    }
  },
}));
