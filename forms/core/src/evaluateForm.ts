import {
  CleanupScope,
  Control,
  createScopedEffect,
  createSyncEffect,
  newControl,
  trackedValue,
  updateComputedValue,
  updateElements,
} from "@astroapps/controls";
import {
  AnyControlDefinition,
  ControlAdornmentType,
  ControlDefinition,
  ControlDefinitionType,
  DataControlDefinition,
  DataRenderType,
  DynamicPropertyType,
  HtmlDisplay,
  isActionControl,
  isControlDisabled,
  isControlReadonly,
  isDataControl,
  isDisplayControl,
  isHtmlDisplay,
  isTextDisplay,
  TextDisplay,
} from "./controlDefinition";
import { createScoped, createScopedComputed } from "./util";
import { EntityExpression } from "./entityExpression";
import { SchemaInterface } from "./schemaInterface";
import { FormNode, lookupDataNode } from "./formNode";
import {
  hideDisplayOnly,
  SchemaDataNode,
  validDataNode,
} from "./schemaDataNode";
import { setupValidation } from "./validators";
import { createEvalExpr, ExpressionEvalContext } from "./evalExpression";
import { createOverrideProxy, KeysOfUnion, NoOverride } from "./overrideProxy";
import { FieldOption } from "./schemaField";

export type EvalExpr = <A>(
  scope: CleanupScope,
  init: A,
  nk: Control<A>,
  e: EntityExpression | undefined,
  coerce: (t: unknown) => any,
) => boolean;

export interface FormContextOptions {
  readonly?: boolean | null;
  hidden?: boolean | null;
  disabled?: boolean | null;
  clearHidden?: boolean;
  stateKey?: string;
  variables?: Record<string, any>;
}

export interface ResolvedDefinition {
  definition: ControlDefinition;
  display?: string;
  stateId?: string;
  style?: object;
  layoutStyle?: object;
  fieldOptions?: FieldOption[];
}

export interface FormStateBase {
  parent: SchemaDataNode;
  dataNode?: SchemaDataNode | undefined;
  readonly: boolean;
  hidden: boolean;
  disabled: boolean;
  resolved: ResolvedDefinition;
}

export interface FormStateNode extends FormStateBase {
  childKey: string | number;
  uniqueId: string;
  definition: ControlDefinition;
  schemaInterface: SchemaInterface;
  valid: boolean;
  touched: boolean;
  clearHidden: boolean;
  variables: Record<string, any>;
  meta: Control<Record<string, any>>;
  getChildNodes(): FormStateNode[];
}

interface FormStateOptions {
  schemaInterface: SchemaInterface;
  evalExpression: (e: EntityExpression, ctx: ExpressionEvalContext) => void;
  contextOptions: FormContextOptions;
  runAsync: (af: () => void) => void;
}

