import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  role: null, // 'admin' | 'mairie' | 'institution' | 'enqueteur'

  login: (user, token, role) => {
    localStorage.setItem('osn_token', token);
    localStorage.setItem('osn_role', role);
    set({ user, token, role });
  },

  logout: () => {
    localStorage.removeItem('osn_token');
    localStorage.removeItem('osn_role');
    set({ user: null, token: null, role: null });
  },

  restoreSession: () => {
    const token = localStorage.getItem('osn_token');
    const role = localStorage.getItem('osn_role');
    if (token) {
      set({ token, role });
    }
  },
}));
