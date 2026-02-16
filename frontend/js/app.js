import Router from '/js/router.js';
import { ProgressBar } from '/js/components/ProgressBar.js';

// Helper for lazy loading modules with progress bar
const lazyLoad = async (importFunc) => {
    ProgressBar.start();
    try {
        const module = await importFunc();
        ProgressBar.finish();
        return module;
    } catch (error) {
        ProgressBar.finish();
        console.error('Failed to load module:', error);
        document.getElementById('app').innerHTML = `
            <div class="container text-center mt-4">
                <div class="alert alert-danger">
                    Failed to load content. Please check your connection and reload.
                </div>
                <button class="btn btn-primary" onclick="window.location.reload()">Reload</button>
            </div>
        `;
        throw error;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ProgressBar.init();

    const routes = {
        '/': (params, root) => {
            root.innerHTML = `
                <div class="container text-center" style="padding-top: 4rem;">
                    <h1>Welcome to PrepStack</h1>
                    <p class="mb-4">Select your path</p>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <a href="/courses" class="btn btn-primary" data-link>Browse Courses</a>
                        <a href="/admin" class="btn btn-secondary" data-link>Admin Login</a>
                    </div>
                </div>
            `;
        },
        '/admin': (params, root) => {
            lazyLoad(() => import('/js/admin/login.js')).then(module => module.default(params, root));
        },
        '/admin/dashboard': (params, root) => {
            lazyLoad(() => import('/js/admin/dashboard.js')).then(module => module.default(params, root));
        },
        '/admin/quiz/:id': (params, root) => {
            lazyLoad(() => import('/js/admin/quizDetails.js')).then(module => module.default(params, root));
        },
        '/login': (params, root) => {
            lazyLoad(() => import('/js/user/auth.js')).then(module => module.default(params, root));
        },
        '/register': (params, root) => {
            lazyLoad(() => import('/js/user/auth.js')).then(module => module.default(params, root));
        },
        '/courses': (params, root) => {
            if (!localStorage.getItem('prepstack_token')) {
                window.router.navigate('/login');
                return;
            }
            lazyLoad(() => import('/js/user/browse.js')).then(module => module.default(params, root));
        },
        '/attempt/:id': (params, root) => {
            if (!localStorage.getItem('prepstack_token')) {
                window.router.navigate('/login');
                return;
            }
            lazyLoad(() => import('/js/user/attempt.js')).then(module => module.default(params, root));
        },
        '/review/:id': (params, root) => {
            if (!localStorage.getItem('prepstack_token')) {
                window.router.navigate('/login');
                return;
            }
            lazyLoad(() => import('/js/user/review.js')).then(module => module.default(params, root));
        }
    };

    window.router = new Router(routes);
});