export function createEvaluatedDefinition(
  def: ControlDefinition,
  evalExpr: EvalExpr,
  scope: CleanupScope,
  display: Control<string | undefined>,
): ControlDefinition {
  const definitionOverrides = createScoped<Record<string, any>>(scope, {});
  const displayOverrides = createScoped<Record<string, any>>(scope, {});

  const of = definitionOverrides.fields as Record<
    KeysOfUnion<AnyControlDefinition>,
    Control<any>
  >;

  const { html, text } = displayOverrides.fields as Record<
    KeysOfUnion<TextDisplay | HtmlDisplay>,
    Control<any>
  >;

  updateComputedValue(of.displayData, () =>
    isDisplayControl(def)
      ? createOverrideProxy(def.displayData, displayOverrides)
      : undefined,
  );

  evalDynamic(
    of.hidden,
    DynamicPropertyType.Visible,
    () => def.hidden,
    (r) => !r,
  );

  evalDynamic(
    of.readonly,
    DynamicPropertyType.Readonly,
    () => isControlReadonly(def),
    (r) => !!r,
  );

  createScopedEffect((c) => {
    evalExpr(
      c,
      isControlDisabled(def),
      of.disabled,
      firstExpr(DynamicPropertyType.Disabled),
      (r) => !!r,
    );
  }, definitionOverrides);

  createScopedEffect((c) => {
    evalExpr(
      c,
      isDataControl(def) ? def.defaultValue : undefined,
      of.defaultValue,
      isDataControl(def)
        ? firstExpr(DynamicPropertyType.DefaultValue)
        : undefined,
      (r) => r,
    );
  }, definitionOverrides);

  createScopedEffect((c) => {
    evalExpr(
      c,
      isActionControl(def) ? def.actionData : undefined,
      of.actionData,
      isActionControl(def)
        ? firstExpr(DynamicPropertyType.ActionData)
        : undefined,
      (r) => r,
    );
  }, definitionOverrides);

  createScopedEffect((c) => {
    evalExpr(
      c,
      def.title,
      of.title,
      firstExpr(DynamicPropertyType.Label),
      coerceString,
    );
  }, definitionOverrides);

  createSyncEffect(() => {
    if (isDisplayControl(def)) {
      if (display.value !== undefined) {
        text.value = isTextDisplay(def.displayData)
          ? display.value
          : NoOverride;
        html.value = isHtmlDisplay(def.displayData)
          ? display.value
          : NoOverride;
      } else {
        text.value = NoOverride;
        html.value = NoOverride;
      }
    }
  }, displayOverrides);

  return createOverrideProxy(def, definitionOverrides);

  function firstExpr(
    property: DynamicPropertyType,
  ): EntityExpression | undefined {
    return def.dynamic?.find((x) => x.type === property && x.expr.type)?.expr;
  }

  function evalDynamic<A>(
    control: Control<A>,
    property: DynamicPropertyType,
    init: () => A,
    coerce: (v: unknown) => any,
  ) {
    createScopedEffect((c) => {
      evalExpr(c, init(), control, firstExpr(property), coerce);
    }, scope);
  }
}

export function coerceStyle(v: unknown): any {
  return typeof v === "object" ? v : undefined;
}

export function coerceString(v: unknown): string {
  return typeof v === "string" ? v : (v?.toString() ?? "");
}

export function createFormStateNode(
  formNode: FormNode,
  parent: SchemaDataNode,
  options: FormStateOptions,
): FormStateNode {
  const base = initFormState(formNode.definition, formNode, parent, options);

  return new FormStateNodeImpl(
    "ROOT",
    parent,
    options.schemaInterface,
    base,
    options.contextOptions,
  );
}

export interface FormStateBaseImpl extends FormStateBase {
  children: FormStateBaseImpl[];
  allowedOptions?: unknown;
}

