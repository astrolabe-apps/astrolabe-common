import {
  AnyType,
  arrayType,
  BooleanType,
  CallExpr,
  CheckEnv,
  checkValue,
  constGetType,
  emptyEnvState,
  envEffect,
  EnvValue,
  EvalEnv,
  EvalExpr,
  EvalType,
  functionValue,
  getPrimitiveConstant,
  GetReturnType,
  isArrayType,
  mapAllEnv,
  mapEnv,
  NullExpr,
  NumberType,
  objectType,
  Path,
  propertyExpr,
  StringType,
  toNative,
  valueExpr,
  ValueExpr,
  ValueExprValue,
} from "./ast";
import {
  BasicEvalEnv,
  doEvaluate,
  evaluateAll,
  evaluateWith,
  evaluateWithValue,
} from "./evaluate";
import { allElems, valuesToString, addDepsRecursively } from "./values";
import { printExpr } from "./printExpr";
import { withDeps } from "./valueExprHelpers";
import {
  checkAll,
  getElementType,
  mapCallArgs,
  mapCheck,
  typeCheck,
  unionType,
  valueType,
} from "./typeCheck";

function stringFunction(after: (s: string) => string) {
  return functionValue(
    (e, { args }) =>
      mapEnv(evaluateAll(e, args), (x) => valuesToString(e, x, after)),
    constGetType(StringType),
  );
}

const flatFunction = functionValue(
  (e, call) => {
    const allArgs = mapAllEnv(e, call.args, doEvaluate);
    return mapEnv(allArgs, (x) =>
      e.computeValueExpr(
        () => x.flatMap(allElems),
        undefined,
        call.location,
        x,
      ),
    );
  },
  constGetType(arrayType([])),
);

export const objectFunction = functionValue(
  (e, call) => {
    return mapEnv(evaluateAll(e, call.args), (args) => {
      return e.computeValueExpr(
        () => {
          const outObj: Record<string, ValueExpr> = {};
          let i = 0;
          while (i < args.length - 1) {
            outObj[toNative(args[i++]) as string] = args[i++];
          }
          return outObj;
        },
        undefined,
        call.location,
        args,
      );
    });
  },
  (e, call) => {
    const allChecked = checkAll(e, call.args, (e, x) => typeCheck(e, x));
    return mapCheck(allChecked, (argTypes) => {
      const outObj: Record<string, EvalType> = {};
      let i = 0;
      while (i < argTypes.length - 1) {
        const fieldName = getPrimitiveConstant(argTypes[i++]);
        if (typeof fieldName === "string") {
          outObj[fieldName] = argTypes[i];
        }
        i++;
      }
      return objectType(outObj);
    });
  },
);

export function binFunction(
  func: (a: any, b: any, e: EvalEnv) => ValueExprValue,
  returnType: GetReturnType,
  name?: string,
): ValueExpr {
  return binEvalFunction(name ?? "_", returnType, (aE, bE, env) => {
    const [nextEnv, [a, b]] = evaluateAll(env, [aE, bE]);
    // Move null check inside computeValueExpr for reactivity
    return [
      nextEnv,
      nextEnv.computeValueExpr(
        () => {
          if (a.value == null || b.value == null) return null;
          return func(a.value, b.value, nextEnv);
        },
        undefined,
        undefined,
        [a, b],
      ),
    ];
  });
}

export function binEvalFunction(
  name: string,
  returnType: GetReturnType,
  func: (a: EvalExpr, b: EvalExpr, e: EvalEnv) => EnvValue<ValueExpr>,
): ValueExpr {
  return functionValue((env, call) => {
    if (call.args.length != 2)
      return [env.withError(`$${name} expects 2 arguments`), NullExpr];
    const [a, b] = call.args;
    return func(a, b, env);
  }, returnType);
}

export function compareFunction(toBool: (a: number) => boolean): ValueExpr {
  return binFunction(
    (a, b, e) => toBool(e.compare(a, b)),
    constGetType(BooleanType),
  );
}

