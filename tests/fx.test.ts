import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { delay, compactEffects, navigate, log, storageSet, storageGet, dispatchMsg, http } from "../src/fx";
import type { Dispatch, Effect } from "../src/hyperapp";

describe("delay()", () => {
  it("dispatches message after timeout", async () => {
    type Msg = { tag: "Done" };
    let received: Msg | undefined;
    const dispatch: Dispatch<Msg> = (msg) => { received = msg; };
    const [runner, props] = delay<Msg>(50, { tag: "Done" });

    runner(dispatch, props);
    expect(received).toBeUndefined();

    await new Promise((r) => setTimeout(r, 100));
    expect(received).toEqual({ tag: "Done" });
  });
});

describe("compactEffects()", () => {
  it("filters falsy effects", () => {
    const fx1: Effect<string> = [() => {}, null];
    const fx2: Effect<string> = [() => {}, null];
    const result = compactEffects(fx1, null, false, undefined, fx2);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(fx1);
    expect(result[1]).toBe(fx2);
  });

  it("returns empty array for all falsy", () => {
    expect(compactEffects(null, false, undefined)).toEqual([]);
  });
});

describe("navigate()", () => {
  it("creates pushState effect", () => {
    const [runner, props] = navigate<string>("/test");
    expect(props).toEqual({ url: "/test", replace: false });
  });

  it("creates replaceState effect", () => {
    const [_, props] = navigate<string>("/test", true);
    expect(props).toEqual({ url: "/test", replace: true });
  });
});

describe("dispatchMsg()", () => {
  it("dispatches message immediately", () => {
    let received: string | undefined;
    const [runner, props] = dispatchMsg("hello");
    runner((msg) => { received = msg; }, props);
    expect(received).toBe("hello");
  });
});

describe("storageSet/Get", () => {
  beforeEach(() => localStorage.clear());

  it("sets and gets localStorage values", () => {
    const [setRunner, setProps] = storageSet<string>("key", "value");
    setRunner(() => {}, setProps);
    expect(localStorage.getItem("key")).toBe("value");

    let result: string | null | undefined;
    const [getRunner, getProps] = storageGet<string | null>("key", (v) => v);
    getRunner((v) => { result = v; }, getProps);
    expect(result).toBe("value");
  });
});

describe("http()", () => {
  it("creates effect with correct structure", () => {
    const effect = http<string>({
      url: "https://example.com",
      onOk: (data) => `ok:${data}`,
      onError: (err) => `err:${err}`,
    });

    expect(effect).toHaveLength(2);
    expect(typeof effect[0]).toBe("function");
    expect(effect[1].url).toBe("https://example.com");
    expect(effect[1].expect).toBe("json");
  });

  it("dispatches onError for invalid URL before fetch", () => {
    let received: string | undefined;
    const [runner, props] = http<string>({
      url: "",
      onOk: () => "ok",
      onError: (e) => `err:${e}`,
    });

    runner((msg) => { received = msg; }, props);
    expect(received).toBe("err:Invalid URL");
  });
});

describe("log()", () => {
  it("creates log effect", () => {
    const [runner, args] = log<never>("hello", 42);
    expect(args).toEqual(["hello", 42]);
  });
});
