import {
  ControlLayoutProps,
  ControlRenderOptions,
  defaultDataProps,
  FormRenderer,
  renderControlLayout,
  Visibility,
} from "./controlRender";
import React, { useEffect, useRef } from "react";
import {
  createFormState,
  defaultSchemaInterface,
  FormNode,
  FormState,
  isDataControl,
  SchemaDataNode,
} from "@astroapps/forms-core";
import { ControlDataContext } from "./types";
import { actionHandlers, getGroupClassOverrides, rendererClass } from "./util";
import { useControl } from "@react-typed-forms/core";
import { makeHook } from "./dynamicHooks";

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
  const formStateRef = useRef<FormState | undefined>();
  const schemaInterface = options.schemaInterface ?? defaultSchemaInterface;
  const formState =
    options.formState ??
    (formStateRef.current = createFormState(schemaInterface));
  const state = formState.getControlState(data, form, options);

  useEffect(() => {
    const toCleanup = formStateRef.current;
    return () => toCleanup?.cleanup();
  }, [formStateRef.current]);

  useEffect(() => {
    return () => formState.cleanupControl(data, form);
  }, []);

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
      const dContext =
        parentDataNode ?? dataContext.dataNode ?? dataContext.parentNode;
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
    useEvalExpression: () => makeHook(() => undefined, undefined),
    useChildVisibility: () => makeHook(() => useControl(true), undefined),
    // useChildVisibility: (childDef, parentNode, dontOverride) => {
    //   throw "useChildVisibility"
    // return useEvalVisibilityHook(
    //   useExpr,
    //   childDef,
    //   !dontOverride
    //     ? lookupDataNode(childDef, parentNode ?? dataNode ?? parentDataNode)
    //     : undefined,
    // );
    // },
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
