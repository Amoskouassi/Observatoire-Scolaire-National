const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getHeaders() {
    const token = localStorage.getItem('osn_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers },
    });

    if (!response.ok) {
      let error;
      try { error = await response.json(); } catch { error = {}; }
      const detail = error.details?.map(d => `${d.field}: ${d.message}`).join(', ');
      throw new Error(detail || error.error || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  verifyCode(email, code) {
    return this.request('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  resendCode(email) {
    return this.request('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  googleCallback(access_token) {
    return this.request('/auth/google-callback', {
      method: 'POST',
      body: JSON.stringify({ access_token }),
    });
  }

  codeLogin(login_code) {
    return this.request('/auth/code-login', {
      method: 'POST',
      body: JSON.stringify({ login_code }),
    });
  }

  verifyLoginCode(login_code, code) {
    return this.request('/auth/verify-login-code', {
      method: 'POST',
      body: JSON.stringify({ login_code, code }),
    });
  }

  // Écoles
  getSchools(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        params.set(key, value.join(','));
      } else if (value !== null && value !== undefined && value !== '') {
        params.set(key, value);
      }
    });
    return this.request(`/ecoles?${params.toString()}`);
  }

  getSchool(id) {
    return this.request(`/ecoles/${id}`);
  }

  createSchool(data) {
    return this.request('/ecoles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateSchool(id, data) {
    return this.request(`/ecoles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteSchool(id) {
    return this.request(`/ecoles/${id}`, { method: 'DELETE' });
  }

  // Zones admin
  getAdminZones(level, parentCode) {
    return this.request(`/admin-zones/${level}?parent=${parentCode || ''}`);
  }

  getAdminStats(code, level) {
    return this.request(`/admin-stats/${level}/${code}`);
  }

  // Collecte
  submitCollecte(data) {
    return this.request('/collecte', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  uploadPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);
    return fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('osn_token')}`,
      },
      body: formData,
    }).then((r) => r.json());
  }

  // Plaidoyer
  generatePoster(schoolId) {
    return this.request(`/plaidoyer/poster/${schoolId}`);
  }

  // Dashboard
  getDashboardStats(level, code) {
    return this.request(`/dashboard/stats/${level}/${code || ''}`);
  }

  getZoneCounts() {
    return this.request('/dashboard/zone-counts');
  }

  getMyZone() {
    return this.request('/dashboard/my-zone');
  }

  getNationalStats() {
    return this.request('/dashboard/national-stats');
  }

  getHistorical(anneeScolaire) {
    return this.request(`/dashboard/historical?annee_scolaire=${encodeURIComponent(anneeScolaire)}`);
  }

  getCollecteHistory() {
    return this.request('/dashboard/collecte-history');
  }

  getCommuneRanking() {
    return this.request('/dashboard/commune-ranking');
  }

  getAlerts(zoneLevel, zoneCode) {
    const params = new URLSearchParams();
    if (zoneLevel) params.set('zone_level', zoneLevel);
    if (zoneCode) params.set('zone_code', zoneCode);
    return this.request(`/dashboard/alerts?${params.toString()}`);
  }

  saveSnapshot(data) {
    return this.request('/dashboard/snapshots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();
