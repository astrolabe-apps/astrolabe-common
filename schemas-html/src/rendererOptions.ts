import { ReactNode, ReactElement } from "react";
import { Control } from "@react-typed-forms/core";
import {
  CheckRendererOptions,
  FieldOption,
  DataRendererRegistration,
  ArrayActionOptions,
  RendererRegistration,
  FormRenderer,
  IconReference,
  AdornmentPlacement,
  IconPlacement,
  RenderOptions,
  SchemaNode,
  ActionRendererProps,
  ControlDataContext,
  OptionalAdornment,
} from "@react-typed-forms/schemas";

// ============================================================================
// SHARED TYPES AND INTERFACES
// ============================================================================

// Custom navigation props for wizard renderer
export interface CustomNavigationProps {
  className?: string;
  page: number;
  totalPages: number;
  next: ActionRendererProps;
  prev: ActionRendererProps;
  formRenderer: FormRenderer;
  validatePage: () => Promise<boolean>;
}

// Optional render props for optional adornment (HTML-specific)
export interface OptionalRenderProps {
  allValues: Control<unknown[]>;
  editing: Control<boolean | undefined>;
  children: ReactNode;
  adornment: OptionalAdornment;
  nullToggler: Control<boolean>;
  dataContext: ControlDataContext;
  options: DefaultOptionalAdornmentOptions;
  dataControl: Control<any>;
}

// ============================================================================
// INDIVIDUAL COMPONENT OPTIONS INTERFACES
// ============================================================================

export interface SelectRendererOptions {
  className?: string;
  emptyText?: string;
  requiredText?: string;
}

export interface AutocompleteRendererOptions {
  className?: string;
  listContainerClass?: string;
  listEntryClass?: string;
  chipContainerClass?: string;
  chipCloseButtonClass?: string;
}

export interface ArrayElementRendererOptions {
  className?: string;
  actionsClass?: string;
}

export interface DefaultScrollListOptions {
  loadingIcon?: IconReference;
  iconClass?: string;
  spinnerClass?: string;
  className?: string;
}

export interface DefaultDisplayRendererOptions {
  textClassName?: string;
  textTextClass?: string;
  htmlClassName?: string;
}

export interface DefaultGridRenderOptions {
  className?: string;
  defaultColumns?: number;
  rowClass?: string;
  cellClass?: string;
}

export interface DefaultDialogRenderOptions {
  classes?: {
    className?: string;
    titleClass?: string;
    containerClass?: string;
  };
}

