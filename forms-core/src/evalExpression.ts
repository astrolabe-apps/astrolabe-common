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
  addCleanup,
  ChangeListenerFunc,
  collectChange,
  collectChanges,
  Control,
  ControlChange,
  createEffect,
  ensureMetaValue,
  newControl,
  SubscriptionTracker,
  updateComputedValue,
} from "@astroapps/controls";
import { schemaDataForFieldRef, SchemaDataNode } from "./schemaDataNode";
import { FormNode } from "./formNode";
import { FormContextOptions } from "./formState";
import { SchemaInterface } from "./schemaInterface";
import { useEffect, useMemo, useRef } from "react";
import jsonata from "jsonata";
import { getJsonPath, getRootDataNode } from "./controlDefinition";

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

const jsonataEval: ExpressionEval<JsonataExpression> = (expr, result, ctx) => {
  console.log("Running on:", result.uniqueId);
  const parsedJsonata = ensureMetaValue(result, "parsedJsonata", () => {
    return newComputedControl(() => {
      try {
        return jsonata(expr.expression ? expr.expression : "null");
      } catch (e) {
        console.error(e);
        return jsonata("null");
      }
    });
  });
  const rootData = getRootDataNode(ctx.dataNode).control;
  // getRootDataNode(ctx.dataNode).control, getJsonPath(ctx.parentNode);

  let doEval = true;
  let evalPromise: Promise<any>;
  const tracker = new SubscriptionTracker(() => {
    if (!doEval) {
      doEval = true;
      addAfterChangesCallback(() => evalPromise!.then(runJsonata));
    }
  });
  addCleanup(result, () => tracker.cleanup());
  async function runJsonata() {
    doEval = false;
    console.log("Running", expr.expression);
    const evalResult = await parsedJsonata.value.evaluate(
      trackedValue(ctx.dataNode.control, tracker.collectUsage),
    );
    tracker.update();
    result.value = ctx.coerce(evalResult);
    console.log(tracker, result.value);
  }
  evalPromise = runJsonata();
  // export function useJsonataExpression(
  //   jExpr: string,
  //   data: Control<any>,
  //   path: JsonPath[],
  //   bindings?: Control<Record<string, any>>,
  //   coerce: (v: any) => any = (x) => x,
  // ): Control<any> {
  //   const pathString = jsonPathString(path, (x) => `#$i[${x}]`);
  //   const fullExpr = pathString ? pathString + ".(" + jExpr + ")" : jExpr;
  //   const compiledExpr = useMemo(() => {
  //     try {
  //       return jsonata(jExpr ? fullExpr : "null");
  //     } catch (e) {
  //       console.error(e);
  //       return jsonata("null");
  //     }
  //   }, [fullExpr]);
  //   const control = useControl();
  //   const listenerRef = useRef<(() => void) | undefined>(undefined);
  //   const updateRef = useRef(0);
  //   const [ref] = useRefState(
  //     () =>
  //       new SubscriptionTracker(() => {
  //         const l = listenerRef.current;
  //         if (l) {
  //           listenerRef.current = undefined;
  //           addAfterChangesCallback(() => {
  //             listenerRef.current = l;
  //             l();
  //           });
  //         }
  //       }),
  //   );
  //   useEffect(() => {
  //     listenerRef.current = apply;
  //     apply();
  //     async function apply() {
  //       const tracker = ref.current;
  //       try {
  //         updateRef.current++;
  //         control.value = coerce(
  //           await compiledExpr.evaluate(
  //             trackedValue(data, tracker.collectUsage),
  //             collectChanges(tracker.collectUsage, () => bindings?.value),
  //           ),
  //         );
  //       } finally {
  //         if (!--updateRef.current) tracker.update();
  //       }
  //     }
  //   }, [compiledExpr]);
  //   useEffect(() => {
  //     return () => {
  //       listenerRef.current = undefined;
  //       ref.current.cleanup();
  //     };
  //   }, []);
  //   return control;
  // }
};

export const defaultEvaluators: Record<string, ExpressionEval<any>> = {
  [ExpressionType.DataMatch]: dataMatchEval,
  [ExpressionType.Data]: dataEval,
  [ExpressionType.NotEmpty]: notEmptyEval,
  [ExpressionType.Jsonata]: jsonataEval,
};

function newComputedControl<T>(compute: () => T): Control<T> {
  const c = newControl<any>(undefined);
  updateComputedValue(c, compute);
  return c.as();
}

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