export function evalFunction(
  run: (args: unknown[]) => unknown,
  returnType: GetReturnType,
): ValueExpr {
  return functionValue(
    (e, call) =>
      mapEnv(evaluateAll(e, call.args), (args) =>
        e.computeValueExpr(
          () => run(args.map((x) => x.value)) as ValueExprValue,
          undefined,
          call.location,
          args,
        ),
      ),
    returnType,
  );
}

export function evalFunctionExpr(
  run: (args: ValueExpr[]) => ValueExpr,
  returnType: GetReturnType,
): ValueExpr {
  return functionValue(
    (e, call) => mapEnv(evaluateAll(e, call.args), run),
    returnType,
  );
}

function arrayFunc(
  toValue: (values: ValueExpr[], arrayValue?: ValueExpr) => ValueExpr,
) {
  return functionValue(
    (e, call) => {
      let [ne, v] = mapAllEnv(e, call.args, doEvaluate);
      if (v.length == 1 && Array.isArray(v[0].value)) {
        return [ne, toValue(v[0].value as ValueExpr[], v[0])];
      }
      return [ne, toValue(v)];
    },
    constGetType(arrayType([])),
  );
}

function aggFunction<A extends ValueExprValue>(
  init: (v: ValueExpr[]) => A | null,
  op: (acc: A, x: unknown) => A,
): ValueExpr {
  function performOp(v: ValueExpr[]): ValueExprValue {
    return v.reduce(
      (a, { value: b }) => (a != null && b != null ? op(a as A, b) : null),
      init(v),
    );
  }
  return functionValue(
    (e, call) => {
      let [ne, v] = mapAllEnv(e, call.args, doEvaluate);
      // Move array extraction inside computeValueExpr for reactivity
      return [
        ne,
        ne.computeValueExpr(
          () => {
            if (v.length == 1 && Array.isArray(v[0].value)) {
              const arr = v[0].value;
              return performOp(arr);
            }
            return performOp(v);
          },
          undefined,
          call.location,
          v,
        ),
      ];
    },
    constGetType(arrayType([])),
  );
}

export const whichFunction: ValueExpr = functionValue(
  (e, call) => {
    const [c, ...args] = call.args;
    let [env, cond] = e.evaluate(c);
    let i = 0;
    while (i < args.length - 1) {
      const compare = args[i++];
      const value = args[i++];
      const [nextEnv, compValue] = env.evaluate(compare);
      env = nextEnv;
      const cv = compValue.value;
      const cva = Array.isArray(cv) ? cv.map((x) => x.value) : [cv];
      if (cva.find((x) => nextEnv.state.compare(x, cond.value) === 0)) {
        return mapEnv(nextEnv.evaluate(value), (v) =>
          nextEnv.computeValueExpr(() => v.value, undefined, call.location, [
            cond,
            compValue,
            v,
          ]),
        );
      }
    }
    return [
      env,
      env.computeValueExpr(() => null, undefined, call.location, [cond]),
    ];
  },
  (e, call) => {
    return mapCallArgs(call, e, (argTypes) => {
      const resultTypes = argTypes.filter((_, i) => i > 0 && i % 2 === 0);
      return getElementType(arrayType(resultTypes));
    });
  },
);

const mapFunction = functionValue((env, call) => {
  const [left, right] = call.args;
  const [leftEnv, leftVal] = env.evaluate(left);
  if (!right) return [leftEnv.withError("No map expression"), NullExpr];
  const { value } = leftVal;
  if (Array.isArray(value)) {
    return mapEnv(
      mapAllEnv(leftEnv, value, (e, elem) =>
        evaluateWithValue(e, elem, elem, right),
      ),
      (vals) =>
        leftEnv.computeValueExpr(() => vals, leftVal.path, call.location),
    );
  }
  return [
    leftEnv.withError("Can't map value: " + printExpr(leftVal)),
    NullExpr,
  ];
}, constGetType(AnyType));

