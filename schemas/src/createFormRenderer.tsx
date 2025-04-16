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
  VisibilityRendererProps,
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
import { DataRenderType } from "./controlDefinition";

export function createFormRenderer(
  customRenderers: RendererRegistration[] = [],
  defaultRenderers: DefaultRenderers,
): FormRenderer {
  const allRenderers = [
    ...customRenderers,
    ...(defaultRenderers.extraRenderers ?? []),
  ];
  const dataRegistrations = allRenderers.filter(isDataRegistration);
  const groupRegistrations = allRenderers.filter(isGroupRegistration);
  const adornmentRegistrations = allRenderers.filter(isAdornmentRegistration);
  const displayRegistrations = allRenderers.filter(isDisplayRegistration);
  const labelRenderers = allRenderers.filter(isLabelRegistration);
  const arrayRenderers = allRenderers.filter(isArrayRegistration);
  const actionRenderers = allRenderers.filter(isActionRegistration);
  const layoutRenderers = allRenderers.filter(isLayoutRegistration);
  const visibilityRenderer =
    allRenderers.find(isVisibilityRegistration) ?? defaultRenderers.visibility;

  const formRenderers: FormRenderer = {
    renderAction,
    renderData,
    renderGroup,
    renderDisplay,
    renderLabel,
    renderArray,
    renderAdornment,
    renderLayout,
    renderVisibility,
    renderLabelText,
    html: defaultRenderers.html,
  };

  function renderVisibility(props: VisibilityRendererProps) {
    return visibilityRenderer.render(props, formRenderers);
  }

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
    const { renderOptions, field } = props;

    const options = hasOptions(props);
    const renderType = renderOptions.type;
    const renderer = dataRegistrations.find(matchesRenderer);

    const result = (renderer ?? defaultRenderers.data).render(
      props,
      formRenderers,
    );
    if (typeof result === "function") return result;
    return (l) => ({ ...l, children: result });

    function matchesRenderer(x: DataRendererRegistration) {
      const noMatch = x.match ? !x.match(props, renderOptions) : undefined;
      if (noMatch === true) return false;
      const matchCollection =
        (x.collection ?? false) ===
        (props.dataNode.elementIndex == null && (field.collection ?? false));
      const isSchemaAllowed =
        !!x.schemaType && renderType == DataRenderType.Standard
          ? isOneOf(x.schemaType, field.type)
          : undefined;
      const isRendererAllowed =
        !!x.renderType && isOneOf(x.renderType, renderType);
      return (
        matchCollection &&
        (x.options ?? false) === options &&
        (isSchemaAllowed ||
          isRendererAllowed ||
          (!x.renderType && !x.schemaType && noMatch === false))
      );
    }
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
