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
  makeHook,
  makeSchemaDataNode,
  nodeForControl,
  renderControlLayout,
  rendererClass,
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
  parentNode: SchemaNode;
  elementIndex?: number;
  schemaInterface?: SchemaInterface;
  keyPrefix?: string;
  styleClass?: string;
  layoutClass?: string;
  labelClass?: string;
  displayOnly?: boolean;
  context: FormControlPreviewContext;
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
    elementIndex,
    parentNode,
    dropIndex,
    noDrop,
    keyPrefix,
    schemaInterface = defaultSchemaInterface,
    styleClass,
    labelClass,
    layoutClass,
    displayOnly: dOnly,
    context,
  } = props;
  const definition = node.definition;
  const { selected, renderer, hideFields } = context;
  const displayOnly = dOnly || isControlDisplayOnly(definition);

  const defControl = unsafeRestoreControl(definition);
  const defControlId = defControl?.uniqueId.toString();
  const isSelected = useComputed(() => {
    const selControlId = selected.value;
    return selControlId !== undefined && defControlId == selControlId;
  }).value;
  const scrollRef = useScrollIntoView(isSelected);
  const groupControl = useControl({});

  const path = fieldPathForDefinition(definition);

  const childNode =
    path && elementIndex == null ? schemaForFieldPath(path, parentNode) : null;
  const dataDefinition = isDataControl(definition) ? definition : undefined;
  const isRequired = !!dataDefinition?.required;
  const displayOptions = getDisplayOnlyOptions(definition);
  const field = childNode?.field;
  const sampleData = useMemo(
    () =>
      displayOptions
        ? (displayOptions.sampleText ?? "Sample Data")
        : field &&
          (elementIndex == null
            ? field.collection
              ? [undefined]
              : defaultValueForField(field, isRequired)
            : elementValueForField(field)),
    [displayOptions?.sampleText, field, isRequired, elementIndex],
  );
  const control = useMemo(() => newControl(sampleData), [sampleData]);

  const parentDataNode = makeSchemaDataNode(parentNode, groupControl);
  const dataNode = childNode
    ? makeSchemaDataNode(childNode, control, parentDataNode, elementIndex)
    : undefined;
  const dataContext = {
    schemaInterface,
    dataNode: dataNode ?? parentDataNode,
    parentNode: parentDataNode,
    formData: {},
  } satisfies ControlDataContext;
  const formOptions = { readonly: dataDefinition?.readonly, displayOnly };
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

  const childNodes = definition.childRefId
    ? [
        nodeForControl(
          textDisplayControl("Reference:" + definition.childRefId),
          node.tree,
        ),
      ]
    : node.children;
  const layout = renderControlLayout({
    definition,
    formTree: node.tree,
    renderer,
    elementIndex,
    childNodes,
    renderChild: (k, child, c) => {
      return (
        <FormControlPreview
          key={unsafeRestoreControl(child.definition)?.uniqueId ?? k}
          node={child}
          dropIndex={0}
          {...groupClasses}
          {...c}
          parentNode={c?.parentDataNode?.schema ?? childNode ?? parentNode}
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
    control,
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
          selected.value = defControlId;
        },
      }
    : {
        onClickCapture: (e) => {
          e.preventDefault();
          e.stopPropagation();
          selected.value = defControlId;
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
  } = renderer.renderLayout({
    ...layout,
    adornments,
    className: rendererClass(layoutClass, definition.layoutClass),
  });
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
          arrayElement={elementIndex != null}
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
