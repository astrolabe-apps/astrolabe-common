import { SchemaValidator } from "./schemaValidator";
import { SchemaField } from "./schemaField";
import { EntityExpression } from "./entityExpression";
import { SchemaDataNode } from "./schemaDataNode";
import { SchemaNode } from "./schemaNode";

/**
 * Represents any control definition.
 */
export type AnyControlDefinition =
  | DataControlDefinition
  | GroupedControlsDefinition
  | ActionControlDefinition
  | DisplayControlDefinition;

/**
 * Represents a control definition.
 */
export interface ControlDefinition {
  type: string;
  id?: string | null;
  childRefId?: string | null;
  title?: string | null;
  hidden?: boolean | null;
  disabled?: boolean | null;
  readonly?: boolean | null;
  styleClass?: string | null;
  textClass?: string | null;
  layoutClass?: string | null;
  labelClass?: string | null;
  labelTextClass?: string | null;
  placement?: string | null;
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
  GridColumns = "GridColumns",
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
  Optional = "Optional",
}

export enum IconLibrary {
  FontAwesome = "FontAwesome",
  Material = "Material",
  CssClass = "CssClass",
}

export interface IconReference {
  library: string;
  name: string;
}

export interface IconAdornment extends ControlAdornment {
  type: ControlAdornmentType.Icon;
  iconClass: string;
  icon?: IconReference;
  placement?: AdornmentPlacement | null;
}

export interface TooltipAdornment extends ControlAdornment {
  type: ControlAdornmentType.Tooltip;
  tooltip: string;
}

