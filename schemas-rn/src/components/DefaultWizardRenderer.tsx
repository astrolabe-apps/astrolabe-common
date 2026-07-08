import {
  createGroupRenderer,
  deepMerge,
  fontAwesomeIcon,
  FormRenderer,
  GroupRendererProps,
  GroupRenderType,
  IconPlacement,
  rendererClass,
  useWizardRenderer,
} from "@react-typed-forms/schemas";
import {
  CustomNavigationProps,
  DefaultWizardRenderOptions,
} from "../rendererOptions";
import { Fragment, ReactNode } from "react";


const defaultOptions = {
  classes: {
    className: undefined,
    contentClass: "min-h-96 overflow-auto",
    // Buttons stack vertically for mobile.
    navContainerClass: "flex flex-col gap-2 my-2",
    leftNavClass: "flex flex-col gap-2",
    middleNavClass: "flex flex-col gap-2",
    rightNavClass: "flex flex-col gap-2",
  },
  actions: {
    next: {
      text: "Next",
      icon: fontAwesomeIcon("chevron-right"),
      validate: true,
      iconPlacement: IconPlacement.AfterText,
    },
    prev: {
      text: "Prev",
      icon: fontAwesomeIcon("chevron-left"),
      validate: false,
    },
  },
  renderNavigation: defaultNavigationRender,
} satisfies DefaultWizardRenderOptions;

function defaultNavigationRender({
  formRenderer,
  prev,
  next,
  className,
  leftNav,
  middleNav,
  rightNav,
  leftNavClass,
  middleNavClass,
  rightNavClass,
}: CustomNavigationProps) {
  {
    const {
      html: { Div },
      renderAction,
    } = formRenderer;
    return (
      <Div className={className}>
        <Div className={leftNavClass}>
          {renderAction(prev)}
          {leftNav}
        </Div>
        <Div className={middleNavClass}>{middleNav}</Div>
        <Div className={rightNavClass}>
          {rightNav}
          {renderAction(next)}
        </Div>
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
    classes: {
      className,
      contentClass,
      navContainerClass,
      leftNavClass,
      middleNavClass,
      rightNavClass,
    },
    actions,
    renderNavigation,
  } = mergedOptions;
  const { designMode, renderChild } = props;
  const {
    html: { Div },
  } = formRenderer;

  const wizard = useWizardRenderer(props, { actions });

  const {
    currentPage,
    pageChildren,
    page,
    totalPages,
    next,
    prev,
    validatePage,
    leftNavChildren,
    middleNavChildren,
    rightNavChildren,
  } = wizard;

  const leftNav: ReactNode = leftNavChildren.length
    ? leftNavChildren.map((child) => renderChild(child))
    : undefined;
  const middleNav: ReactNode = middleNavChildren.length
    ? middleNavChildren.map((child) => renderChild(child))
    : undefined;
  const rightNav: ReactNode = rightNavChildren.length
    ? rightNavChildren.map((child) => renderChild(child))
    : undefined;

  const navElement = renderNavigation({
    formRenderer,
    page,
    totalPages,
    prev,
    next,
    className: navContainerClass,
    validatePage: async () => validatePage(),
    leftNav,
    middleNav,
    rightNav,
    leftNavClass,
    middleNavClass,
    rightNavClass,
  });

  const currentChild = pageChildren[currentPage];
  const content = designMode ? (
    <Div>{props.formNode.children.map((child) => renderChild(child))}</Div>
  ) : currentChild ? (
    <Div className={contentClass}>
      {renderChild(currentChild)}
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
}
