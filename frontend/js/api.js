const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = {
    async request(endpoint, method = 'GET', data = null) {
        const token = localStorage.getItem('adminToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = { method, headers };
        if (data) options.body = JSON.stringify(data);

        const res = await fetch(`${API_BASE}${endpoint}`, options);
        return handleResponse(res);
    },
    get(endpoint) {
        return this.request(endpoint);
    },
    post(endpoint, data) {
        return this.request(endpoint, 'POST', data);
    },
    put(endpoint, data) {
        return this.request(endpoint, 'PUT', data);
    },
    delete(endpoint) {
        return this.request(endpoint, 'DELETE');
    }
};

async function handleResponse(res) {
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error.error || `Request failed: ${res.status}`);
    }
    return res.json();
}

export default api;
