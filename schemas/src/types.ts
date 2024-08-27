import { Control } from "@react-typed-forms/core";

export interface SchemaField {
  type: string;
  field: string;
  displayName?: string | null;
  tags?: string[] | null;
  system?: boolean | null;
  collection?: boolean | null;
  onlyForTypes?: string[] | null;
  required?: boolean | null;
  notNullable?: boolean | null;
  defaultValue?: any;
  isTypeField?: boolean | null;
  searchable?: boolean | null;
  options?: FieldOption[] | null;
  validators?: SchemaValidator[] | null;
}

export type SchemaMap = Record<string, SchemaField[]>;

export enum FieldType {
  String = "String",
  Bool = "Bool",
  Int = "Int",
  Date = "Date",
  DateTime = "DateTime",
  Time = "Time",
  Double = "Double",
  EntityRef = "EntityRef",
  Compound = "Compound",
  AutoId = "AutoId",
  Image = "Image",
  Any = "Any",
}

export interface EntityRefField extends SchemaField {
  type: FieldType.EntityRef;
  entityRefType: string;
  parentField: string;
}

export interface FieldOption {
  name: string;
  value: any;
  description?: string | null;
  disabled?: boolean | null;
}

export interface CompoundField extends SchemaField {
  type: FieldType.Compound;
  children: SchemaField[];
  treeChildren?: boolean;
  schemaRef?: string;
}

export type AnyControlDefinition =
  | DataControlDefinition
  | GroupedControlsDefinition
  | ActionControlDefinition
  | DisplayControlDefinition;

export enum ValidationMessageType {
  NotEmpty = "NotEmpty",
  MinLength = "MinLength",
  MaxLength = "MaxLength",
  NotAfterDate = "NotAfterDate",
  NotBeforeDate = "NotBeforeDate",
}
export interface SchemaInterface {
  isEmptyValue(field: SchemaField, value: any): boolean;
  textValue(
    field: SchemaField,
    value: any,
    element?: boolean,
  ): string | undefined;
  controlLength(field: SchemaField, control: Control<any>): number;
  valueLength(field: SchemaField, value: any): number;
  getOptions(field: SchemaField): FieldOption[] | undefined | null;
  parseToMillis(field: SchemaField, v: string): number;
  validationMessageText(
    field: SchemaField,
    messageType: ValidationMessageType,
    actual: any,
    expected: any,
  ): string;
}
export interface ControlDefinition {
  type: string;
  title?: string | null;
  styleClass?: string | null;
  layoutClass?: string | null;
  labelClass?: string | null;
  dynamic?: DynamicProperty[] | null;
  adornments?: ControlAdornment[] | null;
  children?: ControlDefinition[] | null;
}

export enum ControlDefinitionType {
  Data = "Data",
  Group = "Group",
  Display = "Display",
  Action = "Action",
}

export interface DynamicProperty {
  type: string;
  expr: EntityExpression;
}

export enum DynamicPropertyType {
  Visible = "Visible",
  DefaultValue = "DefaultValue",
  Readonly = "Readonly",
  Disabled = "Disabled",
  Display = "Display",
  Style = "Style",
  LayoutStyle = "LayoutStyle",
  AllowedOptions = "AllowedOptions",
  Label = "Label",
  ActionData = "ActionData",
}

export interface EntityExpression {
  type: string;
}

export enum ExpressionType {
  Jsonata = "Jsonata",
  Data = "Data",
  DataMatch = "FieldValue",
  UserMatch = "UserMatch",
  NotEmpty = "NotEmpty",
  UUID = "UUID",
}

export interface JsonataExpression extends EntityExpression {
  type: ExpressionType.Jsonata;
  expression: string;
}

export interface DataExpression extends EntityExpression {
  type: ExpressionType.Data;
  field: string;
}

export interface DataMatchExpression extends EntityExpression {
  type: ExpressionType.DataMatch;
  field: string;
  value: any;
}

export interface NotEmptyExpression extends EntityExpression {
  type: ExpressionType.DataMatch;
  field: string;
}

export interface UserMatchExpression extends EntityExpression {
  type: ExpressionType.UserMatch;
  userMatch: string;
}

export interface ControlAdornment {
  type: string;
}

export enum AdornmentPlacement {
  ControlStart = "ControlStart",
  ControlEnd = "ControlEnd",
  LabelStart = "LabelStart",
  LabelEnd = "LabelEnd",
}

