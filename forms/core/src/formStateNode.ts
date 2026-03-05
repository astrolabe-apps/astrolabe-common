import { FormNode, lookupDataNode } from "./formNode";
import {
  hideDisplayOnly,
  SchemaDataNode,
  validDataNode,
} from "./schemaDataNode";
import { SchemaInterface } from "./schemaInterface";
import { FieldOption } from "./schemaField";
import {
  ChangeListenerFunc,
  CleanupScope,
  Control,
  createSyncEffect,
  newControl,
  updateComputedValue,
  updateElements,
} from "@astroapps/controls";
import { createEvalExpr, ExpressionEvalContext } from "./evalExpression";
import { EntityExpression, ExpressionType } from "./entityExpression";
import {
  ControlAdornmentType,
  ControlDefinition,
  ControlDisableType,
  DataRenderType,
  DynamicPropertyType,
  isControlDisabled,
  isControlReadonly,
  isDataControl,
  isDataGroupRenderer,
  isDisplayControl,
  isGroupControl,
  isHtmlDisplay,
  isTextDisplay,
} from "./controlDefinition";
import { ChildNodeSpec, ChildResolverFunc } from "./resolveChildren";
import { setupValidation } from "./validators";
import { groupedControl } from "./controlBuilder";
import { ControlDefinitionSchemaMap } from "./schemaSchemas";
import { createSchemaLookup, SchemaNode } from "./schemaNode";
import {
  createScriptedProxy,
  type EvalExpr,
  type ScriptProvider,
} from "./scriptedProxy";
export type { EvalExpr } from "./scriptedProxy";

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
  controlDefinitionSchema?: SchemaNode;
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
 * Build a Map from schema field path to legacy scripts derived from `dynamic[]`.
 * Uses path strings (e.g., "", "displayData", "renderOptions.groupOptions") as keys
 * instead of object identity, so it works correctly with tracked/proxied values.
 */
function buildLegacyScripts(
  def: ControlDefinition,
): Map<string, Record<string, EntityExpression>> {
  const map = new Map<string, Record<string, EntityExpression>>();
  if (!def.dynamic?.length) return map;

  const rootScripts: Record<string, EntityExpression> = {};

  for (const dp of def.dynamic) {
    if (!dp.expr?.type) continue;
    switch (dp.type) {
      case DynamicPropertyType.Visible:
        rootScripts["hidden"] = {
          type: ExpressionType.Not,
          innerExpression: dp.expr,
        } as EntityExpression;
        break;
      case DynamicPropertyType.Readonly:
        rootScripts["readonly"] = dp.expr;
        break;
      case DynamicPropertyType.Disabled:
        rootScripts["disabled"] = dp.expr;
        break;
      case DynamicPropertyType.Label:
        rootScripts["title"] = dp.expr;
        break;
      case DynamicPropertyType.DefaultValue:
        rootScripts["defaultValue"] = dp.expr;
        break;
      case DynamicPropertyType.ActionData:
        rootScripts["actionData"] = dp.expr;
        break;
      case DynamicPropertyType.Style:
        rootScripts["style"] = dp.expr;
        break;
      case DynamicPropertyType.LayoutStyle:
        rootScripts["layoutStyle"] = dp.expr;
        break;
      case DynamicPropertyType.AllowedOptions:
        rootScripts["allowedOptions"] = dp.expr;
        break;
      case DynamicPropertyType.Display:
        if (isDisplayControl(def)) {
          if (isTextDisplay(def.displayData) && def.displayData) {
            const existing = map.get("displayData") ?? {};
            existing["text"] = dp.expr;
            map.set("displayData", existing);
          } else if (isHtmlDisplay(def.displayData) && def.displayData) {
            const existing = map.get("displayData") ?? {};
            existing["html"] = dp.expr;
            map.set("displayData", existing);
          }
        }
        break;
      case DynamicPropertyType.GridColumns:
        if (isGroupControl(def) && def.groupOptions) {
          const existing = map.get("groupOptions") ?? {};
          existing["columns"] = dp.expr;
          map.set("groupOptions", existing);
        } else if (
          isDataControl(def) &&
          isDataGroupRenderer(def.renderOptions) &&
          def.renderOptions.groupOptions
        ) {
          const existing = map.get("renderOptions.groupOptions") ?? {};
          existing["columns"] = dp.expr;
          map.set("renderOptions.groupOptions", existing);
        }
        break;
    }
  }

  if (Object.keys(rootScripts).length > 0) {
    map.set("", rootScripts);
  }

  return map;
}

const DefaultControlDefinitionSchemaNode = createSchemaLookup(
  ControlDefinitionSchemaMap,
).getSchema("ControlDefinition");

export function createEvaluatedDefinition(
  def: ControlDefinition,
  evalExpr: EvalExpr,
  scope: CleanupScope,
  schema: SchemaNode = DefaultControlDefinitionSchemaNode,
): ControlDefinition {
  const legacyMap = buildLegacyScripts(def);
  const getScripts: ScriptProvider = (target, path) => {
    const explicit = target?.["$scripts"] ?? {};
    const legacy = legacyMap.get(path) ?? {};
    return { ...legacy, ...explicit };
  };
  const { proxy } = createScriptedProxy(
    def,
    schema,
    evalExpr,
    scope,
    getScripts,
  );

  return proxy;
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
    controlDefinitionSchema: options.controlDefinitionSchema,
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
  _childrenInitialized = false;

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

  private ensureChildren() {
    if (!this._childrenInitialized) {
      this._childrenInitialized = true;
      initChildren(this);
    }
  }

  get childIndex() {
    return this.base.fields.childIndex.value;
  }

  get children() {
    this.ensureChildren();
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
    this.ensureChildren();
    return this.base.fields.children.elements[index]?.meta[
      "$FormState"
    ] as FormStateNode;
  }

  getChildCount(): number {
    this.ensureChildren();
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

  const controlDefinitionSchema =
    impl.globals.fields.controlDefinitionSchema.value ??
    DefaultControlDefinitionSchemaNode;
  const definition = createEvaluatedDefinition(
    def,
    evalExpr,
    scope,
    controlDefinitionSchema,
  );
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

  // Eagerly init children unless this node has childRefId (potential recursion)
  if (!(def as any).childRefId) {
    impl._childrenInitialized = true;
    initChildren(impl);
  }
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
  let lastParent: SchemaDataNode | undefined;
  createSyncEffect(() => {
    const { base, resolveChildren } = formImpl;
    const children = base.fields.children;
    const kids = resolveChildren(formImpl);
    // If the parent data context changed, children hold stale parent references
    // so we must recreate them rather than reusing from the cache.
    const currentParent = base.fields.dataNode.value;
    if (lastParent !== currentParent) {
      childMap.clear();
    }
    lastParent = currentParent;
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
