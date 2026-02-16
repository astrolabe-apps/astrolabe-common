import {
  ControlDefinition,
  createFormStateNode,
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  createSchemaTree,
  defaultEvaluators,
  defaultResolveChildNodes,
  defaultSchemaInterface,
  DynamicPropertyType,
  EntityExpression,
  ExpressionEvalContext,
  FormNodeOptions,
  FormStateNode,
  SchemaDataNode,
  SchemaField,
} from "../src";
import {
  createCleanupScope,
  createSyncEffect,
  deepEquals,
  newControl,
} from "@astroapps/controls";
import { FieldAndValue } from "./gen-schema";

export interface TestNodeOptions {
  evalExpression?: (e: EntityExpression, ctx: ExpressionEvalContext) => void;
  contextOptions?: FormNodeOptions;
  data?: any;
}

export function testNodeState(
  c: ControlDefinition,
  f: SchemaField,
  options: TestNodeOptions = {},
) {
  const formTree = createFormTree([c]);
  const schemaTree = createSchemaTree([f]);
  const data = newControl(options.data ?? {});
  const formState = createFormStateNode(
    formTree.rootNode,
    createSchemaDataNode(schemaTree.rootNode, data),
    {
      schemaInterface: defaultSchemaInterface,
      clearHidden: false,
      runAsync: (cb) => cb(),
      resolveChildren: defaultResolveChildNodes,
      evalExpression:
        options.evalExpression ??
        ((e, ctx) => defaultEvaluators[e.type]?.(e, ctx)),
    },
    options.contextOptions ?? {},
  );
  return formState;
}

export function allChildren(
  c: FormStateNode,
  ignoreSelf?: boolean,
): FormStateNode[] {
  const children = c.children.flatMap((x) => allChildren(x));
  if (ignoreSelf) return children;
  return [c, ...children];
}

export function makeDataNode(fv: FieldAndValue): SchemaDataNode {
  return createSchemaDataNode(
    createSchemaLookup({ "": [fv.field] })
      .getSchema("")!
      .getChildNode(fv.field.field)!,
    newControl(fv.value),
  );
}

export function withDynamic(
  c: ControlDefinition,
  type: DynamicPropertyType,
): ControlDefinition {
  return { ...c, dynamic: [{ type, expr: { type: "Anything" } }] };
}

export function withScript(
  c: ControlDefinition,
  key: string,
  expr?: EntityExpression,
): ControlDefinition {
  return {
    ...c,
    ["$scripts"]: { ...(c as any)["$scripts"], [key]: expr ?? { type: "Anything" } },
  } as ControlDefinition;
}

export function notNullPromise<A>(f: () => A | null | undefined) {
  return new Promise<A>((resolve, reject) => {
    const scope = createCleanupScope();
    createSyncEffect(() => {
      const v = f();
      if (v != null) {
        resolve(v);
        scope.cleanup();
      }
    }, scope);
  });
}

export function changePromise<A>(f: () => A) {
  return new Promise<A>((resolve, reject) => {
    const scope = createCleanupScope();
    const initial = f();
    createSyncEffect(() => {
      const v = f();
      if (v !== initial) {
        resolve(v);
        scope.cleanup();
      }
    }, scope);
  });
}

export function deepEqualPromise<A>(f: () => A, expected: A) {
  return new Promise<A>((resolve, reject) => {
    const scope = createCleanupScope();
    createSyncEffect(() => {
      const v = f();
      if (deepEquals(v, expected)) {
        resolve(v);
        scope.cleanup();
      }
    }, scope);
  });
}
