import {
  AnyType,
  arrayType,
  BooleanType,
  callExpr,
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
  propertyExpr,
  StringType,
  toNative,
  valueExpr,
  ValueExpr,
  valueExprWithDeps,
} from "./ast";
import {
  BasicEvalEnv,
  doEvaluate,
  doPartialEvaluate,
  evaluateAll,
  evaluateWith,
  evaluateWithValue,
} from "./evaluate";
import { allElems, valuesToString } from "./values";
import { printExpr } from "./printExpr";
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
      mapEnv(evaluateAll(e, args), (x) => valuesToString(x, after)),
    constGetType(StringType),
  );
}

const flatFunction = functionValue(
  (e, call) => {
    const [ne, partials] = mapAllEnv(e, call.args, doPartialEvaluate);

    // Check if all arguments are fully evaluated
    const allFullyEvaluated = partials.every(p => p.type === "value");
    if (!allFullyEvaluated) {
      // At least one argument is symbolic - return symbolic call
      return [ne, { ...call, args: partials }];
    }

    // All arguments are ValueExpr - proceed with concrete evaluation
    return [ne, valueExpr((partials as ValueExpr[]).flatMap((v) => allElems(v)))];
  },
  constGetType(arrayType([])),
);

export const objectFunction = functionValue(
  (e, call) => {
    const [ne, partials] = mapAllEnv(e, call.args, doPartialEvaluate);

    // Check if all arguments are fully evaluated
    const allFullyEvaluated = partials.every(p => p.type === "value");
    if (!allFullyEvaluated) {
      // At least one argument is symbolic - return symbolic call
      return [ne, { ...call, args: partials }];
    }

    // All arguments are ValueExpr - proceed with object construction
    const args = partials as ValueExpr[];
    const outObj: Record<string, ValueExpr> = {};
    let i = 0;
    while (i < args.length - 1) {
      outObj[toNative(args[i++]) as string] = args[i++];
    }
    return [ne, valueExpr(outObj)];
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
  func: (a: any, b: any, e: EvalEnv) => unknown,
  returnType: GetReturnType,
  name?: string,
): ValueExpr {
  return binEvalFunction(name ?? "_", returnType, (aE, bE, env) => {
    // Partially evaluate both operands
    const [env1, a] = env.evaluatePartial(aE);
    const [env2, b] = env1.evaluatePartial(bE);

    // Check if both operands are fully evaluated
    if (a.type === "value" && b.type === "value") {
      if (a.value == null || b.value == null)
        return [env2, valueExprWithDeps(null, [a, b])];
      return [
        env2,
        valueExprWithDeps(func(a.value, b.value, env2), [a, b]),
      ];
    }

    // At least one operand is symbolic - return CallExpr
    return [env2, { type: "call", function: name ?? "_", args: [a, b] }];
  });
}

export function binEvalFunction(
  name: string,
  returnType: GetReturnType,
  func: (a: EvalExpr, b: EvalExpr, e: EvalEnv) => EnvValue<EvalExpr>,
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
  return evalFunctionExpr(
    (a) => valueExprWithDeps(run(a.map((x) => x.value)), a),
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
      let [ne, partials] = mapAllEnv(e, call.args, doPartialEvaluate);

      // Check if all arguments are fully evaluated
      const allFullyEvaluated = partials.every(p => p.type === "value");
      if (!allFullyEvaluated) {
        // At least one argument is symbolic - return symbolic call
        return [ne, { ...call, args: partials }];
      }

      // All arguments are ValueExpr - proceed with concrete evaluation
      const v = partials as ValueExpr[];
      if (v.length == 1 && Array.isArray(v[0].value)) {
        return [ne, toValue(v[0].value as ValueExpr[], v[0])];
      }
      return [ne, toValue(v)];
    },
    constGetType(arrayType([])),
  );
}

function aggFunction<A>(
  init: (v: ValueExpr[]) => A | null,
  op: (acc: A, x: unknown) => A,
): ValueExpr {
  function performOp(v: ValueExpr[]): unknown {
    return v.reduce(
      (a, { value: b }) => (a != null && b != null ? op(a as A, b) : null),
      init(v),
    );
  }
  return arrayFunc((v) => valueExprWithDeps(performOp(v), v));
}

