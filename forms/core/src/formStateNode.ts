import { FormNode, lookupDataNode } from "./formNode";
import {
  hideDisplayOnly,
  SchemaDataNode,
  validDataNode,
} from "./schemaDataNode";
import { SchemaInterface } from "./schemaInterface";
import { FieldOption, SchemaTags } from "./schemaField";
import {
  ChangeListenerFunc,
  CleanupScope,
  Control,
  createScopedEffect,
  createSyncEffect,
  newControl,
  updateComputedValue,
  updateElements,
} from "@astroapps/controls";
import { createEvalExpr, ExpressionEvalContext } from "./evalExpression";
import { EntityExpression, ExpressionType } from "./entityExpression";
import { createScoped } from "./util";
import {
  AnyControlDefinition,
  ControlAdornmentType,
  ControlDefinition,
  ControlDisableType,
  DataGroupRenderOptions,
  DataRenderType,
  DisplayDataType,
  DynamicPropertyType,
  getGroupRendererOptions,
  GridRendererOptions,
  HtmlDisplay,
  isActionControl,
  isControlDisabled,
  isControlReadonly,
  isDataControl,
  isDataGroupRenderer,
  isDisplayControl,
  isGroupControl,
  isHtmlDisplay,
  isTextDisplay,
  TextDisplay,
} from "./controlDefinition";
import { createOverrideProxy, KeysOfUnion, NoOverride } from "./overrideProxy";
import { ChildNodeSpec, ChildResolverFunc } from "./resolveChildren";
import { setupValidation } from "./validators";
import { groupedControl } from "./controlBuilder";
import {
  ControlDefinitionScriptFields,
  coerceForFieldType,
  resolveSchemaPath,
  hasSchemaTag,
} from "./controlDefinitionSchemas";

export type EvalExpr = <A>(
  scope: CleanupScope,
  init: A,
  nk: Control<A>,
  e: EntityExpression | undefined,
  coerce: (t: unknown) => any,
) => boolean;

export type VariablesFunc = (
  changes: ChangeListenerFunc<any>,
) => Record<string, any>;
export interface FormNodeOptions {
  forceReadonly?: boolean;
  forceDisabled?: boolean;
  forceHidden?: boolean;
  variables?: VariablesFunc;
}
export interface FormGlobalOptions {
  schemaInterface: SchemaInterface;
  evalExpression: (e: EntityExpression, ctx: ExpressionEvalContext) => void;
  resolveChildren(c: FormStateNode): ChildNodeSpec[];
  runAsync: (af: () => void) => void;
  clearHidden: boolean;
}

export interface ResolvedDefinition {
  definition: ControlDefinition;
  stateId?: string;
  fieldOptions?: FieldOption[];
}

export interface FormStateBase {
  parent: SchemaDataNode;
  dataNode?: SchemaDataNode | undefined;
  readonly: boolean;
  visible: boolean | null;
  disabled: boolean;
  resolved: ResolvedDefinition;
  childIndex: number;
  busy: boolean;
}

export interface FormNodeUi {
  ensureVisible(): void;
  ensureChildVisible(childIndex: number): void;
  getDisabler(type: ControlDisableType): () => () => void;
}

export interface FormStateNode extends FormStateBase, FormNodeOptions {
  childKey: string | number;
  uniqueId: string;
  definition: ControlDefinition;
  schemaInterface: SchemaInterface;
  valid: boolean;
  touched: boolean;
  clearHidden: boolean;
  variables?: (changes: ChangeListenerFunc<any>) => Record<string, any>;
  meta: Record<string, any>;
  form: FormNode | undefined | null;
  children: FormStateNode[];
  parentNode: FormStateNode | undefined;
  setTouched(b: boolean, notChildren?: boolean): void;
  validate(): boolean;
  getChildCount(): number;
  getChild(index: number): FormStateNode | undefined;
  ensureMeta<A>(key: string, init: (scope: CleanupScope) => A): A;
  cleanup(): void;
  ui: FormNodeUi;
  attachUi(f: FormNodeUi): void;
  setBusy(busy: boolean): void;
  setForceDisabled(forceDisable: boolean): void;
}
/**
 * Converts legacy `dynamic[]` entries to the new `scripts` format,
 * then merges with any explicit `scripts` entries (which take precedence).
 */
