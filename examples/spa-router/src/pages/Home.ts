import { h, type VNode } from "superapp";
import { routerLink, type PageConfig } from "superapp/router";
import type { Shared } from "../shared";

function featureCard(title: string, desc: string): VNode {
  return h("div", { class: "card bg-base-100 shadow-sm" },
    h("div", { class: "card-body" },
      h("h3", { class: "card-title text-sm" }, title),
      h("p", { class: "text-sm text-base-content/60" }, desc),
    ),
  );
}

export const page: PageConfig<{}, never, Shared, {}> = {
  init: () => ({}),
  update: (model) => model,
  view: (_model, shared) =>
    h("div", {},
      h("div", { class: "hero bg-base-100 rounded-box mb-8" },
        h("div", { class: "hero-content text-center py-16" },
          h("div", { class: "max-w-md" },
            h("h1", { class: "text-4xl font-bold" }, `Welcome to ${shared.appName}`),
            h("p", { class: "py-4 text-base-content/70" },
              "A modern TypeScript framework inspired by Elm and Hyperapp. " +
              "Functional, type-safe, and optimized for performance.",
            ),
            h("div", { class: "flex gap-3 justify-center" },
              h("a", { ...routerLink("/users"), class: "btn btn-primary" }, "Browse Users"),
              h("a", { ...routerLink("/about"), class: "btn btn-outline" }, "Learn More"),
            ),
          ),
        ),
      ),
      h("div", { class: "grid grid-cols-1 md:grid-cols-3 gap-4" },
        featureCard("Virtual DOM", "Keyed reconciliation with head/tail optimization for fast updates."),
        featureCard("Effects & Subs", "Elm-style effects and subscriptions for managing side effects."),
        featureCard("Composition", "Nested TEA with mapDispatch, mapEffect, and mapSub."),
        featureCard("Router", "Built-in SPA router with pattern matching and URL parameters."),
        featureCard("Type Safety", "Full TypeScript — discriminated unions for messages, branded state."),
        featureCard("Time Travel", "Debug mode with state history, go back/forward, jump to any point."),
      ),
    ),
};
