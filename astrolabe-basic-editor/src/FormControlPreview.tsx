import {
  CleanupScope,
  CleanupScopeImpl,
  Control,
  createCleanupScope,
  createScopedEffect,
  newControl,
  updateElements,
  useComputed,
} from "@react-typed-forms/core";
import React, { HTMLAttributes, useMemo } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import {
  ChildNodeSpec,
  ChildResolverFunc,
  ControlDataContext,
  ControlDefinition,
  createScoped,
  createScopedComputed,
  defaultDataProps,
  defaultValueForField,
  elementValueForField,
  fieldPathForDefinition,
  FormNode,
  FormNodeUi,
  FormRenderer,
  FormStateNode,
  getDisplayOnlyOptions,
  getGroupClassOverrides,
  groupedControl,
  isCompoundField,
  isDataControl,
  isGroupControl,
  noopUi,
  renderControlLayout,
  rendererClass,
  schemaDataForFieldPath,
  SchemaDataNode,
  SchemaInterface,
  textDisplayControl,
} from "@react-typed-forms/schemas";

export interface FormControlPreviewProps {
  node: FormPreviewStateNode;
  styleClass?: string;
  layoutClass?: string;
  labelClass?: string;
  displayOnly?: boolean;
  context: FormControlPreviewContext;
  inline?: boolean;
  isRoot?: boolean;
  containerId?: string;
}

export interface FormControlPreviewContext {
  selected: Control<string | undefined>;
  renderer: FormRenderer;
}