export function getMergedScripts(
  def: ControlDefinition,
): Record<string, EntityExpression> {
  const scripts: Record<string, EntityExpression> = {};

  // Convert legacy dynamic[] entries
  if (def.dynamic) {
    for (const dp of def.dynamic) {
      if (!dp.expr?.type) continue;
      switch (dp.type) {
        case DynamicPropertyType.Visible:
          // Visible inverts → hidden with Not wrapper
          scripts["hidden"] = {
            type: ExpressionType.Not,
            expression: dp.expr,
          } as EntityExpression;
          break;
        case DynamicPropertyType.Readonly:
          scripts["readonly"] = dp.expr;
          break;
        case DynamicPropertyType.Disabled:
          scripts["disabled"] = dp.expr;
          break;
        case DynamicPropertyType.Label:
          scripts["title"] = dp.expr;
          break;
        case DynamicPropertyType.DefaultValue:
          scripts["defaultValue"] = dp.expr;
          break;
        case DynamicPropertyType.ActionData:
          scripts["actionData"] = dp.expr;
          break;
        case DynamicPropertyType.Style:
          scripts["style"] = dp.expr;
          break;
        case DynamicPropertyType.LayoutStyle:
          scripts["layoutStyle"] = dp.expr;
          break;
        case DynamicPropertyType.AllowedOptions:
          scripts["allowedOptions"] = dp.expr;
          break;
        case DynamicPropertyType.Display:
          // Map to displayData.text or displayData.html based on display type
          if (isDisplayControl(def)) {
            if (isTextDisplay(def.displayData)) {
              scripts["displayData.text"] = dp.expr;
            } else if (isHtmlDisplay(def.displayData)) {
              scripts["displayData.html"] = dp.expr;
            }
          }
          break;
        case DynamicPropertyType.GridColumns:
          // Map to groupOptions.columns or renderOptions.groupOptions.columns
          if (isGroupControl(def)) {
            scripts["groupOptions.columns"] = dp.expr;
          } else if (
            isDataControl(def) &&
            isDataGroupRenderer(def.renderOptions)
          ) {
            scripts["renderOptions.groupOptions.columns"] = dp.expr;
          }
          break;
      }
    }
  }

  // Explicit scripts take precedence
  if (def.scripts) {
    Object.assign(scripts, def.scripts);
  }

  return scripts;
}

export function createEvaluatedDefinition(
  def: ControlDefinition,
  evalExpr: EvalExpr,
  scope: CleanupScope,
): ControlDefinition {
  const definitionOverrides = createScoped<Record<string, any>>(scope, {});
  const displayOverrides = createScoped<Record<string, any>>(scope, {});
  const groupOptionsOverrides = createScoped<Record<string, any>>(scope, {});
  const renderOptionsOverrides = createScoped<Record<string, any>>(scope, {});

  // Map from path prefix to override control
  const overrideMap: Record<string, Control<Record<string, any>>> = {
    "": definitionOverrides,
    displayData: displayOverrides,
    groupOptions: groupOptionsOverrides,
    "renderOptions.groupOptions": groupOptionsOverrides,
  };

  // Set up computed nested proxies (same structure as before)
  const defFields = definitionOverrides.fields as Record<string, Control<any>>;

  updateComputedValue(
    defFields["displayData"] ??
      (definitionOverrides.fields as any).displayData,
    () =>
      isDisplayControl(def)
        ? createOverrideProxy(def.displayData, displayOverrides)
        : undefined,
  );

  updateComputedValue(
    defFields["groupOptions"] ??
      (definitionOverrides.fields as any).groupOptions,
    () => {
      const groupOptions = getGroupRendererOptions(def);
      return groupOptions
        ? createOverrideProxy(groupOptions, groupOptionsOverrides)
        : undefined;
    },
  );

  const renderOptionsFields = renderOptionsOverrides.fields as Record<
    string,
    Control<any>
  >;
  updateComputedValue(
    renderOptionsFields["groupOptions"] ??
      (renderOptionsOverrides.fields as any).groupOptions,
    () =>
      isDataControl(def) && isDataGroupRenderer(def.renderOptions)
        ? createOverrideProxy(
            (def.renderOptions.groupOptions as GridRendererOptions) ?? {},
            groupOptionsOverrides,
          )
        : undefined,
  );

  updateComputedValue(
    defFields["renderOptions"] ??
      (definitionOverrides.fields as any).renderOptions,
    () =>
      isDataControl(def)
        ? createOverrideProxy(def.renderOptions ?? {}, renderOptionsOverrides)
        : undefined,
  );

  // Generic script evaluation loop
  const scripts = getMergedScripts(def);
  const schema = ControlDefinitionScriptFields;

  for (const [key, expr] of Object.entries(scripts)) {
    const resolved = resolveSchemaPath(key, schema);
    if (!resolved) continue;

    const { segments, leafField } = resolved;
    const coerce = coerceForFieldType(leafField.type);

    // Determine which override control and field name to target
    const fieldName = segments[segments.length - 1];
    const parentPath = segments.slice(0, -1).join(".");
    const targetOverride = overrideMap[parentPath] ?? definitionOverrides;
    const targetField = (targetOverride.fields as Record<string, Control<any>>)[
      fieldName
    ];

    // Determine init value
    const nullInit = hasSchemaTag(leafField, SchemaTags.ScriptNullInit);
    const staticValue = getNestedValue(def, segments);
    const initValue = nullInit ? staticValue : coerce(staticValue ?? undefined);

    createScopedEffect((c) => {
      evalExpr(c, initValue, targetField, expr, coerce);
    }, targetOverride);
  }

  // If no script targets hidden, ensure it gets a non-null init
  if (!("hidden" in scripts)) {
    const hiddenField = (
      definitionOverrides.fields as Record<string, Control<any>>
    )["hidden"];
    createScopedEffect((c) => {
      evalExpr(c, !!def.hidden, hiddenField, undefined, (r) => !!r);
    }, definitionOverrides);
  }

  return createOverrideProxy(def, definitionOverrides);
}