export interface DefaultTabsRenderOptions {
  className?: string;
  tabListClass?: string;
  tabClass?: string;
  labelClass?: string;
  activeClass?: string;
  inactiveClass?: string;
  contentClass?: string;
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

export interface ValueForFieldRenderOptions extends RenderOptions {
  type: "ValueForField";
  fieldRef?: string | null;
  noOptions?: boolean;
  refIsDirect?: boolean;
}

export interface ValueForFieldOptions {
  schema: SchemaNode;
}

export interface DefaultArrayRendererOptions extends ArrayActionOptions {
  className?: string;
  removableClass?: string;
  childClass?: string;
  removableChildClass?: string;
  removeActionClass?: string;
  addActionClass?: string;
}

export interface DefaultLayoutRendererOptions {
  className?: string;
  errorClass?: string;
  renderError?: (
    errorText: string | null | undefined,
    errorId?: string,
  ) => ReactNode;
}

export interface DefaultActionRendererOptions {
  buttonClass?: string;
  textClass?: string;
  primaryClass?: string;
  primaryTextClass?: string;
  secondaryClass?: string;
  secondaryTextClass?: string;
  linkClass?: string;
  linkTextClass?: string;
  iconBeforeClass?: string;
  iconAfterClass?: string;
  groupClass?: string;
  renderContent?: (
    actionText: string,
    actionId: string,
    actionData: any,
    busy?: boolean,
  ) => ReactNode;
  icon?: IconReference;
  iconPlacement?: IconPlacement;
  busyIcon?: IconReference;
  busyIconPlacement?: IconPlacement;
  notWrapInText?: boolean;
  androidRippleColor?: string;
}

export interface DefaultOptionalAdornmentOptions {
  className?: string;
  checkClass?: string;
  childWrapperClass?: string;
  multiValuesClass?: string;
  multiValuesText?: string;
  nullWrapperClass?: string;
  setNullText?: string;
  defaultPlacement?: AdornmentPlacement;
  hideEdit?: boolean;
  customRender?: (props: OptionalRenderProps) => ReactNode;
}

export interface DefaultAccordionRendererOptions {
  className?: string;
  titleTextClass?: string;
  togglerClass?: string;
  iconOpen?: IconReference;
  iconClosed?: IconReference;
  renderTitle?: (title: ReactNode, current: Control<boolean>) => ReactNode;
  renderToggler?: (current: Control<boolean>, title: ReactNode) => ReactNode;
  useCss?: boolean;
}

export interface DefaultHelpTextRendererOptions {
  triggerContainerClass?: string;
  triggerLabelClass?: string;
  contentContainerClass?: string;
  contentTextClass?: string;
  iconName?: string;
  iconClass?: string;
}

export interface DefaultAdornmentRendererOptions {
  accordion?: DefaultAccordionRendererOptions;
  helpText?: DefaultHelpTextRendererOptions;
  optional?: DefaultOptionalAdornmentOptions;
}

export interface DefaultLabelRendererOptions {
  className?: string;
  textClass?: string;
  groupLabelClass?: string;
  groupLabelTextClass?: string;
  controlLabelClass?: string;
  controlLabelTextClass?: string;
  requiredElement?: (h: FormRenderer["html"]) => ReactNode;
  labelContainer?: (children: ReactElement) => ReactElement;
}

export interface DefaultGroupRendererOptions {
  className?: string;
  standardClassName?: string;
  grid?: DefaultGridRenderOptions;
  flexClassName?: string;
  defaultFlexGap?: string;
  inlineClass?: string;
  tabs?: DefaultTabsRenderOptions;
  wizard?: DefaultWizardRenderOptions;
  dialog?: DefaultDialogRenderOptions;
  accordion?: DefaultAccordionRendererOptions;
}

// ============================================================================
// MAIN COMPOSITE OPTIONS INTERFACES
// ============================================================================

export interface DefaultDataRendererOptions {
  inputClass?: string;
  inputTextClass?: string;
  displayOnlyClass?: string;
  selectOptions?: SelectRendererOptions;
  checkboxOptions?: CheckRendererOptions;
  checkOptions?: CheckRendererOptions;
  radioOptions?: CheckRendererOptions;
  checkListOptions?: CheckRendererOptions;
  autocompleteOptions?: AutocompleteRendererOptions;
  arrayElementOptions?: ArrayElementRendererOptions;
  booleanOptions?: FieldOption[];
  optionRenderer?: DataRendererRegistration;
  multilineClass?: string;
  jsonataClass?: string;
  arrayOptions?: ArrayActionOptions;
  defaultEmptyText?: string;
  scrollListOptions?: DefaultScrollListOptions;
}

export interface DefaultRendererOptions {
  data?: DefaultDataRendererOptions;
  display?: DefaultDisplayRendererOptions;
  action?: DefaultActionRendererOptions;
  array?: DefaultArrayRendererOptions;
  group?: DefaultGroupRendererOptions;
  label?: DefaultLabelRendererOptions;
  adornment?: DefaultAdornmentRendererOptions;
  layout?: DefaultLayoutRendererOptions;
  extraRenderers?: (options: DefaultRendererOptions) => RendererRegistration[];
  html?: FormRenderer["html"];
}

// ============================================================================
// ADDITIONAL CONSTANTS
// ============================================================================

export const DefaultBoolOptions: FieldOption[] = [
  { name: "Yes", value: true },
  { name: "No", value: false },
];