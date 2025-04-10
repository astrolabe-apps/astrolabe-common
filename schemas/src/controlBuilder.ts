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
  SignatureRenderOptions,
  TextDisplay,
  TextfieldRenderOptions,
} from "./controlDefinition";
import { ActionRendererProps } from "./controlRender";
import { useMemo } from "react";
import { addMissingControls } from "./util";
import { mergeFields, resolveSchemas } from "./schemaBuilder";
import {
  DateValidator,
  JsonataValidator,
  LengthValidator,
  ValidatorType,
} from "./schemaValidator";
import { SchemaField, SchemaMap } from "./schemaField";
import {
  DataExpression,
  DataMatchExpression,
  EntityExpression,
  ExpressionType,
  JsonataExpression,
} from "./entityExpression";
import { SchemaNode } from "./schemaNode";

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

export const signatureOptions = renderOptionsFor<SignatureRenderOptions>(
  DataRenderType.Signature,
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
export function createAction(
  actionId: string,
  onClick: () => void,
  actionText?: string,
  options?: Partial<ActionRendererProps>,
): ActionRendererProps {
  return {
    actionId,
    onClick,
    actionText: actionText ?? actionId,
    ...options,
  };
}

export const emptyGroupDefinition: GroupedControlsDefinition = {
  type: ControlDefinitionType.Group,
  children: [],
  groupOptions: { type: GroupRenderType.Standard, hideTitle: true },
};

export function useControlDefinitionForSchema(
  sf: SchemaField[],
  definition: GroupedControlsDefinition = emptyGroupDefinition,
): GroupedControlsDefinition {
  return useMemo<GroupedControlsDefinition>(
    () => ({
      ...definition,
      children: addMissingControls(sf, definition.children ?? []),
    }),
    [sf, definition],
  );
}

export interface EditorGroup {
  parent: string;
  group: ControlDefinition;
}

export interface CustomRenderOptions {
  value: string;
  name: string;
  fields?: SchemaField[];
  groups?: EditorGroup[];
  applies?: (sf: SchemaNode) => boolean;
}

export type ControlDefinitionExtension = {
  RenderOptions?: CustomRenderOptions | CustomRenderOptions[];
  GroupRenderOptions?: CustomRenderOptions | CustomRenderOptions[];
  ControlAdornment?: CustomRenderOptions | CustomRenderOptions[];
  SchemaValidator?: CustomRenderOptions | CustomRenderOptions[];
  DisplayData?: CustomRenderOptions | CustomRenderOptions[];
};

export function applyExtensionToSchema<A extends SchemaMap>(
  schemaMap: A,
  extension: ControlDefinitionExtension,
): A {
  const outMap = { ...schemaMap };
  Object.entries(extension).forEach(([field, cro]) => {
    outMap[field as keyof A] = (Array.isArray(cro) ? cro : [cro]).reduce(
      (a, cr) => mergeFields(a, cr.name, cr.value, cr.fields ?? []),
      outMap[field],
    ) as A[string];
  });
  return outMap;
}

export function applyExtensionsToSchema<A extends SchemaMap>(
  schemaMap: A,
  extensions: ControlDefinitionExtension[],
) {
  return resolveSchemas(extensions.reduce(applyExtensionToSchema, schemaMap));
}
