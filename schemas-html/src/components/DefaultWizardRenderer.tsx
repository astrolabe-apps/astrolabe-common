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
} from "@react-typed-forms/schemas";
import { useComputed, useControl } from "@react-typed-forms/core";
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
      <WizardRenderer
        groupProps={props}
        formRenderer={formRenderer}
        options={options}
      />
    ),
    {
      renderType: GroupRenderType.Wizard,
    },
  );
}

function WizardRenderer({
  groupProps: props,
  formRenderer,
  options,
}: {
  groupProps: GroupRendererProps;
  formRenderer: FormRenderer;
  options?: DefaultWizardRenderOptions;
}) {
  const mergedOptions = deepMerge(
    (options ?? {}) as typeof defaultOptions,
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
  const { formNode, designMode, renderChild } = props;
  const {
    html: { Div },
  } = formRenderer;
  const childrenLength = formNode.getChildCount();
  const page = useControl(0);
  const currentPage = page.value;
  const isValid = useComputed(() => isPageValid());

  const next = createAction("nav", () => nav(1, nextValidate), nextText, {
    hidden: !designMode && nextVisibleInDirection(1) == null,
    disabled: !isValid.value,
    icon: nextIcon,
    iconPlacement: IconPlacement.AfterText,
  });

  const prev = createAction("nav", () => nav(-1, prevValidate), prevText, {
    disabled: !designMode && nextVisibleInDirection(-1) == null,
    icon: prevIcon,
  });
  const navElement = renderNavigation({
    formRenderer,
    page: countVisibleUntil(currentPage),
    totalPages: countVisibleUntil(childrenLength),
    prev,
    next: next,
    className: navContainerClass,
    validatePage: async () => validatePage(),
  });
  const content = designMode ? (
    <Div>{formNode.children.map((child) => renderChild(child))}</Div>
  ) : currentPage < childrenLength ? (
    <Div className={contentClass}>
      {renderChild(formNode.getChild(currentPage)!)}
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
    for (let i = 0; i < untilPage && i < childrenLength; i++) {
      if (!formNode.getChild(i)!.hidden) {
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
    while (next >= 0 && next < childrenLength) {
      if (!formNode.getChild(next)!.hidden) {
        return next;
      }
      next += dir;
    }
    return null;
  }

  function validatePage() {
    return formNode.getChild(currentPage)!.validate();
  }

  function isPageValid() {
    return formNode.getChild(currentPage)!.valid;
  }
}
