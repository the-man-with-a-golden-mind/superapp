import { describe, expect, it } from "bun:test";
import { createDispatchSpy, getEffects, getModel, hasEffects, runEffect } from "../src/testing";
import type { Effect } from "../src/hyperapp";

describe("testing helpers", () => {
  it("unwraps plain and effectful update results", () => {
    const effect: Effect<string, { ok: boolean }> = [() => {}, { ok: true }];
    const plain = { n: 1 };
    const withFx = [{ n: 2 }, [effect]] as const;

    expect(getModel(plain)).toEqual({ n: 1 });
    expect(getEffects(plain)).toEqual([]);
    expect(hasEffects(plain)).toBe(false);

    expect(getModel(withFx)).toEqual({ n: 2 });
    expect(getEffects(withFx)).toEqual([effect]);
    expect(hasEffects(withFx)).toBe(true);
  });

  it("records dispatched messages including batches", () => {
    const spy = createDispatchSpy<string>();

    spy.dispatch("a");
    spy.dispatch(["b", "c"]);

    expect(spy.messages).toEqual(["a", "b", "c"]);
    expect(spy.last()).toBe("c");

    spy.clear();
    expect(spy.messages).toEqual([]);
  });

  it("runs an effect with its typed props", () => {
    let value = "";
    const effect: Effect<string, { name: string }> = [
      (dispatch, props) => dispatch(props.name),
      { name: "ok" },
    ];

    runEffect(effect, (msg) => {
      value = msg as string;
    });

    expect(value).toBe("ok");
  });
});
