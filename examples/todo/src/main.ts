import { app, h, withFx, type Dispatch } from "superapp";
import { storageSet, storageGet } from "superapp/fx";
import { attachDebugger } from "superapp/debugger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

type Filter = "all" | "active" | "completed";

interface State {
  todos: Todo[];
  filter: Filter;
  input: string;
  nextId: number;
  lastAddedId: number | null;
}

type Msg =
  | { tag: "AddTodo" }
  | { tag: "ToggleTodo"; id: number }
  | { tag: "RemoveTodo"; id: number }
  | { tag: "SetFilter"; filter: Filter }
  | { tag: "SetInput"; value: string }
  | { tag: "ClearCompleted" }
  | { tag: "LoadTodos"; raw: string | null };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "superapp-todos";

function saveTodos(todos: Todo[]) {
  return storageSet<Msg>(STORAGE_KEY, JSON.stringify(todos));
}

function filteredTodos(todos: Todo[], filter: Filter): Todo[] {
  switch (filter) {
    case "active":
      return todos.filter((t) => !t.done);
    case "completed":
      return todos.filter((t) => t.done);
    default:
      return todos;
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

const init: readonly [State, ReturnType<typeof storageGet<Msg>>[]] = [
  { todos: [], filter: "all", input: "", nextId: 1, lastAddedId: null },
  [storageGet<Msg>(STORAGE_KEY, (raw) => ({ tag: "LoadTodos", raw }))],
];

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

function update(state: State, msg: Msg): State | readonly [State, any[]] {
  switch (msg.tag) {
    case "AddTodo": {
      const text = state.input.trim();
      if (!text) return state;
      const todo: Todo = { id: state.nextId, text, done: false };
      const todos = [...state.todos, todo];
      const next = {
        ...state,
        todos,
        input: "",
        nextId: state.nextId + 1,
        lastAddedId: todo.id,
      };
      return withFx(next, saveTodos(todos));
    }

    case "ToggleTodo": {
      const todos = state.todos.map((t) =>
        t.id === msg.id ? { ...t, done: !t.done } : t,
      );
      return withFx({ ...state, todos, lastAddedId: null }, saveTodos(todos));
    }

    case "RemoveTodo": {
      const todos = state.todos.filter((t) => t.id !== msg.id);
      return withFx({
        ...state,
        todos,
        lastAddedId: state.lastAddedId === msg.id ? null : state.lastAddedId,
      }, saveTodos(todos));
    }

    case "SetFilter":
      return { ...state, filter: msg.filter };

    case "SetInput":
      return { ...state, input: msg.value };

    case "ClearCompleted": {
      const todos = state.todos.filter((t) => !t.done);
      return withFx({ ...state, todos, lastAddedId: null }, saveTodos(todos));
    }

    case "LoadTodos": {
      if (!msg.raw) return state;
      try {
        const loaded: Todo[] = JSON.parse(msg.raw);
        const maxId = loaded.reduce((max, t) => Math.max(max, t.id), 0);
        return { ...state, todos: loaded, nextId: maxId + 1, lastAddedId: null };
      } catch {
        return state;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

function view(state: State, dispatch: Dispatch<Msg>) {
  const visible = filteredTodos(state.todos, state.filter);
  const remaining = state.todos.filter((t) => !t.done).length;
  const hasCompleted = state.todos.some((t) => t.done);

  return h("div", { class: "card bg-base-100 shadow-xl max-w-lg mx-auto mt-12" },
    h("div", { class: "card-body" },

      // Title row
      h("div", { class: "flex items-center justify-between mb-4" },
        h("h1", { class: "card-title text-2xl font-bold" }, "Todo"),
        h("span", { class: "badge badge-primary" }, `${remaining} left`),
      ),
      h("p", { class: "text-sm text-base-content/60 mb-4" },
        "onMount focuses the input, afterRender scrolls newly-added todos into view.",
      ),

      // Input row (form for Enter support)
      h("form", {
        class: "flex gap-2 mb-4",
        onSubmit: (e: Event) => {
          e.preventDefault();
          dispatch({ tag: "AddTodo" });
        },
      },
        h("input", {
          id: "todo-input",
          class: "input input-bordered flex-1",
          type: "text",
          placeholder: "What needs to be done?",
          value: state.input,
          onInput: (e: Event) =>
            dispatch({ tag: "SetInput", value: (e.target as HTMLInputElement).value }),
        }),
        h("button", { class: "btn btn-primary", type: "submit" }, "Add"),
      ),

      // Filter tabs
      h("div", { class: "tabs tabs-boxed mb-4 justify-center" },
        ...( ["all", "active", "completed"] as Filter[]).map((f) =>
          h("a", {
            class: `tab${state.filter === f ? " tab-active" : ""}`,
            onClick: () => dispatch({ tag: "SetFilter", filter: f }),
          }, f.charAt(0).toUpperCase() + f.slice(1)),
        ),
      ),

      // Todo list
      ...visible.map((todo) =>
        h("div", {
          key: todo.id,
          id: `todo-${todo.id}`,
          class: "flex items-center gap-3 py-2 px-1 group",
        },
          h("input", {
            type: "checkbox",
            class: "checkbox checkbox-sm",
            checked: todo.done,
            onClick: () => dispatch({ tag: "ToggleTodo", id: todo.id }),
          }),
          h("span", {
            class: `flex-1${todo.done ? " line-through opacity-50" : ""}`,
          }, todo.text),
          h("button", {
            class: "btn btn-ghost btn-xs opacity-0 group-hover:opacity-100",
            onClick: () => dispatch({ tag: "RemoveTodo", id: todo.id }),
          }, "x"),
        ),
      ),

      // Divider (only if completed exist)
      ...(hasCompleted
        ? [h("div", { class: "divider my-2" })]
        : []),

      // Footer
      h("div", { class: "flex justify-between items-center mt-2" },
        h("span", {}, `${remaining} item${remaining !== 1 ? "s" : ""} left`),
        ...(hasCompleted
          ? [
              h("button", {
                class: "btn btn-ghost btn-sm",
                onClick: () => dispatch({ tag: "ClearCompleted" }),
              }, "Clear completed"),
            ]
          : []),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

const instance = app<State, Msg>({
  init,
  update,
  view,
  onMount: ({ node }) => {
    node.querySelector<HTMLInputElement>("#todo-input")?.focus();
    document.title = "SuperApp Todo";
  },
  afterRender: ({ state, prevState, node }) => {
    document.title = `Todo (${state.todos.length})`;
    if (state.lastAddedId !== null && state.lastAddedId !== prevState?.lastAddedId) {
      node.querySelector<HTMLElement>(`#todo-${state.lastAddedId}`)?.scrollIntoView({
        block: "nearest",
      });
      node.querySelector<HTMLInputElement>("#todo-input")?.focus();
    }
  },
  onUnmount: () => {
    document.title = "SuperApp";
  },
  node: document.getElementById("app")!,
  debug: true,
});

attachDebugger(instance);
