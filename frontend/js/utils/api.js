import { ProgressBar } from '../components/ProgressBar.js';

const API_BASE = (import.meta.env.VITE_API_URL || "https://prep-stack-backend.vercel.app").replace(/\/$/, '');

const api = {
    async request(endpoint, method = 'GET', data = null, customHeaders = {}) {
        // 1. Start Loading Bar
        ProgressBar.start();

        const token = localStorage.getItem('adminToken') || localStorage.getItem('prepstack_token');
        const headers = { 'Content-Type': 'application/json', ...customHeaders };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = { method, headers };
        if (data) options.body = JSON.stringify(data);

        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${API_BASE}/api${path}`;

        // 2. Timeout Logic (10s)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        options.signal = controller.signal;

        try {
            const res = await fetch(url, options);
            clearTimeout(timeoutId);

            // 3. Global Error Handling
            if (res.status === 401) {
                // Determine if Admin or User based on current path or token
                if (window.location.pathname.includes('/admin')) {
                    localStorage.removeItem('adminToken');
                    window.location.href = '/admin/login';
                } else {
                    localStorage.removeItem('prepstack_token');
                    localStorage.removeItem('prepstack_user');
                    window.location.href = '/login';
                }
                throw new Error('Session expired. Please login again.');
            }

            if (!res.ok) {
                const error = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(error.error || `Request failed: ${res.status}`);
            }

            // 4. Finish Loading Bar
            ProgressBar.finish();
            return await res.json();

        } catch (err) {
            ProgressBar.finish();
            clearTimeout(timeoutId);

            if (err.name === 'AbortError') {
                console.error('Request timed out');
                throw new Error('Request timed out. Please try again.');
            }

            console.error('API Request Failed:', err);
            throw err;
        }
    },

    get(endpoint) { return this.request(endpoint); },
    post(endpoint, data) { return this.request(endpoint, 'POST', data); },
    put(endpoint, data) { return this.request(endpoint, 'PUT', data); },
    delete(endpoint) { return this.request(endpoint, 'DELETE'); },

    async upload(endpoint, formData) {
        ProgressBar.start();
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
            ProgressBar.finish();

            if (!res.ok) {
                const error = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(error.error || `Upload failed: ${res.status}`);
            }
            return await res.json();
        } catch (err) {
            ProgressBar.finish();
            console.error('API Upload Failed:', err);
            throw err;
        }
    }
};

export default api;
