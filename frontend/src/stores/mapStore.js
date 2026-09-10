import { create } from 'zustand';

export const useMapStore = create((set) => ({
  // Niveau de navigation actuel
  currentLevel: 'country', // 'country' | 'district' | 'region' | 'dept' | 'commune' | 'school'
  currentFeature: null,
  currentParent: null,

  // Sidebar
  sidebarOpen: false,
  sidebarContent: null,

  // Filtres (Approche hybride)
  filters: {
    collect_status: [],     // ['collected', 'waiting', 'pending']
    milieu: [],             // ['urbain', 'rural']
    statut: [],             // ['public', 'prive_laic', 'prive_confessionnel', 'communautaire_non_reconnue']
    niveau: [],             // ['primaire', 'secondaire', 'superieur']
    sans_toilettes: false,
    sans_eau: false,
    sans_electricite: false,
    manque_bancs: false,
    manque_enseignants: false,
    materiaux_precaires: false,
    taux_filles_min: null,
    taux_filles_max: null,
  },

  // Données écoles (chargées une fois, filtrées côté client)
  schoolsData: null,
  schoolsLoading: false,

  // Actions
  setCurrentLevel: (level) => set({ currentLevel: level }),
  setCurrentFeature: (feature) => set({ currentFeature: feature }),
  setCurrentParent: (parent) => set({ currentParent: parent }),

  openSidebar: (content) => set({ sidebarOpen: true, sidebarContent: content }),
  closeSidebar: () => set({ sidebarOpen: false }),

  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),

  resetFilters: () => set({
    filters: {
      collect_status: [],
      milieu: [],
      statut: [],
      niveau: [],
      sans_toilettes: false,
      sans_eau: false,
      sans_electricite: false,
      manque_bancs: false,
      manque_enseignants: false,
      materiaux_precaires: false,
      taux_filles_min: null,
      taux_filles_max: null,
    }
  }),

  setSchoolsData: (data) => set({ schoolsData: data }),
  setSchoolsLoading: (loading) => set({ schoolsLoading: loading }),
}));