class FormStateNodeImpl implements FormStateNode {
  meta: Control<Record<string, any>>;
  constructor(
    public childKey: string | number,
    public parent: SchemaDataNode,
    public schemaInterface: SchemaInterface,
    private base: Control<FormStateBaseImpl>,
    private context: FormContextOptions,
  ) {
    this.meta = newControl({});
    base.meta["$FormState"] = this;
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

  get readonly() {
    return this.base.fields.readonly.value;
  }

  get hidden() {
    return this.base.fields.hidden.value;
  }

  get disabled() {
    return this.base.fields.disabled.value;
  }

  get clearHidden() {
    return !!this.context.clearHidden;
  }

  get variables() {
    return this.context.variables ?? {};
  }

  get definition() {
    return this.resolved.definition;
  }

  getChildNodes() {
    return this.base.fields.children.elements.map(
      (x) => x.meta["$FormState"] as FormStateNode,
    );
  }

  get resolved() {
    return this.base.fields.resolved.value;
  }

  get dataNode() {
    return this.base.fields.dataNode.value;
  }
}

function initFormState(
  def: ControlDefinition,
  form: FormNode,
  parent: SchemaDataNode,
  options: FormStateOptions,
): Control<FormStateBaseImpl> {
  const { evalExpression, runAsync, schemaInterface, contextOptions } = options;

  const evalExpr = createEvalExpr(evalExpression, {
    schemaInterface,
    variables: contextOptions.variables,
    dataNode: parent,
    runAsync,
  });

  const cf = contextOptions;

  const base = newControl<FormStateBaseImpl>({
    readonly: false,
    hidden: false,
    disabled: false,
    children: [],
    resolved: { definition: def },
    parent,
    allowedOptions: undefined,
  });
  const scope = base;

  const resolved = base.fields.resolved.as<ResolvedDefinition>();
  const {
    style,
    layoutStyle,
    fieldOptions,
    display,
    definition: rd,
  } = resolved.fields;

  evalDynamic(display, DynamicPropertyType.Display, undefined, coerceString);

  const { dataNode, readonly, disabled, hidden, children, allowedOptions } =
    base.fields;

  const definition = createEvaluatedDefinition(def, evalExpr, scope, display);
  rd.value = definition;

  evalDynamic(style, DynamicPropertyType.Style, undefined, coerceStyle);
  evalDynamic(
    layoutStyle,
    DynamicPropertyType.LayoutStyle,
    undefined,
    coerceStyle,
  );
  evalDynamic(
    fieldOptions,
    DynamicPropertyType.AllowedOptions,
    undefined,
    (x) => x,
  );

  updateComputedValue(dataNode, () => lookupDataNode(definition, parent));

  updateComputedValue(
    hidden,
    () =>
      !!(
        cf.hidden ||
        definition.hidden ||
        (dataNode.value &&
          (!validDataNode(dataNode.value) ||
            hideDisplayOnly(dataNode.value, schemaInterface, definition)))
      ),
  );

  updateComputedValue(
    readonly,
    () => !!cf.readonly || isControlReadonly(definition),
  );
  updateComputedValue(
    disabled,
    () => !!cf.disabled || isControlDisabled(definition),
  );

  updateComputedValue(fieldOptions, () => {
    const dn = dataNode.value;
    if (!dn) return undefined;
    const fieldOptions = schemaInterface.getDataOptions(dn);
    const _allowed = allowedOptions.value ?? [];
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
    base.setErrors(dn?.control.errors);
  }, scope);

  setupValidation(
    scope,
    contextOptions,
    definition,
    dataNode,
    schemaInterface,
    parent,
    runAsync,
  );

  createSyncEffect(() => {
    const dn = dataNode.value?.control;
    if (dn && isDataControl(definition)) {
      if (definition.hidden) {
        if (contextOptions.clearHidden && !definition.dontClearHidden) {
          // console.log("Clearing hidden");
          dn.value = undefined;
        }
      } else if (
        dn.value === undefined &&
        definition.defaultValue != null &&
        !definition.adornments?.some(
          (x) => x.type === ControlAdornmentType.Optional,
        ) &&
        definition.renderOptions?.type != DataRenderType.NullToggle
      ) {
        // console.log(
        //   "Setting to default",
        //   definition.defaultValue,
        //   definition.field,
        // );
        // const [required, dcv] = isDataControl(definition)
        //   ? [definition.required, definition.defaultValue]
        //   : [false, undefined];
        // const field = ctx.dataNode?.schema.field;
        // return (
        //   dcv ??
        //   (field
        //     ? ctx.dataNode!.elementIndex != null
        //       ? elementValueForField(field)
        //       : defaultValueForField(field, required)
        //     : undefined)
        // );

        dn.value = definition.defaultValue;
      }
    }
  }, scope);

  initChildren(scope, children, resolved, form, parent, dataNode, options);

  return base;

  function firstExpr(
    property: DynamicPropertyType,
  ): EntityExpression | undefined {
    return def.dynamic?.find((x) => x.type === property && x.expr.type)?.expr;
  }

  function evalDynamic<A>(
    control: Control<A>,
    property: DynamicPropertyType,
    init: A,
    coerce: (v: unknown) => any,
  ) {
    createScopedEffect(
      (c) => evalExpr(c, init, control, firstExpr(property), coerce),
      scope,
    );
  }
}

function initChildren(
  scope: CleanupScope,
  children: Control<FormStateBaseImpl[]>,
  resolved: Control<ResolvedDefinition>,
  node: FormNode,
  parent: SchemaDataNode,
  dataNode: Control<SchemaDataNode | undefined> | undefined,
  options: FormStateOptions,
) {
  const childMap = new Map<any, Control<FormStateBaseImpl>>();
  createSyncEffect(() => {
    const childs = getChildNodes(
      resolved.value,
      node,
      parent,
      dataNode?.value,
      options.schemaInterface,
    );
    updateElements(children, () =>
      childs.map(({ childKey, create }) => {
        let child = childMap.get(childKey);
        if (!child) {
          const cc = create(scope);
          const co = cc.variables
            ? {
                ...options,
                contextOptions: {
                  ...options.contextOptions,
                  variables: {
                    ...options.contextOptions.variables,
                    ...cc.variables,
                  },
                },
              }
            : options;
          child = initFormState(cc.definition, cc.node, cc.parent, co);
          new FormStateNodeImpl(
            childKey,
            cc.parent,
            co.schemaInterface,
            child,
            co.contextOptions,
          );
        }
        return child;
      }),
    );
  }, scope);
}
//   const childMap = new Map<any, Control<FormStateBaseImpl>>();
//   createSyncEffect(() => {
//     // Object.entries(children.current.value.map(x => [x.childKey, x]));
//     const dn = dataNode?.value;
//     if (dn && dn.elementIndex == null && dn.schema.field.collection) {
//       updateElements(children, () =>
//         dn.control.as<any[]>().elements.map((x, i) => {
//           const childKey = x.uniqueId;
//           let elemNode = childMap.get(childKey);
//           if (!elemNode) {
//             elemNode = createElementNode(
//               childKey,
//               formNode,
//               dn.getChildElement(i),
//               options,
//             );
//             childMap.set(childKey, elemNode);
//           }
//           return elemNode;
//         }),
//       );
//     } else {
//       const childNodes = formNode.getChildNodes();
//       if (dn && !isCompoundNode(dn.schema) && childNodes.length > 0) {
//         updateElements(
//           children,
//           () =>
//             options.schemaInterface.getDataOptions(dn)?.map((x, i) => {
//               const childKey = x.value?.toString();
//               let childNode = childMap.get(childKey);
//               if (!childNode) {
//                 childNode = createOptionNode(
//                   childKey,
//                   x,
//                   formNode,
//                   parent,
//                   options,
//                 );
//                 childMap.set(childKey, childNode);
//               }
//               return childNode;
//             }) ?? [],
//         );
//       } else {
//         updateElements(children, () =>
//           childNodes.map((x) => {
//             const childKey = x.id;
//             let childNode = childMap.get(childKey);
//             if (!childNode) {
//               childNode = createChildNode(x, dn ?? parent, options);
//               childMap.set(childKey, childNode);
//             }
//             return childNode;
//           }),
//         );
//       }
//     }
//   }, scope);
// }

// export function createChildNode(
//   formNode: FormNode,
//   parent: SchemaDataNode,
//   options: FormStateOptions,
// ): Control<FormStateBaseImpl> {
//   const base = initFormState(formNode, parent, options);
//
//   new FormStateNodeImpl(
//     formNode.id,
//     options.schemaInterface,
//     base,
//     options.contextOptions,
//   );
//   return base;
// }
//
// function createElementNode(
//   childKey: number,
//   formNode: FormNode,
//   element: SchemaDataNode,
//   options: FormStateOptions,
// ): Control<FormStateBaseImpl> {
//   const base = createScoped<FormStateBaseImpl>(options.scope, {
//     dataNode: element,
//     disabled: false,
//     hidden: false,
//     readonly: false,
//     children: [],
//     resolved: { definition: { type: ControlDefinitionType.Group } },
//   });
//   const { children } = base.fields;
//   initChildren(options.scope, children, formNode, element, undefined, options);
//   new FormStateNodeImpl(
//     childKey,
//     options.schemaInterface,
//     base,
//     options.contextOptions,
//   );
//   return base;
// }
//
// function createOptionNode(
//   childKey: number,
//   option: FieldOption,
//   formNode: FormNode,
//   dataNode: SchemaDataNode,
//   options: FormStateOptions,
// ): Control<FormStateBaseImpl> {
//   const base = createScoped<FormStateBaseImpl>(options.scope, {
//     dataNode,
//     disabled: false,
//     hidden: false,
//     readonly: false,
//     children: [],
//     resolved: { definition: { type: ControlDefinitionType.Group } },
//   });
//   const { children } = base.fields;
//   const oldVars = options.contextOptions.fields.variables;
//   const newVars = createScoped<Record<string, any>>(
//     options.scope,
//     oldVars.current.value ?? {},
//   );
//   updateComputedValue(newVars, () => ({
//     ...oldVars.value,
//     formData: { option, optionSelected: true },
//   }));
//   const newOptions = cloneFields(options.contextOptions);
//   setFields(newOptions, { variables: newVars });
//
//   initChildren(options.scope, children, formNode, dataNode, undefined, {
//     ...options,
//     contextOptions: newOptions,
//   });
//
//   new FormStateNodeImpl(childKey, options.schemaInterface, base, newOptions);
//   return base;
// }

export interface ChildNode {
  childKey: string | number;
  create: (scope: CleanupScope) => {
    definition: ControlDefinition;
    parent: SchemaDataNode;
    node: FormNode;
    variables?: Record<string, any>;
  };
}

function getChildNodes(
  resolved: ResolvedDefinition,
  node: FormNode,
  parent: SchemaDataNode,
  data: SchemaDataNode | undefined,
  schemaInterface: SchemaInterface,
): ChildNode[] {
  const def = resolved.definition;
  if (isDataControl(def)) {
    if (!data) return [];
    const type = def.renderOptions?.type;
    if (type === DataRenderType.CheckList || type === DataRenderType.Radio) {
      const n = node.getChildNodes();
      if (n.length > 0 && resolved.fieldOptions) {
        return resolved.fieldOptions.map((x) => ({
          childKey: x.value?.toString(),
          create: (scope) => {
            const vars = createScopedComputed(scope, () => {
              console.log(
                "Re-calculating option",
                x,
                isOptionSelected(schemaInterface, x, data),
              );
              return {
                option: x,
                optionSelected: isOptionSelected(schemaInterface, x, data),
              };
            });
            return {
              definition: {
                type: ControlDefinitionType.Group,
              },
              parent,
              node,
              variables: { formData: trackedValue(vars) },
            };
          },
        }));
      }
      return [];
    }
    if (data.schema.field.collection && data.elementIndex == null)
      return data.control.as<any[]>().elements.map((x, i) => ({
        childKey: x.uniqueId,
        create: () => ({
          definition: {
            type: ControlDefinitionType.Data,
            field: ".",
            hideTitle: true,
            renderOptions: {},
          } as DataControlDefinition,
          node,
          parent: data!.getChildElement(i),
        }),
      }));
  }
  return node.getChildNodes().map((x) => ({
    childKey: x.id,
    create: () => ({
      node: x,
      parent: data ?? parent,
      definition: x.definition,
    }),
  }));
}

function isOptionSelected(
  schemaInteface: SchemaInterface,
  option: FieldOption,
  data: SchemaDataNode,
) {
  if (data.schema.field.collection) {
    return !!data.control.as<any[] | undefined>().value?.includes(option.value);
  }
  return (
    schemaInteface.compareValue(
      data.schema.field,
      data.control.value,
      option.value,
    ) === 0
  );
}
