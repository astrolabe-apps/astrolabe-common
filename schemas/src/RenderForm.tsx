import {
  ControlLayoutProps,
  ControlRenderOptions,
  ControlRenderProps,
  defaultDataProps,
  FormRenderer,
  renderControlLayout,
  Visibility,
} from "./controlRender";
import React, {
  FC,
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  ControlDefinition,
  ControlDisableType,
  createFormStateNode,
  createSchemaDataNode,
  createSchemaTree,
  defaultEvaluators,
  defaultSchemaInterface,
  FormGlobalOptions,
  FormNode,
  FormNodeOptions,
  FormNodeUi,
  FormStateNode,
  JsonPath,
  legacyFormNode,
  SchemaDataNode,
  SchemaField,
} from "@astroapps/forms-core";
import { ControlDataContext } from "./types";
import {
  actionHandlers,
  getGroupClassOverrides,
  rendererClass,
  useUpdatedRef,
} from "./util";
import { Control, useControl } from "@react-typed-forms/core";

export interface RenderFormProps {
  data: SchemaDataNode;
  form: FormNode;
  renderer: FormRenderer;
  options?: ControlRenderOptions;
  stateRef?: MutableRefObject<FormStateNode | null>;
}

/* @trackControls */
export function RenderForm({
  data,
  form,
  renderer,
  options = {},
  stateRef,
}: RenderFormProps) {
  const { readonly, disabled, displayOnly, hidden, variables, clearHidden } =
    options;
  const nodeOptions: FormNodeOptions = {
    forceReadonly: !!readonly,
    forceDisabled: !!disabled,
    variables,
    forceHidden: !!hidden,
  };
  const schemaInterface = options.schemaInterface ?? defaultSchemaInterface;
  const { runAsync } = useAsyncRunner();
  const globals: FormGlobalOptions = {
    runAsync,
    schemaInterface,
    evalExpression: (e, ctx) => defaultEvaluators[e.type]?.(e, ctx),
    resolveChildren: renderer.resolveChildren,
    clearHidden: !!clearHidden,
  };
  const state = useMemo(
    () => createFormStateNode(form, data, globals, nodeOptions),
    [form.id],
  );
  state.globals.value = globals;
  state.options.value = nodeOptions;
  if (stateRef) stateRef.current = state;
  useEffect(() => {
    return () => {
      state.cleanup();
    };
  }, [state]);
  return <RenderFormNode node={state} renderer={renderer} options={options} />;
}

export interface RenderFormNodeProps {
  node: FormStateNode;
  renderer: FormRenderer;
  options?: ControlRenderOptions;
}

/* @trackControls */
export function RenderFormNode({
  node: state,
  renderer,
  options = {},
}: RenderFormNodeProps) {
  useEffect(() => {
    state.attachUi(new DefaultFormNodeUi(state));
  }, [state]);
  const { runAsync } = useAsyncRunner();
  const schemaInterface = state.schemaInterface;
  const definition = state.definition;
  const visible = state.visible;
  const visibility = useControl<Visibility | undefined>(() =>
    visible != null
      ? {
          visible,
          showing: visible,
        }
      : undefined,
  );
  if (visible != null) {
    visibility.fields.visible.value = visible;
  }

  const dataContext: ControlDataContext = {
    schemaInterface: state.schemaInterface,
    dataNode: state.dataNode,
    parentNode: state.parent,
  };

  const adornments =
    definition.adornments?.map((x) =>
      renderer.renderAdornment({
        adornment: x,
        dataContext,
        formNode: state,
      }),
    ) ?? [];

  const {
    styleClass,
    labelClass,
    layoutClass,
    labelTextClass,
    textClass,
    ...inheritableOptions
  } = options;
  const { readonly, visible: vis, disabled, variables } = state;
  const childOptions: ControlRenderOptions = {
    ...inheritableOptions,
    readonly,
    disabled,
    variables,
    hidden: vis === false,
  };

  const labelAndChildren = renderControlLayout({
    formNode: state,
    renderer,
    renderChild: (child, options) => {
      const overrideClasses = getGroupClassOverrides(definition);
      const { actionOnClick, ...renderOptions } = options ?? {};
      const allChildOptions = {
        ...childOptions,
        ...overrideClasses,
        ...renderOptions,
        actionOnClick: actionHandlers(
          actionOnClick,
          childOptions.actionOnClick,
        ),
      };
      return (
        <RenderFormNode
          key={child.childKey}
          node={child}
          renderer={renderer}
          options={allChildOptions}
        />
      );
    },
    inline: options?.inline,
    displayOnly: options?.displayOnly,
    createDataProps: defaultDataProps,
    dataContext,
    control: dataContext.dataNode?.control,
    schemaInterface,
    style: state.resolved.style,
    customDisplay: options.customDisplay,
    actionOnClick: options.actionOnClick,
    styleClass: styleClass,
    labelClass: labelClass,
    labelTextClass: labelTextClass,
    textClass: textClass,
    runExpression: (scope, expr, returnResult) => {
      if (expr?.type) {
        defaultEvaluators[expr.type](expr, {
          dataNode: state.parent,
          schemaInterface,
          scope,
          returnResult,
          runAsync,
        });
      }
    },
  });
  const layoutProps: ControlLayoutProps = {
    ...labelAndChildren,
    adornments,
    className: rendererClass(options.layoutClass, definition.layoutClass),
    style: state.resolved.layoutStyle,
  };
  const renderedControl = renderer.renderLayout(
    options.adjustLayout?.(dataContext, layoutProps) ?? layoutProps,
  );
  return renderer.renderVisibility({
    visibility,
    ...renderedControl,
  });
}

