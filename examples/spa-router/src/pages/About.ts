import { h, type VNode } from "superapp";
import { routerLink, type PageConfig } from "superapp/router";
import type { Shared } from "../shared";

function stepItem(title: string, desc: string): VNode {
  return h("li", { class: "step step-primary" },
    h("div", { class: "text-left" },
      h("span", { class: "font-semibold" }, title),
      h("span", { class: "text-base-content/60 text-sm block" }, desc),
    ),
  );
}

function moduleRow(name: string, desc: string): VNode {
  return h("tr", {},
    h("td", {}, h("code", { class: "text-primary font-mono text-xs" }, name)),
    h("td", { class: "text-base-content/70" }, desc),
  );
}

export const page: PageConfig<{}, never, Shared, {}> = {
  init: () => ({}),
  update: (model) => model,
  view: (_model, shared) =>
    h("div", {},
      h("h1", { class: "text-3xl font-bold mb-2" }, `About ${shared.appName}`),
      h("p", { class: "text-base-content/70 mb-6 max-w-prose" },
        "SuperApp is a modern TypeScript framework inspired by Elm and Hyperapp. " +
        "It provides a functional, immutable, type-safe architecture for building web apps.",
      ),
      h("div", { class: "card bg-base-100 shadow-sm mb-6" },
        h("div", { class: "card-body" },
          h("h2", { class: "card-title" }, "Architecture"),
          h("p", { class: "text-base-content/70 mb-4" }, "The Elm Architecture (TEA) pattern:"),
          h("ul", { class: "steps steps-vertical" },
            stepItem("State", "Immutable application state — single source of truth"),
            stepItem("View", "Pure function: State → VNode tree"),
            stepItem("Update", "Pure function: (State, Msg) → State | [State, Cmd]"),
            stepItem("Effects", "Side effects run after update — HTTP, timers, storage"),
            stepItem("Subscriptions", "Declarative event sources — intervals, keyboard, WebSocket"),
          ),
        ),
      ),
      h("div", { class: "card bg-base-100 shadow-sm" },
        h("div", { class: "card-body" },
          h("h2", { class: "card-title" }, "Modules"),
          h("div", { class: "overflow-x-auto" },
            h("table", { class: "table table-sm" },
              h("thead", {},
                h("tr", {},
                  h("th", {}, "Import"),
                  h("th", {}, "Description"),
                ),
              ),
              h("tbody", {},
                moduleRow("superapp", "Core: app, h, text, memo, lazy, withFx, mapEffect, mapSub"),
                moduleRow("superapp/fx", "Effects: http, delay, navigate, storageSet/Get, log"),
                moduleRow("superapp/subs", "Subs: interval, onKeyDown, onResize, websocket"),
                moduleRow("superapp/router", "Router: route, createRouter, routerApp, page"),
                moduleRow("superapp/debugger", "Debug: attachDebugger with time-travel"),
              ),
            ),
          ),
        ),
      ),
    ),
};
