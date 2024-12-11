import { SchemaValidator } from "./schemaValidator";
import {
  FieldOption,
  isCompoundField,
  schemaDataForFieldPath,
  SchemaDataNode,
  SchemaField,
  SchemaInterface,
  SchemaNode,
} from "./schemaField";
import { Control } from "@react-typed-forms/core";
import { EntityExpression } from "./entityExpression";

/**
 * Interface representing the form context data.
 */
export interface FormContextData {
  option?: FieldOption;
  optionSelected?: boolean;
}

/**
 * Interface representing the control data context.
 */
export interface ControlDataContext {
  schemaInterface: SchemaInterface;
  dataNode: SchemaDataNode | undefined;
  parentNode: SchemaDataNode;
  formData: FormContextData;
}

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
  Array = "Array",
}

export interface TextfieldRenderOptions extends RenderOptions {
  type: DataRenderType.Textfield;
  placeholder?: string | null;
  multiline?: boolean | null;
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
  noAdd?: boolean | null;
  noRemove?: boolean | null;
  noReorder?: boolean | null;
  childOptions?: RenderOptions | null;
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

export enum GroupRenderType {
  Standard = "Standard",
  Grid = "Grid",
  Flex = "Flex",
  GroupElement = "GroupElement",
  SelectChild = "SelectChild",
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
  actionData?: string | null;
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

export function isSelectChildRenderer(
  options: GroupRenderOptions,
): options is SelectChildRenderer {
  return options.type === GroupRenderType.SelectChild;
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

export type ControlActionHandler = (
  actionId: string,
  actionData: any,
  ctx: ControlDataContext,
) => (() => void) | undefined;

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

export interface FormNode {
  definition: ControlDefinition;
  getChildNodes(): FormNode[];
  parent?: FormNode;
}

export interface FormTreeLookup<A = string> {
  getForm(formId: A): FormTreeNode | undefined;
}
export interface FormTreeNode extends FormTreeLookup {
  rootNode: FormNode;
}

function nodeForControl(
  definition: ControlDefinition,
  parent?: FormNode,
): FormNode {
  const node = { definition, parent, getChildNodes };
  return node;
  function getChildNodes(): FormNode[] {
    return definition.children?.map((x) => nodeForControl(x, node)) ?? [];
  }
}
export function createFormLookup<A extends Record<string, ControlDefinition[]>>(
  formMap: A,
): FormTreeLookup<keyof A> {
  const lookup = {
    getForm,
  };
  return lookup;

  function getForm(formId: keyof A): FormTreeNode | undefined {
    const controls = formMap[formId];
    if (controls) {
      return {
        rootNode: nodeForControl({
          children: controls,
          type: ControlDefinitionType.Group,
        }),
        getForm,
      };
    }
    return undefined;
  }
}

export function fieldPathForDefinition(
  c: ControlDefinition,
): string[] | undefined {
  const fieldName = isGroupControlsDefinition(c)
    ? c.compoundField
    : isDataControlDefinition(c)
      ? c.field
      : undefined;
  return fieldName?.split("/");
}

export function lookupDataNode(
  c: ControlDefinition,
  parentNode: SchemaDataNode,
) {
  const fieldNamePath = fieldPathForDefinition(c);
  return fieldNamePath
    ? schemaDataForFieldPath(fieldNamePath, parentNode)
    : undefined;
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

export function visitControlDataArray<A>(
  controls: ControlDefinition[] | undefined | null,
  context: SchemaDataNode,
  cb: (
    definition: DataControlDefinition,
    node: SchemaDataNode,
  ) => A | undefined,
): A | undefined {
  if (!controls) return undefined;
  for (const c of controls) {
    const r = visitControlData(c, context, cb);
    if (r !== undefined) return r;
  }
  return undefined;
}

export function visitControlData<A>(
  definition: ControlDefinition,
  ctx: SchemaDataNode,
  cb: (
    definition: DataControlDefinition,
    field: SchemaDataNode,
  ) => A | undefined,
): A | undefined {
  if (!ctx.control || ctx.control.isNull) return undefined;
  return visitControlDefinition<A | undefined>(
    definition,
    {
      data(def: DataControlDefinition) {
        return processData(def);
      },
      group(d: GroupedControlsDefinition) {
        return processData(d);
      },
      action: () => undefined,
      display: () => undefined,
    },
    () => undefined,
  );

  function processData(def: ControlDefinition) {
    const children = def.children;
    const childNode = lookupDataNode(def, ctx);
    if (!childNode) return visitControlDataArray(children, ctx, cb);
    const dataControl = isDataControlDefinition(def) ? def : undefined;
    const result = dataControl ? cb(dataControl, childNode) : undefined;
    if (result !== undefined) return result;
    const fieldNode = childNode.schema;
    const compound = isCompoundField(fieldNode.field);
    if (fieldNode.field.collection) {
      const control = childNode.control as Control<unknown[]>;
      let cIndex = 0;
      for (const c of control!.elements ?? []) {
        const elemChild = childNode.getChildElement(cIndex);
        const elemResult = dataControl ? cb(dataControl, elemChild) : undefined;
        if (elemResult !== undefined) return elemResult;
        if (compound) {
          const cfResult = visitControlDataArray(children, elemChild, cb);
          if (cfResult !== undefined) return cfResult;
        }
        cIndex++;
      }
    } else if (compound) {
      return visitControlDataArray(children, childNode, cb);
    }
    return undefined;
  }
}
