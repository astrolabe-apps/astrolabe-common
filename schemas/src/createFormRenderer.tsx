import { ReactNode } from "react";
import {
  ActionRendererProps,
  AdornmentProps,
  AdornmentRenderer,
  ArrayRendererProps,
  ControlLayoutProps,
  DataRendererProps,
  DisplayRendererProps,
  FormRenderer,
  GroupRendererProps,
  LabelRendererProps,
  LabelType,
} from "./controlRender";
import { hasOptions } from "./util";
import {
  ActionRendererRegistration,
  AdornmentRendererRegistration,
  ArrayRendererRegistration,
  DataRendererRegistration,
  DefaultRenderers,
  DisplayRendererRegistration,
  GroupRendererRegistration,
  LabelRendererRegistration,
  LayoutRendererRegistration,
  RendererRegistration,
  VisibilityRendererRegistration,
} from "./renderers";
import { DataRenderType } from "./types";

export function createFormRenderer(
  customRenderers: RendererRegistration[] = [],
  defaultRenderers: DefaultRenderers,
): FormRenderer {
  const dataRegistrations = customRenderers.filter(isDataRegistration);
  const groupRegistrations = customRenderers.filter(isGroupRegistration);
  const adornmentRegistrations = customRenderers.filter(
    isAdornmentRegistration,
  );
  const displayRegistrations = customRenderers.filter(isDisplayRegistration);
  const labelRenderers = customRenderers.filter(isLabelRegistration);
  const arrayRenderers = customRenderers.filter(isArrayRegistration);
  const actionRenderers = customRenderers.filter(isActionRegistration);
  const layoutRenderers = customRenderers.filter(isLayoutRegistration);
  const visibilityRenderer =
    customRenderers.find(isVisibilityRegistration) ??
    defaultRenderers.visibility;

  const formRenderers: FormRenderer = {
    renderAction,
    renderData,
    renderGroup,
    renderDisplay,
    renderLabel,
    renderArray,
    renderAdornment,
    renderLayout,
    renderVisibility: visibilityRenderer.render,
    renderLabelText,
  };

  function renderLabelText(label: ReactNode) {
    return renderLabel({ label, type: LabelType.Text }, undefined, undefined);
  }

  function renderLayout(props: ControlLayoutProps) {
    const renderer =
      layoutRenderers.find((x) => !x.match || x.match(props)) ??
      defaultRenderers.renderLayout;
    return renderer.render(props, formRenderers);
  }

  function renderAdornment(props: AdornmentProps): AdornmentRenderer {
    const renderer =
      adornmentRegistrations.find((x) =>
        isOneOf(x.adornmentType, props.adornment.type),
      ) ?? defaultRenderers.adornment;
    return renderer.render(props, formRenderers);
  }

  function renderArray(props: ArrayRendererProps) {
    return (arrayRenderers[0] ?? defaultRenderers.array).render(
      props,
      formRenderers,
    );
  }

  function renderLabel(
    props: LabelRendererProps,
    labelStart: ReactNode,
    labelEnd: ReactNode,
  ) {
    const renderer =
      labelRenderers.find((x) => isOneOf(x.labelType, props.type)) ??
      defaultRenderers.label;
    return renderer.render(props, labelStart, labelEnd, formRenderers);
  }

  function renderData(
    props: DataRendererProps,
  ): (layout: ControlLayoutProps) => ControlLayoutProps {
    const {
      renderOptions: { type: renderType },
      field,
    } = props;

    const options = hasOptions(props);
    const renderer =
      dataRegistrations.find(
        (x) =>
          (x.collection ?? false) ===
            (props.elementIndex == null && (field.collection ?? false)) &&
          (x.options ?? false) === options &&
          ((x.schemaType &&
            renderType == DataRenderType.Standard &&
            isOneOf(x.schemaType, field.type)) ||
            (x.renderType && isOneOf(x.renderType, renderType)) ||
            (x.match && x.match(props))),
      ) ?? defaultRenderers.data;

    const result = renderer.render(props, formRenderers);
    if (typeof result === "function") return result;
    return (l) => ({ ...l, children: result });
  }

  function renderGroup(
    props: GroupRendererProps,
  ): (layout: ControlLayoutProps) => ControlLayoutProps {
    const renderType = props.renderOptions.type;
    const renderer =
      groupRegistrations.find((x) => isOneOf(x.renderType, renderType)) ??
      defaultRenderers.group;
    const result = renderer.render(props, formRenderers);
    if (typeof result === "function") return result;
    return (l) => ({ ...l, children: result });
  }

  function renderAction(props: ActionRendererProps) {
    const renderer =
      actionRenderers.find((x) => isOneOf(x.actionType, props.actionId)) ??
      defaultRenderers.action;
    return renderer.render(props, formRenderers);
  }

  function renderDisplay(props: DisplayRendererProps) {
    const renderType = props.data.type;
    const renderer =
      displayRegistrations.find((x) => isOneOf(x.renderType, renderType)) ??
      defaultRenderers.display;
    return renderer.render(props, formRenderers);
  }

  return formRenderers;
}

function isOneOf<A>(x: A | A[] | undefined, v: A) {
  return x == null ? true : Array.isArray(x) ? x.includes(v) : v === x;
}

function isAdornmentRegistration(
  x: RendererRegistration,
): x is AdornmentRendererRegistration {
  return x.type === "adornment";
}

function isDataRegistration(
  x: RendererRegistration,
): x is DataRendererRegistration {
  return x.type === "data";
}

function isGroupRegistration(
  x: RendererRegistration,
): x is GroupRendererRegistration {
  return x.type === "group";
}

function isLabelRegistration(
  x: RendererRegistration,
): x is LabelRendererRegistration {
  return x.type === "label";
}

function isLayoutRegistration(
  x: RendererRegistration,
): x is LayoutRendererRegistration {
  return x.type === "layout";
}

function isVisibilityRegistration(
  x: RendererRegistration,
): x is VisibilityRendererRegistration {
  return x.type === "visibility";
}

function isActionRegistration(
  x: RendererRegistration,
): x is ActionRendererRegistration {
  return x.type === "action";
}

function isDisplayRegistration(
  x: RendererRegistration,
): x is DisplayRendererRegistration {
  return x.type === "display";
}

function isArrayRegistration(
  x: RendererRegistration,
): x is ArrayRendererRegistration {
  return x.type === "array";
}
