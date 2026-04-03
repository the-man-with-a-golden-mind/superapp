# The Elm Architecture in SuperApp

SuperApp implements The Elm Architecture (TEA), a pattern for building web applications using unidirectional data flow. Every SuperApp application is driven by three things: **State**, **Update**, and **View**.

## The Cycle

```
                    ┌──────────────────────────────┐
                    │                              │
                    v                              │
              ┌──────────┐                         │
              │  State   │                         │
              └────┬─────┘                         │
                   │                               │
                   v                               │
              ┌──────────┐      ┌──────────┐       │
              │   View   │─────>│   DOM    │       │
              └──────────┘      └────┬─────┘       │
                                     │             │
                                 user event        │
                                     │             │
                                     v             │
                                ┌─────────┐        │
                                │   Msg   │        │
                                └────┬────┘        │
                                     │             │
                                     v             │
              ┌──────────┐      ┌──────────┐       │
              │ Effects  │<─────│  Update  │───────┘
              └────┬─────┘      └──────────┘
                   │
                   v
              ┌──────────┐
              │ External │  (HTTP, timers, storage, ...)
              │  World   │───> dispatches Msg back into Update
              └──────────┘
```

## State

State is a plain, immutable TypeScript object. It is the single source of truth for your entire application.

```ts
interface State {
  count: number;
  loading: boolean;
  items: Item[];
}

const init: State = { count: 0, loading: false, items: [] };
```

When debug mode is enabled, state is deeply frozen after every update to catch accidental mutations.

### Init

The initial state can be a plain value or a `[State, Cmd<Msg>]` tuple to run effects at startup:

```ts
// Plain state
const init: State = { count: 0 };

// State with initial effects (e.g., load from localStorage)
const init: [State, Cmd<Msg>] = [
  { count: 0, items: [] },
  [storageGet("items", (raw) => ({ tag: "LoadedItems", raw }))],
];
```

## Messages (Msg)

Messages are discriminated unions that describe what happened. Every state change is triggered by a message.

```ts
type Msg =
  | { tag: "Inc" }
  | { tag: "Dec" }
  | { tag: "SetInput"; value: string }
  | { tag: "GotData"; data: Item[] }
  | { tag: "FetchFailed"; error: string };
```

Using discriminated unions with a `tag` field gives you exhaustive pattern matching in `switch` statements and full type safety.

## Update

The update function is a pure function: `(State, Msg) -> State | [State, Cmd<Msg>]`.

- Return just the new state when no side effects are needed.
- Return `[state, effects]` when side effects should run after the update.

```ts
function update(state: State, msg: Msg): State | [State, Cmd<Msg>] {
  switch (msg.tag) {
    case "Inc":
      return { ...state, count: state.count + 1 };

    case "FetchItems":
      return withFx(
        { ...state, loading: true },
        http({
          url: "/api/items",
          onOk: (data) => ({ tag: "GotData", data }),
          onError: (err) => ({ tag: "FetchFailed", error: err }),
        }),
      );

    case "GotData":
      return { ...state, loading: false, items: msg.data };
  }
}
```

### Helpers

| Helper | Signature | Description |
|--------|-----------|-------------|
| `noFx(state)` | `S -> [S, []]` | Return state with no effects |
| `withFx(state, ...effects)` | `(S, ...Effect<Msg>[]) -> [S, Effect<Msg>[]]` | Return state with effects |
| `batch(commands)` | `Cmd<Msg>[] -> Cmd<Msg>` | Merge multiple command arrays |
| `none` | `[]` | Empty command constant |

## Effects

Effects are `[EffectFn, props]` tuples. They are **data**, not imperative calls. The runtime executes them after the state update completes.

```ts
type Effect<Msg> = readonly [EffectFn<Msg, any>, any];
type EffectFn<Msg, P> = (dispatch: Dispatch<Msg>, props: P) => void;
```

Built-in effects: `http`, `delay`, `navigate`, `storageSet`, `storageGet`, `log`, `dispatchMsg`.

Effects dispatch messages back into the update cycle when their async work completes. This keeps the update function pure -- it never performs I/O directly.

### Creating Custom Effects

