import { describe, it, expect, beforeEach } from "bun:test";
import {
  // New API
  str, int, float, oneOf, q, route, routerLink,
  page, createRouter,
  type RouteDef, type PageConfig, type RouterModel, type RouterMsg, type Router,
  // Backward compat
  matchRoute, onRoute, type Route,
} from "../src/router";
import { h, type VNode } from "../src/hyperapp";

// ══════════════════════════════════════════════════════════════
// URL Parser
// ══════════════════════════════════════════════════════════════

describe("str parser", () => {
  it("parses any string", () => {
    expect(str.parse("hello")).toBe("hello");
    expect(str.parse("42")).toBe("42");
    expect(str.parse("")).toBe("");
  });
});

describe("int parser", () => {
  it("parses integers", () => {
    expect(int.parse("42")).toBe(42);
    expect(int.parse("0")).toBe(0);
    expect(int.parse("-5")).toBe(-5);
  });

  it("rejects non-integers", () => {
    expect(int.parse("3.14")).toBeNull();
    expect(int.parse("abc")).toBeNull();
    expect(int.parse("")).toBeNull();
    expect(int.parse("12x")).toBeNull();
  });
});

describe("float parser", () => {
  it("parses floats", () => {
    expect(float.parse("3.14")).toBe(3.14);
    expect(float.parse("42")).toBe(42);
    expect(float.parse("-1.5")).toBe(-1.5);
  });

  it("rejects non-numbers", () => {
    expect(float.parse("abc")).toBeNull();
    expect(float.parse("")).toBeNull();
    expect(float.parse("Infinity")).toBeNull();
    expect(float.parse("NaN")).toBeNull();
  });
});

describe("oneOf parser", () => {
  it("matches valid values", () => {
    const p = oneOf(["active", "inactive", "banned"] as const);
    expect(p.parse("active")).toBe("active");
    expect(p.parse("banned")).toBe("banned");
  });

  it("rejects invalid values", () => {
    const p = oneOf(["a", "b"] as const);
    expect(p.parse("c")).toBeNull();
    expect(p.parse("")).toBeNull();
  });
});

