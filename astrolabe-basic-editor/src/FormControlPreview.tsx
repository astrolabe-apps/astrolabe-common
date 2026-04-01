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
import React, { Fragment, HTMLAttributes, useMemo } from "react";
import clsx from "clsx";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
  FieldType,
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
  selected: Control<FormNode | undefined>;
  renderer: FormRenderer;
  overId: Control<string | null>;
  activeId: Control<string | null>;
  dropAfter: Control<boolean>;
  pageMode?: boolean;
}

function sampleValueForField(
  sampleText: string | undefined | null,
  field: { type: string; collection?: boolean | null } | undefined,
): any {
  if (!field) return sampleText;
  if (field.collection) {
    return [sampleValueForField(sampleText, { type: field.type })];
  }
  if (sampleText) return sampleText;
  switch (field.type) {
    case FieldType.String:
      return "Sample Data";
    case FieldType.Bool:
      return undefined;
    case FieldType.Int:
      return 42;
    case FieldType.Double:
      return 3.14;
    case FieldType.Date:
      return "1980-04-22";
    case FieldType.DateTime:
      return new Date(0).toISOString();
    case FieldType.Time:
      return "12:00";
    default:
      return undefined;
  }
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
    Boolean(isGroupControl(definition) && definition.groupOptions?.displayOnly);

  const isRootNode = !!isRoot;
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: node.id,
    disabled: isRootNode,
    data: { node, containerId },
  });

  const isGroupNode = isGroupControl(definition);
  const childNodes = node.getChildNodes() as FormPreviewStateNode[];
  const childIds = isGroupNode ? childNodes.map((c) => c.id) : [];

  const isSelected = useComputed(() => {
    return selected.value?.id === node.id;
  }).value;

  const dataDefinition = isDataControl(definition) ? definition : undefined;
  const childNode = dataNode?.schema;
  const isRequired = !!dataDefinition?.required;
  const displayOptions = getDisplayOnlyOptions(definition);
  const field = childNode?.field;
  const sampleData = useMemo(
    () =>
      displayOptions
        ? sampleValueForField(displayOptions.sampleText, field)
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
          selected.value = node.form ?? undefined;
        },
      }
    : {
        onClickCapture: (e) => {
          if (isDragHandle(e)) return;
          e.preventDefault();
          e.stopPropagation();
          selected.value = node.form ?? undefined;
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

  const isDropTarget =
    !isRootNode &&
    context.overId.value === node.id &&
    context.activeId.value !== node.id;
  const dropBefore = isDropTarget && !context.dropAfter.value;
  const dropAfterThis = isDropTarget && !!context.dropAfter.value;

  let result = (
    <>
      {dropBefore && <DropIndicator />}
      <div
        ref={isRootNode ? undefined : setNodeRef}
        style={style}
        {...mouseCapture}
        {...(!isRootNode ? { "data-drag-wrapper": true } : {})}
        className={clsx(
          className,
          "relative cursor-pointer",
          isSelected && "outline-2 outline-primary-500 bg-primary-500/5",
          !isRootNode && isDragging && "opacity-30",
        )}
      >
        {!isRootNode && (
          <DragHandle attributes={attributes} listeners={listeners} />
        )}
        {child}
        {isGroupNode && (
          <GroupDropTarget
            containerId={node.form?.id ?? node.id}
            hasChildren={childIds.length > 0}
            onlyGroups={isRootNode && !!context.pageMode}
          />
        )}
      </div>
      {dropAfterThis && <DropIndicator />}
    </>
  );

  if (isGroupNode) {
    result = (
      <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
        {result}
      </SortableContext>
    );
  }

  // Page mode visual treatment for root-level groups
  if (
    context.pageMode &&
    isGroupNode &&
    !isRootNode &&
    node.parentNode &&
    !node.parentNode.parentNode
  ) {
    const pageTitle =
      (definition as any).title || `Page ${node.childIndex + 1}`;
    result = (
      <>
        <div
          className={clsx(
            "flex items-center gap-2",
            node.childIndex === 0 ? "mb-2" : "mt-4 mb-2",
          )}
        >
          <div className="text-[11px] font-bold uppercase tracking-wide text-primary-500 whitespace-nowrap">
            {pageTitle}
          </div>
          <div className="flex-1 h-px bg-primary-200" />
        </div>
        <div className="border border-primary-200 rounded-xl p-2 bg-primary-50">
          {result}
        </div>
      </>
    );
  }

  return result;
}

function DropIndicator() {
  return <div className="h-0.5 bg-primary-500 rounded-sm my-0.5" />;
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
      className="absolute right-0.5 top-0.5 cursor-grab p-1 flex items-center text-primary-500 bg-white rounded shadow-sm z-[1] opacity-0 transition-opacity duration-150"
    >
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
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

function GroupDropTarget({
  containerId,
  hasChildren,
  onlyGroups,
}: {
  containerId: string;
  hasChildren: boolean;
  onlyGroups?: boolean;
}) {
  const { active } = useDndContext();
  const isDragActive = !!active;
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${containerId}`,
    data: { containerId, isContainerDropZone: true },
  });

  if (hasChildren && !isDragActive) {
    return null;
  }

  if (onlyGroups && active) {
    const activeNode = active.data.current?.node as
      | FormPreviewStateNode
      | undefined;
    if (activeNode && !isGroupControl(activeNode.definition)) {
      return null;
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "border-2 border-dashed rounded-lg flex items-center justify-center text-slate-400 text-xs transition-colors duration-200",
        hasChildren ? "min-h-6 my-1" : "min-h-10 my-2",
        isOver ? "border-primary-500" : "border-slate-200",
      )}
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