const flatmapFunction = functionValue(
  (env: EvalEnv, call: CallExpr) => {
    const [left, right] = call.args;
    const [leftEnv, leftVal] = env.evaluate(left);
    if (!right) return [leftEnv.withError("No map expression"), NullExpr];
    const { value } = leftVal;
    if (Array.isArray(value)) {
      return mapEnv(
        mapAllEnv(leftEnv, value, (e, elem: ValueExpr, i) =>
          evaluateWith(e, elem, i, right),
        ),
        (vals) =>
          leftEnv.computeValueExpr(
            () => vals.flatMap(allElems),
            leftVal.path,
            call.location,
          ),
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
  },
  (env, call) => {
    const [left, right] = call.args;
    const context = typeCheck(env, left);
    let contextType = context.value;
    if (isArrayType(contextType)) {
      contextType = getElementType(contextType);
    }
    const newContext = { ...context.env, dataType: contextType };
    if (!right) return checkValue(newContext, AnyType);
    return typeCheck(newContext, right);
  },
);

function firstFunction(
  name: string,
  callback: (
    index: number,
    values: ValueExpr[],
    result: ValueExpr,
    env: EvalEnv,
    leftVal: ValueExpr,
  ) => ValueExpr | undefined,
  finished: ValueExpr = NullExpr,
): ValueExpr {
  return functionValue(
    (env, call) => {
      const [left, right] = call.args;
      const [leftEnv, leftVal] = env.evaluate(left);
      const { value } = leftVal;
      if (value == null) {
        return [leftEnv, NullExpr];
      }
      if (Array.isArray(value)) {
        let curEnv = leftEnv;
        for (let i = 0; i < value.length; i++) {
          const [nextEnv, v] = evaluateWith(curEnv, value[i], i, right);
          curEnv = nextEnv;
          const res = callback(i, value, v, curEnv, leftVal);
          if (res) {
            return [curEnv, res];
          }
        }
        return [curEnv, finished];
      }
      return [
        leftEnv.withError(
          `$${name} only works on arrays: ${printExpr(leftVal)}`,
        ),
        NullExpr,
      ];
    },
    (e, call) =>
      mapCallArgs(call, e, (args) =>
        isArrayType(args[0]) ? getElementType(args[0]) : AnyType,
      ),
  );
}

const filterFunction = functionValue(
  (env: EvalEnv, call: CallExpr) => {
    const [left, right] = call.args;
    const [leftEnv, leftVal] = env.evaluate(left);
    const { value } = leftVal;
    if (!right) return [leftEnv.withError("No filter expression"), NullExpr];
    if (Array.isArray(value)) {
      const empty = value.length === 0;
      const [firstEnv, indexResult] = evaluateWith(
        leftEnv,
        empty ? NullExpr : value[0],
        empty ? null : 0,
        right,
      );
      const { value: firstFilter } = indexResult;

      // Handle null index - return null with preserved dependencies
      if (firstFilter === null) {
        return [
          firstEnv,
          firstEnv.computeValueExpr(() => null, undefined, call.location, [
            leftVal,
            indexResult,
          ]),
        ];
      }

      if (typeof firstFilter === "number") {
        const element = value[firstFilter];
        if (!element) return [firstEnv, NullExpr];

        // Check if index or array has dependencies
        const indexHasDeps =
          (indexResult.deps && indexResult.deps.length > 0) ||
          indexResult.path != null;
        const arrayHasDeps = leftVal.deps && leftVal.deps.length > 0;

        // If neither index nor array has deps, return element as-is
        if (!indexHasDeps && !arrayHasDeps) {
          return [firstEnv, element];
        }

        // Index is dynamic OR array has deps - preserve element but add dependencies
        const additionalDeps: Path[] = [];
        if (indexResult.path) additionalDeps.push(indexResult.path);
        if (indexResult.deps) additionalDeps.push(...indexResult.deps);
        if (leftVal.deps) additionalDeps.push(...leftVal.deps);

        // Use addDepsRecursively to ensure nested array elements also get the dependencies
        return [firstEnv, addDepsRecursively(element, additionalDeps)];
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
      return [
        outEnv,
        outEnv.computeValueExpr(() => accArray, undefined, call.location),
      ];
    }
    if (value == null) {
      return [leftEnv, NullExpr];
    }
    if (typeof value === "object") {
      // Evaluate key expression with the object as current context
      const [keyEnv, keyResult] = evaluateWith(leftEnv, leftVal, null, right);
      const { value: firstFilter } = keyResult;

      // Handle null key - return null with preserved dependencies
      if (firstFilter === null) {
        return [
          keyEnv,
          keyEnv.computeValueExpr(() => null, undefined, call.location, [
            leftVal,
            keyResult,
          ]),
        ];
      }

      if (typeof firstFilter === "string") {
        const [propEnv, propValue] = evaluateWith(
          keyEnv,
          leftVal,
          null,
          propertyExpr(firstFilter),
        );

        // Check if key or object has dependencies
        const keyHasDeps =
          (keyResult.deps && keyResult.deps.length > 0) ||
          keyResult.path != null;
        const objectHasDeps = leftVal.deps && leftVal.deps.length > 0;

        // If neither key nor object has deps, return property value as-is
        if (!keyHasDeps && !objectHasDeps) {
          return [propEnv, propValue];
        }

        // Key is dynamic OR object has deps - preserve property but add dependencies
        const additionalDeps: Path[] = [];
        if (keyResult.path) additionalDeps.push(keyResult.path);
        if (keyResult.deps) additionalDeps.push(...keyResult.deps);
        if (leftVal.deps) additionalDeps.push(...leftVal.deps);

        // Use addDepsRecursively to ensure nested array elements also get the dependencies
        return [propEnv, addDepsRecursively(propValue, additionalDeps)];
      }
      return [
        keyEnv,
        keyEnv.computeValueExpr(() => null, undefined, call.location, [
          leftVal,
          keyResult,
        ]),
      ];
    }
    return [
      leftEnv.withError("Can't filter value: " + printExpr(leftVal)),
      NullExpr,
    ];
  },
  (env, call) => {
    const [left, right] = call.args;
    const context = typeCheck(env, left);
    let contextType = context.value;
    if (isArrayType(contextType)) {
      contextType = getElementType(contextType);
    }
    const newContext = { ...context.env, dataType: contextType };
    if (!right) return checkValue(newContext, AnyType);
    return typeCheck(newContext, right);
  },
);

const condFunction = functionValue(
  (env: EvalEnv, call: CallExpr) => {
    if (call.args.length !== 3) {
      return [env.withError("Conditional expects 3 arguments"), NullExpr];
    }
    const [condExpr, thenExpr, elseExpr] = call.args;

    // Evaluate all three expressions to track all dependencies
    const [env1, condVal] = env.evaluate(condExpr);
    const [env2, thenVal] = env1.evaluate(thenExpr);
    const [env3, elseVal] = env2.evaluate(elseExpr);

    // Selection happens inside computeValueExpr for reactivity
    return [
      env3,
      env3.computeValueExpr(
        () => {
          if (condVal.value === true) {
            return thenVal.value;
          } else if (condVal.value === false) {
            return elseVal.value;
          } else {
            return null;
          }
        },
        undefined,
        call.location,
        [condVal, thenVal, elseVal],
      ),
    ];
  },
  (e, call) =>
    mapCallArgs(call, e, (args) =>
      args.length == 3 ? unionType(args[1], args[2]) : AnyType,
    ),
);

const elemFunction = functionValue(
  (env, call) => {
    if (call.args.length !== 2) {
      return [env.withError("elem expects 2 arguments"), NullExpr];
    }
    const [arrayExpr, indexExpr] = call.args;
    const [env1, arrayVal] = env.evaluate(arrayExpr);
    const [env2, indexVal] = env1.evaluate(indexExpr);

    if (!Array.isArray(arrayVal.value)) {
      return [env2, NullExpr];
    }

    const index = indexVal.value as number;
    const elem = (arrayVal.value as ValueExpr[])?.[index];
    if (elem == null) {
      return [env2, NullExpr];
    }

    // Check if index or array has dependencies
    const indexHasDeps =
      (indexVal.deps && indexVal.deps.length > 0) || indexVal.path != null;
    const arrayHasDeps = arrayVal.deps && arrayVal.deps.length > 0;

    // If neither index nor array has deps, return element as-is
    if (!indexHasDeps && !arrayHasDeps) {
      return [env2, elem];
    }

    // Index is dynamic OR array has deps - preserve element but add dependencies
    const combinedDeps: Path[] = [];
    if (indexVal.path) combinedDeps.push(indexVal.path);
    if (indexVal.deps) combinedDeps.push(...indexVal.deps);
    if (arrayVal.deps) combinedDeps.push(...arrayVal.deps);
    if (elem.deps) combinedDeps.push(...elem.deps);

    return [env2, withDeps(elem, combinedDeps)];
  },
  (e, call) =>
    mapCallArgs(call, e, (args) =>
      isArrayType(args[0]) ? getElementType(args[0]) : AnyType,
    ),
);

export const keysOrValuesFunction = (type: string) =>
  functionValue(
    (env: EvalEnv, call: CallExpr) => {
      if (call.args.length !== 1) {
        return [env.withError(`${type} expects 1 argument`), NullExpr];
      }

      const [objExpr] = call.args;
      const [nextEnv, objVal] = env.evaluate(objExpr);

      if (objVal.value == null) {
        return [nextEnv, NullExpr];
      }

      if (typeof objVal.value === "object" && !Array.isArray(objVal.value)) {
        const objValue = objVal.value as Record<string, ValueExpr>;
        return [
          nextEnv,
          nextEnv.computeValueExpr(
            () => {
              const data =
                type === "keys"
                  ? Object.keys(objValue).map((val) => valueExpr(val))
                  : Object.values(objValue);
              return data;
            },
            undefined,
            call.location,
            [objVal],
          ),
        ];
      }

      return [
        nextEnv.withError(
          `${type} can only be called on an object but was called on: ` +
            (Array.isArray(objVal.value) ? "array" : typeof objVal.value),
        ),
        NullExpr,
      ];
    },
    (env: CheckEnv, call: CallExpr) => {
      return checkValue(env, arrayType([AnyType]));
    },
  );

/**
 * Helper for boolean operators (AND/OR) with full reactive evaluation.
 * Evaluates ALL arguments to track dependencies, then computes result reactively.
 * Note: This sacrifices short-circuit optimization for full reactivity.
 *
 * @param env - The evaluation environment
 * @param call - The function call expression
 * @param shortCircuitValue - The value that triggers short-circuit (false for AND, true for OR)
 * @param defaultResult - The result when all args match expected value (true for AND, false for OR)
 */
function shortCircuitBooleanOp(
  env: EvalEnv,
  call: CallExpr,
  shortCircuitValue: boolean,
  defaultResult: boolean,
): EnvValue<ValueExpr> {
  // Evaluate ALL arguments to track all dependencies
  const [finalEnv, evaluatedArgs] = mapAllEnv(env, call.args, doEvaluate);

  // Compute result inside computeValueExpr for reactivity
  return [
    finalEnv,
    finalEnv.computeValueExpr(
      () => {
        // Check each argument's value
        for (const argResult of evaluatedArgs) {
          // If we hit the short-circuit value, return it
          if (argResult.value === shortCircuitValue) {
            return shortCircuitValue;
          }

          // If null, return null
          if (argResult.value == null) {
            return null;
          }

          // If not a valid boolean, return null
          if (argResult.value !== !shortCircuitValue) {
            return null;
          }
        }

        // All arguments evaluated without short-circuiting
        return defaultResult;
      },
      undefined,
      call.location,
      evaluatedArgs,
    ),
  ];
}

// Short-circuiting AND operator - stops on false, returns true if all true
const andFunction = functionValue(
  (env: EvalEnv, call: CallExpr) =>
    shortCircuitBooleanOp(env, call, false, true),
  constGetType(BooleanType),
);

// Short-circuiting OR operator - stops on true, returns false if all false
const orFunction = functionValue(
  (env: EvalEnv, call: CallExpr) =>
    shortCircuitBooleanOp(env, call, true, false),
  constGetType(BooleanType),
);

export const defaultFunctions = {
  "?": condFunction,
  "!": evalFunction((a) => {
    const val = a[0];
    return typeof val === "boolean" ? !val : null;
  }, constGetType(BooleanType)),
  and: andFunction,
  or: orFunction,
  "+": binFunction((a, b) => a + b, constGetType(NumberType)),
  "-": binFunction((a, b) => a - b, constGetType(NumberType)),
  "*": binFunction((a, b) => a * b, constGetType(NumberType)),
  "/": binFunction((a, b) => a / b, constGetType(NumberType)),
  "%": binFunction((a, b) => a % b, constGetType(NumberType)),
  ">": compareFunction((x) => x > 0),
  "<": compareFunction((x) => x < 0),
  "<=": compareFunction((x) => x <= 0),
  ">=": compareFunction((x) => x >= 0),
  "=": compareFunction((x) => x === 0),
  "!=": compareFunction((x) => x !== 0),
  "??": functionValue(
    (env, call) => {
      return mapEnv(evaluateAll(env, call.args), (x) => {
        if (x.length !== 2) return NullExpr;
        // Selection happens inside computeValueExpr for reactivity
        return env.computeValueExpr(
          () => (x[0].value != null ? x[0].value : x[1].value),
          x[0].value != null ? x[0].path : x[1].path,
          call.location,
          x,
        );
      });
    },
    (e, call) =>
      mapCallArgs(call, e, (args) =>
        args.length == 2 ? unionType(args[0], args[1]) : AnyType,
      ),
  ),
  array: flatFunction,
  string: stringFunction((x) => x),
  lower: stringFunction((x) => x.toLowerCase()),
  upper: stringFunction((x) => x.toUpperCase()),
  first: firstFunction("first", (x, v, r, _env, leftVal) =>
    r.value === true ? v[x] : undefined,
  ),
  firstIndex: firstFunction("firstIndex", (x, _, r, env, leftVal) =>
    r.value === true
      ? env.computeValueExpr(() => x, undefined, undefined, [leftVal])
      : undefined,
  ),
  any: functionValue(
    (env, call) => {
      const [left, right] = call.args;
      const [leftEnv, leftVal] = env.evaluate(left);
      const { value } = leftVal;
      if (value == null) {
        return [leftEnv, NullExpr];
      }
      if (Array.isArray(value)) {
        let curEnv = leftEnv;
        for (let i = 0; i < value.length; i++) {
          const [nextEnv, v] = evaluateWith(curEnv, value[i], i, right);
          curEnv = nextEnv;
          if (v.value === true) {
            return [
              curEnv,
              curEnv.computeValueExpr(() => true, undefined, call.location, [
                leftVal,
              ]),
            ];
          }
        }
        return [
          curEnv,
          curEnv.computeValueExpr(() => false, undefined, call.location, [
            leftVal,
          ]),
        ];
      }
      return [
        leftEnv.withError(`any only works on arrays: ${printExpr(leftVal)}`),
        NullExpr,
      ];
    },
    (e, call) =>
      mapCallArgs(call, e, (args) =>
        isArrayType(args[0]) ? BooleanType : AnyType,
      ),
  ),
  all: functionValue(
    (env, call) => {
      const [left, right] = call.args;
      const [leftEnv, leftVal] = env.evaluate(left);
      const { value } = leftVal;
      if (value == null) {
        return [leftEnv, NullExpr];
      }
      if (Array.isArray(value)) {
        let curEnv = leftEnv;
        for (let i = 0; i < value.length; i++) {
          const [nextEnv, v] = evaluateWith(curEnv, value[i], i, right);
          curEnv = nextEnv;
          if (v.value !== true) {
            return [
              curEnv,
              curEnv.computeValueExpr(() => false, undefined, call.location, [
                leftVal,
              ]),
            ];
          }
        }
        return [
          curEnv,
          curEnv.computeValueExpr(() => true, undefined, call.location, [
            leftVal,
          ]),
        ];
      }
      return [
        leftEnv.withError(`all only works on arrays: ${printExpr(leftVal)}`),
        NullExpr,
      ];
    },
    (e, call) =>
      mapCallArgs(call, e, (args) =>
        isArrayType(args[0]) ? BooleanType : AnyType,
      ),
  ),
  contains: functionValue(
    (env, call) => {
      const [left, right] = call.args;
      const [leftEnv, leftVal] = env.evaluate(left);
      const { value } = leftVal;
      if (value == null) {
        return [leftEnv, NullExpr];
      }
      if (Array.isArray(value)) {
        let curEnv = leftEnv;
        for (let i = 0; i < value.length; i++) {
          const [nextEnv, v] = evaluateWith(curEnv, value[i], i, right);
          curEnv = nextEnv;
          if (curEnv.compare(value[i].value, v.value) === 0) {
            return [
              curEnv,
              curEnv.computeValueExpr(() => true, undefined, call.location, [
                leftVal,
              ]),
            ];
          }
        }
        return [
          curEnv,
          curEnv.computeValueExpr(() => false, undefined, call.location, [
            leftVal,
          ]),
        ];
      }
      return [
        leftEnv.withError(
          `contains only works on arrays: ${printExpr(leftVal)}`,
        ),
        NullExpr,
      ];
    },
    (e, call) =>
      mapCallArgs(call, e, (args) =>
        isArrayType(args[0]) ? BooleanType : AnyType,
      ),
  ),
  indexOf: firstFunction("indexOf", (i, v, r, env, leftVal) =>
    env.compare(v[i].value, r.value) === 0
      ? env.computeValueExpr(() => i, undefined, undefined, [leftVal])
      : undefined,
  ),
  sum: aggFunction<number>(
    () => 0,
    (acc, b) => acc + (b as number),
  ),
  count: functionValue(
    (e, call) => {
      let [ne, v] = mapAllEnv(e, call.args, doEvaluate);
      // Move array extraction inside computeValueExpr for reactivity
      return [
        ne,
        ne.computeValueExpr(
          () => {
            if (v.length == 1 && Array.isArray(v[0].value)) {
              const arr = v[0].value as ValueExpr[];
              return arr.length;
            }
            return v.length;
          },
          undefined,
          call.location,
          v,
        ),
      ];
    },
    constGetType(arrayType([])),
  ),
  min: aggFunction(
    (v) => v[0]?.value as number,
    (a, b) => Math.min(a, b as number),
  ),
  max: aggFunction(
    (v) => v[0]?.value as number,
    (a, b) => Math.max(a, b as number),
  ),
  notEmpty: evalFunction(
    ([a]) => !(a === "" || a == null),
    constGetType(BooleanType),
  ),
  which: whichFunction,
  object: objectFunction,
  elem: elemFunction,
  fixed: evalFunction(
    ([num, digits]) =>
      typeof num === "number" && typeof digits === "number"
        ? num.toFixed(digits)
        : null,
    constGetType(StringType),
  ),
  ".": flatmapFunction,
  map: mapFunction,
  "[": filterFunction,
  this: functionValue(
    (e) => [e, e.current],
    (e, _) => checkValue(e, e.dataType),
  ),
  keys: keysOrValuesFunction("keys"),
  values: keysOrValuesFunction("values"),
};

export function addDefaults(evalEnv: EvalEnv) {
  return evalEnv.withVariables(Object.entries(defaultFunctions));
}

export function basicEnv(root: unknown): EvalEnv {
  return addDefaults(new BasicEvalEnv(emptyEnvState(root)));
}

export const defaultCheckEnv: CheckEnv = {
  vars: Object.fromEntries(
    Object.entries(defaultFunctions).map((x) => [x[0], valueType(x[1])]),
  ),
  dataType: AnyType,
};
