import {
    ControlDefinition,
    createFormStateNode,
    createFormTree,
    createSchemaDataNode,
    createSchemaTree,
    defaultEvaluators,
    defaultResolveChildNodes,
    defaultSchemaInterface, EntityExpression, ExpressionEvalContext,
} from "../src";
import { newControl } from "@astroapps/controls";

export function testNodeState(c: ControlDefinition, evalExpression?: (e: EntityExpression, ctx: ExpressionEvalContext) => void) {
  const formTree = createFormTree([c]);
  const schemaTree = createSchemaTree([]);
  const data = newControl({});
  const formState = createFormStateNode(
    formTree.rootNode,
    createSchemaDataNode(schemaTree.rootNode, data),
    {
      schemaInterface: defaultSchemaInterface,
      runAsync: (cb) => cb(),
      resolveChildren: defaultResolveChildNodes,
      evalExpression: evalExpression ?? ((e, ctx) => defaultEvaluators[e.type]?.(e, ctx)),
      contextOptions: {},
    },
  );
  return formState.getChild(0)!;
}
