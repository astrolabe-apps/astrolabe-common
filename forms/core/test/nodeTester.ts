import {
  ControlDefinition,
  createFormStateNode,
  createFormTree,
  createSchemaDataNode,
  createSchemaTree,
  defaultEvaluators,
  defaultResolveChildNodes,
  defaultSchemaInterface,
} from "../src";
import { newControl } from "@astroapps/controls";

export function testNodeState(c: ControlDefinition) {
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
      evalExpression: (e, ctx) => defaultEvaluators[e.type]?.(e, ctx),
      contextOptions: {},
    },
  );
  return formState.getChild(0)!;
}
