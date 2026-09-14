import { create } from 'zustand';
import { api } from '../services/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  role: null,
  loading: true,

  login: (user, token) => {
    localStorage.setItem('osn_token', token);
    set({ user, token, role: user?.role || null, loading: false });
  },

  logout: () => {
    localStorage.removeItem('osn_token');
    set({ user: null, token: null, role: null, loading: false });
  },

  restoreSession: async () => {
    const token = localStorage.getItem('osn_token');
    if (!token) { set({ loading: false }); return; }
    try {
      const data = await api.request('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ user: data?.user || null, token, role: data?.user?.role || null, loading: false });
    } catch {
      localStorage.removeItem('osn_token');
      set({ user: null, token: null, role: null, loading: false });
    }
  },
}));
