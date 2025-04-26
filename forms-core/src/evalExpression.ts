import {
  DataExpression,
  DataMatchExpression,
  EntityExpression,
  ExpressionType,
  JsonataExpression,
  NotEmptyExpression,
} from "./entityExpression";
import {
  addAfterChangesCallback,
  ChangeListenerFunc,
  collectChange,
  collectChanges,
  Control,
  ControlChange,
  ensureMetaValue,
  SubscriptionTracker,
  updateComputedValue,
} from "@astroapps/controls";
import { schemaDataForFieldRef, SchemaDataNode } from "./schemaDataNode";
import { FormContextOptions } from "./formState";
import { SchemaInterface } from "./schemaInterface";
import jsonata from "jsonata";
import { getJsonPath, getRootDataNode } from "./controlDefinition";
import { v4 as uuidv4 } from "uuid";
import { jsonPathString, newScopedControl } from "./util";

export interface ExpressionEvalContext {
  coerce: (k: unknown) => unknown;
  dataNode: SchemaDataNode;
  formContext: Control<FormContextOptions>;
  schemaInterface: SchemaInterface;
}

export type ExpressionEval<T extends EntityExpression> = (
  expr: T,
  result: Control<any>,
  context: ExpressionEvalContext,
) => void;

const dataEval: ExpressionEval<DataExpression> = (
  fvExpr,
  result,
  { dataNode: node, coerce },
) => {
  updateComputedValue(result, () => {
    const otherField = schemaDataForFieldRef(fvExpr.field, node);
    return coerce(otherField.control?.value);
  });
};
const dataMatchEval: ExpressionEval<DataMatchExpression> = (
  matchExpr,
  result,
  { dataNode, coerce },
) => {
  updateComputedValue(result, () => {
    const otherField = schemaDataForFieldRef(matchExpr.field, dataNode);
    const fv = otherField?.control.value;
    return coerce(
      Array.isArray(fv) ? fv.includes(matchExpr.value) : fv === matchExpr.value,
    );
  });
};

const notEmptyEval: ExpressionEval<NotEmptyExpression> = (
  expr,
  result,
  { coerce, dataNode, formContext, schemaInterface },
) => {
  updateComputedValue(result, () => {
    const otherField = schemaDataForFieldRef(expr.field, dataNode);
    const fv = otherField.control?.value;
    const field = otherField.schema.field;
    return coerce(field && !schemaInterface.isEmptyValue(field, fv));
  });
};

export const jsonataEval: ExpressionEval<JsonataExpression> = (
  expr,
  result,
  ctx,
) => {
  const path = getJsonPath(ctx.dataNode);
  const pathString = jsonPathString(path, (x) => `#$i[${x}]`);
  const rootData = getRootDataNode(ctx.dataNode).control;
  const parsedJsonata = newScopedControl(result, () => {
    const jExpr = expr.expression;
    const fullExpr = pathString ? pathString + ".(" + jExpr + ")" : jExpr;
    try {
      return jsonata(fullExpr ? fullExpr : "null");
    } catch (e) {
      console.error(e);
      return jsonata("null");
    }
  });

  let doEval = true;
  let evalPromise: Promise<any>;
  const tracker = new SubscriptionTracker(() => {
    if (!doEval) {
      doEval = true;
      addAfterChangesCallback(() => evalPromise!.then(runJsonata));
    }
  });
  result.addCleanup(() => {
    doEval = false;
    tracker.cleanup();
  });
  async function runJsonata() {
    if (doEval) {
      doEval = false;
      tracker.collectUsage(parsedJsonata, ControlChange.Value);
      try {
        const evalResult = await parsedJsonata.current.value.evaluate(
          trackedValue(rootData, tracker.collectUsage),
        );
        collectChanges(tracker.collectUsage, () => {
          result.value = ctx.coerce(evalResult);
        });
      } finally {
        tracker.update();
      }
    }
  }
  evalPromise = runJsonata();
};

export const uuidEval: ExpressionEval<EntityExpression> = (_, result, ctx) => {
  updateComputedValue(result, () => ctx.coerce(uuidv4()));
};

export const defaultEvaluators: Record<string, ExpressionEval<any>> = {
  [ExpressionType.DataMatch]: dataMatchEval,
  [ExpressionType.Data]: dataEval,
  [ExpressionType.NotEmpty]: notEmptyEval,
  [ExpressionType.Jsonata]: jsonataEval,
  [ExpressionType.UUID]: uuidEval,
};
export function trackedValue<A>(
  c: Control<A>,
  tracker?: ChangeListenerFunc<any>,
): A {
  const cc = c.current;
  const cv = cc.value;
  if (cv == null) {
    t(ControlChange.Structure);
    return cv;
  }
  if (typeof cv !== "object") {
    t(ControlChange.Value);
    return cv;
  }
  t(ControlChange.Structure);
  return new Proxy(cv, {
    get(target: object, p: string | symbol, receiver: any): any {
      // if (p === restoreControlSymbol) return c;
      if (Array.isArray(cv)) {
        if (p === "length") return (cc.elements as any).length;
        if (typeof p === "symbol" || p[0] > "9" || p[0] < "0")
          return Reflect.get(cv, p);
        const nc = (cc.elements as any)[p];
        if (typeof nc === "function") return nc;
        if (nc == null) return null;
        return trackedValue(nc, tracker);
      }
      return trackedValue((cc.fields as any)[p], tracker);
    },
  }) as A;

  function t(cc: ControlChange) {
    return (tracker ?? collectChange)?.(c, cc);
  }
}
