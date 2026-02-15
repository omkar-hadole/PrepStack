import Router from '/js/router.js';
import renderAdminLogin from '/js/admin/login.js';




document.addEventListener('DOMContentLoaded', () => {
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
        '/admin': renderAdminLogin,
        '/admin/dashboard': (params, root) => {
            
            import('/js/admin/dashboard.js').then(module => {
                module.default(params, root);
            });
        },
        '/admin/quiz/:id': (params, root) => {
            import('/js/admin/quizDetails.js').then(module => {
                module.default(params, root);
            });
        },
        '/login': (params, root) => {
            import('/js/user/auth.js').then(module => {
                module.default(params, root);
            });
        },
        '/register': (params, root) => {
            import('/js/user/auth.js').then(module => {
                module.default(params, root);
            });
        },
        '/courses': (params, root) => {
            if (!localStorage.getItem('prepstack_token')) {
                window.router.navigate('/login');
                return;
            }
            import('/js/user/browse.js').then(module => {
                module.default(params, root);
            });
        },
        '/attempt/:id': (params, root) => {
            if (!localStorage.getItem('prepstack_token')) {
                window.router.navigate('/login');
                return;
            }
            import('/js/user/attempt.js').then(module => {
                module.default(params, root);
            });
        },
        '/review/:id': (params, root) => {
            if (!localStorage.getItem('prepstack_token')) {
                window.router.navigate('/login');
                return;
            }
            import('/js/user/review.js').then(module => {
                module.default(params, root);
            });
        }
    };

    window.router = new Router(routes);
});
