import { h, type VNode } from "superapp";
import { routerLink, type PageConfig } from "superapp/router";
import type { Shared } from "../../shared";
import { USERS, userColor } from "./Index";

// ── Types ─────────────────────────────────────────────────────

interface Model {
  id: string;
}

// ── Helpers ───────────────────────────────────────────────────

function statItem(label: string, value: string): VNode {
  return h("div", { class: "stat" },
    h("div", { class: "stat-title" }, label),
    h("div", { class: "stat-value text-primary" }, value),
  );
}

// ── Page ──────────────────────────────────────────────────────

export const page: PageConfig<Model, never, Shared, { id: string }> = {
  init: (params) => ({ id: params.id }),
  update: (model) => model,

  view: (model) => {
    const user = USERS.find(u => u.id === model.id);

    if (!user) {
      return h("div", { class: "text-center py-16" },
        h("div", { class: "text-6xl mb-4" }, "?"),
        h("h1", { class: "text-2xl font-bold mb-2" }, "User Not Found"),
        h("p", { class: "text-base-content/60 mb-4" }, `No user with ID "${model.id}"`),
        h("a", { ...routerLink("/users"), class: "btn btn-primary" }, "Back to Users"),
      );
    }

    return h("div", {},
      // Breadcrumbs
      h("div", { class: "breadcrumbs text-sm mb-6" },
        h("ul", {},
          h("li", {}, h("a", { ...routerLink("/users") }, "Users")),
          h("li", {}, user.name),
        ),
      ),
      // Profile card
      h("div", { class: "card bg-base-100 shadow-sm" },
        h("div", { class: "card-body" },
          h("div", { class: "flex items-center gap-6 mb-6" },
            h("div", {
              class: "w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl shrink-0",
              style: { background: userColor(user.id) },
            }, user.name[0]),
            h("div", {},
              h("h1", { class: "text-2xl font-bold" }, user.name),
              h("p", { class: "text-base-content/60" }, user.role),
              h("div", { class: "flex gap-2 mt-2" },
                h("span", { class: "badge badge-primary" }, `ID: ${user.id}`),
                h("span", { class: "badge badge-ghost" }, `${user.projects} projects`),
              ),
            ),
          ),
          h("div", { class: "stats shadow w-full" },
            statItem("Projects", String(user.projects)),
            statItem("Commits", String(user.projects * 47)),
            statItem("Reviews", String(user.projects * 12)),
          ),
        ),
      ),
    );
  },

  // Cache page state when navigating away — restore on back
  save: (model) => model,
  load: (saved) => saved as Model,
};