export function FormControlPreview(props: FormControlPreviewProps) {
  const {
    node,
    styleClass,
    labelClass,
    layoutClass,
    displayOnly: dOnly,
    context,
    inline,
    isRoot,
    containerId,
  } = props;
  const { definition, schemaInterface, parent, dataNode } = node;
  const { selected, renderer } = context;
  const displayOnly =
    dOnly ||
    Boolean(
      isGroupControl(definition) && definition.groupOptions?.displayOnly,
    );

  const isRootNode = !!isRoot;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    disabled: isRootNode,
    data: { node, containerId },
  });

  const isGroupNode = isGroupControl(definition);
  const childNodes = node.getChildNodes() as FormPreviewStateNode[];
  const childIds = isGroupNode ? childNodes.map((c) => c.id) : [];

  const isSelected = useComputed(() => {
    const selControlId = selected.value;
    return selControlId !== undefined && node.id == selControlId;
  }).value;

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
  if (dataNode && field && (field.collection || !isCompoundField(field))) {
    dataNode.control.value = sampleData;
  }
  const dataContext: ControlDataContext = {
    schemaInterface,
    dataNode,
    parentNode: parent,
  };

  const adornments =
    definition.adornments?.map((x) =>
      renderer.renderAdornment({
        adornment: x,
        designMode: true,
        dataContext,
        formNode: node,
      }),
    ) ?? [];

  const groupClasses = getGroupClassOverrides(definition);
  const layout = renderControlLayout({
    renderer,
    formNode: node,
    renderChild: (child, c) => {
      return (
        <FormControlPreview
          key={child.childKey}
          node={child as FormPreviewStateNode}
          {...groupClasses}
          displayOnly={c?.displayOnly || displayOnly}
          inline={c?.inline}
          context={context}
          containerId={node.form?.id ?? node.id}
        />
      );
    },
    labelClass,
    styleClass,
    createDataProps: defaultDataProps,
    inline,
    displayOnly,
    dataContext,
    control: dataNode?.control,
    schemaInterface,
    runExpression: () => {},
    designMode: true,
  });
  const isDragHandle = (e: React.SyntheticEvent) =>
    (e.target as HTMLElement).closest?.("[data-drag-handle]");
  const mouseCapture: Pick<
    HTMLAttributes<HTMLDivElement>,
    "onClick" | "onClickCapture" | "onMouseDownCapture"
  > = isGroupControl(definition) ||
  (isDataControl(definition) && (definition.children?.length ?? 0) > 0)
    ? {
        onClick: (e) => {
          if (isDragHandle(e)) return;
          e.preventDefault();
          e.stopPropagation();
          selected.value = node.id;
        },
      }
    : {
        onClickCapture: (e) => {
          if (isDragHandle(e)) return;
          e.preventDefault();
          e.stopPropagation();
          selected.value = node.id;
        },
        onMouseDownCapture: (e) => {
          if (isDragHandle(e)) return;
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

  const adjustedTransform = transform
    ? { ...transform, scaleX: 1, scaleY: 1 }
    : null;

  let result = (
    <div
      ref={isRootNode ? undefined : setNodeRef}
      style={{
        ...style,
        outline: isSelected ? "2px solid #7c6dd8" : undefined,
        backgroundColor: isSelected ? "rgba(124, 109, 216, 0.04)" : undefined,
        position: "relative",
        cursor: "pointer",
        ...(isRootNode
          ? {}
          : {
              transform: CSS.Transform.toString(adjustedTransform) || undefined,
              opacity: isDragging ? 0.3 : undefined,
            }),
      }}
      {...mouseCapture}
      className={className! + (!isRootNode ? " group/drag" : "")}
    >
      {!isRootNode && (
        <DragHandle attributes={attributes} listeners={listeners} />
      )}
      {child}
      {isGroupNode && (
        <GroupDropTarget containerId={node.id} hasChildren={childIds.length > 0} />
      )}
    </div>
  );

  if (isGroupNode) {
    result = (
      <SortableContext
        items={childIds}
        strategy={verticalListSortingStrategy}
      >
        {result}
      </SortableContext>
    );
  }

  return result;
}

function DragHandle({
  attributes,
  listeners,
}: {
  attributes: Record<string, any>;
  listeners: Record<string, any> | undefined;
}) {
  return (
    <div
      data-drag-handle
      {...attributes}
      {...listeners}
      className="opacity-0 group-hover/drag:opacity-100"
      style={{
        position: "absolute",
        left: 2,
        top: "50%",
        transform: "translateY(-50%)",
        cursor: "grab",
        padding: 4,
        display: "flex",
        alignItems: "center",
        color: "#7c6dd8",
        backgroundColor: "white",
        borderRadius: 4,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        zIndex: 1,
        transition: "opacity 0.15s",
      }}
    >
      <svg
        width="12"
        height="16"
        viewBox="0 0 12 16"
        fill="currentColor"
      >
        <circle cx="3" cy="2" r="1.5" />
        <circle cx="9" cy="2" r="1.5" />
        <circle cx="3" cy="8" r="1.5" />
        <circle cx="9" cy="8" r="1.5" />
        <circle cx="3" cy="14" r="1.5" />
        <circle cx="9" cy="14" r="1.5" />
      </svg>
    </div>
  );
}

function GroupDropTarget({ containerId, hasChildren }: { containerId: string; hasChildren: boolean }) {
  const { active } = useDndContext();
  const isDragActive = !!active;
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${containerId}`,
    data: { containerId, isContainerDropZone: true },
  });

  if (hasChildren && !isDragActive) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: hasChildren ? 24 : 40,
        border: "2px dashed",
        borderColor: isOver ? "#7c6dd8" : "#e2e8f0",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        fontSize: 12,
        margin: hasChildren ? "4px 0" : "8px 0",
        transition: "border-color 0.2s",
      }}
    >
      Drop fields here
    </div>
  );
}

export function createPreviewNode(
  childKey: string | number,
  schemaInterface: SchemaInterface,
  form: FormNode,
  schema: SchemaDataNode,
  renderer: FormRenderer,
) {
  return new FormPreviewStateNode(
    childKey,
    {},
    form,
    form.definition,
    schemaInterface,
    schema,
    undefined,
    0,
    renderer.resolveChildren,
  );
}

let previewNodeId = 0;

export class FormPreviewStateNode implements FormStateNode {
  ui = noopUi;
  _dataNode: Control<SchemaDataNode | undefined>;
  _children: Control<FormPreviewStateNode[]>;
  scope: CleanupScopeImpl;
  uniqueId = (++previewNodeId).toString();

  constructor(
    public childKey: string | number,
    public meta: Record<string, any>,
    public form: FormNode | undefined | null,
    public definition: ControlDefinition,
    public schemaInterface: SchemaInterface,
    public parent: SchemaDataNode,
    public parentNode: FormStateNode | undefined,
    public childIndex: number,
    public resolver: FormRenderer["resolveChildren"],
    public resolveChildren?: ChildResolverFunc,
  ) {
    const scope = createCleanupScope();
    this.scope = scope;
    this._children = createScoped(scope, []);
    this._dataNode = createScopedComputed(scope, () => {
      const fieldNamePath = fieldPathForDefinition(definition);
      return fieldNamePath
        ? schemaDataForFieldPath(fieldNamePath, parent)
        : undefined;
    });
    createScopedEffect((scope) => {
      const lastId = this._children.meta["dataId"];
      const nextId = this._dataNode.value?.id;
      this._children.meta["dataId"] = nextId;
      const canReuse = lastId === nextId;
      const kids = this.getKids();
      updateElements(this._children, (c) => {
        return kids.map(({ childKey, create }, childIndex) => {
          let child = canReuse
            ? c.find((x) => x.current.value.childKey == childKey)
            : undefined;
          if (!child) {
            const meta: Record<string, any> = {};
            const cc = create(this.scope, meta);
            child = newControl(
              new FormPreviewStateNode(
                childKey,
                meta,
                cc.node === undefined ? this.form : cc.node,
                cc.definition ?? groupedControl([]),
                this.schemaInterface,
                cc.parent ?? this.parent,
                this,
                childIndex,
                this.resolver,
                cc.resolveChildren,
              ),
            );
          }
          return child;
        });
      });
    }, scope);
  }

  get busy() {
    return false;
  }

  setBusy(busy: boolean) {}

  setForceDisabled(forceDisabled: boolean) {}

  attachUi(f: FormNodeUi) {
    this.ui = f;
  }

  validate(): boolean {
    return true;
  }

  cleanup() {
    this.scope.cleanup();
  }

  setTouched(b: boolean, notChildren?: boolean) {}

  get children() {
    return this.getChildNodes();
  }
  get id() {
    return this.form?.id || "GEN";
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

  getKids(): ChildNodeSpec[] {
    return this.definition.childRefId
      ? [
          {
            childKey: "Ref",
            create: () => ({
              node: this.form,
              definition: textDisplayControl(
                "Reference: " + this.definition.childRefId,
              ),
              parent: this.parent,
              schemaInterface: this.schemaInterface,
              dataNode: this.dataNode,
            }),
          },
        ]
      : (this.resolveChildren?.(this) ?? this.resolver(this));
  }

  getChildCount(): number {
    return this._children.value.length;
  }

  getChild(index: number) {
    return this.getChildNodes()[index];
  }
  getChildNodes(): FormStateNode[] {
    return this._children.value;
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

  get visible() {
    return true;
  }

  get disabled() {
    return false;
  }
  get resolved() {
    return {
      definition: this.definition,
      fieldOptions: this.dataNode?.schema.field.options ?? undefined,
    };
  }
}