/**
 * @deprecated Use RenderForm instead.
 */
export function useControlRendererComponent(
  controlOrFormNode: ControlDefinition | FormNode,
  renderer: FormRenderer,
  options: ControlRenderOptions = {},
  parentDataNode: SchemaDataNode,
): FC<{}> {
  const [definition, formNode] =
    "definition" in controlOrFormNode
      ? [controlOrFormNode.definition, controlOrFormNode]
      : [controlOrFormNode, legacyFormNode(controlOrFormNode)];

  const r = useUpdatedRef({
    options,
    renderer,
    parentDataNode,
    formNode,
  });

  return useMemo(
    () => () => {
      const { options, parentDataNode, formNode, renderer } = r.current;
      return (
        <RenderForm
          data={parentDataNode}
          form={formNode}
          renderer={renderer}
          options={options}
        />
      );
    },
    [r],
  );
}

/**
 * @deprecated Use RenderForm instead.
 */
export function ControlRenderer({
  definition,
  fields,
  renderer,
  options,
  control,
  parentPath,
}: {
  definition: ControlDefinition;
  fields: SchemaField[];
  renderer: FormRenderer;
  options?: ControlRenderOptions;
  control: Control<any>;
  parentPath?: JsonPath[];
}) {
  const schemaDataNode = createSchemaDataNode(
    createSchemaTree(fields).rootNode,
    control,
  );
  const Render = useControlRendererComponent(
    definition,
    renderer,
    options,
    schemaDataNode,
  );
  return <Render />;
}

/**
 * @deprecated Use RenderForm instead.
 */
export function NewControlRenderer({
  definition,
  renderer,
  options,
  parentDataNode,
}: {
  definition: ControlDefinition | FormNode;
  renderer: FormRenderer;
  options?: ControlRenderOptions;
  parentDataNode: SchemaDataNode;
}) {
  const Render = useControlRendererComponent(
    definition,
    renderer,
    options,
    parentDataNode,
  );
  return <Render />;
}

/**
 * @deprecated Use RenderForm instead.
 */
export function useControlRenderer(
  definition: ControlDefinition,
  fields: SchemaField[],
  renderer: FormRenderer,
  options: ControlRenderOptions = {},
): FC<ControlRenderProps> {
  const r = useUpdatedRef({ definition, fields, renderer, options });
  return useCallback(
    ({ control, parentPath }) => {
      return (
        <ControlRenderer
          {...r.current}
          control={control}
          parentPath={parentPath}
        />
      );
    },
    [r],
  );
}

export function useAsyncRunner(): {
  runAsync: (cb: () => void) => void;
} {
  let effects: (() => void)[] | undefined = [];
  const runAsync = (cb: () => void) => {
    if (effects) effects.push(cb);
    else cb();
  };
  useEffect(() => {
    if (effects) {
      const toRun = effects;
      effects = undefined;
      toRun.forEach((cb) => cb());
    }
  }, [effects]);

  return {
    runAsync,
  };
}

export class DefaultFormNodeUi implements FormNodeUi {
  constructor(protected node: FormStateNode) {}
  ensureVisible() {
    this.node.parentNode?.ui.ensureChildVisible(this.node.childIndex);
  }
  ensureChildVisible(childIndex: number) {
    this.ensureVisible();
  }
  getDisabler(type: ControlDisableType): () => () => void {
    if (type === ControlDisableType.Self) {
      return () => {
        const old = !!this.node.forceDisabled;
        this.node.setForceDisabled(true);
        return () => {
          this.node.setForceDisabled(old);
        };
      };
    }
    if (type === ControlDisableType.Global) {
      let topLevel = this.node;
      while (topLevel.parentNode) {
        topLevel = topLevel.parentNode;
      }
      return topLevel.ui.getDisabler(ControlDisableType.Self);
    }
    return () => () => {};
  }
}
