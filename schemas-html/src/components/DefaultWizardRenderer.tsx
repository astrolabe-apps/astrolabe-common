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
  WizardStepInfo,
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
    navContainerClass: "flex justify-between gap-4 my-2",
    stepsContainerClass: "flex items-center gap-2 mb-4",
    stepClass:
      "flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-500",
    activeStepClass: "font-semibold text-blue-600 bg-blue-50",
    completedStepClass: "text-green-600",
    stepLabelClass: "",
    stepNumberClass:
      "flex items-center justify-center w-6 h-6 rounded-full border text-xs",
    leftNavClass: "flex gap-2",
    rightNavClass: "flex gap-2",
    middleNavClass: "flex gap-2",
  },
  actions: {
    next: {
      text: "Next",
      icon: fontAwesomeIcon("chevron-right"),
      validate: true,
      hide: false,
      actionData: 1,
      iconPlacement: IconPlacement.AfterText,
    },
    prev: {
      text: "Prev",
      icon: fontAwesomeIcon("chevron-left"),
      validate: false,
      hide: false,
      actionData: -1,
    },
    navActionId: "nav",
    validateActionId: undefined,
  },
  defaultShowSteps: false,
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
  rightNavClass,
  middleNavClass,
}: CustomNavigationProps) {
  {
    const { renderAction } = formRenderer;
    return (
      <div className={className}>
        <div className={leftNavClass}>
          {renderAction(prev)}
          {leftNav}
        </div>
        <div className={middleNavClass}>{middleNav}</div>
        <div className={rightNavClass}>
          {rightNav}
          {renderAction(next)}
        </div>
      </div>
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
      stepsContainerClass,
      stepClass,
      activeStepClass,
      completedStepClass,
      stepLabelClass,
      stepNumberClass,
      leftNavClass,
      rightNavClass,
      middleNavClass,
    },
    actions,
    defaultShowSteps,
    renderNavigation,
  } = mergedOptions;

  const { designMode, renderChild } = props;

  const wizard = useWizardRenderer(props, {
    actions,
    defaultShowSteps,
  });

  const {
    currentPage,
    pageChildren,
    steps,
    page,
    totalPages,
    next,
    prev,
    validatePage,
    showSteps,
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
    steps,
    leftNav,
    middleNav,
    rightNav,
    leftNavClass,
    middleNavClass,
    rightNavClass,
  });

  const customRenderSteps = options?.renderSteps;
  const stepsElement = showSteps
    ? customRenderSteps
      ? customRenderSteps(steps, formRenderer)
      : defaultStepsRender()
    : null;

  const currentChild = pageChildren[currentPage];
  const content = designMode ? (
    <div>{pageChildren.map((child) => renderChild(child))}</div>
  ) : currentChild ? (
    <div className={contentClass}>{renderChild(currentChild)}</div>
  ) : (
    <Fragment />
  );

  return (
    <div className={rendererClass(props.className, className)}>
      {stepsElement}
      {content}
      {navElement}
    </div>
  );

  function defaultStepsRender() {
    const visibleSteps = steps.filter((s) => s.visible);
    return (
      <div className={stepsContainerClass}>
        {visibleSteps.map((step, i) => (
          <div
            key={i}
            className={rendererClass(
              stepClass,
              step.active
                ? activeStepClass
                : step.completed
                  ? completedStepClass
                  : undefined,
            )}
          >
            <span className={stepNumberClass}>{step.index + 1}</span>
            <span className={stepLabelClass}>{step.title}</span>
          </div>
        ))}
      </div>
    );
  }
}
