import { Control, newControl, updateComputedValue } from "@astroapps/controls";
import type { ValueExpr, ValueExprValue, Path, SourceLocation } from "./ast";
import { valueExpr } from "./ast";

// Base class for reactive implementations
abstract class ReactiveValueExprBase implements ValueExpr {
  readonly type = "value" as const;

  abstract get value(): ValueExprValue;

  constructor(
    public path?: Path,
    public location?: SourceLocation,
    public deps?: Path[],
  ) {}

  static isReactive(expr: ValueExpr): expr is ReactiveValueExprBase {
    return expr instanceof ReactiveValueExprBase;
  }
}

// 1. Computed reactive values (from compute function)
export class ComputedValueExpr extends ReactiveValueExprBase {
  private _control: Control<ValueExprValue>;

  get value(): ValueExprValue {
    return this._control.value;
  }

  constructor(
    control: Control<ValueExprValue>,
    path?: Path,
    location?: SourceLocation,
    deps?: Path[],
  ) {
    super(path, location, deps);
    this._control = control;
  }

  getControl(): Control<ValueExprValue> {
    return this._control;
  }
}

// 2. Control-backed reactive values (wraps existing Control<any>)
export class ControlBackedValueExpr extends ReactiveValueExprBase {
  private _control: Control<any>;

  get value(): ValueExprValue {
    const rawValue = this._control.value; // Reactive access!
    return shapeAsValueExprValue(this._control, rawValue, this.path);
  }

  constructor(
    control: Control<any>,
    path?: Path,
    location?: SourceLocation,
    deps?: Path[],
  ) {
    super(path, location, deps);
    this._control = control;
  }

  getControl(): Control<any> {
    return this._control;
  }
}

// Helper: Convert raw value to ValueExprValue shape using Control's reactive properties
function shapeAsValueExprValue(
  control: Control<any>,
  raw: any,
  path?: Path,
): ValueExprValue {
  // Primitives and null/undefined pass through
  if (raw === null || raw === undefined) return raw;
  if (
    typeof raw === "string" ||
    typeof raw === "number" ||
    typeof raw === "boolean"
  ) {
    return raw;
  }

  // Arrays - use simplified Proxy approach (following trackedValue.ts pattern)
  if (Array.isArray(raw)) {
    const elements = control.elements;

    // Proxy the actual raw array, not the control.elements
    return new Proxy(raw, {
      get(target, prop, receiver) {
        // Return length from control.elements
        if (prop === "length") {
          return elements.length;
        }

        // Handle numeric indices - get element control and wrap it
        if (typeof prop === "string" && /^\d+$/.test(prop)) {
          const idx = parseInt(prop, 10);
          if (idx >= 0 && idx < elements.length) {
            const elementControl = elements[idx];
            const itemPath = path
              ? { segment: String(idx), parent: path }
              : undefined;
            return new ControlBackedValueExpr(elementControl, itemPath);
          }
          return undefined;
        }

        // For all other properties (methods, symbols), use the raw array
        // This allows array methods like map, reduce, forEach to work naturally
        return Reflect.get(target, prop, receiver);
      },
    }) as any;
  }

  // Objects - use Proxy to wrap control.fields
  if (typeof raw === "object") {
    const fields = control.fields;

    // Create a Proxy that lazily creates ControlBackedValueExpr for each field
    return new Proxy(raw, {
      get(target, prop, receiver) {
        if (typeof prop === "string") {
          const propPath = path ? { segment: prop, parent: path } : undefined;
          return new ControlBackedValueExpr(fields[prop], propPath);
        }

        return Reflect.get(target, prop, receiver);
      },

      has(target, prop) {
        return Reflect.has(target, prop);
      },

      ownKeys(target) {
        return Reflect.ownKeys(target);
      },

      getOwnPropertyDescriptor(target, prop) {
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    }) as any;
  }

  // Fallback for unknown types
  return raw;
}

// Factory: Create computed reactive value
export function computeValueExpr(
  computeFn: () => ValueExprValue,
  path?: Path,
  location?: SourceLocation,
  deps?: Path[],
): ValueExpr {
  const control = newControl<ValueExprValue>(null);
  updateComputedValue(control, computeFn);
  return new ComputedValueExpr(control, path, location, deps);
}

// Factory: Wrap existing Control as reactive ValueExpr
export function controlValueExpr(
  control: Control<any>,
  path?: Path,
  location?: SourceLocation,
): ValueExpr {
  return new ControlBackedValueExpr(control, path, location);
}

// Re-export base for type checking
export { ReactiveValueExprBase };
