import {
  AccordionAdornment,
  ActionControlDefinition,
  AutocompleteRenderOptions,
  CheckListRenderOptions,
  ControlAdornmentType,
  ControlDefinition,
  ControlDefinitionType,
  DataControlDefinition,
  DataRenderType,
  DisplayControlDefinition,
  DisplayDataType,
  DisplayOnlyRenderOptions,
  DynamicProperty,
  DynamicPropertyType,
  GroupedControlsDefinition,
  GroupRenderType,
  HtmlDisplay,
  JsonataRenderOptions,
  RadioButtonRenderOptions,
  RenderOptions,
  TextDisplay,
  TextfieldRenderOptions,
} from "./controlDefinition";
import {
  DateValidator,
  JsonataValidator,
  LengthValidator,
  ValidatorType,
} from "./schemaValidator";
import {
  DataExpression,
  DataMatchExpression,
  EntityExpression,
  ExpressionType,
  JsonataExpression,
} from "./entityExpression";

export function dataControl(
  field: string,
  title?: string | null,
  options?: Partial<DataControlDefinition>,
): DataControlDefinition {
  return { type: ControlDefinitionType.Data, field, title, ...options };
}

export function validatorOptions<A extends { type: string }>(
  type: ValidatorType,
): (options: Omit<A, "type">) => A {
  return (o) => ({ type, ...o }) as A;
}

export function adornmentOptions<A extends { type: string }>(
  type: ControlAdornmentType,
): (options: Omit<A, "type">) => A {
  return (o) => ({ type, ...o }) as A;
}

export function renderOptionsFor<A extends RenderOptions>(
  type: DataRenderType,
): (options: Omit<A, "type">) => { renderOptions: A } {
  return (o) => ({ renderOptions: { type, ...o } as A });
}

export const autocompleteOptions = renderOptionsFor<AutocompleteRenderOptions>(
  DataRenderType.Autocomplete,
);

export const checkListOptions = renderOptionsFor<CheckListRenderOptions>(
  DataRenderType.CheckList,
);

export const radioButtonOptions = renderOptionsFor<RadioButtonRenderOptions>(
  DataRenderType.Radio,
);

export const lengthValidatorOptions = validatorOptions<LengthValidator>(
  ValidatorType.Length,
);

export const jsonataValidatorOptions = validatorOptions<JsonataValidator>(
  ValidatorType.Jsonata,
);

export const dateValidatorOptions = validatorOptions<DateValidator>(
  ValidatorType.Date,
);

export const accordionOptions = adornmentOptions<AccordionAdornment>(
  ControlAdornmentType.Accordion,
);

export const textfieldOptions = renderOptionsFor<TextfieldRenderOptions>(
  DataRenderType.Textfield,
);

export const displayOnlyOptions = renderOptionsFor<DisplayOnlyRenderOptions>(
  DataRenderType.DisplayOnly,
);

export const jsonataOptions = renderOptionsFor<JsonataRenderOptions>(
  DataRenderType.Jsonata,
);

export function textDisplayControl(
  text: string,
  options?: Partial<DisplayControlDefinition>,
): DisplayControlDefinition {
  return {
    type: ControlDefinitionType.Display,
    displayData: { type: DisplayDataType.Text, text } as TextDisplay,
    ...options,
  };
}

export function htmlDisplayControl(
  html: string,
  options?: Partial<DisplayControlDefinition>,
): DisplayControlDefinition {
  return {
    type: ControlDefinitionType.Display,
    displayData: { type: DisplayDataType.Html, html } as HtmlDisplay,
    ...options,
  };
}

export function dynamicDefaultValue(expr: EntityExpression): DynamicProperty {
  return { type: DynamicPropertyType.DefaultValue, expr };
}

export function dynamicReadonly(expr: EntityExpression): DynamicProperty {
  return { type: DynamicPropertyType.Readonly, expr };
}

export function dynamicVisibility(expr: EntityExpression): DynamicProperty {
  return { type: DynamicPropertyType.Visible, expr };
}

export function dynamicDisabled(expr: EntityExpression): DynamicProperty {
  return { type: DynamicPropertyType.Disabled, expr };
}

export function fieldExpr(field: string): DataExpression {
  return { type: ExpressionType.Data, field };
}

export function fieldEqExpr(field: string, value: any): DataMatchExpression {
  return { type: ExpressionType.DataMatch, field, value };
}
export function jsonataExpr(expression: string): JsonataExpression {
  return { type: ExpressionType.Jsonata, expression };
}

export function groupedControl(
  children: ControlDefinition[],
  title?: string,
  options?: Partial<GroupedControlsDefinition>,
): GroupedControlsDefinition {
  return {
    type: ControlDefinitionType.Group,
    children,
    title,
    groupOptions: { type: "Standard", hideTitle: !title },
    ...options,
  };
}
export function compoundControl(
  field: string,
  title: string | undefined,
  children: ControlDefinition[],
  options?: Partial<DataControlDefinition>,
): DataControlDefinition {
  return {
    type: ControlDefinitionType.Data,
    field,
    children,
    title,
    renderOptions: { type: "Standard" },
    ...options,
  };
}

export function actionControl(
  actionText: string,
  actionId: string,
  options?: Partial<ActionControlDefinition>,
): ActionControlDefinition {
  return {
    type: ControlDefinitionType.Action,
    title: actionText,
    actionId,
    ...options,
  };
}
export const emptyGroupDefinition: GroupedControlsDefinition = {
  type: ControlDefinitionType.Group,
  children: [],
  groupOptions: { type: GroupRenderType.Standard, hideTitle: true },
};
