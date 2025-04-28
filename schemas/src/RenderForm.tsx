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
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ControlDefinition,
  ControlState,
  createFormState,
  createSchemaDataNode,
  createSchemaTree,
  defaultSchemaInterface,
  FormNode,
  FormState,
  isDataControl,
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
}
/* @trackControls */
export function RenderForm({
  data,
  form,
  renderer,
  options = {},
}: RenderFormProps) {
  const schemaInterface = options.schemaInterface ?? defaultSchemaInterface;
  const [formState, setFormState] = useState(
    () => options?.formState ?? createFormState(schemaInterface),
  );
  const state = formState.getControlState(data, form, options);

  useEffect(() => {
    if (!options?.formState) {
      return () => formState.cleanup();
    }
  }, [formState, options?.formState]);

  const definition = state.definition;

  const visible = !state.hidden;

  const visibility = useControl<Visibility | undefined>(() =>
    visible != null
      ? {
          visible,
          showing: visible,
        }
      : undefined,
  );
  visibility.fields.visible.value = visible;

  const dataContext: ControlDataContext = {
    schemaInterface: state.schemaInterface,
    dataNode: state.dataNode,
    parentNode: data,
    formData: state.formData,
  };

  const adornments =
    definition.adornments?.map((x) =>
      renderer.renderAdornment({
        adornment: x,
        dataContext,
        formOptions: state,
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
  const childOptions: ControlRenderOptions = {
    ...inheritableOptions,
    ...state,
  };

  const labelAndChildren = renderControlLayout({
    formNode: form,
    renderer,
    state,
    renderChild: (k, child, options) => {
      const overrideClasses = getGroupClassOverrides(definition);
      const { parentDataNode, actionOnClick, ...renderOptions } = options ?? {};
      const dContext = parentDataNode ?? dataContext.dataNode ?? data;
      const allChildOptions = {
        ...childOptions,
        ...overrideClasses,
        ...renderOptions,
        actionOnClick: actionHandlers(
          actionOnClick,
          childOptions.actionOnClick,
        ),
        formState,
      };
      return (
        <RenderForm
          key={k}
          form={child}
          renderer={renderer}
          data={dContext}
          options={allChildOptions}
        />
      );
    },
    createDataProps: defaultDataProps,
    formOptions: state,
    dataContext,
    control: dataContext.dataNode?.control,
    schemaInterface,
    style: state.style,
    allowedOptions: state.allowedOptions,
    customDisplay: options.customDisplay,
    actionOnClick: options.actionOnClick,
    styleClass: options.styleClass,
    labelClass: options.labelClass,
    textClass: options.textClass,
    getChildState(child: FormNode, parent?: SchemaDataNode): ControlState {
      return formState.getControlState(
        parent ?? state.dataNode ?? data,
        child,
        childOptions,
      );
    },
    runExpression: (scope, expr, returnResult) => {
      if (expr?.type) {
        formState.evalExpression(expr, {
          scope,
          dataNode: data,
          schemaInterface,
          returnResult,
        });
      }
    },
  });
  const layoutProps: ControlLayoutProps = {
    ...labelAndChildren,
    adornments,
    className: rendererClass(options.layoutClass, definition.layoutClass),
    style: state.layoutStyle,
  };
  const renderedControl = renderer.renderLayout(
    options.adjustLayout?.(dataContext, layoutProps) ?? layoutProps,
  );
  return renderer.renderVisibility({ visibility, ...renderedControl });
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
