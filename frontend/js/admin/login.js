import api from '/js/utils/api.js';

export default function renderAdminLogin(params, root) {
    root.innerHTML = `
        <div class="container" style="max-width: 400px; margin-top: 10vh;">
            <div class="card">
                <h2 class="text-center mb-4">Admin Login</h2>
                <form id="admin-login-form">
                    <div class="mb-4">
                        <label style="display:block; margin-bottom: 0.5rem">Username</label>
                        <input type="text" name="username" class="input-field" required style="width: 100%; padding: 0.5rem;">
                    </div>
                    <div class="mb-4">
                        <label style="display:block; margin-bottom: 0.5rem">Password</label>
                        <input type="password" name="password" class="input-field" required style="width: 100%; padding: 0.5rem;">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%">Login</button>
                    <div id="error-msg" style="color: red; margin-top: 1rem; text-align: center;"></div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const errorDiv = document.getElementById('error-msg');

        try {
            const res = await api.post('/auth/login', data);
            localStorage.setItem('adminToken', res.token);
            window.router.navigate('/admin/dashboard');
        } catch (err) {
            errorDiv.textContent = err.message;
        }
    });
}
