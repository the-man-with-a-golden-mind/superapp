# Effects and Subscriptions

SuperApp manages side effects through two mechanisms:

- **Effects** -- One-shot actions triggered by state updates (HTTP requests, timers, navigation)
- **Subscriptions** -- Ongoing event sources managed declaratively based on state (intervals, keyboard, WebSocket)

Both are represented as data (`[function, props]` tuples), not imperative calls. The runtime executes them.

---

## Effects

An effect is a `[EffectFn, props]` tuple returned from the `update` function alongside the new state.

```ts
type Effect<Msg> = readonly [EffectFn<Msg, any>, any];
type EffectFn<Msg, P> = (dispatch: Dispatch<Msg>, props: P) => void;
```

### Returning Effects from Update

Return a `[State, Effect[]]` tuple to trigger effects:

```ts
import { withFx, noFx } from "superapp";

function update(state: State, msg: Msg) {
  switch (msg.tag) {
    case "Save":
      return withFx(state, storageSet("data", JSON.stringify(state.data)));

    case "NoChange":
      return noFx(state);  // equivalent to [state, []]

    case "MultipleEffects":
      return withFx(state,
        storageSet("data", JSON.stringify(state.data)),
        log("Saved!"),
      );

    case "PlainUpdate":
      return { ...state, count: state.count + 1 };  // no effects
  }
}
```

### Built-in Effects

#### http

Fetch a resource via the Fetch API.

```ts
import { http } from "superapp/fx";

http<Msg>({
  url: "/api/users",
  options: { method: "POST", body: JSON.stringify(data) },  // optional RequestInit
  expect: "json",   // "json" (default) or "text"
  onOk: (data) => ({ tag: "GotUsers", users: data }),
  onError: (error) => ({ tag: "FetchFailed", error }),
})
```

- Validates that `url` is a non-empty string
- Non-2xx responses trigger `onError` with `"HTTP {status}"`
- Network errors trigger `onError` with the error message

#### delay

Dispatch a message after a timeout.

```ts
import { delay } from "superapp/fx";

delay<Msg>(500, { tag: "TimerDone" })
// Dispatches { tag: "TimerDone" } after 500ms
```

#### navigate

Push or replace browser history and trigger the router.

```ts
import { navigate } from "superapp/fx";

navigate<Msg>("/users/42")         // pushState
navigate<Msg>("/login", true)      // replaceState
```

Dispatches a `popstate` event after updating history so the router picks up the change.

#### storageSet

Write a string value to localStorage.

```ts
import { storageSet } from "superapp/fx";

storageSet<Msg>("theme", "dark")
```

Silently catches quota-exceeded errors.

#### storageGet

Read from localStorage and dispatch the result.

```ts
import { storageGet } from "superapp/fx";

storageGet<Msg>("theme", (value) => ({ tag: "GotTheme", theme: value }))
// value is string | null
```

#### log

Console.log as an effect. Useful for debugging in update chains.

```ts
import { log } from "superapp/fx";

log<Msg>("current state:", state)
```

#### dispatchMsg

Dispatch a message as an effect. Useful in batched effect lists where you want to trigger another update cycle.

```ts
import { dispatchMsg } from "superapp/fx";

dispatchMsg<Msg>({ tag: "Refresh" })
```

#### compactEffects

Filter out falsy values from an effect list. Useful for conditional effects.

```ts
import { compactEffects } from "superapp/fx";

return withFx(state, ...compactEffects(
  shouldSave && storageSet("data", JSON.stringify(state)),
  shouldLog && log("Updated"),
  http({ url: "/api/sync", onOk: (d) => ({ tag: "Synced", d }), onError: (e) => ({ tag: "Err", e }) }),
));
```

### Creating Custom Effects

An effect is just a `[function, props]` pair. The function receives `dispatch` and the props, performs async work, and dispatches results back.

```ts
import type { Dispatch, Effect } from "superapp";

// 1. Define the effect runner
function clipboardWriteFx<Msg>(
  dispatch: Dispatch<Msg>,
  props: { text: string; onDone: () => Msg; onError: (err: string) => Msg },
): void {
  navigator.clipboard.writeText(props.text)
    .then(() => dispatch(props.onDone()))
    .catch((e) => dispatch(props.onError(e.message)));
}

// 2. Define the public creator function
export function clipboardWrite<Msg>(
  text: string,
  onDone: () => Msg,
  onError: (err: string) => Msg,
): Effect<Msg> {
  return [clipboardWriteFx, { text, onDone, onError }];
}

// 3. Use in update
function update(state: State, msg: Msg) {
  switch (msg.tag) {
    case "CopyLink":
      return withFx(state,
        clipboardWrite(
          state.shareUrl,
          () => ({ tag: "Copied" }),
          (err) => ({ tag: "CopyFailed", error: err }),
        ),
      );
  }
}
```

### Batching Commands

Use `batch()` to merge multiple `Cmd` arrays:

```ts
import { batch, none } from "superapp";

const cmd1: Cmd<Msg> = [storageSet("a", "1")];
const cmd2: Cmd<Msg> = [log("saved")];
const combined = batch([cmd1, cmd2]);
// combined = [storageSet("a", "1"), log("saved")]
```

---

## Subscriptions

A subscription is a `[SubFn, props]` tuple. The runner function receives `dispatch` and props, sets up a listener, and returns a cleanup function.

```ts
type Sub<Msg> = readonly [SubFn<Msg, any>, any] | false | null | undefined;
type SubFn<Msg, P> = (dispatch: Dispatch<Msg>, props: P) => () => void;
```

### Declaring Subscriptions

The `subscriptions` function returns an array based on the current state. Falsy values are filtered out, enabling conditional subscriptions.

