import { h } from "superapp";
import { routerApp, routerLink } from "superapp/router";
import { attachDebugger } from "superapp/debugger";
import { router } from "./generated/router";

// ── Boot ──────────────────────────────────────────────────────
// routerApp() handles all wiring: init, update, view, subscriptions.
// You just provide the router and a layout function.

const instance = routerApp({
  router,
  layout: (content, shared) =>
    h("div", { class: "min-h-screen flex flex-col" },
      // Navbar
      h("nav", { class: "navbar bg-base-100 shadow-sm sticky top-0 z-50 px-4" },
        h("div", { class: "flex-1" },
          h("a", { ...routerLink("/"), class: "btn btn-ghost text-xl font-bold text-primary" }, shared.appName),
        ),
        h("div", { class: "flex gap-1" },
          h("a", { ...routerLink("/"), class: "btn btn-sm btn-ghost" }, "Home"),
          h("a", { ...routerLink("/about"), class: "btn btn-sm btn-ghost" }, "About"),
          h("a", { ...routerLink("/users"), class: "btn btn-sm btn-ghost" }, "Users"),
        ),
      ),
      // Page content (rendered by the router)
      h("main", { class: "flex-1 container mx-auto p-6 max-w-4xl" }, content),
      // Footer
      h("footer", { class: "footer footer-center p-4 bg-base-100 text-base-content/60 text-sm" },
        h("p", {}, `Built with ${shared.appName}`),
      ),
    ),
  node: document.getElementById("app")!,
  debug: true,
});

attachDebugger(instance);
