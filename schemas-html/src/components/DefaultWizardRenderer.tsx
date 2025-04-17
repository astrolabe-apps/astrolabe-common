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
  page: number;
  totalPages: number;
  next: ActionRendererProps;
  prev: ActionRendererProps;
  formRenderer: FormRenderer;
  validatePage: () => Promise<boolean>;
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
    nextValidate?: boolean;
    prevText?: string;
    prevIcon?: IconReference;
    prevValidate?: boolean;
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
    nextValidate: true,
    prevText: "Prev",
    prevIcon: fontAwesomeIcon("chevron-left"),
    prevValidate: false,
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
    actions: {
      nextText,
      nextIcon,
      prevText,
      prevIcon,
      nextValidate,
      prevValidate,
    },
    renderNavigation,
  } = mergedOptions;
  const {
    html: { Div },
  } = props.formRenderer;
  const children = props.formNode.getChildNodes();
  const allVisible = children.map((_, i) => isChildVisible(i));
  const page = useControl(0);
  const currentPage = page.value;
  const next = createAction("nav", () => nav(1, nextValidate), nextText, {
    disabled: !props.designMode && nextVisibleInDirection(1) == null,
    icon: nextIcon,
    iconPlacement: IconPlacement.AfterText,
  });
  const prev = createAction("nav", () => nav(-1, prevValidate), prevText, {
    disabled: !props.designMode && nextVisibleInDirection(-1) == null,
    icon: prevIcon,
  });
  const navElement = renderNavigation({
    formRenderer: props.formRenderer,
    page: countVisibleUntil(currentPage),
    totalPages: countVisibleUntil(children.length),
    prev,
    next,
    className: navContainerClass,
    validatePage: async () => validatePage(),
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

  function countVisibleUntil(untilPage: number) {
    let count = 0;
    for (let i = 0; i < untilPage && i < allVisible.length; i++) {
      if (allVisible[i]) {
        count++;
      }
    }
    return count;
  }

  function nav(dir: number, validate: boolean) {
    if (validate && !validatePage()) {
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
