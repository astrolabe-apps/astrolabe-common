import {
  createAction,
  createGroupRenderer,
  deepMerge,
  fontAwesomeIcon,
  FormRenderer,
  GroupRendererProps,
  GroupRenderType,
  IconPlacement,
  IconReference,
  rendererClass,
} from "@react-typed-forms/schemas";
import { VisibleChildrenRenderer } from "./VisibleChildrenRenderer";
import { useControl } from "@react-typed-forms/core";
import { Fragment } from "react";

export interface DefaultWizardRenderOptions {
  classes?: {
    className?: string;
    navContainerClass?: string;
    contentClass?: string;
  };
  icons?: {
    nextIcon?: IconReference;
    prevIcon?: IconReference;
  };
}

const defaultOptions = {
  classes: {
    className: undefined,
    contentClass: "min-h-96 overflow-auto",
    navContainerClass: "flex justify-between gap-4 my-2",
  },
  icons: {
    nextIcon: fontAwesomeIcon("chevron-right"),
    prevIcon: fontAwesomeIcon("chevron-left"),
  },
} satisfies DefaultWizardRenderOptions;

export function createWizardRenderer(options?: DefaultWizardRenderOptions) {
  return createGroupRenderer(
    (props, formRenderer) => (
      <VisibleChildrenRenderer
        props={{ ...props, formRenderer, defaultOptions: options }}
        render={renderWizard}
        useChildVisibility={props.useChildVisibility}
        dataContext={props.dataContext}
        parentFormNode={props.formNode}
      />
    ),
    {
      renderType: GroupRenderType.Wizard,
    },
  );
}

function renderWizard(
  props: GroupRendererProps & {
    formRenderer: FormRenderer;
    defaultOptions?: DefaultWizardRenderOptions;
  },
  isChildVisible: (i: number) => boolean,
) {
  const mergedOptions = deepMerge(
    defaultOptions,
    (props.defaultOptions ?? {}) as typeof defaultOptions,
  );
  const {
    classes: { className, contentClass, navContainerClass },
    icons: { nextIcon, prevIcon },
  } = mergedOptions;
  const {
    html: { Div },
    renderAction,
  } = props.formRenderer;
  const children = props.formNode.getChildNodes();
  const allVisible = children.map((_, i) => isChildVisible(i));
  const page = useControl(0);
  const currentPage = page.value;
  const next = createAction("nav", () => nav(1), "Next", {
    disabled: nextVisibleInDirection(1) == null,
    icon: nextIcon,
    iconPlacement: IconPlacement.AfterText,
  });
  const prev = createAction("nav", () => nav(-1), "Previous", {
    disabled: nextVisibleInDirection(-1) == null,
    icon: prevIcon,
  });
  const navElement = (
    <Div className={navContainerClass}>
      {renderAction(next)}
      {renderAction(prev)}
    </Div>
  );
  const content = props.designMode ? (
    <Div>{children.map((child, i) => props.renderChild(i, child))}</Div>
  ) : currentPage < children.length ? (
    <Div className={contentClass}>
      {props.renderChild(0, children[currentPage])}
    </Div>
  ) : (
    <Fragment />
  );

  return (
    <Div className={rendererClass(props.className, className)}>
      {content}
      {navElement}
    </Div>
  );

  function nav(dir: number) {
    const next = nextVisibleInDirection(dir);
    if (next != null) {
      page.value = next;
    }
  }

  function nextVisibleInDirection(dir: number): number | null {
    let next = currentPage + dir;
    while (next >= 0 && next < children.length) {
      if (allVisible[next]) {
        return next;
      }
      next += dir;
    }
    return null;
  }
}
