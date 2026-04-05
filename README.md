```
  ╔═╗╦ ╦╔═╗╔═╗╦═╗╔═╗╔═╗╔═╗
  ╚═╗║ ║╠═╝║╣ ╠╦╝╠═╣╠═╝╠═╝
  ╚═╝╚═╝╩  ╚═╝╩╚═╩ ╩╩  ╩
```

**Elm-inspired TypeScript framework**

[![version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/nickabal/superapp)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org/)
[![tests](https://img.shields.io/badge/tests-bun%20test-yellow)](https://bun.sh)

SuperApp is a functional, type-safe web framework built on The Elm Architecture. It brings Elm's proven patterns -- immutable state, message-driven updates, effects as data, and declarative subscriptions -- to TypeScript with zero runtime dependencies.

---

## Feature Highlights

- **The Elm Architecture (TEA)** -- State, Update, View with immutable state and discriminated union messages
- **Typed URL routing** -- Page protocol with typed parsers, guards, redirects, and page caching (like elm-spa)
- **Page lifecycle & error boundaries** -- `onMount`, `onUnmount`, `afterUpdate`, and per-page fallback UI
- **Effects & Subscriptions** -- HTTP, timers, localStorage, WebSocket, keyboard, resize, animation frames
- **Keyed VDOM reconciliation** -- Head/tail optimized diffing with keyed children
- **JSX and h() support** -- Use JSX with automatic transform or plain `h()` calls
- **CLI tool** -- `new`, `add page`, `gen` router, `dev`, `build`
- **Time-travel debugger** -- Visual overlay with state inspection and history navigation
- **Zero runtime dependencies** -- The entire framework is self-contained

---

## Quick Start

```bash
bunx superapp new my-app
cd my-app
bun install
bunx superapp dev
```

This scaffolds a project with Vite, Tailwind CSS v4, a home page, an about page, a 404 page, and a generated router.

---

## Core Concepts

### 1. State, Update, View

The fundamental TEA cycle: define your state, messages, update function, and view.

```ts
import { app, h, type Dispatch } from "superapp";

interface State { count: number }

type Msg = { tag: "Inc" } | { tag: "Dec" };

const init: State = { count: 0 };

function update(state: State, msg: Msg): State {
  switch (msg.tag) {
    case "Inc": return { ...state, count: state.count + 1 };
    case "Dec": return { ...state, count: state.count - 1 };
  }
}

function view(state: State, dispatch: Dispatch<Msg>) {
  return h("div", {},
    h("h1", {}, String(state.count)),
    h("button", { onClick: () => dispatch({ tag: "Inc" }) }, "+"),
    h("button", { onClick: () => dispatch({ tag: "Dec" }) }, "-"),
  );
}

app({ init, update, view, node: document.getElementById("app")! });
```

### 2. Effects

Side effects are returned from `update` as `[State, Cmd<Msg>]` tuples. They run after the state update.

Effects are generic over their props, so custom effect creators can now enforce the payload shape at compile time:

```ts
type Effect<Msg, Props = unknown> = readonly [EffectFn<Msg, Props>, Props];
```

```ts
import { withFx } from "superapp";
import { delay, http } from "superapp/fx";

function update(state: State, msg: Msg) {
  switch (msg.tag) {
    case "DelayedInc":
      return withFx(state, delay(500, { tag: "Inc" }));

    case "FetchUsers":
      return withFx(state,
        http({
          url: "/api/users",
          onOk:    (data) => ({ tag: "GotUsers", users: data }),
          onError: (err)  => ({ tag: "FetchFailed", error: err }),
        }),
      );

    case "Inc":
      return { ...state, count: state.count + 1 };
  }
}
```

### 3. Subscriptions

Declarative event sources. Return active subscriptions based on state; the runtime manages start/stop.

```ts
import { interval, onKeyDown } from "superapp/subs";
import type { Sub } from "superapp";

function subscriptions(state: State): Sub<Msg>[] {
  return [
    state.auto && interval(1000, { tag: "Tick" }),
    onKeyDown((key) => ({ tag: "KeyPressed", key })),
  ];
}

app({ init, update, view, subscriptions, node: document.getElementById("app")! });
```

### 3.5 App Lifecycle Hooks

`app()` can also run code after the DOM commit:

```ts
app({
  init,
  update,
  view,
  onMount: ({ node }) => {
    node.querySelector("#search")?.focus();
  },
  afterRender: ({ state, prevState }) => {
    if (state.count !== prevState?.count) {
      document.title = `Count: ${state.count}`;
    }
  },
  onUnmount: () => {
    document.title = "SuperApp";
  },
  node: document.getElementById("app")!,
});
```

### 4. Router & Pages

File-based routing with typed URL parsers and a Page protocol.

```ts
import { createRouter, routerApp, routerLink, route, page, str, int } from "superapp/router";

// Define typed routes
const homeRoute   = route("/");
const userRoute   = route("/users/:id", { id: int });

// Each page implements the PageConfig protocol
const homePage: PageConfig<{}, never, Shared, {}> = {
  init: () => ({}),
  update: (model) => model,
  view: (_model, shared) => h("h1", {}, `Welcome to ${shared.appName}`),
};

// Create router and boot
const router = createRouter({
  routes: [
    page(homeRoute, homePage),
    page(userRoute, userDetailPage),
  ],
  shared: { appName: "MyApp" },
  notFound: notFoundPage,
});

routerApp({
  router,
  layout: (content, shared) => h("div", {}, content),
  node: document.getElementById("app")!,
});
```

Pages can opt into DOM-aware lifecycle hooks and an error boundary:

```ts
const pageWithChart: PageConfig<Model, Msg, Shared, {}> = {
  // ...
  onMount: ({ root }) => mountChart(root.querySelector("#chart")!),
  afterUpdate: ({ model, prevModel }) => {
    if (model.series !== prevModel.series) redrawChart(model.series);
  },
  onUnmount: () => destroyChart(),
  onError: ({ error, phase }) => console.error("page failed", phase, error),
  errorView: ({ error }) => h("div", { role: "alert" }, String(error)),
};
```

If you need deterministic bootstrapping outside the browser's current URL, `routerApp()` also accepts `url` and `listen: false`.

### Page File Conventions

`superapp gen` treats only route files in `src/pages/` as pages. The generator skips:

- files and directories prefixed with `_`
- `*.component.ts(x)`
- `*.test.ts(x)`, `*.spec.ts(x)`, and `*.d.ts`
- patterns listed in project-root `.superappignore`

Use `src/components/` or `src/lib/` for shared non-route code. Lowercase `index.ts(x)` is supported as a route entrypoint.

Use `routerLink` for SPA navigation without full page reloads:

```ts
h("a", { ...routerLink("/users/42") }, "View User")
```

### 5. JSX Support

Configure `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "superapp"
  }
}
```

Then use JSX in your pages:

```tsx
const view = (state: State, dispatch: Dispatch<Msg>) => (
  <div>
    <h1>{state.count}</h1>
    <button onClick={() => dispatch({ tag: "Inc" })}>+</button>
  </div>
);
```

### 6. Nested TEA (Composition)

Compose child modules with `mapDispatch`, `mapEffect`, and `mapSub`:

```ts
import { mapDispatch, mapEffect, mapSub } from "superapp";
import * as Counter from "./counter";

type Msg = { tag: "Child"; msg: Counter.Msg };

// In view:
Counter.view(
  state.child,
  mapDispatch(dispatch, (m: Counter.Msg): Msg => ({ tag: "Child", msg: m })),
);

// In update, map child effects back:
const [childState, childCmd] = Counter.update(state.child, msg.msg);
return [
  { ...state, child: childState },
  childCmd.map((fx) => mapEffect(fx, (m) => ({ tag: "Child", msg: m }))),
];
```

---

## API Reference

### `superapp` (core)

| Export | Description |
|--------|-------------|
| `h(tag, props?, ...children)` | Create a VNode |
| `text(value)` | Create a text VNode |
| `memo(component, props)` | Memoized component (skips re-render if props unchanged) |
| `lazy(view, data)` | Lazy VNode (alias for memo pattern) |
| `app(config)` | Mount an application, returns `AppInstance`; config supports `onMount`, `afterRender`, `onUnmount` |
| `noFx(state)` | Wrap state with no effects: `[state, []]` |
| `withFx(state, ...effects)` | Wrap state with effects: `[state, effects]` |
| `batch(commands)` | Merge multiple `Cmd` arrays into one |
| `none` | Empty command: `[]` |
| `mapEffect(effect, fn)` | Transform an effect's message type |
| `mapSub(sub, fn)` | Transform a subscription's message type |
| `mapDispatch(dispatch, fn)` | Transform a dispatch function's message type |
| `batchSubs(...subs)` | Merge subscriptions from multiple sources |
| `resolveClass(value)` | Resolve class values (string, array, or object) |

### `superapp/testing`

| Export | Description |
|--------|-------------|
| `getModel(result)` | Unwrap `State` from `State | [State, Cmd]` |
| `getEffects(result)` | Unwrap `Cmd` from an update result |
| `hasEffects(result)` | Type guard for tuple-style update results |
| `createDispatchSpy()` | Record dispatched messages in tests |
| `runEffect(effect, dispatch)` | Execute an effect tuple with its props |

### `superapp/fx` (effects)

| Export | Description |
|--------|-------------|
| `http({ url, options?, expect?, onOk, onError })` | Fetch HTTP resource (JSON or text) |
| `delay(ms, msg)` | Dispatch a message after a delay |
| `navigate(url, replace?)` | Push or replace browser history |
| `storageSet(key, value)` | Write to localStorage |
| `storageGet(key, onResult)` | Read from localStorage |
| `log(...args)` | Console.log (debug effect) |
| `dispatchMsg(msg)` | Dispatch a message as an effect |
| `compactEffects(...effects)` | Filter out falsy effects from a list |

### `superapp/subs` (subscriptions)

| Export | Description |
|--------|-------------|
| `interval(ms, msg)` | Recurring timer. `msg` can be a value or `(now) => Msg` |
| `onKeyDown(msg)` | Keyboard keydown. `msg: (key, event) => Msg` |
| `onKeyUp(msg)` | Keyboard keyup. `msg: (key, event) => Msg` |
| `onMouseMove(msg)` | Mouse movement. `msg: (x, y) => Msg` |
| `onResize(msg)` | Window resize. `msg: (width, height) => Msg` |
| `onUrlChange(msg)` | URL popstate. `msg: (url: URL) => Msg` |
| `onAnimationFrame(msg)` | requestAnimationFrame loop. `msg: (timestamp) => Msg` |
| `onEvent(event, msg, target?)` | Generic DOM event listener |
| `websocket({ url, onMessage, onOpen?, onClose?, onError? })` | WebSocket connection |

### `superapp/router`

| Export | Description |
|--------|-------------|
| `route(path, spec?)` | Define a typed route with path/query parsers |
| `str` | Path parser: any string segment |
| `int` | Path parser: integer segment |
| `float` | Path parser: float segment |
| `oneOf(values)` | Path parser: one of a set of string literals |
| `q.str(fallback)` | Query parser: string with default |
| `q.int(fallback)` | Query parser: integer with default |
| `q.float(fallback)` | Query parser: float with default |
| `q.bool(fallback)` | Query parser: boolean with default |
| `q.optional.str()` | Query parser: optional string |
| `q.optional.int()` | Query parser: optional integer |
| `page(routeDef, config, options?)` | Bind a route to a PageConfig |
| `createRouter({ routes, shared, notFound? })` | Create a Router instance |
| `routerApp({ router, layout, node, url?, listen?, debug? })` | Boot an app with routing, optional deterministic URL bootstrap |
| `routerLink(url)` | Returns `{ href, onClick }` for SPA links |

### `superapp/debugger`

| Export | Description |
|--------|-------------|
| `attachDebugger(instance, config?)` | Attach a floating debugger overlay with time-travel |

---

## CLI

```bash
superapp new <name> [--jsx]     # Scaffold a new project
superapp add <pattern> [--jsx]  # Add a page (auto-runs gen)
superapp gen                    # Regenerate router from src/pages/
superapp dev                    # Start Vite dev server (auto-runs gen)
superapp build                  # Production build (auto-runs gen)
```

### Page pattern syntax

```bash
superapp add "About"                  # /about
superapp add "users/[id]"             # /users/:id (string param)
superapp add "users/[id:int]"         # /users/:id (integer param)
superapp add "products/[slug]/Edit"   # /products/:slug/edit
superapp add "Home"                   # / (special: root route)
superapp add "NotFound"               # 404 handler
superapp add "Blog/Index"             # /blog (Index maps to parent)
```

### File naming conventions

| File | Route |
|------|-------|
| `Home.ts` | `/` |
| `About.ts` | `/about` |
| `users/[id].ts` | `/users/:id` |
| `users/[id:int]/Edit.ts` | `/users/:id/edit` |
| `NotFound.ts` | 404 handler |
| `Blog/Index.ts` | `/blog` |

CamelCase filenames are converted to kebab-case routes (e.g., `UserProfile.ts` -> `/user-profile`).

Ignored by `superapp gen`:

- files and directories prefixed with `_`
- `*.component.ts(x)`
- `*.test.ts(x)`, `*.spec.ts(x)`, and `*.d.ts`
- patterns from project-root `.superappignore`

---

## Examples

| Example | Description |
|---------|-------------|
| `examples/counter` | Counter with effects, subscriptions, and app lifecycle hooks |
| `examples/todo` | Todo app with localStorage persistence plus post-render focus/scroll hooks |
| `examples/nested-tea` | Two independent Counter modules composed via mapDispatch/mapEffect/mapSub |
| `examples/spa-router` | Full SPA with typed routes, page lifecycle hooks, cached page state, error boundaries, and ignored helper files inside `pages/` |

Run an example:

```bash
cd examples/counter
bun install
bunx vite
```

---

## Comparison

| Feature | SuperApp | Elm | Hyperapp | React |
|---------|----------|-----|----------|-------|
| Architecture | TEA | TEA | TEA | Components |
| Language | TypeScript | Elm | JavaScript | JavaScript/TS |
| Runtime deps | 0 | 0 | 0 | react-dom |
| Effects | Return values | Commands | Return values | Hooks/useEffect |
| Subscriptions | Declarative | Ports | Declarative | useEffect |
| Routing | Built-in typed | elm-spa | Community | react-router |
| JSX | Optional | No | Optional | Required |
| VDOM | Keyed | Keyed | Keyed | Fiber |
| Bundle size | ~4KB | ~30KB | ~1KB | ~40KB |
| Time-travel debug | Built-in | Elm Debugger | No | Redux DevTools |
| Nested TEA | mapDispatch/mapEffect/mapSub | Cmd.map/Sub.map | Manual | N/A |

---

## License

MIT
