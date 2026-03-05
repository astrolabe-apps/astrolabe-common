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
  schemaDataForFieldRef,
  WizardRenderOptions,
} from "@react-typed-forms/schemas";
import {
  CustomNavigationProps,
  DefaultWizardRenderOptions,
  WizardStepInfo,
} from "../rendererOptions";
import { Control, useComputed, useControl } from "@react-typed-forms/core";
import { Fragment } from "react";

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
  },
  actions: {
    nextText: "Next",
    nextIcon: fontAwesomeIcon("chevron-right"),
    nextValidate: true,
    prevText: "Prev",
    prevIcon: fontAwesomeIcon("chevron-left"),
    prevValidate: false,
  },
  defaultShowSteps: false,
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
    },
    actions: {
      nextText,
      nextIcon,
      prevText,
      prevIcon,
      nextValidate,
      prevValidate,
    },
    defaultShowSteps,
    renderNavigation,
  } = mergedOptions;

  const wizardOptions = props.renderOptions as WizardRenderOptions;
  const showSteps = wizardOptions.showSteps ?? defaultShowSteps;

  const { pageIndexField } = wizardOptions;
  const pageFieldNode = pageIndexField
    ? schemaDataForFieldRef(pageIndexField, props.dataContext.parentNode)
    : null;
  const internalPage = useControl(0);
  const page: Control<number> =
    pageFieldNode?.control.as<number>() ?? internalPage;

  const { formNode, designMode, renderChild } = props;
  const childrenLength = formNode.getChildCount();
  const currentPage = page.value;
  const isValid = useComputed(() => isPageValid());

  const steps = buildSteps();

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
    steps,
  });

  const customRenderSteps = options?.renderSteps;
  const stepsElement = showSteps
    ? customRenderSteps
      ? customRenderSteps(steps, formRenderer)
      : defaultStepsRender()
    : null;

  const content = designMode ? (
    <div>{formNode.children.map((child) => renderChild(child))}</div>
  ) : currentPage < childrenLength ? (
    <div className={contentClass}>
      {renderChild(formNode.getChild(currentPage)!)}
    </div>
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
      const child = formNode.getChild(i)!;
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
      if (formNode.getChild(i)!.visible) {
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
      if (formNode.getChild(next)!.visible) {
        return next;
      }
      next += dir;
    }
    return null;
  }

  function validatePage() {
    const pageNode = formNode.getChild(currentPage);
    if (pageNode) {
      const valid = pageNode.validate();
      pageNode.setTouched(true);
      return valid;
    }
    return false;
  }

  function isPageValid() {
    return formNode.getChild(currentPage)?.valid ?? false;
  }
}
