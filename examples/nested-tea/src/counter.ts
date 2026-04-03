// counter.ts — Self-contained Counter module
// Exports State, Msg, init, update, view, subscriptions
// The parent composes this via mapDispatch / mapEffect / mapSub

import { h, withFx, type Dispatch, type Sub, type UpdateResult } from "superapp";
import { delay } from "superapp/fx";
import { interval } from "superapp/subs";

// ── State ────────────────────────────────────────────────
export interface State {
  value: number;
  auto: boolean;
}

export type Msg =
  | { tag: "Inc" }
  | { tag: "Dec" }
  | { tag: "ToggleAuto" }
  | { tag: "DelayedInc" };

export const init: State = { value: 0, auto: false };

// ── Update ───────────────────────────────────────────────
export function update(state: Readonly<State>, msg: Msg): UpdateResult<State, Msg> {
  switch (msg.tag) {
    case "Inc": return { ...state, value: state.value + 1 };
    case "Dec": return { ...state, value: state.value - 1 };
    case "ToggleAuto": return { ...state, auto: !state.auto };
    case "DelayedInc": return withFx<State, Msg>(state, delay(500, { tag: "Inc" }));
  }
}

// ── Subscriptions ────────────────────────────────────────
export function subscriptions(state: Readonly<State>): Sub<Msg>[] {
  return [state.auto && interval<Msg>(1000, { tag: "Inc" })];
}

// ── View ─────────────────────────────────────────────────
export function view(state: Readonly<State>, dispatch: Dispatch<Msg>) {
  return h("div", { class: "card bg-base-100 shadow-md" },
    h("div", { class: "card-body items-center text-center" },
      h("div", { class: "text-5xl font-extralight tabular-nums my-2" }, String(state.value)),
      state.auto
        ? h("span", { class: "badge badge-primary badge-sm mb-3" }, "AUTO")
        : h("span", { class: "badge badge-ghost badge-sm mb-3 opacity-0" }, "."),
      h("div", { class: "flex gap-2 flex-wrap justify-center" },
        h("button", { class: "btn btn-outline btn-sm", onClick: () => dispatch({ tag: "Dec" }) }, "-1"),
        h("button", { class: "btn btn-outline btn-sm", onClick: () => dispatch({ tag: "Inc" }) }, "+1"),
        h("button", { class: "btn btn-outline btn-sm", onClick: () => dispatch({ tag: "DelayedInc" }) }, "+1 (delay)"),
      ),
      h("div", { class: "flex gap-2 mt-2" },
        h("button", {
          class: state.auto ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm",
          onClick: () => dispatch({ tag: "ToggleAuto" }),
        }, state.auto ? "Stop" : "Auto +1/s"),
      ),
    ),
  );
}
