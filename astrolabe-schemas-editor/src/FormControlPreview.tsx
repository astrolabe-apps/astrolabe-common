import {
  CleanupScope,
  Control,
  createCleanupScope,
  useComputed,
} from "@react-typed-forms/core";
import React, { Fragment, HTMLAttributes, ReactNode, useMemo } from "react";
import {
  ControlDataContext,
  ControlDefinition,
  createScopedComputed,
  defaultDataProps,
  defaultValueForField,
  DynamicPropertyType,
  elementValueForField,
  fieldPathForDefinition,
  FormNode,
  FormRenderer,
  FormStateNode,
  getChildNodes,
  getDisplayOnlyOptions,
  getGroupClassOverrides,
  isControlDisplayOnly,
  isDataControl,
  isGroupControl,
  renderControlLayout,
  rendererClass,
  schemaDataForFieldPath,
  SchemaDataNode,
  SchemaInterface,
  textDisplayControl,
} from "@react-typed-forms/schemas";
import { useScrollIntoView } from "./useScrollIntoView";

export interface FormControlPreviewProps {
  node: FormPreviewStateNode;
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
    styleClass,
    labelClass,
    layoutClass,
    displayOnly: dOnly,
    context,
    inline,
  } = props;
  const { definition, schemaInterface, parent, dataNode } = node;
  const { selected, renderer, hideFields } = context;
  const displayOnly = dOnly || isControlDisplayOnly(definition);

  const isSelected = useComputed(() => {
    const selControlId = selected.value;
    return selControlId !== undefined && node.id == selControlId;
  }).value;
  const scrollRef = useScrollIntoView(isSelected);
  const dataDefinition = isDataControl(definition) ? definition : undefined;

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
  if (dataNode) {
    dataNode.control.value = sampleData;
  }
  const dataContext: ControlDataContext = {
    schemaInterface,
    dataNode,
    parentNode: parent,
  };

  const formOptions = {
    disabled: false,
    hidden: false,
    clearHidden: false,
    readonly: !!dataDefinition?.readonly,
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
  const layout = renderControlLayout({
    renderer,
    formNode: node,
    renderChild: (k, child, c) => {
      return (
        <FormControlPreview
          key={child.childKey}
          node={child as FormPreviewStateNode}
          {...groupClasses}
          displayOnly={c?.displayOnly || displayOnly}
          context={context}
        />
      );
    },
    labelClass,
    styleClass,
    createDataProps: defaultDataProps,
    formOptions,
    inline,
    displayOnly,
    dataContext,
    control: dataNode?.control,
    schemaInterface,
    runExpression: () => {},
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

export function createPreviewNode(
  childKey: string | number,
  schemaInterface: SchemaInterface,
  form: FormNode,
  schema: () => SchemaDataNode,
) {
  return new FormPreviewStateNode(
    childKey,
    form,
    form.definition,
    schemaInterface,
    schema,
  );
}

let previewNodeId = 0;

class FormPreviewStateNode implements FormStateNode {
  meta: Record<string, any> = {};
  _dataNode: Control<SchemaDataNode | undefined>;
  childMap = new Map<any, FormPreviewStateNode>();
  scope: CleanupScope;
  uniqueId = (++previewNodeId).toString();
  constructor(
    public childKey: string | number,
    public formNode: FormNode,
    public definition: ControlDefinition,
    public schemaInterface: SchemaInterface,
    public _parent: () => SchemaDataNode,
  ) {
    const scope = createCleanupScope();
    this.scope = scope;
    this._dataNode = createScopedComputed(scope, () => {
      const parent = _parent();
      const fieldNamePath = fieldPathForDefinition(definition);
      return fieldNamePath
        ? schemaDataForFieldPath(fieldNamePath, parent)
        : undefined;
    });
  }
  get parent() {
    return this._parent();
  }

  get id() {
    return this.formNode.id;
  }
  get valid() {
    return true;
  }
  get touched() {
    return false;
  }
  get clearHidden() {
    return false;
  }
  get dataNode() {
    return this._dataNode.value;
  }

  getChildNodes(): FormStateNode[] {
    const kids = this.definition.childRefId
      ? [
          {
            childKey: "0",
            create: () => ({
              node: this.formNode,
              definition: textDisplayControl(
                "Reference: " + this.definition.childRefId,
              ),
              parent: this.parent,
              schemaInterface: this.schemaInterface,
              dataNode: this.dataNode,
            }),
          },
        ]
      : getChildNodes(
          this.resolved,
          this.formNode,
          this.parent,
          this.dataNode,
          this.schemaInterface,
        );
    return kids.map(({ childKey, create }) => {
      let child = this.childMap.get(childKey);
      if (!child) {
        const meta: Record<string, any> = {};
        const cc = create(this.scope, meta);
        child = new FormPreviewStateNode(
          childKey,
          cc.node,
          cc.definition,
          this.schemaInterface,
          () => cc.parent,
        );
      }
      return child;
    });
  }
  ensureMeta<A>(key: string, init: (scope: CleanupScope) => A): A {
    if (key in this.meta) return this.meta[key];
    const res = init(this.scope);
    this.meta[key] = res;
    return res;
  }

  get readonly() {
    return false;
  }

  get hidden() {
    return false;
  }

  get disabled() {
    return false;
  }
  get resolved() {
    return { definition: this.definition };
  }
}
