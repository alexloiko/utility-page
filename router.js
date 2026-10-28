// Minimal hash router. A route is { path, component } or { path, redirect }.
// A component renders into #content and may return a cleanup function.
class Router {
    constructor(routes) {
        this.routes = routes;
        this.defaultRoute = routes.find((r) => r.default) || routes[0];
        this.currentRoute = null;
        this.currentCleanup = null;

        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }

    resolve(hash) {
        return this.routes.find((r) => hash === `#${r.path}` || hash.startsWith(`#${r.path}/`) || hash.startsWith(`#${r.path}?`))
            || this.defaultRoute;
    }

    handleRoute() {
        if (!window.location.hash) {
            window.location.replace(`#${this.defaultRoute.path}`);
            return;
        }
        const route = this.resolve(window.location.hash);
        if (route.redirect) {
            window.location.replace(`#${route.redirect}`);
            return;
        }

        if (window.gtag) {
            gtag('event', 'page_view', { page_title: route.path.slice(1), page_path: route.path });
        }

        document.querySelectorAll('.nav-link').forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${route.path}`);
        });

        if (this.currentCleanup) {
            this.currentCleanup();
            this.currentCleanup = null;
        }

        this.currentRoute = route;
        const cleanup = route.component();
        this.currentCleanup = typeof cleanup === 'function' ? cleanup : null;
        this.focusPrimaryInput();
    }

    // Desktop only: on touch devices this would pop the keyboard on every navigation.
    focusPrimaryInput() {
        if (!window.matchMedia('(pointer: fine)').matches) return;
        const el = document.querySelector('#content [data-autofocus]');
        if (el) el.focus({ preventScroll: true });
    }

    reload() {
        this.handleRoute();
    }
}