function getNestedValue(obj: any, segments: string[]): any {
  let current = obj;
  for (const seg of segments) {
    if (current == null) return undefined;
    current = current[seg];
  }
  return current;
}

export function coerceStyle(v: unknown): any {
  return typeof v === "object" ? v : undefined;
}

export function coerceString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  switch (typeof v) {
    case "number":
    case "boolean":
      return v.toString();
    default:
      return JSON.stringify(v);
  }
}

export function createFormStateNode(
  formNode: FormNode,
  parent: SchemaDataNode,
  options: FormGlobalOptions,
  nodeOptions: FormNodeOptions,
): FormStateNodeImpl {
  const globals = newControl<FormGlobalOptions>({
    schemaInterface: options.schemaInterface,
    evalExpression: options.evalExpression,
    runAsync: options.runAsync,
    resolveChildren: options.resolveChildren,
    clearHidden: options.clearHidden,
  });
  return new FormStateNodeImpl(
    "ROOT",
    {},
    formNode.definition,
    formNode,
    nodeOptions,
    globals,
    parent,
    undefined,
    0,
    options.resolveChildren,
  );
}

export interface FormStateBaseImpl extends FormStateBase {
  children: FormStateBaseImpl[];
  nodeOptions: FormNodeOptions;
  busy: boolean;
}

export const noopUi: FormNodeUi = {
  ensureChildVisible(childIndex: number) {},
  ensureVisible() {},
  getDisabler(type: ControlDisableType): () => () => void {
    return () => () => {};
  },
};

class FormStateNodeImpl implements FormStateNode {
  readonly base: Control<FormStateBaseImpl>;
  readonly options: Control<FormNodeOptions>;
  readonly resolveChildren: ChildResolverFunc;

  ui = noopUi;

  constructor(
    public childKey: string | number,
    public meta: Record<string, any>,
    definition: ControlDefinition,
    public form: FormNode | undefined | null,
    nodeOptions: FormNodeOptions,
    public readonly globals: Control<FormGlobalOptions>,
    public parent: SchemaDataNode,
    public parentNode: FormStateNode | undefined,
    childIndex: number,
    resolveChildren?: ChildResolverFunc,
  ) {
    const base = newControl<FormStateBaseImpl>(
      {
        readonly: false,
        visible: null,
        disabled: false,
        children: [],
        resolved: { definition } as ResolvedDefinition,
        parent,
        childIndex,
        nodeOptions,
        busy: false,
      },
      { dontClearError: true },
    );
    this.base = base;
    this.options = base.fields.nodeOptions;
    base.meta["$FormState"] = this;
    this.resolveChildren =
      resolveChildren ?? globals.fields.resolveChildren.value;
    initFormState(definition, this, parentNode);
  }

