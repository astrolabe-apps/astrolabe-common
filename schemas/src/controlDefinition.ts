import { SchemaValidator } from "./schemaValidator";
import {
  createSchemaNode,
  FieldOption,
  getChildrenForNode,
  resolveSchemaNode,
  schemaDataForFieldPath,
  SchemaDataNode,
  SchemaField,
  schemaForFieldPath,
  SchemaInterface,
  SchemaNode,
} from "./schemaField";
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
  id?: string | null;
  childRefId?: string | null;
  title?: string | null;
  styleClass?: string | null;
  textClass?: string | null;
  layoutClass?: string | null;
  labelClass?: string | null;
  labelTextClass?: string | null;
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
  readonly?: boolean | null;
  disabled?: boolean | null;
  validators?: SchemaValidator[] | null;
  hideTitle?: boolean | null;
  dontClearHidden?: boolean | null;
  fieldDef?: SchemaField | null;
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
  childOptions?: RenderOptions | null;
  editExternal?: boolean | null;
}

export interface ArrayElementRenderOptions extends RenderOptions {
  type: DataRenderType.ArrayElement;
  showInline?: boolean | null;
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
  Tabs = "Tabs",
  GroupElement = "GroupElement",
  SelectChild = "SelectChild",
  Inline = "Inline",
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

export interface TabsRenderOptions extends GroupRenderOptions {
  type: GroupRenderType.Tabs;
  contentClass?: string;
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

export interface ActionControlDefinition extends ControlDefinition {
  type: ControlDefinitionType.Action;
  actionId: string;
  actionData?: string | null;
  icon?: IconReference | null;
  actionStyle?: ActionStyle | null;
  iconPlacement?: IconPlacement | null;
}

export enum ActionStyle {
  Button = "Button",
  Link = "Link",
}

export enum IconPlacement {
  BeforeText = "BeforeText",
  AfterText = "AfterText",
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

export function isInlineRenderer(
  options: GroupRenderOptions,
): options is GridRenderer {
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

export type ControlMap = { [k: string]: ControlDefinition };

export interface FormNode {
  id: string;
  definition: ControlDefinition;
  tree: FormTree;
  parent?: FormNode;
  getChildNodes(): FormNode[];
}

class FormNodeImpl implements FormNode {
  public children: FormNode[] = [];
  constructor(
    public id: string,
    public definition: ControlDefinition,
    public tree: FormTree,
    public parent?: FormNode,
  ) {}

  getChildNodes() {
    return this.children;
  }
}

export interface FormTreeLookup {
  getForm(formId: string): FormTree | undefined;
}
export abstract class FormTree implements FormTreeLookup {
  abstract rootNode: FormNode;
  abstract getByRefId(id: string): FormNode | undefined;
  abstract addChild(parent: FormNode, control: ControlDefinition): FormNode;

  abstract getForm(formId: string): FormTree | undefined;
  createTempNode(
    id: string,
    definition: ControlDefinition,
    children?: FormNode[],
    parent?: FormNode,
  ): FormNode {
    const tempNode = {
      id,
      definition,
      tree: this,
      parent,
      getChildNodes: () =>
        children ?? this.createChildNodes(tempNode, definition.children),
    } as FormNode;
    return tempNode;
  }

  createChildNodes(
    parent: FormNode,
    definitions: ControlDefinition[] | undefined | null,
  ): FormNode[] {
    return (
      definitions?.map((x, i) =>
        this.createTempNode(parent.id + "_" + i, x, undefined, parent),
      ) ?? []
    );
  }
}

class FormTreeImpl extends FormTree {
  controlMap: Record<string, FormNode> = {};
  rootNode: FormNode;
  idCount = 1;

  constructor(private forms: FormTreeLookup) {
    super();
    this.rootNode = new FormNodeImpl("", { type: "Group" }, this);
  }

  getByRefId(id: string): FormNode | undefined {
    return this.controlMap[id];
  }

  register(node: FormNode) {
    this.controlMap[node.id] = node;
    node.getChildNodes().forEach((x) => this.register(x));
  }
  addChild(parent: FormNode, control: ControlDefinition): FormNode {
    const node = new FormNodeImpl(
      control.id ? control.id : "c" + this.idCount++,
      control,
      this,
      parent,
    );
    control.children?.forEach((x) => this.addChild(node, x));
    parent.getChildNodes().push(node);
    this.register(node);
    return node;
  }

  getForm(formId: string): FormTree | undefined {
    return this.forms.getForm(formId);
  }
}

export function legacyFormNode(definition: ControlDefinition) {
  return createFormTree([definition]).rootNode.getChildNodes()[0];
}

function getControlIds(
  definition: ControlDefinition,
): [string, ControlDefinition][] {
  const childEntries = definition.children?.flatMap(getControlIds) ?? [];
  return !definition.id
    ? childEntries
    : [[definition.id, definition], ...childEntries];
}

export function createFormTree(
  controls: ControlDefinition[],
  getForm: FormTreeLookup = { getForm: () => undefined },
): FormTree {
  const tree = new FormTreeImpl(getForm);
  controls.forEach((x) => tree.addChild(tree.rootNode, x));
  return tree;
}

export function createFormLookup<A extends Record<string, ControlDefinition[]>>(
  formMap: A,
): {
  getForm(formId: keyof A): FormTree;
} {
  const lookup = {
    getForm,
  };
  const forms = Object.fromEntries(
    Object.entries(formMap).map(([k, v]) => [k, createFormTree(v, lookup)]),
  );
  return lookup;

  function getForm(formId: keyof A): FormTree {
    return forms[formId as string];
  }
}

export function fieldPathForDefinition(
  c: ControlDefinition,
): string[] | undefined {
  const fieldName = isGroupControl(c)
    ? c.compoundField
    : isDataControl(c)
      ? c.field
      : undefined;
  return fieldName?.split("/");
}

export function lookupDataNode(
  c: ControlDefinition,
  parentNode: SchemaDataNode,
) {
  if (isDataControl(c) && c.fieldDef?.field) {
    return parentNode.getChild(parentNode.schema.createChildNode(c.fieldDef));
  }
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

/**
 * @deprecated use visitFormNodeData instead
 */
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

/**
 * @deprecated use visitFormDataInContext instead
 */
export function visitControlData<A>(
  definition: ControlDefinition,
  ctx: SchemaDataNode,
  cb: (
    definition: DataControlDefinition,
    field: SchemaDataNode,
  ) => A | undefined,
): A | undefined {
  return visitFormDataInContext(ctx, legacyFormNode(definition), (n, d) =>
    cb(d, n),
  );
}

export type ControlDataVisitor<A> = (
  dataNode: SchemaDataNode,
  definition: DataControlDefinition,
) => A | undefined;

export function visitFormData<A>(
  node: FormNode,
  dataNode: SchemaDataNode,
  cb: ControlDataVisitor<A>,
  notSelf?: boolean,
): A | undefined {
  const def = node.definition;
  const result = !notSelf && isDataControl(def) ? cb(dataNode, def) : undefined;
  if (result !== undefined) return result;
  if (dataNode.elementIndex == null && dataNode.schema.field.collection) {
    const l = dataNode.control.elements.length;
    for (let i = 0; i < l; i++) {
      const elemChild = dataNode.getChildElement(i);
      const elemResult = visitFormData(node, elemChild, cb);
      if (elemResult !== undefined) return elemResult;
    }
    return undefined;
  }
  if (dataNode.control.isNull) return undefined;
  const children = node.getChildNodes();
  const l = children.length;
  for (let i = 0; i < l; i++) {
    const elemResult = visitFormDataInContext(dataNode, children[i], cb);
    if (elemResult !== undefined) return elemResult;
  }
  return undefined;
}

export function visitFormDataInContext<A>(
  parentContext: SchemaDataNode,
  node: FormNode,
  cb: ControlDataVisitor<A>,
): A | undefined {
  const dataNode = lookupDataNode(node.definition, parentContext);
  return visitFormData(node, dataNode ?? parentContext, cb, !dataNode);
}

export function fontAwesomeIcon(icon: string) {
  return { library: IconLibrary.FontAwesome, name: icon };
}

export function mergeSchemaDefinition(
  schema: SchemaNode,
  root: FormNode,
): SchemaNode {
  function findExtraFields(target: SchemaNode): SchemaField[] {
    const fields: SchemaField[] = [];
    extraFieldsForParent(schema, target, root, fields);
    return fields;
  }
  return new MergedSchemaNode(schema, findExtraFields(schema), findExtraFields);
}

class MergedSchemaNode extends SchemaNode {
  constructor(
    private schema: SchemaNode,
    private extraFields: SchemaField[],
    private findExtraFields: (context: SchemaNode) => SchemaField[],
    public parent?: SchemaNode,
  ) {
    super(schema.id, schema.lookup);
  }

  get field() {
    return this.schema.field;
  }

  getChildFields(): string[] {
    return [
      ...this.schema.getChildFields(),
      ...this.extraFields.map((x) => x.field),
    ];
  }
  getChildField(field: string): SchemaField {
    const child = this.extraFields.find((x) => x.field === field);
    return child ?? this.schema.getChildField(field);
  }
  createChildNode(field: SchemaField): SchemaNode {
    const child = createSchemaNode(field, this.lookup, this);
    const extras = this.findExtraFields(
      createSchemaNode(field, this.lookup, this),
    );
    return new MergedSchemaNode(child, extras, this.findExtraFields, this);
  }
}

export function extraFieldsForParent(
  parentContext: SchemaNode,
  target: SchemaNode,
  formNode: FormNode,
  fields: SchemaField[],
) {
  const def = formNode.definition;
  let nextContext = parentContext;
  const dc = isDataControl(def) ? def : undefined;
  if (dc?.fieldDef?.field) {
    if (parentContext.id == target.id) {
      fields.push(dc.fieldDef);
      return;
    }
    nextContext = parentContext.createChildNode(dc.fieldDef);
  } else {
    const childPath = fieldPathForDefinition(def);
    if (childPath) {
      nextContext = schemaForFieldPath(childPath, parentContext);
    }
  }
  formNode.getChildNodes().forEach((child) => {
    extraFieldsForParent(nextContext, target, child, fields);
  });
}
