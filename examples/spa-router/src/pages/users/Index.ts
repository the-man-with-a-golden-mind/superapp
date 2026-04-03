import { h, type VNode } from "superapp";
import { routerLink, type PageConfig } from "superapp/router";
import type { Shared } from "../../shared";

// ── Mock data ─────────────────────────────────────────────────

const USERS = [
  { id: "1", name: "Alice Chen", role: "Frontend Lead", projects: 12 },
  { id: "2", name: "Bob Smith", role: "Backend Engineer", projects: 8 },
  { id: "3", name: "Carol Davis", role: "Designer", projects: 15 },
  { id: "4", name: "Dan Wilson", role: "DevOps", projects: 6 },
  { id: "5", name: "Eve Johnson", role: "Full Stack", projects: 10 },
  { id: "6", name: "Frank Brown", role: "Data Engineer", projects: 9 },
];

function userColor(id: string): string {
  return `hsl(${parseInt(id) * 67 % 360}, 55%, 55%)`;
}

export { USERS, userColor };

// ── Page ──────────────────────────────────────────────────────

export const page: PageConfig<{}, never, Shared, {}> = {
  init: () => ({}),
  update: (model) => model,
  view: () =>
    h("div", {},
      h("div", { class: "flex justify-between items-center mb-6" },
        h("div", {},
          h("h1", { class: "text-3xl font-bold" }, "Users"),
          h("p", { class: "text-base-content/60" }, `${USERS.length} team members`),
        ),
      ),
      h("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-4" },
        ...USERS.map(u =>
          h("a", {
            ...routerLink(`/users/${u.id}`),
            class: "card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer no-underline text-inherit",
          },
            h("div", { class: "card-body flex-row items-center gap-4" },
              h("div", {
                class: "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0",
                style: { background: userColor(u.id) },
              }, u.name[0]),
              h("div", { class: "flex-1 min-w-0" },
                h("h3", { class: "font-semibold" }, u.name),
                h("p", { class: "text-sm text-base-content/60" }, u.role),
              ),
              h("div", { class: "badge badge-ghost" }, `${u.projects} projects`),
            ),
          ),
        ),
      ),
    ),
};
