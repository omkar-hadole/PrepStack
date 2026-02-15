const API_BASE = import.meta.env.VITE_API_URL;

const api = {
    async request(endpoint, method = 'GET', data = null, customHeaders = {}) {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('prepstack_token');
        const headers = { 'Content-Type': 'application/json', ...customHeaders };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = { method, headers };
        if (data) options.body = JSON.stringify(data);

        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

        const res = await fetch(`${API_BASE}${path}`, options);
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
    },
    // Add file upload support if needed, bypassing JSON content type
    async upload(endpoint, formData) {
        const token = localStorage.getItem('adminToken');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers,
            body: formData
        });
        return handleResponse(res);
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
