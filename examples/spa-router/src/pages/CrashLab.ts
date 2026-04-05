import { h } from "superapp";
import { routerLink, type PageConfig } from "superapp/router";
import type { Shared } from "../shared";

interface Model {
  shouldCrash: boolean;
  recoveryCount: number;
}

type Msg =
  | { tag: "Crash" }
  | { tag: "Recover" };

export const page: PageConfig<Model, Msg, Shared, {}> = {
  init: () => ({ shouldCrash: false, recoveryCount: 0 }),

  update: (model, msg) => {
    switch (msg.tag) {
      case "Crash":
        return { ...model, shouldCrash: true };
      case "Recover":
        return { shouldCrash: false, recoveryCount: model.recoveryCount + 1 };
    }
  },

  view: (model, _shared, dispatch) => {
    if (model.shouldCrash) {
      throw new Error("Intentional page crash from Crash Lab");
    }

    return h("div", { class: "space-y-6" },
      h("div", {},
        h("h1", { class: "text-3xl font-bold mb-2" }, "Crash Lab"),
        h("p", { class: "text-base-content/70 max-w-prose" },
          "This page demonstrates the page-level error boundary. Trigger a crash, then recover without losing the whole app shell.",
        ),
      ),
      h("div", { class: "card bg-base-100 shadow-sm" },
        h("div", { class: "card-body gap-4" },
          h("div", { class: "stats shadow" },
            h("div", { class: "stat" },
              h("div", { class: "stat-title" }, "Recoveries"),
              h("div", { class: "stat-value text-primary" }, String(model.recoveryCount)),
            ),
          ),
          h("div", { class: "flex flex-wrap gap-3" },
            h("button", {
              class: "btn btn-error",
              onClick: () => dispatch({ tag: "Crash" }),
            }, "Crash This Page"),
            h("a", { ...routerLink("/") , class: "btn btn-outline" }, "Back Home"),
          ),
        ),
      ),
    );
  },

  onError: ({ error, phase }) => {
    console.warn(`[CrashLab] ${phase}`, error);
  },

  errorView: ({ error, dispatch }) =>
    h("div", { class: "card bg-base-100 shadow-sm border border-error/30" },
      h("div", { class: "card-body gap-4" },
        h("div", { class: "badge badge-error badge-outline w-fit" }, "Recovered by error boundary"),
        h("h1", { class: "text-2xl font-bold" }, "Page crashed, shell stayed alive"),
        h("p", { class: "text-base-content/70" }, String(error)),
        h("div", { class: "flex flex-wrap gap-3" },
          h("button", {
            class: "btn btn-primary",
            onClick: () => dispatch({ tag: "Recover" }),
          }, "Recover Page"),
          h("a", { ...routerLink("/about"), class: "btn btn-ghost" }, "Read About Hooks"),
        ),
      ),
    ),
};
