import {
  AnyType,
  arrayType,
  BooleanType,
  callExpr,
  CallExpr,
  CheckEnv,
  checkValue,
  constGetType,
  EmptyPath,
  EvalEnv,
  EvalExpr,
  EvalType,
  getPrimitiveConstant,
  GetReturnType,
  isArrayType,
  NullExpr,
  NumberType,
  objectType,
  propertyExpr,
  StringType,
  toNative,
  toValue,
  valueExpr,
  ValueExpr,
  valueExprWithDeps,
  valueExprWithError,
} from "./ast";
import { createBasicEnv } from "./evaluate";
import { createPartialEnv, PartialEvalEnv } from "./partialEvaluate";
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

/**
 * Helper to evaluate an expression with a value bound to _ and optionally a lambda variable.
 * Works with abstract EvalEnv.
 */
function evalWithValue(
  env: EvalEnv,
  value: ValueExpr,
  ind: number | null,
  expr: EvalExpr,
): ValueExpr {
  const bindValue = valueExpr(ind);
  let scopeEnv: EvalEnv;
  let toEval: EvalExpr;

  if (expr.type === "lambda") {
    // Bind both lambda variable and _ to enable both access patterns
    scopeEnv = env.newScope({ [expr.variable]: bindValue, _: value });
    toEval = expr.expr;
  } else {
    // Just bind _ for property access
    scopeEnv = env.newScope({ _: value });
    toEval = expr;
  }

  const result = scopeEnv.evaluateExpr(toEval);
  if (result.type !== "value") {
    throw new Error(`evalWithValue expected ValueExpr but got ${result.type}`);
  }
  return result;
}

/**
 * Creates a FunctionValue from an evaluate function that returns EvalExpr directly.
 */
function functionValue(
  evaluate: (env: EvalEnv, call: CallExpr) => EvalExpr,
  getType: GetReturnType,
): ValueExpr {
  return {
    type: "value",
    function: {
      eval: evaluate,
      getType,
    },
  };
}

function stringFunction(after: (s: string) => string) {
  return functionValue((env, { args }) => {
    const partials = args.map((arg) => env.evaluateExpr(arg));

    // Check if all are fully evaluated
    if (partials.every((p) => p.type === "value")) {
      return valuesToString(partials as ValueExpr[], after);
    }

    // Return symbolic call with partially evaluated args
    return { type: "call", function: "string", args: partials };
  }, constGetType(StringType));
}

const flatFunction = functionValue(
  (env, call) => {
    const partials = call.args.map((arg) => env.evaluateExpr(arg));

    // Check if all arguments are fully evaluated
    const allFullyEvaluated = partials.every((p) => p.type === "value");
    if (!allFullyEvaluated) {
      // At least one argument is symbolic - return symbolic call
      return { ...call, args: partials };
    }

    // All arguments are ValueExpr - proceed with concrete evaluation
    return valueExpr((partials as ValueExpr[]).flatMap((v) => allElems(v)));
  },
  constGetType(arrayType([])),
);

