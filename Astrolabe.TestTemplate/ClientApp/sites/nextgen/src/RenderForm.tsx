import {
  Control,
  Finput,
  RenderArrayElements,
  useControl,
} from "@react-typed-forms/core";
import {
  createFormLookup,
  createSchemaLookup,
  FormNode,
  schemaDataForForm,
  SchemaDataNode,
  schemaDataNode,
} from "./formTree";
import {
  ControlDefinitionForm,
  ControlDefinitionSchemaMap,
  defaultControlDefinitionForm,
} from "./schemaSchemas";
import ControlDef from "formserver/src/ControlDefinition.json";
import {
  ControlDefinitionType,
  defaultValueForField,
  isCompoundField,
  isDataControlDefinition,
  isGroupControlsDefinition,
} from "@react-typed-forms/schemas";
import { data } from "autoprefixer";

const schemaLookup = createSchemaLookup(ControlDefinitionSchemaMap);
const formLookup = createFormLookup({ ControlDef });

export function RenderForm() {
  const data = useControl<ControlDefinitionForm>(defaultControlDefinitionForm);
  const schemaNode = schemaLookup.getSchema("ControlDefinition")!;
  const formNode = formLookup.getForm("ControlDef")!;
  return (
    <div className="flex">
      <RenderNode
        formNode={formNode.rootNode}
        dataNode={schemaDataNode(schemaNode, data)}
      />
      <pre>{JSON.stringify(data.value, null, 2)}</pre>
    </div>
  );
}

function RenderNode({
  dataNode,
  formNode,
}: {
  formNode: FormNode;
  dataNode: SchemaDataNode;
}) {
  const definition = formNode.definition;
  const { schema, control } = dataNode;
  const { field } = schema;
  const children = getChildren();
  control?.setValue((x) =>
    x == null ? defaultValueForField(field, null, true) : x,
  );
  return (
    <div>
      <div>{definition.title ?? "Untitled"}</div>
      {!isCompoundField(schema.field) && control && (
        <Finput control={control as Control<string>} />
      )}
      <RenderArrayElements array={children}>
        {([f, d]) => <RenderNode formNode={f} dataNode={d} />}
      </RenderArrayElements>
    </div>
  );

  function getChildren(): [FormNode, SchemaDataNode][] {
    if (
      (isGroupControlsDefinition(definition) ||
        isDataControlDefinition(definition)) &&
      dataNode.elementIndex == null
    ) {
      if (isDataControlDefinition(definition) && field.collection) {
        return Array.from(
          { length: (control as Control<unknown[]>)?.elements?.length ?? 0 },
          (_, i) => [formNode, dataNode.getChildElement(i)],
        );
      }
      return formNode
        .getChildNodes()
        .map((x) => [x, schemaDataForForm(x, dataNode)]);
    }
    return [];
  }
}
