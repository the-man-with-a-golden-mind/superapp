// SuperApp — Effect creators
// Effects are [runner, props] tuples executed after state updates

import type { Dispatch, Effect } from "./hyperapp";

// ── Batch ──────────────────────────────────────────────────────

export function compactEffects<Msg>( // Renamed from batch to compactEffects
  ...effects: (Effect<Msg> | false | null | undefined)[]
): Effect<Msg>[] {
  return effects.filter(Boolean) as Effect<Msg>[];
}

// ── HTTP ───────────────────────────────────────────────────────

interface HttpProps<Msg> {
  url: string;
  options?: RequestInit;
  expect: "json" | "text";
  onOk: (data: any) => Msg;
  onError: (error: string) => Msg;
}

function httpFx<Msg>(dispatch: Dispatch<Msg>, props: HttpProps<Msg>): void {
  if (typeof props.url !== "string" || !props.url.trim()) {
    dispatch(props.onError("Invalid URL"));
    return;
  }

  fetch(props.url, props.options)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return props.expect === "json" ? r.json() : r.text();
    })
    .then((data) => dispatch(props.onOk(data)))
    .catch((e) => {
      const message = e instanceof Error ? e.message : String(e);
      dispatch(props.onError(message));
    });
}

export function http<Msg>(props: {
  url: string;
  options?: RequestInit;
  expect?: "json" | "text";
  onOk: (data: any) => Msg;
  onError: (error: string) => Msg;
}): Effect<Msg> {
  return [httpFx, { ...props, expect: props.expect ?? "json" }];
}

// ── Delay ──────────────────────────────────────────────────────

function delayFx<Msg>(
  dispatch: Dispatch<Msg>,
  props: { ms: number; msg: Msg },
): void {
  setTimeout(() => dispatch(props.msg), props.ms);
}

export function delay<Msg>(ms: number, msg: Msg): Effect<Msg> {
  return [delayFx, { ms, msg }];
}

// ── Navigate ───────────────────────────────────────────────────

function navFx<Msg>(
  _: Dispatch<Msg>,
  props: { url: string; replace: boolean },
): void {
  if (props.replace) {
    history.replaceState(null, "", props.url);
  } else {
    history.pushState(null, "", props.url);
  }
  dispatchEvent(new PopStateEvent("popstate"));
}

export function navigate<Msg>(url: string, replace = false): Effect<Msg> {
  return [navFx, { url, replace }];
}

// ── Console Log (debug) ────────────────────────────────────────

function logFx<Msg>(_: Dispatch<Msg>, args: any[]): void {
  console.log(...args);
}

export function log<Msg>(...args: any[]): Effect<Msg> {
  return [logFx, args];
}

// ── LocalStorage ───────────────────────────────────────────────

function storageSetFx<Msg>(
  _: Dispatch<Msg>,
  p: { key: string; value: string },
): void {
  try {
    localStorage.setItem(p.key, p.value);
  } catch {
    /* quota exceeded */
  }
}

export function storageSet<Msg>(key: string, value: string): Effect<Msg> {
  return [storageSetFx, { key, value }];
}

function storageGetFx<Msg>(
  dispatch: Dispatch<Msg>,
  p: { key: string; onResult: (v: string | null) => Msg },
): void {
  dispatch(p.onResult(localStorage.getItem(p.key)));
}

export function storageGet<Msg>(
  key: string,
  onResult: (value: string | null) => Msg,
): Effect<Msg> {
  return [storageGetFx, { key, onResult }];
}

// ── Dispatch (useful in batch) ─────────────────────────────────

function dispatchFx<Msg>(dispatch: Dispatch<Msg>, msg: Msg): void {
  dispatch(msg);
}

export function dispatchMsg<Msg>(msg: Msg): Effect<Msg> {
  return [dispatchFx, msg];
}