export const objectFunction = functionValue(
  (env, call) => {
    const partials = call.args.map((arg) => env.evaluateExpr(arg));

    // Check if all arguments are fully evaluated
    const allFullyEvaluated = partials.every((p) => p.type === "value");
    if (!allFullyEvaluated) {
      // At least one argument is symbolic - return symbolic call
      return { ...call, args: partials };
    }

    // All arguments are ValueExpr - proceed with object construction
    const args = partials as ValueExpr[];
    const outObj: Record<string, ValueExpr> = {};
    let i = 0;
    while (i < args.length - 1) {
      outObj[toNative(args[i++]) as string] = args[i++];
    }
    return valueExpr(outObj);
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
): ValueExpr {
  return binEvalFunction2(returnType, (aE, bE, env, call) => {
    // Partially evaluate both operands using new API
    const a = env.evaluateExpr(aE);
    const b = env.evaluateExpr(bE);

    // Null propagation: if either arg is null, return null
    const deps: ValueExpr[] = [];
    if (a.type === "value") {
      deps.push(a);
      if (a.value == null) {
        if (b.type === "value") {
          deps.push(b);
        }
        return valueExprWithDeps(null, deps);
      }
    }
    if (b.type === "value") {
      deps.push(b);
      if (b.value == null) {
        return valueExprWithDeps(null, deps);
      }
    }

    // Check if both operands are fully evaluated (and neither is null, checked above)
    if (a.type === "value" && b.type === "value") {
      return valueExprWithDeps(func(a.value, b.value, env), [a, b]);
    }

    // At least one operand is symbolic - return CallExpr
    return { ...call, args: [a, b] };
  });
}

// New API version - callback returns EvalExpr directly
function binEvalFunction2(
  returnType: GetReturnType,
  func: (a: EvalExpr, b: EvalExpr, e: EvalEnv, c: CallExpr) => EvalExpr,
): ValueExpr {
  return functionValue((env, call) => {
    if (call.args.length != 2) {
      return valueExprWithError(null, `$${call.function} expects 2 arguments`);
    }
    const [a, b] = call.args;
    return func(a, b, env, call);
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
  return functionValue((env, call) => {
    // Use evaluateExpr for partial evaluation
    const partials = call.args.map((arg) => env.evaluateExpr(arg));

    // Check if all are fully evaluated
    if (partials.every((p) => p.type === "value")) {
      return run(partials as ValueExpr[]);
    }

    // Return symbolic call with partially evaluated args
    return { ...call, args: partials };
  }, returnType);
}

function arrayFunc(
  toValue: (values: ValueExpr[], arrayValue?: ValueExpr) => ValueExpr,
) {
  return functionValue(
    (env, call) => {
      const partials = call.args.map((arg) => env.evaluateExpr(arg));

      // Check if all arguments are fully evaluated
      const allFullyEvaluated = partials.every((p) => p.type === "value");
      if (!allFullyEvaluated) {
        // At least one argument is symbolic - return symbolic call
        return { ...call, args: partials };
      }

      // All arguments are ValueExpr - proceed with concrete evaluation
      const v = partials as ValueExpr[];
      if (v.length == 1 && Array.isArray(v[0].value)) {
        return toValue(v[0].value as ValueExpr[], v[0]);
      }
      return toValue(v);
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
  (env, call) => {
    const [c, ...args] = call.args;
    const condPartial = env.evaluateExpr(c);

    // If condition is symbolic, return symbolic call
    if (condPartial.type !== "value") {
      return { ...call, args: [condPartial, ...args] };
    }

    const cond = condPartial as ValueExpr;
    let i = 0;
    while (i < args.length - 1) {
      const compare = args[i++];
      const value = args[i++];
      const compPartial = env.evaluateExpr(compare);

      // If comparison value is symbolic, we can't determine the branch
      if (compPartial.type !== "value") {
        // Return symbolic call with partially evaluated args
        const partialArgs: EvalExpr[] = [condPartial];
        for (let j = 0; j < i - 2; j++) partialArgs.push(args[j]);
        partialArgs.push(compPartial);
        for (let j = i; j < args.length; j++) partialArgs.push(args[j]);
        return { ...call, args: partialArgs };
      }

      const compValue = compPartial as ValueExpr;
      const cv = compValue.value;
      const cva = Array.isArray(cv) ? cv.map((x) => x.value) : [cv];
      if (cva.find((x) => env.compare(x, cond.value) === 0)) {
        const valuePartial = env.evaluateExpr(value);
        if (valuePartial.type !== "value") {
          return valuePartial;
        }
        return valueExprWithDeps((valuePartial as ValueExpr).value, [
          cond,
          compValue,
          valuePartial as ValueExpr,
        ]);
      }
    }
    return valueExprWithDeps(null, [cond]);
  },
  (e, call) => {
    return mapCallArgs(call, e, (argTypes) => {
      const resultTypes = argTypes.filter((_, i) => i > 0 && i % 2 === 0);
      return getElementType(arrayType(resultTypes));
    });
  },
);

const mapFunction = binEvalFunction2(
  constGetType(AnyType),
  (left, right, env, call) => {
    const leftPartial = env.evaluateExpr(left);
    if (!right) return valueExprWithError(null, "No map expression");

    // Check if we got a fully evaluated array
    if (leftPartial.type === "value") {
      const { value } = leftPartial;
      if (Array.isArray(value)) {
        // Map over the array, using partial evaluation for each element
        const partialResults: EvalExpr[] = [];
        for (const elem of value as ValueExpr[]) {
          // Partially evaluate the right side with current element bound to _
          const vars: Record<string, EvalExpr> =
            right.type === "lambda"
              ? { [right.variable]: elem, _: elem }
              : { _: elem };
          const toEval = right.type === "lambda" ? right.expr : right;
          const result = env.newScope(vars).evaluateExpr(toEval);
          partialResults.push(result);
        }

        // Check if all results are fully evaluated
        const allFullyEvaluated = partialResults.every(
          (r) => r.type === "value",
        );
        if (allFullyEvaluated) {
          // All elements evaluated - return concrete array
          return { ...leftPartial, value: partialResults as ValueExpr[] };
        }

        // At least one element is symbolic - return symbolic array
        return { type: "array", values: partialResults };
      }
      return valueExprWithError(
        null,
        "Can't map value: " + printExpr(leftPartial),
      );
    }

    // Left side is symbolic - return symbolic map call
    return callExpr("map", [leftPartial, right]);
  },
);

const flatmapFunction = functionValue(
  (env: EvalEnv, call: CallExpr) => {
    const [left, right] = call.args;
    const leftPartial = env.evaluateExpr(left);
    if (!right) return valueExprWithError(null, "No map expression");

    // Check if we got a fully evaluated value
    if (leftPartial.type === "value") {
      const { value } = leftPartial;
      if (Array.isArray(value)) {
        const vals: ValueExpr[] = [];
        for (let i = 0; i < value.length; i++) {
          const elem = value[i] as ValueExpr;
          const result = evalWithValue(env, elem, i, right);
          vals.push(result);
        }
        return {
          ...leftPartial,
          value: vals.flatMap((v) => allElems(v)),
        };
      }
      if (typeof value === "object") {
        if (value == null) return NullExpr;
        return evalWithValue(env, leftPartial, null, right);
      } else {
        return valueExprWithError(
          null,
          "Can't map value: " + printExpr(leftPartial),
        );
      }
    }

    // Left side is symbolic (ArrayExpr, VarExpr, etc.) - return symbolic flatmap
    return { ...call, args: [leftPartial, right] };
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
      const leftPartial = env.evaluateExpr(left);

      // Check if we got a fully evaluated value
      if (leftPartial.type !== "value") {
        // Left side is symbolic - return symbolic call
        return { ...call, args: [leftPartial, right] };
      }

      const { value } = leftPartial;
      if (value == null) {
        return NullExpr;
      }
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const v = evalWithValue(env, value[i], i, right);
          const res = callback(i, value, v, env);
          if (res) {
            return res;
          }
        }
        return finished;
      }
      return valueExprWithError(
        null,
        `$${name} only works on arrays: ${printExpr(leftPartial)}`,
      );
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
    const leftPartial = env.evaluateExpr(left);
    if (!right) return valueExprWithError(null, "No filter expression");

    // Check if we got a fully evaluated value
    if (leftPartial.type !== "value") {
      // Left side is symbolic - return symbolic filter call
      return { ...call, args: [leftPartial, right] };
    }

    const { value } = leftPartial;
    if (Array.isArray(value)) {
      const empty = value.length === 0;
      const indexResult = evalWithValue(
        env,
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

        return additionalDeps.length > 0
          ? { type: "value" as const, value: null, deps: additionalDeps }
          : NullExpr;
      }

      if (typeof firstFilter === "number") {
        const element = value[firstFilter];
        if (!element) return NullExpr;

        // Check if index or array has dependencies
        const indexHasDeps =
          (indexResult.deps && indexResult.deps.length > 0) ||
          indexResult.path != null;
        const arrayHasDeps = leftPartial.deps && leftPartial.deps.length > 0;

        // If neither index nor array has deps, return element as-is
        if (!indexHasDeps && !arrayHasDeps) {
          return element;
        }

        // Index is dynamic OR array has deps
        // Add parent reference - if element is array, children get deps when extracted via allElems
        const parentWithDeps: ValueExpr = {
          type: "value",
          deps: [indexResult, ...(leftPartial.deps || [])],
          path: element.path,
        };

        return { ...element, deps: [...(element.deps || []), parentWithDeps] };
      }
      const accArray: ValueExpr[] = firstFilter === true ? [value[0]] : [];
      for (let ind = 1; ind < value.length; ind++) {
        const x = value[ind] as ValueExpr;
        const filterResult = evalWithValue(env, x, ind, right);
        if (filterResult.value === true) accArray.push(x);
      }
      return valueExpr(accArray);
    }
    if (value == null) {
      return NullExpr;
    }
    if (typeof value === "object") {
      // Evaluate key expression with the object as current context
      const keyResult = evalWithValue(env, leftPartial, null, right);
      const { value: firstFilter } = keyResult;

      // Handle null key - return null with preserved dependencies
      if (firstFilter === null) {
        const additionalDeps: ValueExpr[] = [
          keyResult,
          ...(leftPartial.deps || []),
        ];

        return additionalDeps.length > 0
          ? { type: "value" as const, value: null, deps: additionalDeps }
          : NullExpr;
      }

      if (typeof firstFilter === "string") {
        const propValue = evalWithValue(
          env,
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
          return propValue;
        }

        // Key is dynamic OR object has deps
        // Add parent reference - if propValue is array, children get deps when extracted via allElems
        const parentWithDeps: ValueExpr = {
          type: "value",
          deps: [keyResult, ...(leftPartial.deps || [])],
          path: propValue.path,
        };

        return {
          ...propValue,
          deps: [...(propValue.deps || []), parentWithDeps],
        };
      }
      return valueExpr(null);
    }
    return valueExprWithError(
      null,
      "Can't filter value: " + printExpr(leftPartial),
    );
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
      return valueExprWithError(null, "Conditional expects 3 arguments");
    }
    const [condExpr, thenExpr, elseExpr] = call.args;
    const condVal = env.evaluateExpr(condExpr);

    // Only evaluate branches if condition is fully evaluated
    if (condVal.type === "value") {
      if (condVal.value === true) {
        const thenVal = env.evaluateExpr(thenExpr);
        // If result is a value, extract it; otherwise keep it as an expression
        return thenVal.type === "value"
          ? valueExprWithDeps(thenVal.value, [condVal, thenVal])
          : thenVal;
      } else if (condVal.value === false) {
        const elseVal = env.evaluateExpr(elseExpr);
        return elseVal.type === "value"
          ? valueExprWithDeps(elseVal.value, [condVal, elseVal])
          : elseVal;
      } else {
        // Condition evaluated to something other than true/false
        return valueExprWithDeps(null, [condVal]);
      }
    }

    // Condition is unknown - partially evaluate both branches
    const thenVal = env.evaluateExpr(thenExpr);
    const elseVal = env.evaluateExpr(elseExpr);
    return { ...call, args: [condVal, thenVal, elseVal] };
  },
  (e, call) =>
    mapCallArgs(call, e, (args) =>
      args.length == 3 ? unionType(args[1], args[2]) : AnyType,
    ),
);

const elemFunction = functionValue(
  (env, call) => {
    if (call.args.length !== 2) {
      return valueExprWithError(null, "elem expects 2 arguments");
    }
    const [arrayExpr, indexExpr] = call.args;
    const arrayPartial = env.evaluateExpr(arrayExpr);
    const indexPartial = env.evaluateExpr(indexExpr);

    // Check if both array and index are fully evaluated
    if (arrayPartial.type !== "value" || indexPartial.type !== "value") {
      // Return symbolic elem call
      return callExpr("elem", [arrayPartial, indexPartial]);
    }

    if (!Array.isArray(arrayPartial.value)) {
      return NullExpr;
    }

    const index = indexPartial.value as number;
    const elem = (arrayPartial.value as ValueExpr[])?.[index];
    if (elem == null) {
      return NullExpr;
    }

    // Check if index or array has dependencies
    const indexHasDeps =
      (indexPartial.deps && indexPartial.deps.length > 0) ||
      indexPartial.path != null;
    const arrayHasDeps = arrayPartial.deps && arrayPartial.deps.length > 0;

    // If neither index nor array has deps, return element as-is
    if (!indexHasDeps && !arrayHasDeps) {
      return elem;
    }

    // Index is dynamic OR array has deps - preserve element but add dependencies
    const combinedDeps: ValueExpr[] = [
      indexPartial,
      ...(arrayPartial.deps || []),
      ...(elem.deps || []),
    ];

    return { ...elem, deps: combinedDeps };
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
        return valueExprWithError(null, `${type} expects 1 argument`);
      }

      const [objExpr] = call.args;
      const objPartial = env.evaluateExpr(objExpr);

      // If object is symbolic, return symbolic call
      if (objPartial.type !== "value") {
        return { ...call, args: [objPartial] };
      }

      const objVal = objPartial as ValueExpr;
      if (objVal.value == null) {
        return NullExpr;
      }

      if (typeof objVal.value === "object" && !Array.isArray(objVal.value)) {
        const objValue = objVal.value as Record<string, ValueExpr>;
        const data =
          type === "keys"
            ? Object.keys(objValue).map((val) => valueExpr(val))
            : Object.values(objValue);
        return valueExprWithDeps(data, [objVal]);
      }

      return valueExprWithError(
        null,
        `${type} can only be called on an object but was called on: ` +
          (Array.isArray(objVal.value) ? "array" : typeof objVal.value),
      );
    },
    (env: CheckEnv, call: CallExpr) => {
      return checkValue(env, arrayType([AnyType]));
    },
  );

/**
 * Helper for short-circuiting boolean operators (AND/OR).
 * Evaluates arguments sequentially until short-circuit condition is met.
 * Uses new API - returns EvalExpr directly.
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
): EvalExpr {
  const deps: ValueExpr[] = [];
  const evaluatedArgs: EvalExpr[] = [];
  const identityValue = !shortCircuitValue; // true for AND, false for OR

  // Evaluate all arguments and collect them
  for (const arg of call.args) {
    const argPartial = env.evaluateExpr(arg);

    if (argPartial.type === "value") {
      const argResult = argPartial as ValueExpr;
      deps.push(argResult);

      // Short-circuit: if we hit the short-circuit value, stop immediately
      if (argResult.value === shortCircuitValue) {
        return valueExprWithDeps(shortCircuitValue, deps);
      }

      // If null, return null
      if (argResult.value == null) {
        return valueExprWithDeps(null, deps);
      }

      // If not a boolean, return null (error case)
      if (typeof argResult.value !== "boolean") {
        return valueExprWithDeps(null, deps);
      }

      // At this point, it must be the identity value (we checked short-circuit already)
      // Add it to evaluated args - we'll filter identity values later
    }

    // Add all args (symbolic and identity values) for potential filtering
    evaluatedArgs.push(argPartial);
  }

  // Filter out identity values (true for AND, false for OR)
  const filteredArgs = evaluatedArgs.filter(
    (arg) =>
      arg.type !== "value" ||
      typeof arg.value !== "boolean" ||
      arg.value !== identityValue,
  );

  // If no args remain after filtering, all were identity values
  if (filteredArgs.length === 0) {
    return valueExprWithDeps(defaultResult, deps);
  }

  // If only one arg remains, return it directly (no need for CallExpr)
  if (filteredArgs.length === 1) {
    return filteredArgs[0];
  }

  // Multiple args remain - return CallExpr with filtered args
  return { ...call, args: filteredArgs };
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
    (env, call) => {
      const currentValue = env.getCurrentValue();
      if (!currentValue) {
        // No current value - return symbolic
        return call;
      }
      return currentValue;
    },
    (e, _) => checkValue(e, e.dataType),
  ),
  keys: keysOrValuesFunction("keys"),
  values: keysOrValuesFunction("values"),
  merge: functionValue(
    (env, call) => {
      if (call.args.length === 0) {
        return valueExprWithError(null, "merge expects at least 1 argument");
      }

      const merged: Record<string, ValueExpr> = {};
      const partialArgs: EvalExpr[] = [];

      for (const arg of call.args) {
        const argPartial = env.evaluateExpr(arg);

        // If we encounter a symbolic value, return symbolic call
        if (argPartial.type !== "value") {
          // Include all evaluated args plus this symbolic one and remaining args
          partialArgs.push(
            ...call.args.slice(0, partialArgs.length),
            argPartial,
            ...call.args.slice(partialArgs.length + 1),
          );
          return { ...call, args: partialArgs };
        }

        const argVal = argPartial as ValueExpr;
        if (argVal.value == null) {
          return NullExpr;
        }

        if (typeof argVal.value === "object" && !Array.isArray(argVal.value)) {
          Object.assign(merged, argVal.value);
        }
      }

      return valueExpr(merged);
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

/**
 * Create a BasicEvalEnv with default functions and root data.
 */
export function basicEnv(root: unknown): EvalEnv {
  return createBasicEnv(root, defaultFunctions);
}

/**
 * Create a PartialEvalEnv with default functions.
 * Optionally bind root data to the `_` variable.
 */
export function partialEnv(data?: unknown): PartialEvalEnv {
  if (data !== undefined) {
    const dataValue = toValue(EmptyPath, data);
    return createPartialEnv({ ...defaultFunctions, _: dataValue });
  }
  return createPartialEnv(defaultFunctions);
}

export const defaultCheckEnv: CheckEnv = {
  vars: Object.fromEntries(
    Object.entries(defaultFunctions).map((x) => [x[0], valueType(x[1])]),
  ),
  dataType: AnyType,
};