export enum ControlAdornmentType {
  Tooltip = "Tooltip",
  Accordion = "Accordion",
  HelpText = "HelpText",
  Icon = "Icon",
  SetField = "SetField",
}

export interface IconAdornment extends ControlAdornment {
  type: ControlAdornmentType.Icon;
  iconClass: string;
  placement?: AdornmentPlacement | null;
}

export interface TooltipAdornment extends ControlAdornment {
  type: ControlAdornmentType.Tooltip;
  tooltip: string;
}

export interface AccordionAdornment extends ControlAdornment {
  type: ControlAdornmentType.Accordion;
  title: string;
  defaultExpanded: boolean;
}

export interface HelpTextAdornment extends ControlAdornment {
  type: ControlAdornmentType.HelpText;
  helpText: string;
  placement?: AdornmentPlacement | null;
}

export interface SetFieldAdornment extends ControlAdornment {
  type: ControlAdornmentType.SetField;
  field: string;
  defaultOnly?: boolean | null;
  expression?: EntityExpression;
}

export interface DataControlDefinition extends ControlDefinition {
  type: ControlDefinitionType.Data;
  field: string;
  required?: boolean | null;
  renderOptions?: RenderOptions | null;
  defaultValue?: any;
  readonly?: boolean | null;
  disabled?: boolean | null;
  validators?: SchemaValidator[] | null;
  hideTitle?: boolean | null;
  dontClearHidden?: boolean | null;
}

export interface RenderOptions {
  type: string;
}

export enum DataRenderType {
  Standard = "Standard",
  Textfield = "Textfield",
  Radio = "Radio",
  HtmlEditor = "HtmlEditor",
  IconList = "IconList",
  CheckList = "CheckList",
  UserSelection = "UserSelection",
  Synchronised = "Synchronised",
  IconSelector = "IconSelector",
  DateTime = "DateTime",
  Checkbox = "Checkbox",
  Dropdown = "Dropdown",
  DisplayOnly = "DisplayOnly",
  Group = "Group",
  NullToggle = "NullToggle",
  Jsonata = "Jsonata",
}

export interface TextfieldRenderOptions extends RenderOptions {
  type: DataRenderType.Textfield;
  placeholder?: string | null;
  multiline?: boolean | null;
}

export interface RadioButtonRenderOptions extends RenderOptions {
  type: DataRenderType.Radio;
}

export interface StandardRenderer extends RenderOptions {
  type: DataRenderType.Standard;
}

export interface DataGroupRenderOptions extends RenderOptions {
  type: DataRenderType.Group;
  groupOptions?: GroupRenderOptions;
}

export interface HtmlEditorRenderOptions extends RenderOptions {
  type: DataRenderType.HtmlEditor;
  allowImages: boolean;
}

export interface DateTimeRenderOptions extends RenderOptions {
  type: DataRenderType.DateTime;
  format?: string | null;
  forceMidnight?: boolean;
}

export interface IconListRenderOptions extends RenderOptions {
  type: DataRenderType.IconList;
  iconMappings: IconMapping[];
}

export interface DisplayOnlyRenderOptions extends RenderOptions {
  type: DataRenderType.DisplayOnly;
  emptyText?: string | null;
  sampleText?: string | null;
}
export interface IconMapping {
  value: string;
  materialIcon?: string | null;
}

export interface JsonataRenderOptions extends RenderOptions {
  type: DataRenderType.Jsonata;
  expression: string;
}

export interface CheckListRenderOptions extends RenderOptions {
  type: DataRenderType.CheckList;
}

export interface SynchronisedRenderOptions extends RenderOptions {
  type: DataRenderType.Synchronised;
  fieldToSync: string;
  syncType: SyncTextType;
}

export enum SyncTextType {
  Camel = "Camel",
  Snake = "Snake",
  Pascal = "Pascal",
}

export interface UserSelectionRenderOptions extends RenderOptions {
  type: DataRenderType.UserSelection;
  noGroups: boolean;
  noUsers: boolean;
}

export interface IconSelectionRenderOptions extends RenderOptions {
  type: DataRenderType.IconSelector;
}

export interface GroupedControlsDefinition extends ControlDefinition {
  type: ControlDefinitionType.Group;
  compoundField?: string | null;
  groupOptions?: GroupRenderOptions;
}

export interface GroupRenderOptions {
  type: string;
  hideTitle?: boolean | null;
}

export enum GroupRenderType {
  Standard = "Standard",
  Grid = "Grid",
  Flex = "Flex",
  GroupElement = "GroupElement",
}

