import {
  AnyType,
  ArrayType,
  arrayType,
  CheckEnv,
  checkValue,
  CheckValue,
  EvalType,
  EvalExpr,
  functionType,
  isFunctionType,
  NeverType,
  objectType,
  primitiveType,
  ValueExpr,
} from "./ast";

export function checkAll<A, B>(
  env: CheckEnv,
  array: A[],
  f: (env: CheckEnv, value: A) => CheckValue<B>,
): CheckValue<B[]> {
  return array.reduce(
    (acc, x) => {
      const { env, value } = f(acc.env, x);
      return { env, value: [...acc.value, value] };
    },
    { env, value: [] } as CheckValue<B[]>,
  );
}

export function mapCheck<A, B>(
  checkValue: CheckValue<A>,
  f: (a: A) => B,
): CheckValue<B> {
  return { env: checkValue.env, value: f(checkValue.value) };
}
export function typeCheck(env: CheckEnv, expr: EvalExpr): CheckValue<EvalType> {
  if (!expr) debugger;
  switch (expr.type) {
    case "var":
      return { env, value: env.vars[expr.variable] || "any" };
    case "let":
      return typeCheck(
        expr.variables.reduce((env, [name, value]) => {
          const { env: newEnv, value: v } = typeCheck(env, value);
          if (name === "VehicleLimits") debugger;
          return {
            ...newEnv,
            vars: { ...newEnv.vars, [name]: v },
          };
        }, env),
        expr.expr,
      );
    case "array":
      return mapCheck(
        checkAll(env, expr.values, (env, value) => typeCheck(env, value)),
        (x) => arrayType(x, undefined),
      );
    case "call":
      const funcType = env.vars[expr.function];
      if (!funcType || !isFunctionType(funcType))
        return checkValue(env, primitiveType("any"));
      return funcType.returnType(env, expr);
    case "value":
      return {
        env,
        value: valueType(expr),
      };
    case "property":
      return doProperty(env, expr.property);
    case "lambda":
      return typeCheck(env, expr.expr);
  }
  function doProperty(env: CheckEnv, property: string): CheckValue<EvalType> {
    const type = env.dataType;
    if (type.type === "object") {
      return checkValue(env, type.fields[property] || primitiveType("any"));
    }
    return checkValue(env, primitiveType("any"));
  }
}

export function valueType(value: ValueExpr): EvalType {
  if (Array.isArray(value.value)) {
    return arrayType(value.value.map(valueType));
  }
  if (value.function) {
    return functionType(arrayType([]), value.function.getType);
  }
  return nativeType(value.value);
}

export function nativeType(value: unknown): EvalType {
  if (Array.isArray(value)) {
    return arrayType(value.map(nativeType));
  }
  const vt = typeof value;
  switch (vt) {
    case "string":
    case "number":
    case "boolean":
      return primitiveType(vt, value);
    case "object":
      return value == null
        ? primitiveType("null")
        : objectType(
            Object.fromEntries(
              Object.entries(value).map((x) => [x[0], nativeType(x[1])]),
            ),
          );
    default:
      return primitiveType("any");
  }
}

export function unionType(t1: EvalType, t2: EvalType): EvalType {
  if (t1.type === "never") return t2;
  if (t2.type === "never") return t1;
  if (t1.type === "object" && t2.type === "object") {
    const outFields = { ...t1.fields };
    for (const [key, value] of Object.entries(t2.fields)) {
      outFields[key] = outFields[key]
        ? unionType(outFields[key], value)
        : value;
    }
    return { type: "object", fields: outFields };
  }
  if (t1.type === "array" && t2.type === "array") {
    return arrayType([], unionType(getElementType(t1), getElementType(t2)));
  }
  if (t1.type === t2.type) return t1;
  return AnyType;
}
export function getElementType(type: ArrayType): EvalType {
  // union all positional types
  const elemType = type.positional.reduce(
    (acc, t) => unionType(acc, t),
    NeverType,
  );
  if (type.restType) return unionType(elemType, type.restType);
  return elemType;
}