```ts
function geolocationFx<Msg>(
  dispatch: Dispatch<Msg>,
  props: { onSuccess: (lat: number, lng: number) => Msg; onError: (err: string) => Msg },
): void {
  navigator.geolocation.getCurrentPosition(
    (pos) => dispatch(props.onSuccess(pos.coords.latitude, pos.coords.longitude)),
    (err) => dispatch(props.onError(err.message)),
  );
}

export function getLocation<Msg>(
  onSuccess: (lat: number, lng: number) => Msg,
  onError: (err: string) => Msg,
): Effect<Msg> {
  return [geolocationFx, { onSuccess, onError }];
}
```

## Subscriptions

Subscriptions are declarative event sources. You declare which events you want based on the current state, and the runtime manages subscribing/unsubscribing automatically.

```ts
type Sub<Msg> = readonly [SubFn<Msg, any>, any] | false | null | undefined;
type SubFn<Msg, P> = (dispatch: Dispatch<Msg>, props: P) => () => void;
```

The `subscriptions` function returns an array. Falsy values are ignored (allowing conditional subscriptions).

```ts
function subscriptions(state: State): Sub<Msg>[] {
  return [
    // Always active
    onKeyDown((key) => ({ tag: "KeyPressed", key })),

    // Conditional -- only active when state.auto is true
    state.auto && interval(1000, { tag: "Tick" }),

    // Conditional WebSocket
    state.connected && websocket({
      url: "wss://api.example.com/ws",
      onMessage: (data) => ({ tag: "WsMessage", data }),
    }),
  ];
}
```

When the state changes, the runtime diffs the old subscription list against the new one. If a subscription's runner function or non-function props changed, the old one is torn down and a new one starts. If nothing changed, the existing subscription is kept alive.

### Creating Custom Subscriptions

```ts
function visibilitySub<Msg>(
  dispatch: Dispatch<Msg>,
  props: { msg: (visible: boolean) => Msg },
): () => void {
  const handler = () => dispatch(props.msg(!document.hidden));
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}

export function onVisibilityChange<Msg>(
  msg: (visible: boolean) => Msg,
): Sub<Msg> {
  return [visibilitySub, { msg }];
}
```

## View

The view is a pure function: `(State, Dispatch<Msg>) -> VNode`.

It produces a virtual DOM tree. The runtime diffs it against the previous tree and patches the real DOM.

```ts
function view(state: State, dispatch: Dispatch<Msg>): VNode {
  return h("div", {},
    h("h1", {}, String(state.count)),
    h("button", { onClick: () => dispatch({ tag: "Inc" }) }, "+"),
  );
}
```

### VDOM Reconciliation

SuperApp uses a keyed VDOM reconciliation algorithm with head/tail optimization:

1. Match children from the head of both old and new lists
2. Match children from the tail
3. Handle insertions, removals, and moves for remaining children using a key map

Provide `key` props on list items for optimal performance:

```ts
state.items.map((item) =>
  h("li", { key: item.id }, item.name),
)
```

## AppInstance

`app()` returns an `AppInstance` with methods for programmatic control:

```ts
interface AppInstance<S, Msg> {
  dispatch: Dispatch<Msg>;       // Send messages programmatically
  getState: () => Readonly<S>;   // Read current state
  destroy: () => void;           // Tear down the app
  getHistory: () => readonly Readonly<S>[];  // State history (debug mode)
  getHistoryIndex: () => number;
  goBack: () => void;            // Time-travel back
  goForward: () => void;         // Time-travel forward
  jumpTo: (index: number) => void;
}
```

## Debug Mode

Enable with `debug: true` or a config object:

```ts
app({
  // ...
  debug: { console: true, history: true, maxHistory: 200 },
});
```

- `console: true` -- Log every message with prev/next state to the console
- `history: true` -- Record state history for time-travel
- `maxHistory` -- Maximum number of states to keep (default: 200)

Combine with `attachDebugger` for a visual overlay:

```ts
import { attachDebugger } from "superapp/debugger";
const instance = app({ /* ... */ debug: true });
attachDebugger(instance, { position: "bottom-right" });
```

## Composition (Nested TEA)

For larger applications, split logic into child modules that each export their own `State`, `Msg`, `init`, `update`, `view`, and `subscriptions`. The parent composes them using mapping functions:

| Function | Purpose |
|----------|---------|
| `mapDispatch(dispatch, fn)` | Wrap child dispatch to produce parent messages |
| `mapEffect(effect, fn)` | Wrap child effects to produce parent messages |
| `mapSub(sub, fn)` | Wrap child subscriptions to produce parent messages |
| `batchSubs(...subs)` | Merge subscription arrays from multiple children |

See `examples/nested-tea/` for a complete working example.
