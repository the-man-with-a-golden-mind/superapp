# JSX Support

SuperApp supports JSX via the React 17+ automatic transform. You can use JSX syntax alongside or instead of `h()` calls.

## Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "superapp"
  }
}
```

This tells TypeScript to use SuperApp's JSX runtime automatically. No manual imports needed.

### Per-File Pragma

Alternatively, use a pragma comment at the top of individual files:

```tsx
/** @jsxImportSource superapp */
```

This is useful when mixing SuperApp JSX with other frameworks or when you only want JSX in specific files.

## Using JSX

### Basic Usage

```tsx
function view(state: State, dispatch: Dispatch<Msg>) {
  return (
    <div class="container">
      <h1>{state.title}</h1>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ tag: "Inc" })}>+</button>
    </div>
  );
}
```

### Conditional Rendering

```tsx
function view(state: State, dispatch: Dispatch<Msg>) {
  return (
    <div>
      {state.loading && <p>Loading...</p>}
      {state.error ? <p class="error">{state.error}</p> : null}
      {state.items.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

### Event Handlers

```tsx
<input
  type="text"
  value={state.input}
  onInput={(e: Event) =>
    dispatch({ tag: "SetInput", value: (e.target as HTMLInputElement).value })
  }
/>

<form onSubmit={(e: Event) => { e.preventDefault(); dispatch({ tag: "Submit" }); }}>
  {/* ... */}
</form>
```

### Spread Props

```tsx
import { routerLink } from "superapp/router";

<a {...routerLink("/about")} class="nav-link">About</a>
```

### Fragments

Use `<></>` to return multiple elements without a wrapper:

```tsx
function view(state: State, dispatch: Dispatch<Msg>) {
  return (
    <>
      <h1>Title</h1>
      <p>Paragraph</p>
    </>
  );
}
```

Note: Fragments are implemented as elements with an empty string tag. They render their children directly into the parent.

## h() vs JSX Comparison

Both produce identical VNode trees. Choose based on preference.

### h() style

```ts
h("div", { class: "card" },
  h("h1", {}, state.title),
  h("p", {}, "Count: ", String(state.count)),
  h("button", { onClick: () => dispatch({ tag: "Inc" }) }, "+"),
)
```

### JSX style

```tsx
<div class="card">
  <h1>{state.title}</h1>
  <p>Count: {state.count}</p>
  <button onClick={() => dispatch({ tag: "Inc" })}>+</button>
</div>
```

### Differences

| Feature | `h()` | JSX |
|---------|-------|-----|
| Import needed | `import { h } from "superapp"` | None (automatic) |
| Children | Variadic arguments | Nested elements |
| Text nodes | Explicit `String()` conversion | Automatic |
| Conditional children | Inline `condition ? h(...) : null` | `{condition && <.../>}` |
| File extension | `.ts` | `.tsx` |

## Using JSX in Pages

When using the CLI with `--jsx`, pages are generated as `.tsx` files:

```bash
superapp new my-app --jsx
superapp add "Dashboard" --jsx
```

A JSX page looks like:

```tsx
import { type PageConfig } from "superapp/router";
import type { Shared } from "../shared";

export const page: PageConfig<{}, never, Shared, {}> = {
  init: () => ({}),
  update: (model) => model,
  view: (_model, shared) => (
    <div class="text-center py-16">
      <h1 class="text-4xl font-bold">Welcome to {shared.appName}</h1>
      <p class="text-gray-500">Built with SuperApp</p>
    </div>
  ),
};
```

## Class Handling

SuperApp supports multiple formats for the `class` prop (both in JSX and `h()`):

```tsx
// String
<div class="foo bar" />

// Array (falsy values filtered)
<div class={["foo", condition && "bar", "baz"]} />

// Object (truthy values included)
<div class={{ foo: true, bar: isActive, baz: false }} />

// className also works (mapped to class)
<div className="foo bar" />
```

## Style Handling

Styles can be strings or objects:

```tsx
// String
<div style="color: red; font-size: 16px" />

// Object (camelCase or CSS custom properties)
<div style={{ color: "red", fontSize: "16px" }} />
<div style={{ "--custom-prop": "value" }} />
```

## Refs

Use the `ref` prop to get a reference to the underlying DOM element:

```tsx
<input ref={(el) => el.focus()} type="text" />
```

The ref callback is called when the element is created.

## TypeScript Types

SuperApp's JSX namespace provides type definitions:

```ts
// VNode is the element type
import type { VNode } from "superapp";

// JSX namespace for intrinsic elements
namespace JSX {
  type Element = VNode;
  interface IntrinsicElements {
    [tag: string]: Record<string, any>;
  }
}
```

All HTML/SVG elements accept any props (loose typing). This provides flexibility while the `Msg` discriminated union pattern catches logic errors at the update level.
