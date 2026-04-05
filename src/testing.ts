import type { Cmd, Dispatch, Effect, UpdateResult } from "./hyperapp";

export function getModel<S, Msg>(result: UpdateResult<S, Msg>): S {
  return (Array.isArray(result) ? result[0] : result) as S;
}

export function getEffects<S, Msg>(result: UpdateResult<S, Msg>): Cmd<Msg> {
  return Array.isArray(result) ? result[1] : [];
}

export function hasEffects<S, Msg>(
  result: UpdateResult<S, Msg>,
): result is readonly [S, Cmd<Msg>] {
  return Array.isArray(result);
}

export function runEffect<Msg, Props>(
  effect: Effect<Msg, Props>,
  dispatch: Dispatch<Msg>,
): void {
  const [runner, props] = effect;
  runner(dispatch, props);
}

export function createDispatchSpy<Msg>() {
  const messages: Msg[] = [];

  const dispatch: Dispatch<Msg> = (msg) => {
    if (Array.isArray(msg)) {
      messages.push(...msg as readonly Msg[]);
      return;
    }
    messages.push(msg as Msg);
  };

  return {
    dispatch,
    messages,
    last(): Msg | undefined {
      return messages[messages.length - 1];
    },
    clear(): void {
      messages.length = 0;
    },
  };
}
