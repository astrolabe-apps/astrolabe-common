import {
  CallExpr,
  emptyEnvState,
  envEffect,
  EvalData,
  EvalEnv,
  functionValue,
  mapAllEnv,
  mapEnv,
  NullExpr,
  toNative,
  valueExpr,
  ValueExpr,
  valueExprWithDeps,
} from "./ast";
import {
  BasicEvalEnv,
  doEvaluate,
  evaluateAll,
  evaluateWith,
} from "./evaluate";
import { allElems, valuesToString } from "./values";
import { printExpr } from "./printExpr";

const stringFunction = functionValue((e, { args }) =>
  mapEnv(evaluateAll(e, args), (x) => valuesToString(x)),
);

const flatFunction = functionValue((e, call) => {
  const allArgs = mapAllEnv(e, call.args, doEvaluate);
  return mapEnv(allArgs, (x) => valueExpr(x.flatMap(allElems)));
});

export const objectFunction = functionValue((e, call) => {
  return mapEnv(evaluateAll(e, call.args), (args) => {
    const outObj: Record<string, unknown> = {};
    let i = 0;
    while (i < args.length - 1) {
      outObj[toNative(args[i++]) as string] = toNative(args[i++]);
    }
    return valueExprWithDeps(outObj, args);
  });
});

export function binFunction(
  func: (a: any, b: any, e: EvalEnv) => unknown,
): ValueExpr {
  return functionValue((env, call) => {
    const [nextEnv, [a, b]] = evaluateAll(env, call.args);
    if (a.value == null || b.value == null)
      return [nextEnv, valueExprWithDeps(null, [a, b])];
    return [
      nextEnv,
      valueExprWithDeps(func(a.value, b.value, nextEnv), [a, b]),
    ];
  });
}

export function compareFunction(toBool: (a: number) => boolean): ValueExpr {
  return binFunction((a, b, e) => toBool(e.compare(a, b)));
}

export function evalFunction(run: (args: unknown[]) => unknown): ValueExpr {
  return functionValue((e, call) =>
    mapEnv(evaluateAll(e, call.args), (a) =>
      valueExprWithDeps(run(a.map((x) => x.value)), a),
    ),
  );
}

function arrayFunc(
  toValue: (values: ValueExpr[], arrayValue?: ValueExpr) => ValueExpr,
) {
  return functionValue((e, call) => {
    let [ne, v] = mapAllEnv(e, call.args, doEvaluate);
    if (v.length == 1) {
      return [ne, toValue(v[0].value, v[0])];
    }
    return [ne, toValue(v)];
  });
}

function aggFunction<A>(init: A, op: (acc: A, x: unknown) => A): ValueExpr {
  function performOp(v: ValueExpr[]): unknown {
    return v.reduce(
      (a, { value: b }) => (a != null && b != null ? op(a as A, b) : null),
      init as A | null,
    );
  }
  return arrayFunc((v) => valueExprWithDeps(performOp(v), v));
}

export const whichFunction: ValueExpr = functionValue((e, call) => {
  const [c, ...args] = call.args;
  let [env, cond] = e.evaluate(c);
  let i = 0;
  while (i < args.length - 1) {
    const compare = args[i++];
    const value = args[i++];
    const [nextEnv, compValue] = env.evaluate(compare);
    env = nextEnv;
    if (compValue.value == cond.value) {
      return mapEnv(nextEnv.evaluate(value), (v) =>
        valueExprWithDeps(v.value, [cond, compValue]),
      );
    }
  }
  return [env, valueExprWithDeps(null, [cond])];
});

