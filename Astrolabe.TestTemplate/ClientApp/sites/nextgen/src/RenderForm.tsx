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
  ControlAdornment,
  ControlDefinitionType,
  createSelectConversion,
  defaultValueForField,
  DynamicProperty,
  FieldOption,
  isCompoundField,
  isDataControlDefinition,
  isGroupControlsDefinition,
  rendererClass,
  SelectDataRenderer,
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

export interface ControlState {
  title: string;
  hideTitle: boolean;
  visible: boolean;
  showing: boolean;
  readonly: boolean;
  disabled: boolean;
  required: boolean;
  styleClass?: string | null;
  layoutClass?: string | null;
  labelClass?: string | null;
  adornments?: ControlAdornment[] | null;
  options?: FieldOption[] | null;
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
  const state = useControl<ControlState>({
    hideTitle: !!(
      (isDataControlDefinition(definition) && definition.hideTitle) ||
      (isGroupControlsDefinition(definition) &&
        definition.groupOptions?.hideTitle)
    ),
    title: definition.title ?? "",
    visible: true,
    showing: true,
    readonly: isDataControlDefinition(definition) && !!definition.readonly,
    disabled: isDataControlDefinition(definition) && !!definition.disabled,
    required: isDataControlDefinition(definition) && !!definition.required,
    options: field.options,
  }).fields;
  const children = getChildren();
  control?.setValue((x) =>
    x == null ? defaultValueForField(field, null, true) : x,
  );
  const options = state.options.value;
  return (
    <div className={rendererClass(state.layoutClass.value, "flex flex-col")}>
      {!state.hideTitle.value && <label>{state.title.value}</label>}
      {!isCompoundField(schema.field) && control && (
        <>
          {options ? (
            <SelectDataRenderer
              options={options}
              readonly={state.readonly.value}
              required={state.required.value}
              state={control}
              convert={createSelectConversion(schema.field.type)}
            />
          ) : (
            <Finput control={control as Control<string>} />
          )}
        </>
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