  get busy() {
    return this.base.fields.busy.value;
  }

  setBusy(busy: boolean) {
    this.base.fields.busy.value = busy;
  }

  get evalExpression(): (
    e: EntityExpression,
    ctx: ExpressionEvalContext,
  ) => void {
    return this.globals.fields.evalExpression.value;
  }

  get runAsync() {
    return this.globals.fields.runAsync.value;
  }

  get schemaInterface(): SchemaInterface {
    return this.globals.fields.schemaInterface.value;
  }

  get forceDisabled() {
    return this.options.fields.forceDisabled.value;
  }

  setForceDisabled(value: boolean) {
    return (this.options.fields.forceDisabled.value = value);
  }

  get forceReadonly() {
    return this.options.fields.forceReadonly.value;
  }
  get forceHidden() {
    return this.options.fields.forceHidden.value;
  }

  attachUi(f: FormNodeUi) {
    this.ui = f;
  }

  get childIndex() {
    return this.base.fields.childIndex.value;
  }

  get children() {
    return this.base.fields.children.elements.map(
      (x) => x.meta["$FormState"] as FormStateNode,
    );
  }

  get uniqueId() {
    return this.base.uniqueId.toString();
  }
  get valid(): boolean {
    return this.base.valid;
  }

  get touched(): boolean {
    return this.base.touched;
  }

  setTouched(touched: boolean, notChildren?: boolean) {
    this.base.setTouched(touched, notChildren);
  }

  validate(): boolean {
    this.children.forEach((child) => {
      child.validate();
    });
    if (this.dataNode) {
      this.dataNode.control.validate();
    }
    return this.valid;
  }

  get readonly() {
    return this.base.fields.readonly.value;
  }

  get visible() {
    return this.base.fields.visible.value;
  }

  get disabled() {
    return this.base.fields.disabled.value;
  }

  get clearHidden() {
    return this.globals.fields.clearHidden.value;
  }

  get variables() {
    return this.options.fields.variables.value;
  }

  get definition() {
    return this.resolved.definition;
  }

  getChild(index: number) {
    return this.base.fields.children.elements[index]?.meta[
      "$FormState"
    ] as FormStateNode;
  }

  getChildCount(): number {
    return this.base.fields.children.elements.length;
  }

  cleanup() {
    this.base.cleanup();
  }

  get resolved() {
    return this.base.fields.resolved.value;
  }

  get dataNode() {
    return this.base.fields.dataNode.value;
  }

  ensureMeta<A>(key: string, init: (scope: CleanupScope) => A): A {
    if (key in this.meta) return this.meta[key];
    const res = init(this.base);
    this.meta[key] = res;
    return res;
  }
}