```ts
function subscriptions(state: State): Sub<Msg>[] {
  return [
    // Always active
    onKeyDown((key) => ({ tag: "KeyPressed", key })),

    // Conditional -- only active when state.auto is true
    state.auto && interval(1000, { tag: "Tick" }),

    // Conditional WebSocket
    state.wsEnabled && websocket({
      url: `wss://api.example.com/ws?token=${state.token}`,
      onMessage: (data) => ({ tag: "WsMsg", data }),
      onOpen: () => ({ tag: "WsConnected" }),
      onClose: () => ({ tag: "WsDisconnected" }),
    }),
  ];
}
```

### How the Runtime Manages Subscriptions

After every state update, the runtime diffs the old and new subscription arrays:

1. **Same position, same runner, same props** -- Keep the existing subscription alive (no restart)
2. **Same position, different runner or changed props** -- Tear down old, start new
3. **New subscription at a position** -- Start it
4. **Removed subscription** -- Tear it down (call cleanup function)

Props comparison ignores function-typed values (since callbacks are often re-created) and compares all other values by identity (`===`).

### Built-in Subscriptions

#### interval

Recurring timer.

```ts
import { interval } from "superapp/subs";

// Fixed message
interval<Msg>(1000, { tag: "Tick" })

// Dynamic message with timestamp
interval<Msg>(16, (now) => ({ tag: "Frame", timestamp: now }))
```

#### onKeyDown / onKeyUp

Keyboard events.

```ts
import { onKeyDown, onKeyUp } from "superapp/subs";

onKeyDown<Msg>((key, event) => ({ tag: "KeyDown", key }))
onKeyUp<Msg>((key, event) => ({ tag: "KeyUp", key }))
```

The callback receives the `key` string (e.g., `"Enter"`, `"ArrowUp"`) and the full `KeyboardEvent`.

#### onMouseMove

Mouse position tracking.

```ts
import { onMouseMove } from "superapp/subs";

onMouseMove<Msg>((x, y) => ({ tag: "MouseMoved", x, y }))
```

Coordinates are `clientX` and `clientY`.

#### onResize

Window resize events.

```ts
import { onResize } from "superapp/subs";

onResize<Msg>((width, height) => ({ tag: "Resized", width, height }))
```

Values are `innerWidth` and `innerHeight`.

#### onUrlChange

Browser URL changes (popstate events).

```ts
import { onUrlChange } from "superapp/subs";

onUrlChange<Msg>((url) => ({ tag: "UrlChanged", url }))
```

Note: If you use `routerApp`, URL listening is handled automatically. This is for manual router setups.

#### onAnimationFrame

requestAnimationFrame loop. Runs every frame (~60fps).

```ts
import { onAnimationFrame } from "superapp/subs";

onAnimationFrame<Msg>((timestamp) => ({ tag: "Frame", t: timestamp }))
```

The callback receives the DOMHighResTimeStamp.

#### onEvent

Generic DOM event listener. Attach to any `EventTarget`.

```ts
import { onEvent } from "superapp/subs";

// Window event (default target)
onEvent<Msg>("online", () => ({ tag: "Online" }))

// Specific target
onEvent<Msg>("scroll", (e) => ({ tag: "Scrolled", e }), document)
```

#### websocket

WebSocket connection managed as a subscription. Automatically connects when active and disconnects when removed.

```ts
import { websocket } from "superapp/subs";

websocket<Msg>({
  url: "wss://api.example.com/ws",
  protocols: "v1",                                     // optional
  onMessage: (data) => ({ tag: "WsMessage", data }),   // required
  onOpen: () => ({ tag: "WsConnected" }),               // optional
  onClose: () => ({ tag: "WsDisconnected" }),            // optional
  onError: (e) => ({ tag: "WsError", event: e }),        // optional
})
```

The `onMessage` callback receives `event.data` (typically a string; parse JSON yourself).

### Creating Custom Subscriptions

A subscription runner receives `dispatch` and `props`, starts listening, and returns a cleanup function.

```ts
import type { Dispatch, Sub } from "superapp";

// 1. Define the subscription runner
function mediaQuerySub<Msg>(
  dispatch: Dispatch<Msg>,
  props: { query: string; msg: (matches: boolean) => Msg },
): () => void {
  const mql = matchMedia(props.query);
  const handler = (e: MediaQueryListEvent) => dispatch(props.msg(e.matches));

  // Dispatch initial state
  dispatch(props.msg(mql.matches));

  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}

// 2. Define the public creator
export function onMediaQuery<Msg>(
  query: string,
  msg: (matches: boolean) => Msg,
): Sub<Msg> {
  return [mediaQuerySub, { query, msg }];
}

// 3. Use in subscriptions
function subscriptions(state: State): Sub<Msg>[] {
  return [
    onMediaQuery("(prefers-color-scheme: dark)", (dark) => ({ tag: "DarkMode", dark })),
  ];
}
```

### Combining Subscriptions from Child Modules

Use `mapSub` and `batchSubs` to compose subscriptions from nested TEA modules:

```ts
import { mapSub, batchSubs } from "superapp";
import * as ChildA from "./child-a";
import * as ChildB from "./child-b";

function subscriptions(state: State): Sub<Msg>[] {
  return batchSubs(
    ...ChildA.subscriptions(state.childA).map((s) =>
      mapSub(s, (m): Msg => ({ tag: "ChildA", msg: m })),
    ),
    ...ChildB.subscriptions(state.childB).map((s) =>
      mapSub(s, (m): Msg => ({ tag: "ChildB", msg: m })),
    ),
    // Parent's own subscriptions
    onKeyDown((key) => ({ tag: "KeyPressed", key })),
  );
}
```
