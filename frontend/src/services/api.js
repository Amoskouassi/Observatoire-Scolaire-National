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
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
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
}

export const api = new ApiService();
