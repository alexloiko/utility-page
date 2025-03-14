class Router {
    constructor(routes) {
        this.routes = routes;
        this.defaultRoute = routes[0];
        this.currentCleanup = null;
        
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }

    handleRoute() {
        const hash = window.location.hash || `#${this.defaultRoute.path}`;
        const route = this.routes.find(route => hash.startsWith(`#${route.path}`)) || this.defaultRoute;
        
        // Track page view
        if (window.gtag) {
            gtag('event', 'page_view', {
                page_title: route.path.slice(1),
                page_path: route.path
            });
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${route.path}`) {
                link.classList.add('active');
            }
        });

        // Clean up previous component if needed
        if (this.currentCleanup) {
            this.currentCleanup();
            this.currentCleanup = null;
        }

        // Run the component and store its cleanup if it returns one
        const cleanup = route.component();
        if (typeof cleanup === 'function') {
            this.currentCleanup = cleanup;
        }
    }
} 