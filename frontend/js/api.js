const API_BASE = import.meta.env.VITE_API_URL;

// Debug Log for Production Verification
console.log("ENV VITE_API_URL:", API_BASE);

const api = {
    async request(endpoint, method = 'GET', data = null, customHeaders = {}) {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('prepstack_token');
        const headers = { 'Content-Type': 'application/json', ...customHeaders };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = { method, headers };
        if (data) options.body = JSON.stringify(data);

        // Ensure endpoint starts with /
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

        // Construct full URL strictly: BASE + /api + endpoint
        // Example: https://prep-stack-backend.vercel.app/api/auth/user/login
        const url = `${API_BASE}/api${path}`;

        try {
            const res = await fetch(url, options);
            return handleResponse(res);
        } catch (err) {
            console.error('API Request Failed:', err);
            // If it's a network error (like CORS or offline), throw it.
            throw new Error('Network error or server unreachable');
        }
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

    async upload(endpoint, formData) {
        const token = localStorage.getItem('adminToken');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${API_BASE}/api${path}`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: formData
            });
            return handleResponse(res);
        } catch (err) {
            console.error('API Upload Failed:', err);
            throw new Error('Network error or server unreachable');
        }
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
