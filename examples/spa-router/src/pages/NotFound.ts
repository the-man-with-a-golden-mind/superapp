import { h } from "superapp";
import { routerLink, type PageConfig } from "superapp/router";
import type { Shared } from "../shared";

export const page: PageConfig<{ path: string }, never, Shared, { path: string }> = {
  init: (params) => ({ path: params.path }),
  update: (model) => model,
  view: (model) =>
    h("div", { class: "text-center py-16" },
      h("div", { class: "text-8xl font-bold text-base-content/10 mb-4" }, "404"),
      h("h1", { class: "text-2xl font-bold mb-2" }, "Page Not Found"),
      h("p", { class: "text-base-content/60 mb-6" }, `The path "${model.path}" doesn't exist.`),
      h("a", { ...routerLink("/"), class: "btn btn-primary" }, "Go Home"),
    ),
};