describe("q (query parsers)", () => {
  it("q.str with fallback", () => {
    const p = q.str("default");
    expect(p.parse("hello")).toBe("hello");
    expect(p.parse(null)).toBe("default");
  });

  it("q.int with fallback", () => {
    const p = q.int(1);
    expect(p.parse("5")).toBe(5);
    expect(p.parse(null)).toBe(1);
    expect(p.parse("abc")).toBe(1);
    expect(p.parse("3.14")).toBe(1);
  });

  it("q.float with fallback", () => {
    const p = q.float(0.0);
    expect(p.parse("3.14")).toBe(3.14);
    expect(p.parse(null)).toBe(0.0);
    expect(p.parse("abc")).toBe(0.0);
  });

  it("q.bool with fallback", () => {
    const p = q.bool(false);
    expect(p.parse("true")).toBe(true);
    expect(p.parse("1")).toBe(true);
    expect(p.parse("false")).toBe(false);
    expect(p.parse("0")).toBe(false);
    expect(p.parse(null)).toBe(false);
  });

  it("q.optional.str", () => {
    const p = q.optional.str();
    expect(p.parse("hello")).toBe("hello");
    expect(p.parse(null)).toBeUndefined();
  });

  it("q.optional.int", () => {
    const p = q.optional.int();
    expect(p.parse("42")).toBe(42);
    expect(p.parse(null)).toBeUndefined();
    expect(p.parse("abc")).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
// RouteDef — parse() and toUrl()
// ══════════════════════════════════════════════════════════════

describe("route()", () => {
  it("matches exact static path", () => {
    const r = route("/");
    expect(r.parse("/")).toEqual({});
    expect(r.parse("/about")).toBeNull();
  });

  it("matches multi-segment static path", () => {
    const r = route("/about/team");
    expect(r.parse("/about/team")).toEqual({});
    expect(r.parse("/about")).toBeNull();
    expect(r.parse("/about/team/extra")).toBeNull();
  });

  it("extracts string path param", () => {
    const r = route("/users/:id", { id: str });
    expect(r.parse("/users/alice")).toEqual({ id: "alice" });
    expect(r.parse("/users/42")).toEqual({ id: "42" });
    expect(r.parse("/users")).toBeNull();
    expect(r.parse("/users/a/b")).toBeNull();
  });

  it("extracts int path param", () => {
    const r = route("/users/:id", { id: int });
    expect(r.parse("/users/42")).toEqual({ id: 42 });
    expect(r.parse("/users/abc")).toBeNull();
    expect(r.parse("/users/3.14")).toBeNull();
  });

  it("extracts multiple path params", () => {
    const r = route("/users/:userId/posts/:postId", { userId: str, postId: int });
    expect(r.parse("/users/alice/posts/7")).toEqual({ userId: "alice", postId: 7 });
    expect(r.parse("/users/alice/posts/abc")).toBeNull();
  });

  it("parses query params", () => {
    const r = route("/search", { query: q.str(""), page: q.int(1) });
    expect(r.parse("/search", "?query=hello&page=3")).toEqual({ query: "hello", page: 3 });
    expect(r.parse("/search", "")).toEqual({ query: "", page: 1 });
    expect(r.parse("/search")).toEqual({ query: "", page: 1 });
  });

  it("mixes path params and query params", () => {
    const r = route("/users/:id", { id: str, tab: q.str("overview") });
    expect(r.parse("/users/42", "?tab=posts")).toEqual({ id: "42", tab: "posts" });
    expect(r.parse("/users/42")).toEqual({ id: "42", tab: "overview" });
  });

  it("handles wildcard", () => {
    const r = route("/files/*");
    expect(r.parse("/files/a/b/c")).toEqual({ "*": "a/b/c" });
    expect(r.parse("/files/")).toEqual({ "*": "" });
    expect(r.parse("/other")).toBeNull();
  });

  it("normalizes trailing slashes", () => {
    const r = route("/about");
    expect(r.parse("/about/")).toEqual({});
  });

  it("decodes URI components", () => {
    const r = route("/search/:q", { q: str });
    expect(r.parse("/search/hello%20world")).toEqual({ q: "hello world" });
  });

  it("returns null on malformed URI", () => {
    const r = route("/search/:q", { q: str });
    expect(r.parse("/search/%E0%A4%A")).toBeNull();
  });
});

describe("route().toUrl()", () => {
  it("generates static URL", () => {
    expect(route("/about").toUrl({})).toBe("/about");
  });

  it("generates URL with path params", () => {
    const r = route("/users/:id", { id: str });
    expect(r.toUrl({ id: "42" })).toBe("/users/42");
  });

  it("encodes path params", () => {
    const r = route("/search/:q", { q: str });
    expect(r.toUrl({ q: "hello world" })).toBe("/search/hello%20world");
  });

  it("generates URL with query params", () => {
    const r = route("/search", { query: q.str(""), page: q.int(1) });
    const url = r.toUrl({ query: "foo", page: 3 });
    expect(url).toContain("/search?");
    expect(url).toContain("query=foo");
    expect(url).toContain("page=3");
  });

  it("generates URL with mixed params", () => {
    const r = route("/users/:id", { id: str, tab: q.str("overview") });
    const url = r.toUrl({ id: "42", tab: "posts" });
    expect(url).toBe("/users/42?tab=posts");
  });
});

// ══════════════════════════════════════════════════════════════
// Page Protocol & Router
// ══════════════════════════════════════════════════════════════

interface TestShared {
  user: string | null;
}

function makeSimplePage<Params extends Record<string, any>>(
  label: string,
): PageConfig<{ label: string; params: Params }, string, TestShared, Params> {
  return {
    init: (params) => ({ label, params }),
    update: (model, msg) => ({ ...model, label: msg }),
    view: (model, shared, _dispatch) =>
      h("div", { class: "page" }, `${model.label}:${JSON.stringify(model.params)}:${shared.user}`),
    subscriptions: () => [],
  };
}

const homeRoute = route("/");
const aboutRoute = route("/about");
const userRoute = route("/users/:id", { id: str });
const postRoute = route("/users/:userId/posts/:postId", { userId: str, postId: int });

const homePage = makeSimplePage("home");
const aboutPage = makeSimplePage("about");
const userPage = makeSimplePage<{ id: string }>("user");
const postPage = makeSimplePage<{ userId: string; postId: number }>("post");

const notFoundPage: PageConfig<{ path: string }, never, TestShared, { path: string }> = {
  init: (params) => params,
  update: (model) => model,
  view: (model) => h("div", { class: "not-found" }, `404: ${model.path}`),
};

function makeRouter() {
  return createRouter<TestShared>({
    routes: [
      page(homeRoute, homePage),
      page(aboutRoute, aboutPage),
      page(userRoute, userPage),
      page(postRoute, postPage),
    ],
    shared: { user: null },
    notFound: notFoundPage,
  });
}

describe("page()", () => {
  it("creates a PageRoute", () => {
    const pr = page(homeRoute, homePage);
    expect(pr._tag).toBe("page-route");
    expect(pr._routeDef).toBe(homeRoute);
    expect(pr._config).toBe(homePage);
    expect(pr._guard).toBeUndefined();
  });

  it("stores guard", () => {
    const guard = () => true as const;
    const pr = page(homeRoute, homePage, { guard });
    expect(pr._guard).toBe(guard);
  });
});

describe("createRouter()", () => {
  let router: Router<TestShared>;

  beforeEach(() => {
    router = makeRouter();
    history.replaceState(null, "", "/");
  });

  describe("init()", () => {
    it("resolves current URL to correct page", () => {
      const result = router.init(new URL("http://localhost/"));
      const model = Array.isArray(result) ? result[0] : result;
      expect(model._page).not.toBeNull();
      expect(model._page!.routeIdx).toBe(0);
      expect(model.shared).toEqual({ user: null });
    });

    it("resolves URL with params", () => {
      const result = router.init(new URL("http://localhost/users/42"));
      const model = Array.isArray(result) ? result[0] : result;
      expect(model._page!.routeIdx).toBe(2);
      expect(model._page!.params).toEqual({ id: "42" });
    });

    it("resolves to notFound for unknown URL", () => {
      const result = router.init(new URL("http://localhost/nonexistent"));
      const model = Array.isArray(result) ? result[0] : result;
      expect(model._page!.routeIdx).toBe(-1);
    });
  });

  describe("update() — UrlChanged", () => {
    it("transitions to new page", () => {
      const initResult = router.init(new URL("http://localhost/"));
      const model = Array.isArray(initResult) ? initResult[0] : initResult;

      const msg: RouterMsg<TestShared> = {
        tag: "@@router/UrlChanged",
        url: new URL("http://localhost/about"),
      };
      const result = router.update(model, msg);
      const next = Array.isArray(result) ? result[0] : result;

      expect(next._page!.routeIdx).toBe(1);
      expect((next._page!.model as any).label).toBe("about");
    });

    it("stays on same page if URL unchanged", () => {
      const initResult = router.init(new URL("http://localhost/"));
      const model = Array.isArray(initResult) ? initResult[0] : initResult;

      const msg: RouterMsg<TestShared> = {
        tag: "@@router/UrlChanged",
        url: new URL("http://localhost/"),
      };
      const result = router.update(model, msg);
      const next = Array.isArray(result) ? result[0] : result;

      expect(next._page!.routeIdx).toBe(0);
    });

    it("transitions to notFound", () => {
      const initResult = router.init(new URL("http://localhost/"));
      const model = Array.isArray(initResult) ? initResult[0] : initResult;

      const msg: RouterMsg<TestShared> = {
        tag: "@@router/UrlChanged",
        url: new URL("http://localhost/xyz"),
      };
      const result = router.update(model, msg);
      const next = Array.isArray(result) ? result[0] : result;

      expect(next._page!.routeIdx).toBe(-1);
    });
  });

  describe("update() — PageMsg", () => {
    it("forwards message to active page update", () => {
      const initResult = router.init(new URL("http://localhost/"));
      const model = Array.isArray(initResult) ? initResult[0] : initResult;

      const msg: RouterMsg<TestShared> = {
        tag: "@@router/PageMsg",
        msg: "updated-label",
      };
      const result = router.update(model, msg);
      const next = Array.isArray(result) ? result[0] : result;

      expect((next._page!.model as any).label).toBe("updated-label");
    });

    it("does nothing when no active page", () => {
      const model: RouterModel<TestShared> = {
        shared: { user: null },
        url: new URL("http://localhost/"),
        _page: null,
        _cache: new Map(),
      };
      const result = router.update(model, { tag: "@@router/PageMsg", msg: "x" });
      expect(result).toBe(model);
    });
  });

  describe("update() — UpdateShared", () => {
    it("updates shared state", () => {
      const initResult = router.init(new URL("http://localhost/"));
      const model = Array.isArray(initResult) ? initResult[0] : initResult;

      const msg = router.updateShared((s) => ({ ...s, user: "Alice" }));
      const result = router.update(model, msg);
      const next = Array.isArray(result) ? result[0] : result;

      expect(next.shared.user).toBe("Alice");
    });
  });

  describe("view()", () => {
    it("renders active page", () => {
      const initResult = router.init(new URL("http://localhost/users/42"));
      const model = Array.isArray(initResult) ? initResult[0] : initResult;

      const dispatched: any[] = [];
      const vnode = router.view(model, (msg) => dispatched.push(msg));

      expect(vnode.tag).toBe("div");
      expect(vnode.children.length).toBeGreaterThan(0);
    });

    it("renders empty div when no page", () => {
      const model: RouterModel<TestShared> = {
        shared: { user: null },
        url: new URL("http://localhost/"),
        _page: null,
        _cache: new Map(),
      };
      const vnode = router.view(model, () => {});
      expect(vnode.tag).toBe("div");
    });
  });

  describe("listen()", () => {
    it("returns a valid subscription", () => {
      const sub = router.listen();
      expect(sub).toHaveLength(2);
      expect(typeof (sub as any)[0]).toBe("function");
    });

    it("fires immediately on subscribe", () => {
      const msgs: any[] = [];
      const [runner, props] = router.listen() as [any, any];
      const cleanup = runner((msg: any) => msgs.push(msg), props);
      cleanup();
      expect(msgs.length).toBeGreaterThanOrEqual(1);
      expect(msgs[0].tag).toBe("@@router/UrlChanged");
    });
  });

  describe("href()", () => {
    it("generates URL from route + params", () => {
      expect(router.href(userRoute, { id: "42" })).toBe("/users/42");
      expect(router.href(homeRoute, {})).toBe("/");
    });
  });

  describe("updateShared()", () => {
    it("creates UpdateShared message", () => {
      const fn = (s: TestShared) => s;
      const msg = router.updateShared(fn);
      expect(msg.tag).toBe("@@router/UpdateShared");
      expect((msg as any).fn).toBe(fn);
    });
  });
});

// ══════════════════════════════════════════════════════════════
// Page Lifecycle — save / load
// ══════════════════════════════════════════════════════════════

describe("page lifecycle", () => {
  it("calls save() on old page and init() on new page during transition", () => {
    const saved: any[] = [];
    const inited: any[] = [];

    const pageA: PageConfig<string, never, {}, {}> = {
      init: () => { inited.push("A"); return "A"; },
      update: (m) => m,
      view: (m) => h("div", {}, m),
      save: (m) => { saved.push(m); return m; },
    };

    const pageB: PageConfig<string, never, {}, {}> = {
      init: () => { inited.push("B"); return "B"; },
      update: (m) => m,
      view: (m) => h("div", {}, m),
    };

    const rA = route("/a");
    const rB = route("/b");
    const router = createRouter<{}>({
      routes: [page(rA, pageA), page(rB, pageB)],
      shared: {},
    });

    const initResult = router.init(new URL("http://localhost/a"));
    const model = Array.isArray(initResult) ? initResult[0] : initResult;
    expect(inited).toEqual(["A"]);

    const result = router.update(model, {
      tag: "@@router/UrlChanged",
      url: new URL("http://localhost/b"),
    });
    const next = Array.isArray(result) ? result[0] : result;

    expect(saved).toEqual(["A"]);
    expect(inited).toEqual(["A", "B"]);
    expect((next._page!.model as any)).toBe("B");
  });

  it("calls load() when returning to a cached page", () => {
    const loadCalls: any[] = [];

    const pageA: PageConfig<{ count: number }, never, {}, {}> = {
      init: () => ({ count: 0 }),
      update: (m) => m,
      view: (m) => h("div", {}, String(m.count)),
      save: (m) => m,
      load: (saved) => { loadCalls.push(saved); return saved as { count: number }; },
    };

    const pageB: PageConfig<string, never, {}, {}> = {
      init: () => "B",
      update: (m) => m,
      view: (m) => h("div", {}, m),
    };

    const rA = route("/a");
    const rB = route("/b");
    const router = createRouter<{}>({
      routes: [page(rA, pageA), page(rB, pageB)],
      shared: {},
    });

    // Init on page A
    let model = Array.isArray(router.init(new URL("http://localhost/a")))
      ? (router.init(new URL("http://localhost/a")) as any)[0]
      : router.init(new URL("http://localhost/a")) as RouterModel<{}>;

    // Update page A model to count=5
    model = {
      ...model,
      _page: { ...model._page!, model: { count: 5 } },
    };

    // Navigate to B (saves A)
    let result = router.update(model, {
      tag: "@@router/UrlChanged",
      url: new URL("http://localhost/b"),
    });
    model = Array.isArray(result) ? result[0] : result;

    // Navigate back to A (should load from cache)
    result = router.update(model, {
      tag: "@@router/UrlChanged",
      url: new URL("http://localhost/a"),
    });
    model = Array.isArray(result) ? result[0] : result;

    expect(loadCalls.length).toBe(1);
    expect(loadCalls[0]).toEqual({ count: 5 });
    expect((model._page!.model as any).count).toBe(5);
  });
});

// ══════════════════════════════════════════════════════════════
// Guards
// ══════════════════════════════════════════════════════════════

describe("guards", () => {
  it("allows navigation when guard returns true", () => {
    const router = createRouter<TestShared>({
      routes: [
        page(route("/"), makeSimplePage("home")),
        page(route("/admin"), makeSimplePage("admin"), {
          guard: (_params, shared) => (shared.user ? true : "/"),
        }),
      ],
      shared: { user: "Alice" },
    });

    const result = router.init(new URL("http://localhost/admin"));
    const model = Array.isArray(result) ? result[0] : result;
    expect((model._page!.model as any).label).toBe("admin");
  });

  it("redirects when guard returns URL string", () => {
    const router = createRouter<TestShared>({
      routes: [
        page(route("/"), makeSimplePage("home")),
        page(route("/admin"), makeSimplePage("admin"), {
          guard: (_params, shared) => (shared.user ? true : "/"),
        }),
      ],
      shared: { user: null },
    });

    const result = router.init(new URL("http://localhost/admin"));
    const model = Array.isArray(result) ? result[0] : result;
    // Guard redirected to "/" → home page
    expect((model._page!.model as any).label).toBe("home");
  });

  it("handles redirect chains with depth limit", () => {
    const router = createRouter<TestShared>({
      routes: [
        page(route("/a"), makeSimplePage("a"), { guard: () => "/b" }),
        page(route("/b"), makeSimplePage("b"), { guard: () => "/c" }),
        page(route("/c"), makeSimplePage("c"), { guard: () => "/a" }), // creates loop
      ],
      shared: { user: null },
      notFound: notFoundPage,
    });

    // Should terminate after max depth (5) and show notFound
    const result = router.init(new URL("http://localhost/a"));
    const model = Array.isArray(result) ? result[0] : result;
    expect(model._page!.routeIdx).toBe(-1); // notFound
  });
});

// ══════════════════════════════════════════════════════════════
// routerLink()
// ══════════════════════════════════════════════════════════════

describe("routerLink()", () => {
  it("returns href and onClick", () => {
    const link = routerLink("/about");
    expect(link.href).toBe("/about");
    expect(typeof link.onClick).toBe("function");
  });
});

// ══════════════════════════════════════════════════════════════
// Page init with effects
// ══════════════════════════════════════════════════════════════

describe("page init effects", () => {
  it("returns mapped effects from page init", () => {
    let effectRan = false;
    const pageWithEffect: PageConfig<string, string, {}, {}> = {
      init: () => ["model", [[(d: any) => { effectRan = true; d("loaded"); }, null]]] as const,
      update: (m, msg) => msg,
      view: (m) => h("div", {}, m),
    };

    const router = createRouter<{}>({
      routes: [page(route("/"), pageWithEffect)],
      shared: {},
    });

    const result = router.init(new URL("http://localhost/"));
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      const [model, cmd] = result;
      expect(cmd.length).toBe(1);
      // Run the mapped effect
      const effect = cmd[0]!;
      effect[0]((msg: any) => {
        expect(msg.tag).toBe("@@router/PageMsg");
        expect(msg.msg).toBe("loaded");
      }, effect[1]);
      expect(effectRan).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// Backward Compatibility
// ══════════════════════════════════════════════════════════════

describe("matchRoute() (deprecated)", () => {
  it("matches exact path", () => {
    expect(matchRoute("/", "/")).toEqual({});
    expect(matchRoute("/about", "/about")).toEqual({});
  });

  it("returns null for non-match", () => {
    expect(matchRoute("/about", "/contact")).toBeNull();
    expect(matchRoute("/a/b", "/a")).toBeNull();
    expect(matchRoute("/a", "/a/b")).toBeNull();
  });

  it("captures named parameters", () => {
    expect(matchRoute("/user/:id", "/user/42")).toEqual({ id: "42" });
    expect(matchRoute("/user/:id/post/:pid", "/user/1/post/99")).toEqual({
      id: "1",
      pid: "99",
    });
  });

  it("decodes URI components", () => {
    expect(matchRoute("/search/:q", "/search/hello%20world")).toEqual({
      q: "hello world",
    });
  });

  it("matches wildcard", () => {
    expect(matchRoute("/files/*", "/files/a/b/c")).toEqual({ "*": "a/b/c" });
    expect(matchRoute("/files/*", "/files/")).toEqual({ "*": "" });
  });

  it("handles trailing slashes", () => {
    expect(matchRoute("/about", "/about/")).toEqual({});
  });

  it("returns null on malformed URI", () => {
    expect(matchRoute("/search/:q", "/search/%E0%A4%A")).toBeNull();
  });

  it("normalizes redundant slashes", () => {
    expect(matchRoute("//user//:id//", "///user///42///")).toEqual({ id: "42" });
  });
});

describe("onRoute() (deprecated)", () => {
  it("creates valid subscription", () => {
    const routes: Route<string>[] = [
      { path: "/", handler: () => "home" },
    ];
    const sub = onRoute(routes);
    expect(sub).toHaveLength(2);
    expect(typeof (sub as any)[0]).toBe("function");
  });

  it("fires handler for matching route", () => {
    let received: string | undefined;
    history.replaceState(null, "", "/");

    const routes: Route<string>[] = [
      { path: location.pathname, handler: () => "matched" },
    ];
    const [runner, props] = onRoute(routes) as [any, any];
    const cleanup = runner((msg: string) => { received = msg; }, props);
    cleanup();
    expect(received).toBe("matched");
  });

  it("fires notFound for unmatched route", () => {
    let received: string | undefined;
    history.pushState(null, "", "/nonexistent-xyz");

    const routes: Route<string>[] = [
      { path: "/only-this", handler: () => "found" },
    ];
    const [runner, props] = onRoute(routes, (path) => `404:${path}`) as [any, any];
    const cleanup = runner((msg: string) => { received = msg; }, props);
    cleanup();
    history.pushState(null, "", "/");
    expect(received).toContain("404:");
  });
});
