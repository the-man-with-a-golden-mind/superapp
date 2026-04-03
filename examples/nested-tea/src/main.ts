// main.ts — Parent app composing two Counter instances
// Demonstrates Elm-style nested TEA via mapDispatch / mapEffect / mapSub

import {
  app, h, mapDispatch, mapEffect, mapSub, none,
  type Dispatch, type Effect, type Sub, type UpdateResult,
} from "superapp";
import { attachDebugger } from "superapp/debugger";
import * as Counter from "./counter";

// ── State ────────────────────────────────────────────────

interface State {
  counterA: Counter.State;
  counterB: Counter.State;
}

type Msg =
  | { tag: "CounterA"; msg: Counter.Msg }
  | { tag: "CounterB"; msg: Counter.Msg }
  | { tag: "ResetAll" };

const init: State = { counterA: Counter.init, counterB: Counter.init };

// ── Update ───────────────────────────────────────────────

function update(state: Readonly<State>, msg: Msg): UpdateResult<State, Msg> {
  switch (msg.tag) {
    case "CounterA": {
      const result = Counter.update(state.counterA, msg.msg);
      if (Array.isArray(result)) {
        const [childState, childCmd] = result;
        return [
          { ...state, counterA: childState },
          childCmd.map((fx: Effect<Counter.Msg>) => mapEffect(fx, (m: Counter.Msg): Msg => ({ tag: "CounterA", msg: m }))),
        ];
      }
      return { ...state, counterA: result as Counter.State };
    }
    case "CounterB": {
      const result = Counter.update(state.counterB, msg.msg);
      if (Array.isArray(result)) {
        const [childState, childCmd] = result;
        return [
          { ...state, counterB: childState },
          childCmd.map((fx: Effect<Counter.Msg>) => mapEffect(fx, (m: Counter.Msg): Msg => ({ tag: "CounterB", msg: m }))),
        ];
      }
      return { ...state, counterB: result as Counter.State };
    }
    case "ResetAll":
      return { counterA: Counter.init, counterB: Counter.init };
  }
}

// ── Subscriptions ────────────────────────────────────────

function subscriptions(state: Readonly<State>): Sub<Msg>[] {
  return [
    ...Counter.subscriptions(state.counterA).map(s =>
      mapSub(s, (m: Counter.Msg): Msg => ({ tag: "CounterA", msg: m })),
    ),
    ...Counter.subscriptions(state.counterB).map(s =>
      mapSub(s, (m: Counter.Msg): Msg => ({ tag: "CounterB", msg: m })),
    ),
  ];
}

// ── View ─────────────────────────────────────────────────

function view(state: Readonly<State>, dispatch: Dispatch<Msg>) {
  const sum = state.counterA.value + state.counterB.value;

  return h("div", { class: "max-w-2xl mx-auto p-6 mt-8" },
    h("h1", { class: "text-3xl font-bold mb-1" }, "Nested TEA"),
    h("p", { class: "text-base-content/60 mb-8" },
      "Two independent counters composed via mapDispatch / mapEffect / mapSub",
    ),

    h("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-6" },
      h("div", null,
        h("div", { class: "text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2" }, "Counter A"),
        Counter.view(
          state.counterA,
          mapDispatch(dispatch, (m: Counter.Msg): Msg => ({ tag: "CounterA", msg: m })),
        ),
      ),
      h("div", null,
        h("div", { class: "text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2" }, "Counter B"),
        Counter.view(
          state.counterB,
          mapDispatch(dispatch, (m: Counter.Msg): Msg => ({ tag: "CounterB", msg: m })),
        ),
      ),
    ),

    h("div", { class: "flex justify-between items-center pt-4" },
      h("span", { class: "badge badge-lg" }, `Total: ${sum}`),
      h("button", {
        class: "btn btn-ghost btn-sm",
        onClick: () => dispatch({ tag: "ResetAll" }),
      }, "Reset All"),
    ),
  );
}

// ── Boot ─────────────────────────────────────────────────

const node = document.getElementById("app")!;

const instance = app<State, Msg>({
  init: [init, none],
  update,
  view,
  subscriptions,
  node,
  debug: true,
});

attachDebugger(instance);
