import { app, h, withFx, type Dispatch, type Sub } from "superapp";
import { delay } from "superapp/fx";
import { interval } from "superapp/subs";
import { attachDebugger } from "superapp/debugger";

// ── State ──────────────────────────────────────────────────────

interface State {
  count: number;
  auto: boolean;
}

type Msg =
  | { tag: "Inc" }
  | { tag: "Dec" }
  | { tag: "DelayedInc" }
  | { tag: "ToggleAuto" }
  | { tag: "Reset" };

const init: State = { count: 0, auto: false };

// ── Update ─────────────────────────────────────────────────────

function update(state: Readonly<State>, msg: Msg) {
  switch (msg.tag) {
    case "Inc":
      return { ...state, count: state.count + 1 };
    case "Dec":
      return { ...state, count: state.count - 1 };
    case "DelayedInc":
      return withFx<State, Msg>(state, delay(500, { tag: "Inc" }));
    case "ToggleAuto":
      return { ...state, auto: !state.auto };
    case "Reset":
      return { count: 0, auto: false };
  }
}

// ── Subscriptions ──────────────────────────────────────────────

function subscriptions(state: Readonly<State>): Sub<Msg>[] {
  return [state.auto && interval<Msg>(1000, { tag: "Inc" })];
}

// ── View ───────────────────────────────────────────────────────

function view(state: Readonly<State>, dispatch: Dispatch<Msg>) {
  return h("div", { class: "card bg-base-100 shadow-xl max-w-md mx-auto mt-16" },
    h("div", { class: "card-body items-center text-center" },
      h("h1", { class: "card-title text-2xl font-bold" }, "Counter"),
      h("p", { class: "text-base-content/60 text-sm mb-4" }, "Effects & subscriptions demo"),

      h("div", { class: "text-7xl font-extralight tabular-nums my-4" }, String(state.count)),

      h("div", { class: "flex gap-2 flex-wrap justify-center" },
        h("button", {
          class: "btn btn-outline btn-sm",
          onClick: () => dispatch({ tag: "Dec" }),
        }, "\u2212 1"),
        h("button", {
          class: "btn btn-outline btn-sm",
          onClick: () => dispatch({ tag: "Inc" }),
        }, "+ 1"),
        h("button", {
          class: "btn btn-outline btn-sm",
          onClick: () => dispatch({ tag: "DelayedInc" }),
        }, "+1 (500ms)"),
      ),

      h("div", { class: "flex gap-2 flex-wrap justify-center mt-2" },
        h("button", {
          class: state.auto ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm",
          onClick: () => dispatch({ tag: "ToggleAuto" }),
        }, state.auto ? "Stop" : "Auto +1/s"),
        h("button", {
          class: "btn btn-ghost btn-sm",
          onClick: () => dispatch({ tag: "Reset" }),
        }, "Reset"),
      ),

      state.auto
        ? h("div", { class: "mt-4" },
            h("span", { class: "badge badge-primary" }, "AUTO"),
          )
        : null,
    ),
  );
}

// ── Boot ───────────────────────────────────────────────────────

const instance = app<State, Msg>({
  init,
  update,
  view,
  subscriptions,
  node: document.getElementById("app")!,
  debug: true,
});

attachDebugger(instance);
