import { describe, it, expect } from "bun:test";
import { jsx, jsxs, jsxDEV, Fragment } from "../src/jsx-runtime";

describe("jsx()", () => {
  it("creates element VNode without children", () => {
    const node = jsx("div", { class: "test" });
    expect(node.tag).toBe("div");
    expect(node.props.class).toBe("test");
    expect(node.children).toHaveLength(0);
  });

  it("creates element VNode with single child", () => {
    const node = jsx("div", { children: "hello" });
    expect(node.tag).toBe("div");
    expect(node.children).toHaveLength(1);
    expect(node.children[0]!.tag).toBe("hello"); // text node
  });

  it("creates element VNode with multiple children", () => {
    const child1 = jsx("span", { children: "a" });
    const child2 = jsx("span", { children: "b" });
    const node = jsx("div", { children: [child1, child2] });
    expect(node.tag).toBe("div");
    expect(node.children).toHaveLength(2);
    expect(node.children[0]!.tag).toBe("span");
    expect(node.children[1]!.tag).toBe("span");
  });

  it("separates children from other props", () => {
    const node = jsx("input", { type: "text", value: "x", children: null });
    expect(node.props.type).toBe("text");
    expect(node.props.value).toBe("x");
    expect(node.props.children).toBeUndefined();
  });

  it("handles null props", () => {
    const node = jsx("div", null);
    expect(node.tag).toBe("div");
    expect(node.children).toHaveLength(0);
  });

  it("extracts key prop", () => {
    const node = jsx("li", { key: "item-1", children: "text" });
    expect(node.key).toBe("item-1");
  });
});

describe("jsxs()", () => {
  it("is an alias for jsx", () => {
    expect(jsxs).toBe(jsx);
  });
});

describe("jsxDEV()", () => {
  it("works like jsx", () => {
    const node = jsxDEV("div", { class: "test" });
    expect(node.tag).toBe("div");
    expect(node.props.class).toBe("test");
  });
});

describe("Fragment()", () => {
  it("renders children without wrapper element", () => {
    const child = jsx("span", { children: "hello" });
    const node = Fragment({ children: [child] });
    expect(node.tag).toBe("");
    expect(node.children).toHaveLength(1);
  });

  it("handles single child", () => {
    const child = jsx("span", { children: "hello" });
    const node = Fragment({ children: child });
    expect(node.children).toHaveLength(1);
  });

  it("handles no children", () => {
    const node = Fragment({});
    expect(node.children).toHaveLength(0);
  });
});
