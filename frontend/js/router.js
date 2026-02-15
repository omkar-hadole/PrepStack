export default class Router {
    constructor(routes) {
        this.routes = routes;
        this.root = document.getElementById('app');

        window.addEventListener('popstate', () => this.handleRoute());

        document.body.addEventListener('click', e => {
            if (e.target.matches('[data-link]')) {
                e.preventDefault();
                this.navigate(e.target.href);
            } else if (e.target.parentElement?.matches('[data-link]')) {
                e.preventDefault();
                this.navigate(e.target.parentElement.href);
            }
        });

        this.handleRoute();
    }

    async handleRoute() {
        const path = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);

        let match = null;
        let params = {};

        for (const routePath in this.routes) {
            const keys = [];
            const regexPath = routePath.replace(/:([^\/]+)/g, (_, key) => {
                keys.push(key);
                return '([^\\/]+)';
            });

            const regex = new RegExp(`^${regexPath}$`);
            const result = path.match(regex);

            if (result) {
                keys.forEach((key, i) => {
                    params[key] = result[i + 1];
                });
                match = this.routes[routePath];
                break;
            }
        }

        if (match) {
            this.root.innerHTML = '';
            await match(params, this.root);
        } else {
            console.log('404 Not Found', path);
            this.root.innerHTML = '<div class="container mt-4"><h1>404 - Page Not Found</h1></div>';
        }
    }

    navigate(url) {
        history.pushState(null, null, url);
        this.handleRoute();
    }
}