function initFormState(
  def: ControlDefinition,
  impl: FormStateNodeImpl,
  parentNode: FormStateNode | undefined,
) {
  const {
    base,
    options,
    schemaInterface,
    runAsync,
    evalExpression,
    parent,
    variables,
  } = impl;

  const evalExpr = createEvalExpr(evalExpression, {
    schemaInterface,
    variables,
    dataNode: parent,
    runAsync,
  });

  const scope = base;

  const { forceReadonly, forceDisabled, forceHidden } = options.fields;
  const resolved = base.fields.resolved.as<ResolvedDefinition>();
  const { fieldOptions, definition: rd } = resolved.fields;

  const { dataNode, readonly, disabled, visible } = base.fields;

  const definition = createEvaluatedDefinition(def, evalExpr, scope);
  rd.value = definition;

  updateComputedValue(dataNode, () => lookupDataNode(definition, parent));

  updateComputedValue(visible, () => {
    if (forceHidden.value) return false;
    if (parentNode && !parentNode.visible) return parentNode.visible;
    const dn = dataNode.value;
    if (
      dn &&
      (!validDataNode(dn) || hideDisplayOnly(dn, schemaInterface, definition))
    )
      return false;
    return definition.hidden == null ? null : !definition.hidden;
  });

  updateComputedValue(
    readonly,
    () =>
      parentNode?.readonly ||
      forceReadonly.value ||
      isControlReadonly(definition),
  );
  updateComputedValue(
    disabled,
    () =>
      parentNode?.disabled ||
      forceDisabled.value ||
      isControlDisabled(definition),
  );

  updateComputedValue(fieldOptions, () => {
    const dn = dataNode.value;
    if (!dn) return undefined;
    const fieldOptions = schemaInterface.getDataOptions(dn);
    const _allowed = definition.allowedOptions ?? [];
    const allowed = Array.isArray(_allowed) ? _allowed : [_allowed];

    return allowed.length > 0
      ? allowed
          .map((x) =>
            typeof x === "object"
              ? x
              : (fieldOptions?.find((y) => y.value == x) ?? {
                  name: x.toString(),
                  value: x,
                }),
          )
          .filter((x) => x != null)
      : fieldOptions;
  });

  createSyncEffect(() => {
    const dn = dataNode.value;
    if (dn) {
      dn.control.disabled = disabled.value;
    }
  }, scope);

  createSyncEffect(() => {
    const dn = dataNode.value;
    if (dn) {
      dn.control.touched = base.touched;
    }
  }, scope);

  createSyncEffect(() => {
    const dn = dataNode.value;
    if (dn) {
      base.touched = dn.control.touched;
    }
  }, scope);

  createSyncEffect(() => {
    const dn = dataNode.value;
    base.setErrors(dn?.control.errors);
  }, scope);

  setupValidation(
    scope,
    impl.variables,
    definition,
    dataNode,
    schemaInterface,
    parent,
    visible,
    runAsync,
  );

  createSyncEffect(() => {
    const dn = dataNode.value?.control;
    if (dn && isDataControl(definition)) {
      if (impl.visible == false) {
        if (impl.clearHidden && !definition.dontClearHidden) {
          dn.value = undefined;
        }
      } else if (
        impl.visible &&
        dn.value === undefined &&
        definition.defaultValue != null &&
        !definition.adornments?.some(
          (x) => x.type === ControlAdornmentType.Optional,
        ) &&
        definition.renderOptions?.type != DataRenderType.NullToggle
      ) {
        dn.value = definition.defaultValue;
      }
    }
  }, scope);

  initChildren(impl);
}

export function combineVariables(
  v1?: VariablesFunc,
  v2?: VariablesFunc,
): VariablesFunc | undefined {
  if (!v1) return v2;
  if (!v2) return v1;
  return (c) => ({ ...v1(c), ...v2(c) });
}

function initChildren(formImpl: FormStateNodeImpl) {
  const childMap = new Map<any, Control<FormStateBaseImpl>>();
  createSyncEffect(() => {
    const { base, resolveChildren } = formImpl;
    const children = base.fields.children;
    const kids = resolveChildren(formImpl);
    const scope = base;
    const detached = updateElements(children, () =>
      kids.map(({ childKey, create }, childIndex) => {
        let child = childMap.get(childKey);
        if (child) {
          child.fields.childIndex.value = childIndex;
        } else {
          const meta: Record<string, any> = {};
          const cc = create(scope, meta);
          const newOptions: FormNodeOptions = {
            forceHidden: false,
            forceDisabled: false,
            forceReadonly: false,
            variables: combineVariables(formImpl.variables, cc.variables),
          };
          const fsChild = new FormStateNodeImpl(
            childKey,
            meta,
            cc.definition ?? groupedControl([]),
            cc.node === undefined ? formImpl.form : cc.node,
            newOptions,
            formImpl.globals,
            cc.parent ?? formImpl.parent,
            formImpl,
            childIndex,
            cc.resolveChildren,
          );
          child = fsChild.base;
          childMap.set(childKey, child);
        }
        return child;
      }),
    );
    detached.forEach((child) => child.cleanup());
  }, formImpl.base);
}

/**
 * Interface representing the form context data.
 */
export interface FormContextData {
  option?: FieldOption;
  optionSelected?: boolean;
}

export function visitFormState<A>(
  node: FormStateNode,
  visitFn: (node: FormStateNode) => A | undefined,
): A | undefined {
  const v = visitFn(node);
  if (v !== undefined) return v;
  const childCount = node.getChildCount();
  for (let i = 0; i < childCount; i++) {
    const res = visitFormState(node.getChild(i)!, visitFn);
    if (res !== undefined) return res;
  }
  return undefined;
}
