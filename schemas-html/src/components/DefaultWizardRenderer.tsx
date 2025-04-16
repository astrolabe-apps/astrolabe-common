import {
  ActionRendererProps,
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
  validationVisitor,
  visitFormDataInContext,
} from "@react-typed-forms/schemas";
import { VisibleChildrenRenderer } from "./VisibleChildrenRenderer";
import { useControl } from "@react-typed-forms/core";
import { Fragment, ReactNode } from "react";

export interface CustomNavigationProps {
  className?: string;
  next: ActionRendererProps;
  prev: ActionRendererProps;
  formRenderer: FormRenderer;
}

export interface DefaultWizardRenderOptions {
  classes?: {
    className?: string;
    navContainerClass?: string;
    contentClass?: string;
  };
  actions?: {
    nextText?: string;
    nextIcon?: IconReference;
    prevText?: string;
    prevIcon?: IconReference;
  };
  renderNavigation?: (props: CustomNavigationProps) => ReactNode;
}

const defaultOptions = {
  classes: {
    className: undefined,
    contentClass: "min-h-96 overflow-auto",
    navContainerClass: "flex justify-between gap-4 my-2",
  },
  actions: {
    nextText: "Next",
    nextIcon: fontAwesomeIcon("chevron-right"),
    prevText: "Prev",
    prevIcon: fontAwesomeIcon("chevron-left"),
  },
  renderNavigation: defaultNavigationRender,
} satisfies DefaultWizardRenderOptions;

function defaultNavigationRender({
  formRenderer,
  prev,
  next,
  className,
}: CustomNavigationProps) {
  {
    const {
      html: { Div },
      renderAction,
    } = formRenderer;
    return (
      <Div className={className}>
        {renderAction(prev)}
        {renderAction(next)}
      </Div>
    );
  }
}

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
    (props.defaultOptions ?? {}) as typeof defaultOptions,
    defaultOptions,
  );
  const {
    classes: { className, contentClass, navContainerClass },
    actions: { nextText, nextIcon, prevText, prevIcon },
    renderNavigation,
  } = mergedOptions;
  const {
    html: { Div },
  } = props.formRenderer;
  const children = props.formNode.getChildNodes();
  const allVisible = children.map((_, i) => isChildVisible(i));
  const page = useControl(0);
  const currentPage = page.value;
  const next = createAction("nav", () => nav(1), nextText, {
    disabled: nextVisibleInDirection(1) == null,
    icon: nextIcon,
    iconPlacement: IconPlacement.AfterText,
  });
  const prev = createAction("nav", () => nav(-1), prevText, {
    disabled: nextVisibleInDirection(-1) == null,
    icon: prevIcon,
  });
  const navElement = renderNavigation({
    formRenderer: props.formRenderer,
    prev,
    next,
    className: navContainerClass,
  });
  const content = props.designMode ? (
    <Div>{children.map((child, i) => props.renderChild(i, child))}</Div>
  ) : currentPage < children.length ? (
    <Div className={contentClass}>
      {props.renderChild(currentPage, children[currentPage])}
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
    if (!validatePage()) {
      return;
    }
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

  function validatePage() {
    const pageNode = children[currentPage];
    let hasErrors = false;
    visitFormDataInContext(
      props.dataContext.parentNode,
      pageNode,
      validationVisitor(() => {
        hasErrors = true;
      }),
    );
    return !hasErrors;
  }
}
