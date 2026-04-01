import {
  FormStateNode,
  schemaDataForFieldRef,
  WizardRenderOptions,
} from "@astroapps/forms-core";
import { Control, useControl } from "@react-typed-forms/core";
import { createAction } from "./controlBuilder";
import { GroupRendererProps } from "./controlRender";
import { ActionRendererProps, NoOpControlActionContext } from "./types";

export interface WizardStepInfo {
  index: number;
  title: string;
  visible: boolean;
  active: boolean;
  completed: boolean;
  valid: boolean;
}

export interface WizardNavActionOptions extends Partial<ActionRendererProps> {
  text?: string;
  validate?: boolean;
  hide?: boolean;
}

export interface UseWizardRendererOptions {
  actions?: {
    next?: WizardNavActionOptions;
    prev?: WizardNavActionOptions;
    navActionId?: string;
    validateActionId?: string;
  };
  defaultShowSteps?: boolean;
}

export interface WizardRendererState {
  currentPage: number;
  pageChildren: FormStateNode[];
  childrenLength: number;
  pageControl: Control<number>;
  page: number;
  totalPages: number;
  steps: WizardStepInfo[];
  next: ActionRendererProps;
  prev: ActionRendererProps;
  hasNext: boolean;
  hasPrev: boolean;
  validatePage: () => boolean;
  isPageValid: () => boolean;
  nav: (dir: number, validate: boolean) => Promise<void>;
  goToPage: (index: number) => void;
  countVisibleUntil: (untilPage: number) => number;
  nextVisibleInDirection: (dir: number) => number | null;
  manualNavigation: boolean;
  showSteps: boolean;
  leftNavChildren: FormStateNode[];
  middleNavChildren: FormStateNode[];
  rightNavChildren: FormStateNode[];
}

export function useWizardRenderer(
  props: GroupRendererProps,
  options?: UseWizardRendererOptions,
): WizardRendererState {
  const {
    actions: {
      next: nextAction = {},
      prev: prevAction = {},
      navActionId = "nav",
      validateActionId,
    } = {},
    defaultShowSteps = false,
  } = options ?? {};

  const wizardOptions = props.renderOptions as WizardRenderOptions;
  const showSteps = wizardOptions.showSteps ?? defaultShowSteps;
  const manualNavigation = wizardOptions.manualNavigation ?? false;

  const { pageIndexField } = wizardOptions;
  const pageFieldNode = pageIndexField
    ? schemaDataForFieldRef(pageIndexField, props.dataContext.parentNode)
    : null;

  const { formNode, designMode } = props;

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
  const internalPage = useControl(
    Math.max(0, pageChildren.findIndex((x) => x.visible)),
  );
  const pageControl: Control<number> =
    pageFieldNode?.control.as<number>() ?? internalPage;
  const rawPage = pageControl.value ?? 0;
  const currentPage =
    childrenLength === 0
      ? 0
      : Math.max(0, Math.min(rawPage, childrenLength - 1));
  if (pageControl.value !== currentPage) pageControl.value = currentPage;

  const steps = buildSteps();

  const noNext = !designMode && nextVisibleInDirection(1) == null;
  const noPrev = !designMode && nextVisibleInDirection(-1) == null;

  const next = createAction(
    navActionId,
    designMode ? () => {} : () => nav(1, nextAction.validate ?? false),
    nextAction.text,
    makeActionProps(nextAction, noNext),
  );

  const prev = createAction(
    navActionId,
    designMode ? () => {} : () => nav(-1, prevAction.validate ?? false),
    prevAction.text,
    makeActionProps(prevAction, noPrev),
  );

  return {
    currentPage,
    pageChildren,
    childrenLength,
    pageControl,
    page: countVisibleUntil(currentPage),
    totalPages: countVisibleUntil(childrenLength),
    steps,
    next,
    prev,
    hasNext: !noNext,
    hasPrev: !noPrev,
    validatePage,
    isPageValid,
    nav,
    goToPage: (index: number) => {
      pageControl.value = index;
    },
    countVisibleUntil,
    nextVisibleInDirection,
    manualNavigation,
    showSteps,
    leftNavChildren,
    middleNavChildren,
    rightNavChildren,
  };

  function makeActionProps(
    { hide, text, validate, ...others }: WizardNavActionOptions,
    disabled: boolean,
  ): Partial<ActionRendererProps> {
    return {
      hidden: manualNavigation || (disabled && hide),
      disabled: disabled || props.formNode.disabled,
      ...others,
    };
  }

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

  function countVisibleUntil(untilPage: number) {
    let count = 0;
    for (let i = 0; i < untilPage && i < childrenLength; i++) {
      if (pageChildren[i]?.visible) {
        count++;
      }
    }
    return count;
  }

  async function nav(dir: number, validate: boolean) {
    if (validate) {
      const syncValid = validatePage();
      const validator = validateActionId
        ? props.actionHandler?.(
            validateActionId,
            { current: pageControl.current.value, dir },
            props.dataContext,
          )
        : undefined;
      const validateResult = await validator?.(NoOpControlActionContext);
      if (!syncValid || validateResult === false) {
        return;
      }
    }
    const nextPage = nextVisibleInDirection(dir);
    if (nextPage != null) {
      pageControl.value = nextPage;
    }
  }

  function nextVisibleInDirection(dir: number): number | null {
    let next = currentPage + dir;
    while (next >= 0 && next < childrenLength) {
      if (pageChildren[next]?.visible) {
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
