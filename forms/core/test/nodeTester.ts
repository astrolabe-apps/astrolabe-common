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
  EntityExpression,
  ExpressionEvalContext,
  FormContextOptions,
  FormStateNode,
  SchemaDataNode,
  SchemaField,
} from "../src";
import { newControl } from "@astroapps/controls";
import { FieldAndValue } from "./gen-schema";
import { CompoundField } from "../lib";

export interface TestNodeOptions {
  evalExpression?: (e: EntityExpression, ctx: ExpressionEvalContext) => void;
  contextOptions?: FormContextOptions;
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
      runAsync: (cb) => cb(),
      resolveChildren: defaultResolveChildNodes,
      evalExpression:
        options.evalExpression ??
        ((e, ctx) => defaultEvaluators[e.type]?.(e, ctx)),
      contextOptions: options.contextOptions ?? {},
    },
  );
  return formState.getChild(0)!;
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
