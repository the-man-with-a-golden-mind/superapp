import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { app, h } from "../src/hyperapp";

GlobalRegistrator.register();

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function measureSync(label: string, iterations: number, fn: () => void): void {
  fn();
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  const med = median(samples);
  const avg = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  console.log(`${label.padEnd(28)} median ${med.toFixed(3)} ms  avg ${avg.toFixed(3)} ms`);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function measureAsync(label: string, iterations: number, fn: () => Promise<void>): Promise<void> {
  await fn();
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  const med = median(samples);
  const avg = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  console.log(`${label.padEnd(28)} median ${med.toFixed(3)} ms  avg ${avg.toFixed(3)} ms`);
}

function rowView(items: number[]) {
  return h("table", {}, h("tbody", {},
    ...items.map((item) =>
      h("tr", { key: item }, h("td", {}, String(item)), h("td", {}, `Item ${item}`)),
    ),
  ));
}

async function main() {
  console.log("SuperApp benchmark");
  console.log("------------------");

  measureSync("mount 1000 keyed rows", 25, () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const instance = app({
      init: { items: Array.from({ length: 1_000 }, (_, index) => index) },
      update: (state: { items: number[] }) => state,
      view: (state: { items: number[] }) => rowView(state.items),
      node: root,
    });
    instance.destroy();
    root.remove();
  });

  await measureAsync("reverse 1000 keyed rows", 20, async () => {
    type State = { items: number[] };
    type Msg = { tag: "Reverse" };

    const root = document.createElement("div");
    document.body.appendChild(root);
    const initial = Array.from({ length: 1_000 }, (_, index) => index);
    const instance = app<State, Msg>({
      init: { items: initial },
      update: (state, msg) => msg.tag === "Reverse" ? { items: [...state.items].reverse() } : state,
      view: (state) => rowView(state.items),
      node: root,
    });

    instance.dispatch({ tag: "Reverse" });
    await nextFrame();
    instance.destroy();
    root.remove();
  });

  await measureAsync("dispatch 10000 msgs", 20, async () => {
    type State = { count: number };
    type Msg = { tag: "Inc" };

    const root = document.createElement("div");
    document.body.appendChild(root);
    const instance = app<State, Msg>({
      init: { count: 0 },
      update: (state) => ({ count: state.count + 1 }),
      view: (state) => h("div", {}, String(state.count)),
      node: root,
    });

    for (let i = 0; i < 10_000; i++) instance.dispatch({ tag: "Inc" });
    await nextFrame();
    instance.destroy();
    root.remove();
  });
}

await main();
