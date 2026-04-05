import { h, type VNode } from "superapp";
import { routerLink, type PageConfig } from "superapp/router";
import type { Shared } from "../../shared";
import { USERS, userColor } from "./_users";

// ── Types ─────────────────────────────────────────────────────

interface Model {
  id: string;
  compact: boolean;
  visits: number;
  mountedAt: string | null;
}

type Msg =
  | { tag: "ToggleCompact" }
  | { tag: "Mounted"; at: string };

// ── Helpers ───────────────────────────────────────────────────

function statItem(label: string, value: string): VNode {
  return h("div", { class: "stat" },
    h("div", { class: "stat-title" }, label),
    h("div", { class: "stat-value text-primary" }, value),
  );
}

// ── Page ──────────────────────────────────────────────────────

export const page: PageConfig<Model, Msg, Shared, { id: string }> = {
  init: (params) => ({ id: params.id, compact: false, visits: 1, mountedAt: null }),
  update: (model, msg) => {
    switch (msg.tag) {
      case "ToggleCompact":
        return { ...model, compact: !model.compact };
      case "Mounted":
        return { ...model, mountedAt: msg.at };
    }
  },

  onMount: ({ dispatch, model, root }) => {
    root.querySelector<HTMLButtonElement>("#profile-compact-toggle")?.focus();
    const activeUser = USERS.find((user) => user.id === model.id);
    if (activeUser) document.title = `${activeUser.name} · SuperApp`;
    dispatch({ tag: "Mounted", at: new Date().toLocaleTimeString() });
  },

  afterUpdate: ({ model, prevModel, root }) => {
    if (model.compact !== prevModel.compact) {
      root.dataset.view = model.compact ? "compact" : "full";
    }
    const activeUser = USERS.find((user) => user.id === model.id);
    if (activeUser) document.title = `${activeUser.name} · SuperApp`;
  },

  onUnmount: ({ shared }) => {
    document.title = shared.appName;
  },

  view: (model, shared, dispatch) => {
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
          h("div", { class: "flex flex-wrap justify-between gap-3 mb-4" },
            h("div", {},
              h("h1", { class: "text-2xl font-bold" }, user.name),
              h("p", { class: "text-base-content/60" }, "This page uses onMount, afterUpdate, onUnmount, save/load."),
            ),
            h("button", {
              id: "profile-compact-toggle",
              class: model.compact ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm",
              onClick: () => dispatch({ tag: "ToggleCompact" }),
            }, model.compact ? "Compact On" : "Compact Off"),
          ),
          h("div", { class: "flex items-center gap-6 mb-6" },
            h("div", {
              class: "w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl shrink-0",
              style: { background: userColor(user.id) },
            }, user.name[0]),
            h("div", {},
              h("p", { class: "text-base-content/60" }, user.role),
              h("div", { class: "flex gap-2 mt-2" },
                h("span", { class: "badge badge-primary" }, `ID: ${user.id}`),
                h("span", { class: "badge badge-ghost" }, `${user.projects} projects`),
              ),
            ),
          ),
          h("div", { class: "alert alert-info mb-6" },
            h("span", {},
              `Mounted at ${model.mountedAt ?? "pending"} · cached visits ${model.visits} · layout ${model.compact ? "compact" : "full"} · ${shared.appName}`,
            ),
          ),
          h("div", { class: "stats shadow w-full" },
            statItem("Projects", String(user.projects)),
            statItem("Commits", String(user.projects * 47)),
            statItem("Reviews", String(user.projects * 12)),
          ),
          model.compact
            ? h("p", { class: "text-sm text-base-content/60 mt-4" },
                "afterUpdate toggles a data attribute on the page root after the DOM commit.",
              )
            : h("div", { class: "mockup-code mt-4 text-sm" },
                h("pre", {}, h("code", {}, "save() keeps compact mode in cache")),
                h("pre", {}, h("code", {}, "load() restores it and bumps visit count")),
              ),
        ),
      ),
    );
  },

  // Cache page state when navigating away — restore on back
  save: (model) => ({ compact: model.compact, visits: model.visits }),
  load: (saved, params) => {
    const cached = saved as Pick<Model, "compact" | "visits">;
    return {
      id: params.id,
      compact: cached.compact,
      visits: cached.visits + 1,
      mountedAt: null,
    };
  },
};
