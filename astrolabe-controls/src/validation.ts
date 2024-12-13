import { ControlValidator } from "./types";

export function notEmpty<V>(msg: string): ControlValidator<V> {
  return (v: V) => (!v ? msg : undefined);
}
