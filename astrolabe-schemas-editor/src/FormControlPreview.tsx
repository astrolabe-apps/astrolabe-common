import {
  Control,
  newControl,
  unsafeRestoreControl,
  useComputed,
  useControl,
} from "@react-typed-forms/core";
import React, { HTMLAttributes, ReactNode, useMemo } from "react";
import {
  ControlDataContext,
  ControlDefinition,
  createSchemaNode,
  defaultDataProps,
  defaultSchemaInterface,
  defaultValueForField,
  DynamicPropertyType,
  elementValueForField,
  fieldPathForDefinition,
  FormNode,
  FormRenderer,
  getDisplayOnlyOptions,
  getGroupClassOverrides,
  isControlDisplayOnly,
  isDataControl,
  isGroupControl,
  lookupDataNode,
  makeHook,
  makeSchemaDataNode,
  missingField,
  renderControlLayout,
  rendererClass,
  resolveSchemaNode,
  schemaDataForFieldPath,
  SchemaDataNode,
  schemaForFieldPath,
  SchemaInterface,
  SchemaNode,
  textDisplayControl,
} from "@react-typed-forms/schemas";
import { useScrollIntoView } from "./useScrollIntoView";

export interface FormControlPreviewProps {
  node: FormNode;
  dropIndex: number;
  noDrop?: boolean;
  parentDataNode: SchemaDataNode;
  schemaInterface?: SchemaInterface;
  keyPrefix?: string;
  styleClass?: string;
  layoutClass?: string;
  labelClass?: string;
  displayOnly?: boolean;
  context: FormControlPreviewContext;
  inline?: boolean;
}

export interface FormControlPreviewContext {
  selected: Control<string | undefined>;
  readonly?: boolean;
  VisibilityIcon: ReactNode;
  hideFields: Control<boolean>;
  renderer: FormRenderer;
}

export interface FormControlPreviewDataProps extends FormControlPreviewProps {
  isSelected: boolean;
  isOver: boolean;
}

const defaultLayoutChange = "position";

