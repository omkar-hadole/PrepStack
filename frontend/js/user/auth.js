import api from '/js/api.js';

export default function renderAuth(params, root) {
    const isRegister = window.location.pathname === '/register';

    root.innerHTML = `
        <div class="container mt-5" style="max-width: 400px;">
            <div class="card p-4 shadow-sm">
                <h2 class="text-center mb-4">${isRegister ? 'Create Account' : 'Welcome Back'}</h2>
                
                <form id="auth-form">
                    ${isRegister ? `
                        <div class="mb-3">
                            <label class="form-label">Full Name</label>
                            <input type="text" id="name" class="form-control" required placeholder="John Doe">
                        </div>
                    ` : ''}
                    
                    <div class="mb-3">
                        <label class="form-label">Email Address</label>
                        <input type="email" id="email" class="form-control" required placeholder="name@example.com">
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Password</label>
                        <input type="password" id="password" class="form-control" required placeholder="••••••••">
                    </div>

                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        ${isRegister ? 'Sign Up' : 'Log In'}
                    </button>

                    <div style="margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary);">
                        <hr style="flex: 1; border-top: 1px solid #e5e7eb;">
                        <span style="font-size: 0.8rem;">OR</span>
                        <hr style="flex: 1; border-top: 1px solid #e5e7eb;">
                    </div>

                    <div id="g_id_onload"
                        data-client_id="${import.meta.env.VITE_GOOGLE_CLIENT_ID}"
                        data-context="signup"
                        data-ux_mode="popup"
                        data-callback="handleGoogleCredentialResponse"
                        data-auto_prompt="false">
                    </div>

                    <div class="g_id_signin"
                        data-type="standard"
                        data-shape="rectangular"
                        data-theme="outline"
                        data-text="continue_with"
                        data-size="large"
                        data-logo_alignment="left"
                        data-width="350">
                    </div>

                </form>

                <p class="text-center mt-3" style="font-size: 0.9rem;">
                    ${isRegister ? 'Already have an account?' : "Don't have an account?"} 
                    <a href="${isRegister ? '/login' : '/register'}" data-link>
                        ${isRegister ? 'Log In' : 'Sign Up'}
                    </a>
                </p>
            </div>
        </div>
    `;


    if (!document.getElementById('google-client-script')) {
        const script = document.createElement('script');
        script.src = "https://accounts.google.com/gsi/client";
        script.id = "google-client-script";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    }


    window.handleGoogleCredentialResponse = async (response) => {
        try {
            const data = await api.post('/auth/google', { credential: response.credential });
            localStorage.setItem('prepstack_token', data.token);
            localStorage.setItem('prepstack_user', JSON.stringify(data.user));
            window.router.navigate('/courses');
        } catch (err) {
            alert(err.message || 'Google Authentication failed');
        }
    };

    document.getElementById('auth-form').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = isRegister ? document.getElementById('name').value : undefined;

        try {
            const endpoint = isRegister ? '/auth/register' : '/auth/user/login';
            const payload = isRegister ? { name, email, password } : { email, password };

            console.log('LOGIN URL:', `${import.meta.env.VITE_API_URL}/api${endpoint}`);
            console.log('Payload:', payload);

            const data = await api.post(endpoint, payload);

            localStorage.setItem('prepstack_token', data.token);
            localStorage.setItem('prepstack_user', JSON.stringify(data.user));

            window.router.navigate('/courses');
        } catch (err) {
            alert(err.message || 'Authentication failed');
        }
    };
}