export const whichFunction: ValueExpr = functionValue(
  (e, call) => {
    const [c, ...args] = call.args;
    let [env, condPartial] = e.evaluatePartial(c);

    // If condition is symbolic, return symbolic call
    if (condPartial.type !== "value") {
      return [env, { ...call, args: [condPartial, ...args] }];
    }

    const cond = condPartial as ValueExpr;
    let i = 0;
    while (i < args.length - 1) {
      const compare = args[i++];
      const value = args[i++];
      const [nextEnv, compPartial] = env.evaluatePartial(compare);
      env = nextEnv;

      // If comparison value is symbolic, we can't determine the branch
      if (compPartial.type !== "value") {
        // Return symbolic call with partially evaluated args
        const partialArgs: EvalExpr[] = [condPartial];
        for (let j = 0; j < i - 2; j++) partialArgs.push(args[j]);
        partialArgs.push(compPartial);
        for (let j = i; j < args.length; j++) partialArgs.push(args[j]);
        return [env, { ...call, args: partialArgs }];
      }

      const compValue = compPartial as ValueExpr;
      const cv = compValue.value;
      const cva = Array.isArray(cv) ? cv.map((x) => x.value) : [cv];
      if (cva.find((x) => nextEnv.state.compare(x, cond.value) === 0)) {
        const [valueEnv, valuePartial] = nextEnv.evaluatePartial(value);
        if (valuePartial.type !== "value") {
          return [valueEnv, valuePartial];
        }
        return [valueEnv, valueExprWithDeps((valuePartial as ValueExpr).value, [cond, compValue, valuePartial as ValueExpr])];
      }
    }
    return [env, valueExprWithDeps(null, [cond])];
  },
  (e, call) => {
    return mapCallArgs(call, e, (argTypes) => {
      const resultTypes = argTypes.filter((_, i) => i > 0 && i % 2 === 0);
      return getElementType(arrayType(resultTypes));
    });
  },
);

const mapFunction = binEvalFunction(
  "map",
  constGetType(AnyType),
  (left, right, env) => {
    const [leftEnv, leftPartial] = env.evaluatePartial(left);
    if (!right) return [leftEnv.withError("No map expression"), NullExpr];

    // Check if we got a fully evaluated array
    if (leftPartial.type === "value") {
      const { value } = leftPartial;
      if (Array.isArray(value)) {
        // Map over the array, using partial evaluation for each element
        const [envAfter, partialResults] = mapAllEnv(leftEnv, value, (e, elem: ValueExpr) => {
          // Partially evaluate the right side with current element bound
          const [e2, toEval] = right.type === "lambda"
            ? [e.withVariables([[right.variable, elem]]), right.expr]
            : [e, right];
          return e2.withCurrent(elem).evaluatePartial(toEval);
        });

        // Check if all results are fully evaluated
        const allFullyEvaluated = partialResults.every(r => r.type === "value");
        if (allFullyEvaluated) {
          // All elements evaluated - return concrete array
          return [envAfter, { ...leftPartial, value: partialResults as ValueExpr[] }];
        }

        // At least one element is symbolic - return symbolic array
        return [envAfter, { type: "array", values: partialResults }];
      }
      return [
        leftEnv.withError("Can't map value: " + printExpr(leftPartial)),
        NullExpr,
      ];
    }

    // Left side is symbolic - return symbolic map call
    return [leftEnv, callExpr("map", [leftPartial, right])];
  },
);

