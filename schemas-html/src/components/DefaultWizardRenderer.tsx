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
  NoOpControlActionContext,
  rendererClass,
  schemaDataForFieldRef,
  WizardRenderOptions,
} from "@react-typed-forms/schemas";
import {
  CustomNavigationProps,
  DefaultWizardRenderOptions,
  WizardNavActionOptions,
  WizardStepInfo,
} from "../rendererOptions";
import { Control, useControl } from "@react-typed-forms/core";
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
    actions: {
      next: nextAction,
      prev: prevAction,
      navActionId,
      validateActionId,
    },
    defaultShowSteps,
    renderNavigation,
  } = mergedOptions;

  const wizardOptions = props.renderOptions as WizardRenderOptions;
  const showSteps = wizardOptions.showSteps ?? defaultShowSteps;
  const manualNavigation = wizardOptions.manualNavigation ?? false;

  const { pageIndexField } = wizardOptions;
  const pageFieldNode = pageIndexField
    ? schemaDataForFieldRef(pageIndexField, props.dataContext.parentNode)
    : null;

  const { formNode, designMode, renderChild } = props;

  const allChildren = formNode.children;
  const leftNavChildren = allChildren.filter(
    (x) => x.definition.placement === "leftNav",
  );
  const middleNavChildren = allChildren.filter(
    (x) => x.definition.placement === "middleNav",
  );
  const rightNavChildren = allChildren.filter(
    (x) => x.definition.placement === "rightNav",
  );
  const pageChildren = allChildren.filter(
    (x) => !x.definition.placement || x.definition.placement === "content",
  );
  const childrenLength = pageChildren.length;
  const internalPage = useControl(pageChildren.findIndex((x) => x.visible));
  const page: Control<number> =
    pageFieldNode?.control.as<number>() ?? internalPage;
  const currentPage = page.value;

  const steps = buildSteps();

  const noNext = !designMode && nextVisibleInDirection(1) == null;
  const noPrev = !designMode && nextVisibleInDirection(-1) == null;

  const next = createAction(
    navActionId,
    designMode ? () => {} : () => nav(1, nextAction.validate),
    nextAction.text,
    makeActionProps(nextAction, noNext),
  );

  const prev = createAction(
    navActionId,
    designMode ? () => {} : () => nav(-1, prevAction.validate),
    prevAction.text,
    makeActionProps(prevAction, noPrev),
  );

  function makeActionProps(
    { hide, text, validate, ...others }: WizardNavActionOptions,
    disabled: boolean,
  ): Partial<ActionRendererProps> {
    return {
      hidden: manualNavigation || (disabled && hide),
      disabled,
      ...others,
    };
  }

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
    page: countVisibleUntil(currentPage),
    totalPages: countVisibleUntil(childrenLength),
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

  const content = designMode ? (
    <div>{pageChildren.map((child) => renderChild(child))}</div>
  ) : currentPage < childrenLength ? (
    <div className={contentClass}>{renderChild(pageChildren[currentPage])}</div>
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

  function buildSteps(): WizardStepInfo[] {
    const result: WizardStepInfo[] = [];
    let visibleIndex = 0;
    for (let i = 0; i < childrenLength; i++) {
      const child = pageChildren[i];
      const visible = !!child.visible;
      result.push({
        index: visibleIndex,
        title: child.definition.title ?? `Step ${visibleIndex + 1}`,
        visible,
        active: i === currentPage,
        completed: visible && i < currentPage,
        valid: child.valid,
      });
      if (visible) visibleIndex++;
    }
    return result;
  }

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

  function countVisibleUntil(untilPage: number) {
    let count = 0;
    for (let i = 0; i < untilPage && i < childrenLength; i++) {
      if (pageChildren[i].visible) {
        count++;
      }
    }
    return count;
  }

  async function nav(dir: number, validate: boolean) {
    if (validate) {
      const syncValid = validatePage();
      const validator = validateActionId
        ? props.actionOnClick?.(
            validateActionId,
            { current: page.current.value, dir },
            props.dataContext,
          )
        : undefined;
      const validateResult = await validator?.(NoOpControlActionContext);
      if (!syncValid || validateResult === false) {
        return;
      }
    }
    const next = nextVisibleInDirection(dir);
    if (next != null) {
      page.value = next;
    }
  }

  function nextVisibleInDirection(dir: number): number | null {
    let next = currentPage + dir;
    while (next >= 0 && next < childrenLength) {
      if (pageChildren[next].visible) {
        return next;
      }
      next += dir;
    }
    return null;
  }

  function validatePage() {
    const pageNode = pageChildren[currentPage];
    if (pageNode) {
      const valid = pageNode.validate();
      pageNode.setTouched(true);
      return valid;
    }
    return false;
  }

  function isPageValid() {
    return pageChildren[currentPage]?.valid ?? false;
  }
}
