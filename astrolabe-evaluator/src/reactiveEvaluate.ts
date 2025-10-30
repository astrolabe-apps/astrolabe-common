import { Control } from "@astroapps/controls";
import {
  EmptyPath,
  EvalData,
  EvalEnv,
  EvalEnvState,
  Path,
  SourceLocation,
  ValueExpr,
  ValueExprValue,
  segmentPath,
  valueExpr,
} from "./ast";
import { BasicEvalEnv } from "./evaluate";
import {
  computeValueExpr as createComputedValueExpr,
  controlValueExpr,
} from "./reactiveValueExpr";
import { withPath, withDeps } from "./valueExprHelpers";
import { addDefaults } from "./defaultFunctions";

/**
 * Reactive evaluation environment.
 * Creates reactive ComputedValueExpr instances for computed values.
 */
export class ReactiveEvalEnv extends BasicEvalEnv {
  computeValueExpr(
    computeFn: () => ValueExprValue,
    path?: Path,
    location?: SourceLocation,
    deps?: ValueExpr[],
  ): ValueExpr {
    // Reactive evaluation: Create reactive ComputedValueExpr
    const extractedDeps = deps?.flatMap(({ path, deps }) => [
      ...(deps ?? []),
      ...(path ? [path] : []),
    ]);
    return createComputedValueExpr(
      computeFn,
      path,
      location,
      extractedDeps && extractedDeps.length > 0 ? extractedDeps : undefined,
    );
  }

  protected newEnv(newState: EvalEnvState): EvalEnv {
    // Ensure child environments are also reactive
    return new ReactiveEvalEnv(newState);
  }
}

/**
 * Create a reactive environment state from a Control.
 * Equivalent to emptyEnvState() but for reactive evaluation.
 */
export function reactiveEnvState(rootControl: Control<any>): EvalEnvState {
  const rootValueExpr = controlValueExpr(rootControl, EmptyPath);

  const data: EvalData = {
    root: rootValueExpr,
    getProperty(object: ValueExpr, property: string): ValueExpr {
      const propPath = object.path
        ? segmentPath(property, object.path)
        : undefined;
      const value = object.value;
      if (typeof value === "object" && value != null && !Array.isArray(value)) {
        const objValue = value as Record<string, ValueExpr>;
        const propValue = objValue[property];
        if (propValue) {
          // Preserve dependencies from parent object when accessing properties
          const combinedDeps: Path[] = [];
          if (object.deps) combinedDeps.push(...object.deps);
          if (propValue.deps) combinedDeps.push(...propValue.deps);

          // Update path and deps while preserving reactivity
          let result = withPath(propValue, propPath);
          if (combinedDeps.length > 0) {
            result = withDeps(result, combinedDeps);
          }
          return result;
        }
      }
      return valueExpr(null, propPath);
    },
  };

  return {
    data,
    current: rootValueExpr,
    localVars: {},
    parent: undefined,
    errors: [],
    compare: (v1: unknown, v2: unknown) => {
      const multiplier = Math.pow(10, 5);
      switch (typeof v1) {
        case "number":
          return (
            Math.round(multiplier * v1) -
            Math.round(multiplier * (v2 as number))
          );
        case "string":
          return v1.localeCompare(v2 as string);
        case "boolean":
          return v1 === v2 ? 0 : 1;
        default:
          return 1;
      }
    },
  };
}

/**
 * Create a reactive evaluation environment with default functions.
 * Equivalent to basicEnv() but for reactive evaluation.
 *
 * @param rootControl - Control instance containing the root data
 * @returns Reactive evaluation environment with default functions
 */
export function reactiveEnv(rootControl: Control<any>): EvalEnv {
  return addDefaults(new ReactiveEvalEnv(reactiveEnvState(rootControl)));
}