export function FormControlPreview(props: FormControlPreviewProps) {
  const {
    node,
    parentDataNode,
    dropIndex,
    noDrop,
    keyPrefix,
    schemaInterface = defaultSchemaInterface,
    styleClass,
    labelClass,
    layoutClass,
    displayOnly: dOnly,
    context,
    inline,
  } = props;

  const definition = node.definition;
  const { selected, renderer, hideFields } = context;
  const displayOnly = dOnly || isControlDisplayOnly(definition);

  const isSelected = useComputed(() => {
    const selControlId = selected.value;
    return selControlId !== undefined && node.id == selControlId;
  }).value;
  const scrollRef = useScrollIntoView(isSelected);
  const dataDefinition = isDataControl(definition) ? definition : undefined;

  const fieldNamePath = fieldPathForDefinition(definition);
  const dataNode = fieldNamePath
    ? schemaDataForFieldPath(fieldNamePath, parentDataNode)
    : undefined;
  const childNode = dataNode?.schema;
  const isRequired = !!dataDefinition?.required;
  const displayOptions = getDisplayOnlyOptions(definition);
  const field = childNode?.field;
  const sampleData = useMemo(
    () =>
      displayOptions
        ? (displayOptions.sampleText ?? "Sample Data")
        : field &&
          (dataNode?.elementIndex == null
            ? field.collection
              ? [undefined]
              : defaultValueForField(field, isRequired)
            : elementValueForField(field)),
    [displayOptions?.sampleText, field, isRequired],
  );
  const control = useMemo(() => newControl(sampleData), [sampleData]);
  if (dataNode) {
    dataNode.control = control;
  }
  const dataContext = {
    schemaInterface,
    dataNode,
    parentNode: parentDataNode,
    formData: {},
  } satisfies ControlDataContext;
  const formOptions = {
    readonly: dataDefinition?.readonly,
    displayOnly,
    inline,
  };
  const adornments =
    definition.adornments?.map((x) =>
      renderer.renderAdornment({
        adornment: x,
        designMode: true,
        dataContext,
        formOptions,
      }),
    ) ?? [];

  const groupClasses = getGroupClassOverrides(definition);
  const renderedNode = node.definition.childRefId
    ? node.createChildNode(
        "ref",
        textDisplayControl("Reference:" + node.definition.childRefId),
      )
    : node;
  const layout = renderControlLayout({
    renderer,
    state: {
      definition: renderedNode.definition,
      schemaInterface,
      context: formOptions,
      dataNode
    },
    formNode: renderedNode,
    renderChild: (k, child, c) => {
      const pd = c?.parentDataNode ?? dataNode ?? parentDataNode;
      return (
        <FormControlPreview
          key={unsafeRestoreControl(child.definition)?.uniqueId ?? k}
          node={child}
          dropIndex={0}
          {...groupClasses}
          {...c}
          parentDataNode={pd}
          keyPrefix={keyPrefix}
          schemaInterface={schemaInterface}
          displayOnly={c?.displayOnly || displayOnly}
          context={context}
        />
      );
    },
    labelClass,
    styleClass,
    createDataProps: defaultDataProps,
    formOptions,
    dataContext,
    control: dataNode?.control,
    schemaInterface,
    useEvalExpression: () => makeHook(() => undefined, undefined),
    useChildVisibility: () => makeHook(() => useControl(true), undefined),
    designMode: true,
  });
  const mouseCapture: Pick<
    HTMLAttributes<HTMLDivElement>,
    "onClick" | "onClickCapture" | "onMouseDownCapture"
  > = isGroupControl(definition) ||
  (isDataControl(definition) && (definition.children?.length ?? 0) > 0)
    ? {
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          selected.value = node.id;
        },
      }
    : {
        onClickCapture: (e) => {
          e.preventDefault();
          e.stopPropagation();
          selected.value = node.id;
        },
        onMouseDownCapture: (e) => {
          e.stopPropagation();
          e.preventDefault();
        },
      };
  const {
    style,
    children: child,
    className,
    inline: showInline,
  } = renderer.renderLayout({
    ...layout,
    adornments,
    className: rendererClass(layoutClass, definition.layoutClass),
  });

  if (showInline) {
    return child;
  }
  return (
    <div
      style={{
        ...style,
        backgroundColor: isSelected ? "rgba(25, 118, 210, 0.08)" : undefined,
        position: "relative",
      }}
      {...mouseCapture}
      className={className!}
      ref={(e) => {
        scrollRef(e);
      }}
    >
      {!hideFields.value && (
        <EditorDetails
          context={context}
          control={definition}
          arrayElement={dataNode?.elementIndex != null}
          schemaVisibility={!!field?.onlyForTypes?.length}
        />
      )}

      {child}
    </div>
  );
}

function EditorDetails({
  control,
  schemaVisibility,
  arrayElement,
  context,
}: {
  control: ControlDefinition;
  context: FormControlPreviewContext;
  arrayElement: boolean;
  schemaVisibility?: boolean;
}) {
  const { VisibilityIcon } = context;
  const { dynamic } = control;
  const hasVisibilityScripting = dynamic?.some(
    (x) => x.type === DynamicPropertyType.Visible,
  );

  const fieldName = !arrayElement
    ? isDataControl(control)
      ? control.field
      : isGroupControl(control)
        ? control.compoundField
        : null
    : null;

  if (!fieldName && !(hasVisibilityScripting || schemaVisibility)) return <></>;
  return (
    <div
      style={{
        backgroundColor: "white",
        fontSize: "12px",
        position: "absolute",
        top: 0,
        right: 0,
        padding: 2,
        border: "solid 1px black",
      }}
    >
      {fieldName}
      {(hasVisibilityScripting || schemaVisibility) && (
        <span style={{ paddingLeft: 4 }}>{VisibilityIcon}</span>
      )}
    </div>
  );
}
