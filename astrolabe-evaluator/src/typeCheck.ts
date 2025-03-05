import { EvalEnvState, EvalExpr, ValueExpr } from "./ast";

interface PrimitiveType {
  type: "number" | "string" | "boolean" | "null" | "any";
  constant?: unknown;
}

interface ArrayType {
  type: "array";
  positional: EnvType[];
  restType?: EnvType;
}

interface ObjectType {
  type: "object";
  fields: Record<string, EnvType>;
}

interface FunctionType {
  type: "function";
  args: ArrayType;
  returnType: EnvType;
}

export type EnvType = PrimitiveType | ArrayType | ObjectType | FunctionType;

export function primitiveType(
  type: "number" | "string" | "boolean" | "null" | "any",
  constant?: unknown,
): PrimitiveType {
  return { type, constant };
}

export function arrayType(
  positional: EnvType[],
  restType?: EnvType,
): ArrayType {
  return { type: "array", positional, restType };
}

export function objectType(fields: Record<string, EnvType>): ObjectType {
  return { type: "object", fields };
}

export function isObjectType(type: EnvType): type is ObjectType {
  return type.type === "object";
}

export function functionType(
  args: ArrayType,
  returnType: EnvType,
): FunctionType {
  return { type: "function", args, returnType };
}

interface CheckEnv {
  vars: Record<string, EnvType>;
  dataType: EnvType;
}

interface CheckValue<A> {
  env: CheckEnv;
  value: A;
}

export function typeCheckState(
  envState: EvalEnvState,
  dataType: EnvType,
  expr: EvalExpr,
): CheckValue<EnvType> {
  return typeCheck(
    {
      vars: Object.fromEntries(
        Object.entries(envState.vars).map((x) => [x[0], valueType(x[1])]),
      ),
      dataType,
    },
    expr,
  );
}

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
export function typeCheck(env: CheckEnv, expr: EvalExpr): CheckValue<EnvType> {
  if (!expr) debugger;
  switch (expr.type) {
    case "var":
      return { env, value: env.vars[expr.variable] || "any" };
    case "let":
      return typeCheck(
        expr.variables.reduce(
          (env, [name, value]) => ({
            ...env,
            vars: { ...env.vars, [name]: typeCheck(env, value).value },
          }),
          env,
        ),
        expr.expr,
      );
    case "array":
      return mapCheck(
        checkAll(env, expr.values, (env, value) => typeCheck(env, value)),
        (x) => arrayType(x, undefined),
      );
    case "call":
      return { env, value: primitiveType("any") };
    case "value":
      return {
        env,
        value: valueType(expr),
      };
    case "property":
      return {
        env,
        value: primitiveType("any"),
      };
    case "lambda":
      return {
        env,
        value: functionType(arrayType([]), primitiveType("any")),
      };
  }
}

export function valueType(value: ValueExpr): EnvType {
  if (Array.isArray(value.value)) {
    return arrayType(value.value.map(valueType));
  }
  if (value.function) {
    return functionType(arrayType([]), primitiveType("any"));
  }
  return nativeType(value.value);
}

export function nativeType(value: unknown): EnvType {
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
