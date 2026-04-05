import { h } from "superapp";
import { type PageConfig } from "superapp/router";
import type { Shared } from "../../shared";
import { USERS, userCard } from "./_users";

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
        ...USERS.map((user) => userCard(user)),
      ),
    ),
};
