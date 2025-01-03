import { ControlValidator } from "./types";

export function notEmpty<V>(msg: string): (s: V) => string | undefined {
  return (v: V) => (!v ? msg : undefined);
}