export interface AccordionAdornment extends ControlAdornment {
  type: ControlAdornmentType.Accordion;
  title: string;
  defaultExpanded?: boolean | null;
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

export interface OptionalAdornment extends ControlAdornment {
  type: ControlAdornmentType.Optional;
  placement?: AdornmentPlacement | null;
  allowNull?: boolean;
  editSelectable?: boolean;
}

export interface DataControlDefinition extends ControlDefinition {
  type: ControlDefinitionType.Data;
  field: string;
  required?: boolean | null;
  renderOptions?: RenderOptions | null;
  defaultValue?: any;
  validators?: SchemaValidator[] | null;
  hideTitle?: boolean | null;
  dontClearHidden?: boolean | null;
  requiredErrorText?: string | null;
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
  Autocomplete = "Autocomplete",
  Jsonata = "Jsonata",
  Array = "Array",
  ArrayElement = "ArrayElement",
  ElementSelected = "ElementSelected",
  ScrollList = "ScrollList",
}

export interface TextfieldRenderOptions extends RenderOptions {
  type: DataRenderType.Textfield;
  placeholder?: string | null;
  multiline?: boolean | null;
}

export interface AutocompleteRenderOptions
  extends RenderOptions,
    AutocompleteClasses {
  type: DataRenderType.Autocomplete;
}

export interface AutocompleteClasses {
  listContainerClass?: string | null;
  listEntryClass?: string | null;
  chipContainerClass?: string | null;
  chipCloseButtonClass?: string | null;
  placeholder?: string | null;
}

export interface CheckEntryClasses {
  entryWrapperClass?: string | null;
  selectedClass?: string | null;
  notSelectedClass?: string | null;
}
export interface RadioButtonRenderOptions
  extends RenderOptions,
    CheckEntryClasses {
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
  forceStandard?: boolean;
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

export interface JsonataRenderOptions extends RenderOptions {
  type: DataRenderType.Jsonata;
  expression: string;
}

export interface ArrayRenderOptions extends RenderOptions {
  type: DataRenderType.Array;
  addText?: string | null;
  addActionId?: string | null;
  removeText?: string | null;
  removeActionId?: string | null;
  editText?: string | null;
  editActionId?: string | null;
  noAdd?: boolean | null;
  noRemove?: boolean | null;
  noReorder?: boolean | null;
  editExternal?: boolean | null;
}

export interface ArrayElementRenderOptions extends RenderOptions {
  type: DataRenderType.ArrayElement;
  showInline?: boolean | null;
}

export interface ElementSelectedRenderOptions extends RenderOptions {
  type: DataRenderType.ElementSelected;
  elementExpression: EntityExpression;
}

export type ArrayActionOptions = Pick<
  ArrayRenderOptions,
  | "addText"
  | "addActionId"
  | "removeText"
  | "removeActionId"
  | "noAdd"
  | "noRemove"
  | "noReorder"
  | "editExternal"
  | "editActionId"
  | "editText"
> & { readonly?: boolean; disabled?: boolean; designMode?: boolean };

export interface CheckListRenderOptions
  extends RenderOptions,
    CheckEntryClasses {
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

export interface ScrollListRenderOptions extends RenderOptions {
  type: DataRenderType.ScrollList;
  bottomActionId?: string;
  refreshActionId?: string;
}

export interface GroupedControlsDefinition extends ControlDefinition {
  type: ControlDefinitionType.Group;
  compoundField?: string | null;
  groupOptions?: GroupRenderOptions;
}

export interface GroupRenderOptions {
  type: string;
  hideTitle?: boolean | null;
  childStyleClass?: string | null;
  childLayoutClass?: string | null;
  childLabelClass?: string | null;
  displayOnly?: boolean | null;
}

export interface ActionOptions {
  actionId: string;
  actionText?: string | null;
  actionData?: string | null;
  icon?: IconReference | null;
  actionStyle?: ActionStyle | null;
  iconPlacement?: IconPlacement | null;
}
export enum GroupRenderType {
  Standard = "Standard",
  Grid = "Grid",
  Flex = "Flex",
  Tabs = "Tabs",
  GroupElement = "GroupElement",
  SelectChild = "SelectChild",
  Inline = "Inline",
  Wizard = "Wizard",
  Dialog = "Dialog",
  Contents = "Contents",
  Accordion = "Accordion",
}

export interface AccordionRenderer extends GroupRenderOptions {
  type: GroupRenderType.Accordion;
  defaultExpanded?: boolean | null;
}

export interface DialogRenderOptions extends GroupRenderOptions {
  type: GroupRenderType.Dialog;
  title?: string | null;
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

export interface GridRendererOptions extends GroupRenderOptions {
  type: GroupRenderType.Grid;
  columns?: number | null;
  rowClass?: string | null;
}

export interface TabsRenderOptions extends GroupRenderOptions {
  type: GroupRenderType.Tabs;
  contentClass?: string;
}

export interface WizardRenderOptions extends GroupRenderOptions {
  type: GroupRenderType.Wizard;
}

export interface SelectChildRenderer extends GroupRenderOptions {
  type: GroupRenderType.SelectChild;
  childIndexExpression?: EntityExpression | null;
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
  icon?: IconReference | null;
}

export interface HtmlDisplay extends DisplayData {
  type: DisplayDataType.Html;
  html: string;
}

export interface CustomDisplay extends DisplayData {
  type: DisplayDataType.Custom;
  customId: string;
}

export enum ControlDisableType {
  None = "None",
  Self = "Self",
  Global = "Global",
}

export interface ActionControlDefinition extends ControlDefinition {
  type: ControlDefinitionType.Action;
  actionId: string;
  actionData?: string | null;
  icon?: IconReference | null;
  actionStyle?: ActionStyle | null;
  iconPlacement?: IconPlacement | null;
  disableType?: ControlDisableType | null;
}

export enum ActionStyle {
  Button = "Button",
  Secondary = "Secondary",
  Link = "Link",
  Group = "Group",
}

export enum IconPlacement {
  BeforeText = "BeforeText",
  AfterText = "AfterText",
  ReplaceText = "ReplaceText",
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
): options is GridRendererOptions {
  return options.type === GroupRenderType.Grid;
}

export function isWizardRenderer(
  options: GroupRenderOptions,
): options is WizardRenderOptions {
  return options.type === GroupRenderType.Wizard;
}

export function isDialogRenderer(
  options: GroupRenderOptions,
): options is DialogRenderOptions {
  return options.type === GroupRenderType.Dialog;
}

export function isAccordionRenderer(
  options: GroupRenderOptions,
): options is AccordionRenderer {
  return options.type === GroupRenderType.Accordion;
}

export function isInlineRenderer(options: GroupRenderOptions): boolean {
  return options.type === GroupRenderType.Inline;
}

export function isSelectChildRenderer(
  options: GroupRenderOptions,
): options is SelectChildRenderer {
  return options.type === GroupRenderType.SelectChild;
}

export function isTabsRenderer(
  options: GroupRenderOptions,
): options is TabsRenderOptions {
  return options.type === GroupRenderType.Tabs;
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

export function isDateTimeRenderer(
  options: RenderOptions,
): options is DateTimeRenderOptions {
  return options.type === DataRenderType.DateTime;
}

export function isAutocompleteRenderer(
  options: RenderOptions,
): options is AutocompleteRenderOptions {
  return options.type === DataRenderType.Autocomplete;
}

export function isAutoCompleteClasses(
  options?: RenderOptions | null,
): options is AutocompleteClasses & RenderOptions {
  switch (options?.type) {
    case DataRenderType.Autocomplete:
      return true;
    default:
      return false;
  }
}

export function isDataGroupRenderer(
  options?: RenderOptions | null,
): options is DataGroupRenderOptions {
  return options?.type === DataRenderType.Group;
}

export function isArrayRenderer(
  options: RenderOptions,
): options is ArrayRenderOptions {
  return options.type === DataRenderType.Array;
}

export function isDataControl(
  c: ControlDefinition,
): c is DataControlDefinition {
  return c.type === ControlDefinitionType.Data;
}

export function isGroupControl(
  c: ControlDefinition,
): c is GroupedControlsDefinition {
  return c.type === ControlDefinitionType.Group;
}

export function isActionControl(
  c: ControlDefinition,
): c is ActionControlDefinition {
  return c.type === ControlDefinitionType.Action;
}

export function isDisplayControl(
  c: ControlDefinition,
): c is DisplayControlDefinition {
  return c.type === ControlDefinitionType.Display;
}

export function isTextDisplay(d: DisplayData): d is TextDisplay {
  return d.type === DisplayDataType.Text;
}

export function isHtmlDisplay(d: DisplayData): d is HtmlDisplay {
  return d.type === DisplayDataType.Html;
}

export function isCheckEntryClasses(
  options?: RenderOptions | null,
): options is CheckEntryClasses & RenderOptions {
  switch (options?.type) {
    case DataRenderType.Radio:
    case DataRenderType.CheckList:
      return true;
    default:
      return false;
  }
}

export function traverseParents<A, B extends { parent?: B | undefined }>(
  current: B | undefined,
  get: (b: B) => A,
  until?: (b: B) => boolean,
): A[] {
  let outArray: A[] = [];
  while (current && !until?.(current)) {
    outArray.push(get(current));
    current = current.parent;
  }
  return outArray.reverse();
}

export function getRootDataNode(dataNode: SchemaDataNode) {
  while (dataNode.parent) {
    dataNode = dataNode.parent;
  }
  return dataNode;
}

export function getJsonPath(dataNode: SchemaDataNode) {
  return traverseParents(
    dataNode,
    (d) => (d.elementIndex == null ? d.schema.field.field : d.elementIndex),
    (x) => !x.parent,
  );
}

export function getSchemaPath(schemaNode: SchemaNode): SchemaField[] {
  return traverseParents(
    schemaNode,
    (d) => d.field,
    (x) => !x.parent,
  );
}

export function getSchemaFieldList(schema: SchemaNode): SchemaField[] {
  return schema.getChildNodes().map((x) => x.field);
}

export function fontAwesomeIcon(icon: string) {
  return { library: IconLibrary.FontAwesome, name: icon };
}

/**
 * Checks if a control definition is readonly.
 * @param c - The control definition to check.
 * @returns True if the control definition is readonly, false otherwise.
 */
export function isControlReadonly(c: ControlDefinition): boolean {
  return !!c.readonly;
}

/**
 * Checks if a control definition is disabled.
 * @param c - The control definition to check.
 * @returns True if the control definition is disabled, false otherwise.
 */
export function isControlDisabled(c: ControlDefinition): boolean {
  return !!c.disabled;
}

/**
 * Returns the group renderer options for a control definition.
 * @param {ControlDefinition} def - The control definition to get the group renderer options for.
 * @returns {GroupRenderOptions | undefined} - The group renderer options, or undefined if not applicable.
 */
export function getGroupRendererOptions(
  def: ControlDefinition,
): GroupRenderOptions | undefined {
  return isGroupControl(def)
    ? def.groupOptions
    : isDataControl(def) && isDataGroupRenderer(def.renderOptions)
      ? def.renderOptions.groupOptions
      : undefined;
}

/**
 * Checks if a control definition is display-only.
 * @param {ControlDefinition} def - The control definition to check.
 * @returns {boolean} - True if the control definition is display-only, false otherwise.
 */
export function isControlDisplayOnly(def: ControlDefinition): boolean {
  return Boolean(getGroupRendererOptions(def)?.displayOnly);
}

/**
 * Returns the display-only render options for a control definition.
 * @param d - The control definition to get the display-only render options for.
 * @returns The display-only render options, or undefined if not applicable.
 */
export function getDisplayOnlyOptions(
  d: ControlDefinition,
): DisplayOnlyRenderOptions | undefined {
  return isDataControl(d) &&
    d.renderOptions &&
    isDisplayOnlyRenderer(d.renderOptions)
    ? d.renderOptions
    : undefined;
}
