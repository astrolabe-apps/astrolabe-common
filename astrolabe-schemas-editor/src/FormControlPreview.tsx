import {
  Control,
  newControl,
  unsafeRestoreControl,
  useComputed,
  useControl,
} from "@react-typed-forms/core";
import React, {
  createContext,
  HTMLAttributes,
  ReactNode,
  useContext,
  useMemo,
} from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  ControlDataContext,
  ControlDefinition,
  DataControlDefinition,
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
  renderControlLayout,
  rendererClass,
  schemaForFieldPath,
  SchemaInterface,
  SchemaNode,
  textDisplayControl,
} from "@react-typed-forms/schemas";
import { useScrollIntoView } from "./useScrollIntoView";
import { ControlDragState, controlDropData, DragData, DropData } from "./util";
import { SelectedControlNode } from "./types";

export interface FormControlPreviewProps {
  node: FormNode;
  parent?: FormNode;
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
}

export interface FormControlPreviewContext {
  selected: Control<SelectedControlNode | undefined>;
  treeDrag: Control<ControlDragState | undefined>;
  dropSuccess: (drag: DragData, drop: DropData) => void;
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

const PreviewContext = createContext<FormControlPreviewContext | undefined>(
  undefined,
);
export const PreviewContextProvider = PreviewContext.Provider;

function usePreviewContext() {
  const pc = useContext(PreviewContext);
  if (!pc) throw "Must supply a PreviewContextProvider";
  return pc;
}

export function FormControlPreview(props: FormControlPreviewProps) {
  const {
    node,
    parent,
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
  } = props;
  const definition = node.definition;
  const { selected, dropSuccess, renderer, hideFields } = usePreviewContext();
  const displayOnly = dOnly || isControlDisplayOnly(definition);

  const defControlId = unsafeRestoreControl(definition)?.uniqueId;
  const isSelected = useComputed(() => {
    const selDef = selected.value?.form.definition;
    return (
      (selDef && defControlId === unsafeRestoreControl(selDef)?.uniqueId) ??
      false
    );
  }).value;
  const scrollRef = useScrollIntoView(isSelected);
  const { setNodeRef, isOver } = useDroppable({
    id: node.id,
    disabled: Boolean(noDrop),
    data: controlDropData(
      parent ? unsafeRestoreControl(parent)?.as() : undefined,
      dropIndex,
      dropSuccess,
    ),
  });
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

  const layout = renderControlLayout({
    definition,
    renderer,
    elementIndex,
    formNode: node.definition.childRefId
      ? node.withOverrideChildren([
          textDisplayControl("Reference:" + node.definition.childRefId),
        ])
      : node,
    renderChild: (k, child, c) => {
      return (
        <FormControlPreview
          key={unsafeRestoreControl(child.definition)?.uniqueId ?? k}
          node={child}
          parent={node}
          dropIndex={0}
          {...groupClasses}
          {...c}
          parentNode={c?.parentDataNode?.schema ?? childNode ?? parentNode}
          keyPrefix={keyPrefix}
          schemaInterface={schemaInterface}
          displayOnly={c?.displayOnly || displayOnly}
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
  const asSelection = { form: node, schema: parentNode };
  const mouseCapture: Pick<
    HTMLAttributes<HTMLDivElement>,
    "onClick" | "onClickCapture" | "onMouseDownCapture"
  > = isGroupControl(definition) ||
  (isDataControl(definition) && (definition.children?.length ?? 0) > 0)
    ? {
        onClick: (e) => (selected.value = asSelection),
      }
    : {
        onClickCapture: (e) => {
          e.preventDefault();
          e.stopPropagation();
          selected.value = asSelection;
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
        setNodeRef(e);
      }}
    >
      {!hideFields.value && (
        <EditorDetails
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
}: {
  control: ControlDefinition;
  arrayElement: boolean;
  schemaVisibility?: boolean;
}) {
  const { VisibilityIcon } = usePreviewContext();
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