const mapFunction = functionValue((env: EvalEnv, call: CallExpr) => {
  const [left, right] = call.args;
  const [leftEnv, leftVal] = env.evaluate(left);
  const { value } = leftVal;
  if (Array.isArray(value)) {
    return mapEnv(
      mapAllEnv(leftEnv, leftVal.value, (e, elem: ValueExpr, i) =>
        evaluateWith(e, elem, i, right),
      ),
      (vals) => ({ ...leftVal, value: vals.flatMap(allElems) }),
    );
  }
  if (typeof value === "object") {
    if (value == null) return [leftEnv, NullExpr];
    return evaluateWith(leftEnv, leftVal, null, right);
  } else {
    return [
      leftEnv.withError("Can't map value: " + printExpr(leftVal)),
      NullExpr,
    ];
  }
});

const filterFunction = functionValue((env: EvalEnv, call: CallExpr) => {
  const [left, right] = call.args;
  const [leftEnv, leftVal] = env.evaluate(left);
  const { value } = leftVal;
  if (Array.isArray(value)) {
    const empty = value.length === 0;
    const [firstEnv, { value: firstFilter }] = evaluateWith(
      leftEnv,
      empty ? NullExpr : value[0],
      empty ? null : 0,
      right,
    );
    if (typeof firstFilter === "number") {
      return [firstEnv, value[firstFilter] ?? NullExpr];
    }
    const accArray: ValueExpr[] = firstFilter === true ? [value[0]] : [];
    const outEnv = value.reduce(
      (e, x: ValueExpr, ind) =>
        ind === 0
          ? e
          : envEffect(evaluateWith(e, x, ind, right), ({ value }) => {
              if (value === true) accArray.push(x);
            }),
      firstEnv,
    );
    return [outEnv, valueExpr(accArray)];
  }
  if (leftVal == null) {
    return [leftEnv, NullExpr];
  }
  return [
    leftEnv.withError("Can't filter value: " + printExpr(leftVal)),
    NullExpr,
  ];
});

const condFunction = functionValue((env: EvalEnv, call: CallExpr) => {
  return mapEnv(
    mapAllEnv(env, call.args, doEvaluate),
    ([{ value: c }, e1, e2]) => (c === true ? e1 : c === false ? e2 : NullExpr),
  );
});

const defaultFunctions = {
  "?": condFunction,
  "!": evalFunction((a) => !a[0]),
  and: binFunction((a, b) => a && b),
  or: binFunction((a, b) => a || b),
  "+": binFunction((a, b) => a + b),
  "-": binFunction((a, b) => a - b),
  "*": binFunction((a, b) => a * b),
  "/": binFunction((a, b) => a / b),
  ">": compareFunction((x) => x > 0),
  "<": compareFunction((x) => x < 0),
  "<=": compareFunction((x) => x <= 0),
  ">=": compareFunction((x) => x >= 0),
  "=": compareFunction((x) => x === 0),
  "!=": compareFunction((x) => x !== 0),
  array: flatFunction,
  string: stringFunction,
  sum: aggFunction(0, (acc, b) => acc + (b as number)),
  count: arrayFunc((acc, v) => valueExprWithDeps(acc.length, v ? [v] : [])),
  min: aggFunction(Number.MAX_VALUE, (a, b) => Math.min(a, b as number)),
  max: aggFunction(Number.MIN_VALUE, (a, b) => Math.max(a, b as number)),
  notEmpty: evalFunction(([a]) => !(a === "" || a == null)),
  which: whichFunction,
  object: objectFunction,
  elem: evalFunction((args) => {
    const elem = (args[0] as ValueExpr[])?.[args[1] as number];
    return elem == null ? null : elem.value;
  }),
  fixed: evalFunction(([num, digits]) =>
    typeof num === "number" && typeof digits === "number"
      ? num.toFixed(digits)
      : null,
  ),
  ".": mapFunction,
  "[": filterFunction,
  this: functionValue((e, call) => [e, e.current]),
};

export function addDefaults(evalEnv: EvalEnv) {
  return evalEnv.withVariables(Object.entries(defaultFunctions));
}

export function basicEnv(data: EvalData): EvalEnv {
  return addDefaults(new BasicEvalEnv(emptyEnvState(data)));
}