export interface StandardGroupRenderer extends GroupRenderOptions {
  type: GroupRenderType.Standard;
}

export interface FlexRenderer extends GroupRenderOptions {
  type: GroupRenderType.Flex;
  direction?: string | null;
  gap?: string | null;
}

export interface GroupElementRenderer extends GroupRenderOptions {
  type: GroupRenderType.GroupElement;
  value: any;
}

export interface GridRenderer extends GroupRenderOptions {
  type: GroupRenderType.Grid;
  columns?: number | null;
}

export interface DisplayControlDefinition extends ControlDefinition {
  type: ControlDefinitionType.Display;
  displayData: DisplayData;
}

export interface DisplayData {
  type: string;
}

export enum DisplayDataType {
  Text = "Text",
  Html = "Html",
  Icon = "Icon",
  Custom = "Custom",
}
export interface TextDisplay extends DisplayData {
  type: DisplayDataType.Text;
  text: string;
}

export interface IconDisplay extends DisplayData {
  type: DisplayDataType.Icon;
  iconClass: string;
}

export interface HtmlDisplay extends DisplayData {
  type: DisplayDataType.Html;
  html: string;
}

export interface CustomDisplay extends DisplayData {
  type: DisplayDataType.Custom;
  customId: string;
}

export interface ActionControlDefinition extends ControlDefinition {
  type: ControlDefinitionType.Action;
  actionId: string;
  actionData: string;
}

export enum ValidatorType {
  Jsonata = "Jsonata",
  Date = "Date",
  Length = "Length",
}
export interface SchemaValidator {
  type: string;
}

export interface JsonataValidator extends SchemaValidator {
  type: ValidatorType.Jsonata;
  expression: string;
}

export interface LengthValidator extends SchemaValidator {
  type: ValidatorType.Length;
  min?: number | null;
  max?: number | null;
}

export enum DateComparison {
  NotBefore = "NotBefore",
  NotAfter = "NotAfter",
}

export interface DateValidator extends SchemaValidator {
  type: ValidatorType.Date;
  comparison: DateComparison;
  fixedDate?: string | null;
  daysFromCurrent?: number | null;
}

export function isDataControlDefinition(
  x: ControlDefinition,
): x is DataControlDefinition {
  return x.type === ControlDefinitionType.Data;
}

export function isGroupControlsDefinition(
  x: ControlDefinition,
): x is GroupedControlsDefinition {
  return x.type === ControlDefinitionType.Group;
}

export function isDisplayControlsDefinition(
  x: ControlDefinition,
): x is DisplayControlDefinition {
  return x.type === ControlDefinitionType.Display;
}

export function isActionControlsDefinition(
  x: ControlDefinition,
): x is ActionControlDefinition {
  return x.type === ControlDefinitionType.Action;
}

export interface ControlVisitor<A> {
  data(d: DataControlDefinition): A;
  group(d: GroupedControlsDefinition): A;
  display(d: DisplayControlDefinition): A;
  action(d: ActionControlDefinition): A;
}

export function visitControlDefinition<A>(
  x: ControlDefinition,
  visitor: ControlVisitor<A>,
  defaultValue: (c: ControlDefinition) => A,
): A {
  switch (x.type) {
    case ControlDefinitionType.Action:
      return visitor.action(x as ActionControlDefinition);
    case ControlDefinitionType.Data:
      return visitor.data(x as DataControlDefinition);
    case ControlDefinitionType.Display:
      return visitor.display(x as DisplayControlDefinition);
    case ControlDefinitionType.Group:
      return visitor.group(x as GroupedControlsDefinition);
    default:
      return defaultValue(x);
  }
}
export function isGridRenderer(
  options: GroupRenderOptions,
): options is GridRenderer {
  return options.type === GroupRenderType.Grid;
}

export function isFlexRenderer(
  options: GroupRenderOptions,
): options is FlexRenderer {
  return options.type === GroupRenderType.Flex;
}

export function isDisplayOnlyRenderer(
  options: RenderOptions,
): options is DisplayOnlyRenderOptions {
  return options.type === DataRenderType.DisplayOnly;
}

export function isTextfieldRenderer(
  options: RenderOptions,
): options is TextfieldRenderOptions {
  return options.type === DataRenderType.Textfield;
}

export function isDataGroupRenderer(
  options: RenderOptions,
): options is DataGroupRenderOptions {
  return options.type === DataRenderType.Group;
}
