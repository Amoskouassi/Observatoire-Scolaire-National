import { create } from 'zustand';
import { api } from '../services/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  role: null,
  loading: true,

  login: (user, token, role) => {
    localStorage.setItem('osn_token', token);
    localStorage.setItem('osn_role', role);
    set({ user, token, role, loading: false });
  },

  logout: () => {
    localStorage.removeItem('osn_token');
    localStorage.removeItem('osn_role');
    set({ user: null, token: null, role: null, loading: false });
  },

  restoreSession: async () => {
    const token = localStorage.getItem('osn_token');
    const role = localStorage.getItem('osn_role');
    if (!token) { set({ loading: false }); return; }
    try {
      const data = await api.request('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ user: data.user, token, role: data.user.role || role, loading: false });
    } catch {
      localStorage.removeItem('osn_token');
      localStorage.removeItem('osn_role');
      set({ user: null, token: null, role: null, loading: false });
    }
  },
}));