const flatmapFunction = functionValue(
  (env: EvalEnv, call: CallExpr) => {
    const [left, right] = call.args;
    const [leftEnv, leftPartial] = env.evaluatePartial(left);
    if (!right) return [leftEnv.withError("No map expression"), NullExpr];

    // Check if we got a fully evaluated value
    if (leftPartial.type === "value") {
      const { value } = leftPartial;
      if (Array.isArray(value)) {
        return mapEnv(
          mapAllEnv(leftEnv, value, (e, elem: ValueExpr, i) =>
            evaluateWith(e, elem, i, right),
          ),
          (vals) => ({ ...leftPartial, value: vals.flatMap((v) => allElems(v)) }),
        );
      }
      if (typeof value === "object") {
        if (value == null) return [leftEnv, NullExpr];
        return evaluateWith(leftEnv, leftPartial, null, right);
      } else {
        return [
          leftEnv.withError("Can't map value: " + printExpr(leftPartial)),
          NullExpr,
        ];
      }
    }

    // Left side is symbolic (ArrayExpr, VarExpr, etc.) - return symbolic flatmap
    return [leftEnv, { ...call, args: [leftPartial, right] }];
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
  ) => ValueExpr | undefined,
  finished: ValueExpr = NullExpr,
): ValueExpr {
  return functionValue(
    (env, call) => {
      const [left, right] = call.args;
      const [leftEnv, leftPartial] = env.evaluatePartial(left);

      // Check if we got a fully evaluated value
      if (leftPartial.type !== "value") {
        // Left side is symbolic - return symbolic call
        return [leftEnv, { ...call, args: [leftPartial, right] }];
      }

      const { value } = leftPartial;
      if (value == null) {
        return [leftEnv, NullExpr];
      }
      if (Array.isArray(value)) {
        let curEnv = leftEnv;
        for (let i = 0; i < value.length; i++) {
          const [nextEnv, v] = evaluateWith(curEnv, value[i], i, right);
          curEnv = nextEnv;
          const res = callback(i, value, v, curEnv);
          if (res) {
            return [curEnv, res];
          }
        }
        return [curEnv, finished];
      }
      return [
        leftEnv.withError(
          `$${name} only works on arrays: ${printExpr(leftPartial)}`,
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
    const [leftEnv, leftPartial] = env.evaluatePartial(left);
    if (!right) return [leftEnv.withError("No filter expression"), NullExpr];

    // Check if we got a fully evaluated value
    if (leftPartial.type !== "value") {
      // Left side is symbolic - return symbolic filter call
      return [leftEnv, { ...call, args: [leftPartial, right] }];
    }

    const { value } = leftPartial;
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
        const additionalDeps: ValueExpr[] = [
          indexResult,
          ...(leftPartial.deps || []),
        ];

        return [
          firstEnv,
          additionalDeps.length > 0
            ? { type: "value" as const, value: null, deps: additionalDeps }
            : NullExpr,
        ];
      }

      if (typeof firstFilter === "number") {
        const element = value[firstFilter];
        if (!element) return [firstEnv, NullExpr];

        // Check if index or array has dependencies
        const indexHasDeps =
          (indexResult.deps && indexResult.deps.length > 0) ||
          indexResult.path != null;
        const arrayHasDeps = leftPartial.deps && leftPartial.deps.length > 0;

        // If neither index nor array has deps, return element as-is
        if (!indexHasDeps && !arrayHasDeps) {
          return [firstEnv, element];
        }

        // Index is dynamic OR array has deps
        // Add parent reference - if element is array, children get deps when extracted via allElems
        const parentWithDeps: ValueExpr = {
          type: "value",
          deps: [indexResult, ...(leftPartial.deps || [])],
          path: element.path,
        };

        return [
          firstEnv,
          { ...element, deps: [...(element.deps || []), parentWithDeps] },
        ];
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
    if (value == null) {
      return [leftEnv, NullExpr];
    }
    if (typeof value === "object") {
      // Evaluate key expression with the object as current context
      const [keyEnv, keyResult] = evaluateWith(leftEnv, leftPartial, null, right);
      const { value: firstFilter } = keyResult;

      // Handle null key - return null with preserved dependencies
      if (firstFilter === null) {
        const additionalDeps: ValueExpr[] = [
          keyResult,
          ...(leftPartial.deps || []),
        ];

        return [
          keyEnv,
          additionalDeps.length > 0
            ? { type: "value" as const, value: null, deps: additionalDeps }
            : NullExpr,
        ];
      }

      if (typeof firstFilter === "string") {
        const [propEnv, propValue] = evaluateWith(
          keyEnv,
          leftPartial,
          null,
          propertyExpr(firstFilter),
        );

        // Check if key or object has dependencies
        const keyHasDeps =
          (keyResult.deps && keyResult.deps.length > 0) ||
          keyResult.path != null;
        const objectHasDeps = leftPartial.deps && leftPartial.deps.length > 0;

        // If neither key nor object has deps, return property value as-is
        if (!keyHasDeps && !objectHasDeps) {
          return [propEnv, propValue];
        }

        // Key is dynamic OR object has deps
        // Add parent reference - if propValue is array, children get deps when extracted via allElems
        const parentWithDeps: ValueExpr = {
          type: "value",
          deps: [keyResult, ...(leftPartial.deps || [])],
          path: propValue.path,
        };

        return [
          propEnv,
          { ...propValue, deps: [...(propValue.deps || []), parentWithDeps] },
        ];
      }
      return [keyEnv, valueExpr(null)];
    }
    return [
      leftEnv.withError("Can't filter value: " + printExpr(leftPartial)),
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
    const [env1, condVal] = env.evaluatePartial(condExpr);

    // Only evaluate branches if condition is fully evaluated
    if (condVal.type === "value") {
      if (condVal.value === true) {
        const [env2, thenVal] = env1.evaluatePartial(thenExpr);
        // If result is a value, extract it; otherwise keep it as an expression
        return [env2, thenVal.type === "value"
          ? valueExprWithDeps(thenVal.value, [condVal, thenVal])
          : thenVal
        ];
      } else if (condVal.value === false) {
        const [env2, elseVal] = env1.evaluatePartial(elseExpr);
        return [env2, elseVal.type === "value"
          ? valueExprWithDeps(elseVal.value, [condVal, elseVal])
          : elseVal
        ];
      } else {
        // Condition evaluated to something other than true/false
        return [env1, valueExprWithDeps(null, [condVal])];
      }
    }

    // Condition is unknown - partially evaluate both branches
    const [env2, thenVal] = env1.evaluatePartial(thenExpr);
    const [env3, elseVal] = env2.evaluatePartial(elseExpr);
    return [env3, { ...call, args: [condVal, thenVal, elseVal] }];
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
    const [env1, arrayPartial] = env.evaluatePartial(arrayExpr);
    const [env2, indexPartial] = env1.evaluatePartial(indexExpr);

    // Check if both array and index are fully evaluated
    if (arrayPartial.type !== "value" || indexPartial.type !== "value") {
      // Return symbolic elem call
      return [env2, callExpr("elem", [arrayPartial, indexPartial])];
    }

    if (!Array.isArray(arrayPartial.value)) {
      return [env2, NullExpr];
    }

    const index = indexPartial.value as number;
    const elem = (arrayPartial.value as ValueExpr[])?.[index];
    if (elem == null) {
      return [env2, NullExpr];
    }

    // Check if index or array has dependencies
    const indexHasDeps =
      (indexPartial.deps && indexPartial.deps.length > 0) || indexPartial.path != null;
    const arrayHasDeps = arrayPartial.deps && arrayPartial.deps.length > 0;

    // If neither index nor array has deps, return element as-is
    if (!indexHasDeps && !arrayHasDeps) {
      return [env2, elem];
    }

    // Index is dynamic OR array has deps - preserve element but add dependencies
    const combinedDeps: ValueExpr[] = [
      indexPartial,
      ...(arrayPartial.deps || []),
      ...(elem.deps || []),
    ];

    return [env2, { ...elem, deps: combinedDeps }];
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
      const [nextEnv, objPartial] = env.evaluatePartial(objExpr);

      // If object is symbolic, return symbolic call
      if (objPartial.type !== "value") {
        return [nextEnv, { ...call, args: [objPartial] }];
      }

      const objVal = objPartial as ValueExpr;
      if (objVal.value == null) {
        return [nextEnv, NullExpr];
      }

      if (typeof objVal.value === "object" && !Array.isArray(objVal.value)) {
        const objValue = objVal.value as Record<string, ValueExpr>;
        const data =
          type === "keys"
            ? Object.keys(objValue).map((val) => valueExpr(val))
            : Object.values(objValue);
        return [nextEnv, valueExprWithDeps(data, [objVal])];
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
 * Helper for short-circuiting boolean operators (AND/OR).
 * Evaluates arguments sequentially until short-circuit condition is met.
 *
 * @param env - The evaluation environment
 * @param call - The function call expression
 * @param shortCircuitValue - The value that triggers short-circuiting (false for AND, true for OR)
 * @param defaultResult - The result when all args evaluated without short-circuit (true for AND, false for OR)
 */
function shortCircuitBooleanOp(
  env: EvalEnv,
  call: CallExpr,
  shortCircuitValue: boolean,
  defaultResult: boolean,
): EnvValue<EvalExpr> {
  const deps: ValueExpr[] = [];
  const partialArgs: EvalExpr[] = [];
  let currentEnv = env;

  for (const arg of call.args) {
    const [nextEnv, argPartial] = currentEnv.evaluatePartial(arg);
    currentEnv = nextEnv;

    // If we encounter a symbolic value, return symbolic call
    if (argPartial.type !== "value") {
      // Include all evaluated args plus this symbolic one and remaining args
      partialArgs.push(...deps, argPartial, ...call.args.slice(partialArgs.length + deps.length + 1));
      return [currentEnv, { ...call, args: partialArgs }];
    }

    const argResult = argPartial as ValueExpr;
    deps.push(argResult);

    // Short-circuit: if we hit the short-circuit value, stop evaluating
    if (argResult.value === shortCircuitValue) {
      return [currentEnv, valueExprWithDeps(shortCircuitValue, deps)];
    }

    // If null, return null
    if (argResult.value == null) {
      return [currentEnv, valueExprWithDeps(null, deps)];
    }

    // If not a valid boolean, return null
    if (argResult.value !== !shortCircuitValue) {
      return [currentEnv, valueExprWithDeps(null, deps)];
    }
  }

  // All arguments evaluated without short-circuiting
  return [currentEnv, valueExprWithDeps(defaultResult, deps)];
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
  "+": binFunction((a, b) => a + b, constGetType(NumberType), "+"),
  "-": binFunction((a, b) => a - b, constGetType(NumberType), "-"),
  "*": binFunction((a, b) => a * b, constGetType(NumberType), "*"),
  "/": binFunction((a, b) => a / b, constGetType(NumberType), "/"),
  "%": binFunction((a, b) => a % b, constGetType(NumberType), "%"),
  ">": compareFunction((x) => x > 0),
  "<": compareFunction((x) => x < 0),
  "<=": compareFunction((x) => x <= 0),
  ">=": compareFunction((x) => x >= 0),
  "=": compareFunction((x) => x === 0),
  "!=": compareFunction((x) => x !== 0),
  "??": evalFunctionExpr(
    (x) => {
      if (x.length !== 2) return NullExpr;
      // If first arg is not null, return it
      if (x[0].value != null) return x[0];
      // First arg is null, return second arg but preserve dependencies from first arg
      const combinedDeps: ValueExpr[] = [x[0], x[1]];
      return { ...x[1], deps: combinedDeps };
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
  first: firstFunction("first", (x, v, r) =>
    r.value === true ? v[x] : undefined,
  ),
  firstIndex: firstFunction("firstIndex", (x, _, r) =>
    r.value === true ? valueExpr(x) : undefined,
  ),
  any: firstFunction(
    "any",
    (_, __, r) => (r.value === true ? valueExpr(true) : undefined),
    valueExpr(false),
  ),
  all: firstFunction(
    "all",
    (_, __, r) => (r.value !== true ? valueExpr(false) : undefined),
    valueExpr(true),
  ),
  contains: firstFunction(
    "contains",
    (i, v, r, env) =>
      env.compare(v[i].value, r.value) === 0 ? valueExpr(true) : undefined,
    valueExpr(false),
  ),
  indexOf: firstFunction("indexOf", (i, v, r, env) =>
    env.compare(v[i].value, r.value) === 0 ? valueExpr(i) : undefined,
  ),
  sum: aggFunction(
    () => 0,
    (acc, b) => acc + (b as number),
  ),
  count: arrayFunc((acc, v) => valueExprWithDeps(acc.length, v ? [v] : [])),
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
    (e, call) => {
      if (e.current === undefined) {
        // No current value - return symbolic
        return [e, call];
      }
      return [e, e.current];
    },
    (e, _) => checkValue(e, e.dataType),
  ),
  keys: keysOrValuesFunction("keys"),
  values: keysOrValuesFunction("values"),
  merge: functionValue(
    (env, call) => {
      if (call.args.length === 0) {
        return [env.withError("merge expects at least 1 argument"), NullExpr];
      }

      const merged: Record<string, ValueExpr> = {};
      const partialArgs: EvalExpr[] = [];
      let currentEnv = env;

      for (const arg of call.args) {
        const [nextEnv, argPartial] = currentEnv.evaluatePartial(arg);
        currentEnv = nextEnv;

        // If we encounter a symbolic value, return symbolic call
        if (argPartial.type !== "value") {
          // Include all evaluated args plus this symbolic one and remaining args
          partialArgs.push(...call.args.slice(0, partialArgs.length), argPartial, ...call.args.slice(partialArgs.length + 1));
          return [currentEnv, { ...call, args: partialArgs }];
        }

        const argVal = argPartial as ValueExpr;
        if (argVal.value == null) {
          return [currentEnv, NullExpr];
        }

        if (typeof argVal.value === "object" && !Array.isArray(argVal.value)) {
          Object.assign(merged, argVal.value);
        }
      }

      return [currentEnv, valueExpr(merged)];
    },
    (e) => checkValue(e, objectType({})),
  ),
  floor: evalFunction((args) => {
    if (args.length != 1) return null;
    const [num] = args;
    return typeof num === "number" ? Math.floor(num) : null;
  }, constGetType(NumberType)),
  ceil: evalFunction((args) => {
    if (args.length != 1) return null;
    const [num] = args;
    return typeof num === "number" ? Math.ceil(num) : null;
  }, constGetType(NumberType)),
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
