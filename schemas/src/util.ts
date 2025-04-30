import {
  CompoundField,
  ControlDataVisitor,
  ControlDefinition,
  ControlDefinitionType,
  createSchemaTree,
  DataControlDefinition,
  DataRenderType,
  DisplayOnlyRenderOptions,
  EntityExpression,
  FieldOption,
  fieldPathForDefinition,
  findField,
  FormContextData,
  getGroupRendererOptions,
  getTagParam,
  GroupRenderOptions,
  isAutoCompleteClasses,
  isCheckEntryClasses,
  isCompoundField,
  isCompoundNode,
  isDataControl,
  isDataGroupRenderer,
  isDisplayOnlyRenderer,
  isGridRenderer,
  isGroupControl,
  isScalarField,
  relativePath,
  SchemaDataNode,
  SchemaField,
  schemaForFieldPath,
  SchemaNode,
  SchemaTags,
} from "@astroapps/forms-core";
import { MutableRefObject, useRef } from "react";
import clsx from "clsx";
import {
  Control,
  ControlChange,
  createScopedEffect,
  ensureMetaValue,
  getElementIndex,
  newControl,
  useControl,
} from "@react-typed-forms/core";
import {
  ActionRendererProps,
  ControlActionHandler,
  RunExpression,
} from "./types";
import { Expression } from "jsonata";

/**
 * Interface representing the classes for a control.
 */
export interface ControlClasses {
  styleClass?: string;
  layoutClass?: string;
  labelClass?: string;
  textClass?: string;
  labelTextClass?: string;
}

/**
 * Applies default values to the given record based on the provided schema fields.
 * @param v - The record to apply default values to.
 * @param fields - The schema fields to use for applying default values.
 * @param doneSet - A set to keep track of processed records.
 * @returns The record with default values applied.
 */
export function applyDefaultValues(
  v: Record<string, any> | undefined,
  fields: SchemaField[],
  doneSet?: Set<Record<string, any>>,
): any {
  if (!v) return defaultValueForFields(fields);
  if (doneSet && doneSet.has(v)) return v;
  doneSet ??= new Set();
  doneSet.add(v);
  const applyValue = fields.filter(
    (x) => isCompoundField(x) || !(x.field in v),
  );
  if (!applyValue.length) return v;
  const out = { ...v };
  applyValue.forEach((x) => {
    out[x.field] =
      x.field in v
        ? applyDefaultForField(v[x.field], x, fields, false, doneSet)
        : defaultValueForField(x);
  });
  return out;
}

/**
 * Applies default values to a specific field based on the provided schema field.
 * @param v - The value to apply default values to.
 * @param field - The schema field to use for applying default values.
 * @param parent - The parent schema fields.
 * @param notElement - Flag indicating if the field is not an element.
 * @param doneSet - A set to keep track of processed records.
 * @returns The value with default values applied.
 */
export function applyDefaultForField(
  v: any,
  field: SchemaField,
  parent: SchemaField[],
  notElement?: boolean,
  doneSet?: Set<Record<string, any>>,
): any {
  if (field.collection && !notElement) {
    return ((v as any[]) ?? []).map((x) =>
      applyDefaultForField(x, field, parent, true, doneSet),
    );
  }
  if (isCompoundField(field)) {
    if (!v && !field.required) return v;
    return applyDefaultValues(
      v,
      field.treeChildren ? parent : field.children,
      doneSet,
    );
  }
  return defaultValueForField(field);
}

/**
 * Returns the default values for the provided schema fields.
 * @param fields - The schema fields to get default values for.
 * @returns The default values for the schema fields.
 */
export function defaultValueForFields(fields: SchemaField[]): any {
  return Object.fromEntries(
    fields.map((x) => [x.field, defaultValueForField(x)]),
  );
}

/**
 * Returns the default value for a specific schema field.
 * @param sf - The schema field to get the default value for.
 * @param required - Flag indicating if the field is required.
 * @returns The default value for the schema field.
 */
export function defaultValueForField(
  sf: SchemaField,
  required?: boolean | null,
): any {
  if (sf.defaultValue !== undefined) return sf.defaultValue;
  const isRequired = !!(required || sf.required);
  if (isCompoundField(sf)) {
    if (isRequired) {
      const childValue = defaultValueForFields(sf.children ?? []);
      return sf.collection ? [childValue] : childValue;
    }
    return sf.notNullable ? (sf.collection ? [] : {}) : undefined;
  }
  if (sf.collection && sf.notNullable) {
    return [];
  }
  return undefined;
}

/**
 * Returns the element value for a specific schema field.
 * @param sf - The schema field to get the element value for.
 * @returns The element value for the schema field.
 */
export function elementValueForField(sf: SchemaField): any {
  if (isCompoundField(sf)) {
    return defaultValueForFields(sf.children ?? []);
  }
  return sf.defaultValue;
}

/**
 * Finds a scalar field in the provided schema fields.
 * @param fields - The schema fields to search in.
 * @param field - The field name to search for.
 * @returns The found scalar field, or undefined if not found.
 */
export function findScalarField(
  fields: SchemaField[],
  field: string,
): SchemaField | undefined {
  return findField(fields, field);
}

/**
 * Finds a compound field in the provided schema fields.
 * @param fields - The schema fields to search in.
 * @param field - The field name to search for.
 * @returns The found compound field, or undefined if not found.
 */
export function findCompoundField(
  fields: SchemaField[],
  field: string,
): CompoundField | undefined {
  return findField(fields, field) as CompoundField | undefined;
}

/**
 * Checks if a field has a specific tag.
 * @param field - The field to check.
 * @param tag - The tag to check for.
 * @returns True if the field has the tag, false otherwise.
 */
export function fieldHasTag(field: SchemaField, tag: string) {
  return Boolean(field.tags?.includes(tag));
}

/**
 * Returns the display name for a specific field.
 * @param field - The field to get the display name for.
 * @returns The display name for the field.
 */
export function fieldDisplayName(field: SchemaField) {
  return field.displayName ?? field.field;
}

/**
 * Checks if an object has options.
 * @param o - The object to check.
 * @returns True if the object has options, false otherwise.
 */
export function hasOptions(o: { options: FieldOption[] | undefined | null }) {
  return (o.options?.length ?? 0) > 0;
}

/**
 * Returns the default control definition for a specific schema field.
 * @param sf - The schema field to get the default control definition for.
 * @param noChildren - Flag indicating if children should not be included.
 * @returns The default control definition for the schema field.
 */
export function defaultControlForField(
  sf: SchemaField,
  noChildren?: boolean,
): DataControlDefinition {
  if (isCompoundField(sf)) {
    const ref = getTagParam(sf, SchemaTags.ControlRef);
    return {
      type: ControlDefinitionType.Data,
      title: sf.displayName,
      field: sf.field,
      required: sf.required,
      childRefId: ref,
      children:
        !noChildren && !ref
          ? sf.children
              .filter((x) => !fieldHasTag(x, SchemaTags.NoControl))
              .map((x) => defaultControlForField(x))
          : undefined,
    };
  } else if (isScalarField(sf)) {
    const htmlEditor = fieldHasTag(sf, SchemaTags.HtmlEditor);
    return {
      type: ControlDefinitionType.Data,
      title: sf.displayName,
      field: sf.field,
      required: sf.required,
      renderOptions: {
        type: htmlEditor ? DataRenderType.HtmlEditor : DataRenderType.Standard,
      },
    };
  }
  throw "Unknown schema field";
}

/**
 * Finds a referenced control in the provided control definition.
 * @param field - The field name to search for.
 * @param control - The control definition to search in.
 * @returns The found control definition, or undefined if not found.
 */
function findReferencedControl(
  field: string,
  control: ControlDefinition,
): ControlDefinition | undefined {
  if (isDataControl(control) && field === control.field) return control;
  if (isGroupControl(control)) {
    if (control.compoundField)
      return field === control.compoundField ? control : undefined;
    return findReferencedControlInArray(field, control.children ?? []);
  }
  return undefined;
}

/**
 * Finds a referenced control in an array of control definitions.
 * @param field - The field name to search for.
 * @param controls - The array of control definitions to search in.
 * @returns The found control definition, or undefined if not found.
 */
function findReferencedControlInArray(
  field: string,
  controls: ControlDefinition[],
): ControlDefinition | undefined {
  for (const c of controls) {
    const ref = findReferencedControl(field, c);
    if (ref) return ref;
  }
  return undefined;
}

export function findControlsForCompound(
  compound: SchemaNode,
  definition: ControlDefinition,
): ControlDefinition[] {
  if (isDataControl(definition) && compound.field.field === definition.field) {
    return [definition];
  }
  if (isGroupControl(definition)) {
    if (definition.compoundField === compound.field.field) return [definition];
    return (
      definition.children?.flatMap((d) =>
        findControlsForCompound(compound, d),
      ) ?? []
    );
  }
  return [];
}

/**
 * Finds non-data groups in the provided control definitions.
 * @param controls - The control definitions to search in.
 * @returns An array of found non-data groups.
 */
export function findNonDataGroups(
  controls: ControlDefinition[],
): ControlDefinition[] {
  return controls.flatMap((control) =>
    isGroupControl(control) && !control.compoundField
      ? [control, ...findNonDataGroups(control.children ?? [])]
      : [],
  );
}

/**
 * Adds missing controls to the provided control definitions based on the schema fields.
 * @param fields - The schema fields to use for adding missing controls.
 * @param controls - The control definitions to add missing controls to.
 * @param warning - An optional function to call with warning messages.
 * @returns The control definitions with missing controls added.
 */
export function addMissingControls(
  fields: SchemaField[],
  controls: ControlDefinition[],
  warning?: (msg: string) => void,
) {
  return addMissingControlsForSchema(
    createSchemaTree(fields).rootNode,
    controls,
    warning,
  );
}

interface ControlAndSchema {
  control: ControlDefinition;
  children: ControlAndSchema[];
  schema?: SchemaNode;
  parent?: ControlAndSchema;
}

/**
 * Adds missing controls to the provided control definitions based on the schema fields.
 * @param schema - The root schema node to use for adding missing controls.
 * @param controls - The control definitions to add missing controls to.
 * @param warning - An optional function to call with warning messages.
 * @returns The control definitions with missing controls added.
 */
export function addMissingControlsForSchema(
  schema: SchemaNode,
  controls: ControlDefinition[],
  warning?: (msg: string) => void,
): ControlDefinition[] {
  const controlMap: { [k: string]: ControlAndSchema } = {};
  const schemaControlMap: { [k: string]: ControlAndSchema[] } = {};
  const rootControls = controls.map((c) => toControlAndSchema(c, schema));
  const rootSchema = { schema, children: rootControls } as ControlAndSchema;
  addSchemaMapEntry("", rootSchema);
  rootControls.forEach(addReferences);
  const fields = schema.getChildNodes();
  fields.forEach(addMissing);
  return rootControls.map(toDefinition);

  function toDefinition(c: ControlAndSchema): ControlDefinition {
    const children = c.children.length ? c.children.map(toDefinition) : null;
    return { ...c.control, children };
  }

  function addMissing(schemaNode: SchemaNode) {
    if (fieldHasTag(schemaNode.field, SchemaTags.NoControl)) return;
    let skipChildren = false;
    const existingControls = schemaControlMap[schemaNode.id];
    if (!existingControls) {
      const eligibleParents = getEligibleParents(schemaNode);
      const desiredGroup = getTagParam(
        schemaNode.field,
        SchemaTags.ControlGroup,
      );
      let parentGroup = desiredGroup ? controlMap[desiredGroup] : undefined;
      if (!parentGroup && desiredGroup)
        warning?.("No group '" + desiredGroup + "' for " + schemaNode.id);
      if (parentGroup && eligibleParents.indexOf(parentGroup.schema!.id) < 0) {
        warning?.(
          `Target group '${desiredGroup}' is not an eligible parent for '${schemaNode.id}'`,
        );
        parentGroup = undefined;
      }
      if (!parentGroup && eligibleParents.length) {
        parentGroup = schemaControlMap[eligibleParents[0]]?.[0];
      }
      if (parentGroup) {
        const newControl = defaultControlForField(schemaNode.field, true);
        skipChildren = !!newControl.childRefId;
        newControl.field = relativePath(parentGroup.schema!, schemaNode);
        parentGroup.children.push(
          toControlAndSchema(newControl, parentGroup.schema!, parentGroup),
        );
      } else warning?.("Could not find a parent group for: " + schemaNode.id);
    } else {
      skipChildren = existingControls.some((x) => x.control.childRefId);
    }
    if (!skipChildren) schemaNode.getChildNodes().forEach(addMissing);
  }

  function getEligibleParents(schemaNode: SchemaNode) {
    const eligibleParents: string[] = [];
    let parent = schemaNode.parent;
    while (parent) {
      eligibleParents.push(parent.id);
      if (parent.field.collection) break;
      if (!parent.parent) parent.getChildNodes().forEach(addCompound);
      parent = parent.parent;
    }
    return eligibleParents;

    function addCompound(node: SchemaNode) {
      if (isCompoundNode(node) && !node.field.collection) {
        eligibleParents.push(node.id);
        node.getChildNodes().forEach(addCompound);
      }
    }
  }

  function addReferences(c: ControlAndSchema) {
    c.children.forEach(addReferences);
    if (c.control.childRefId) {
      const ref = controlMap[c.control.childRefId];
      if (ref) {
        ref.children.forEach((x) =>
          toControlAndSchema(x.control, c.schema!, c, true),
        );
        return;
      }
      console.warn("Missing reference", c.control.childRefId);
    }
  }

  function addSchemaMapEntry(schemaId: string, entry: ControlAndSchema) {
    if (!schemaControlMap[schemaId]) schemaControlMap[schemaId] = [];
    schemaControlMap[schemaId].push(entry);
  }
  function toControlAndSchema(
    c: ControlDefinition,
    parentSchema: SchemaNode,
    parentNode?: ControlAndSchema,
    dontRegister?: boolean,
  ): ControlAndSchema {
    const controlPath = fieldPathForDefinition(c);
    let dataSchema = controlPath
      ? schemaForFieldPath(controlPath, parentSchema)
      : undefined;
    if (isGroupControl(c) && dataSchema == null) dataSchema = parentSchema;
    const entry: ControlAndSchema = {
      schema: dataSchema,
      control: c,
      children: [],
      parent: parentNode,
    };
    entry.children =
      c.children?.map((x) =>
        toControlAndSchema(x, dataSchema ?? parentSchema, entry, dontRegister),
      ) ?? [];
    if (!dontRegister && c.id) controlMap[c.id] = entry;
    if (dataSchema) {
      addSchemaMapEntry(dataSchema.id, entry);
    }
    return entry;
  }
}

/**
 * Custom hook to use an updated reference.
 * @param a - The value to create a reference for.
 * @returns A mutable reference object.
 */
export function useUpdatedRef<A>(a: A): MutableRefObject<A> {
  const r = useRef(a);
  r.current = a;
  return r;
}

/**
 * Cleans data for a schema based on the provided schema fields.
 * @param v - The data to clean.
 * @param schemaNode
 * @param removeIfDefault - Flag indicating if default values should be removed.
 * @returns The cleaned data.
 */
export function cleanDataForSchema(
  v: { [k: string]: any } | undefined,
  schemaNode: SchemaNode,
  removeIfDefault?: boolean,
): any {
  if (!v) return v;
  const fields = schemaNode.getResolvedFields();
  const typeField = fields.find((x) => x.isTypeField)?.field;
  const typeValue = typeField ? v[typeField] : undefined;
  const cleanableFields = !removeIfDefault
    ? fields.filter(
        (x) => isCompoundField(x) || (x.onlyForTypes?.length ?? 0) > 0,
      )
    : fields;
  if (!cleanableFields.length) return v;
  const out = { ...v };
  cleanableFields.forEach((x) => {
    const childValue = v[x.field];
    if (
      x.onlyForTypes?.includes(typeValue) === false ||
      (!x.notNullable && canBeNull())
    ) {
      delete out[x.field];
      return;
    }
    if (isCompoundField(x)) {
      const childNode = schemaNode.createChildNode(x);
      if (x.collection) {
        if (Array.isArray(childValue)) {
          out[x.field] = childValue.map((cv) =>
            cleanDataForSchema(cv, childNode, removeIfDefault),
          );
        }
      } else {
        out[x.field] = cleanDataForSchema(
          childValue,
          childNode,
          removeIfDefault,
        );
      }
    }
    function canBeNull() {
      return (
        (removeIfDefault && x.defaultValue === childValue) ||
        (x.collection && Array.isArray(childValue) && !childValue.length)
        //|| (x.type === FieldType.Bool && childValue === false)
      );
    }
  });
  return out;
}

/**
 * Returns all referenced classes for a control definition.
 * @param c - The control definition to get the referenced classes for.
 * @param collectExtra - Optional function to collect extra classes.
 * @returns An array of referenced classes.
 */
export function getAllReferencedClasses(
  c: ControlDefinition,
  collectExtra?: (c: ControlDefinition) => (string | undefined | null)[],
): string[] {
  const childClasses = c.children?.flatMap((x) =>
    getAllReferencedClasses(x, collectExtra),
  );
  const go = getGroupClassOverrides(c);

  const { entryWrapperClass, selectedClass, notSelectedClass } =
    isDataControl(c) && isCheckEntryClasses(c.renderOptions)
      ? c.renderOptions
      : {};
  const groupOptions = isGroupControl(c) ? c.groupOptions : undefined;
  const gridClasses =
    groupOptions && isGridRenderer(groupOptions) ? [groupOptions.rowClass] : [];

  const {
    listContainerClass,
    listEntryClass,
    chipContainerClass,
    chipCloseButtonClass,
  } =
    isDataControl(c) && isAutoCompleteClasses(c.renderOptions)
      ? c.renderOptions
      : {};

  const tc = clsx(
    [
      c.styleClass,
      c.layoutClass,
      c.labelClass,
      c.textClass,
      c.labelTextClass,
      ...gridClasses,
      ...Object.values(go),
      ...(collectExtra?.(c) ?? []),
      entryWrapperClass,
      selectedClass,
      notSelectedClass,
      listContainerClass,
      listEntryClass,
      chipContainerClass,
      chipCloseButtonClass,
    ].map(getOverrideClass),
  );
  if (childClasses && !tc) return childClasses;
  if (!tc) return [];
  if (childClasses) return [tc, ...childClasses];
  return [tc];
}

/**
 * Finds a child control definition within a parent control definition.
 * @param parent - The parent control definition.
 * @param childPath - The path to the child control definition, either as a single index or an array of indices.
 * @returns The found child control definition.
 */
export function findChildDefinition(
  parent: ControlDefinition,
  childPath: number | number[],
): ControlDefinition {
  if (Array.isArray(childPath)) {
    let base = parent;
    childPath.forEach((x) => (base = base.children![x]));
    return base;
  }
  return parent.children![childPath];
}

/**
 * Returns the override class name if the class name starts with "@ ".
 * Otherwise, returns the original class name.
 * @param className - The class name to check and potentially modify.
 * @returns The override class name or the original class name.
 */
export function getOverrideClass(className?: string | null) {
  if (className && className.startsWith("@ ")) {
    return className.substring(2);
  }
  return className;
}

/**
 * Returns the appropriate class name for a renderer.
 * If the global class name starts with "@ ", it overrides the control class name.
 * Otherwise, it combines the control class name and the global class name.
 *
 * @param controlClass - The class name for the control.
 * @param globalClass - The global class name.
 * @returns The appropriate class name for the renderer.
 */
export function rendererClass(
  controlClass?: string | null,
  globalClass?: string | null,
) {
  const gc = getOverrideClass(globalClass);
  if (gc !== globalClass) return globalClass ? globalClass : undefined;
  const oc = getOverrideClass(controlClass);
  if (oc === controlClass) return clsx(controlClass, globalClass);
  return oc ? oc : undefined;
}

/**
 * Applies length restrictions to a value.
 * @template Min - The type of the minimum value.
 * @template Max - The type of the maximum value.
 * @param {number} length - The length to check.
 * @param {number | null | undefined} min - The minimum length.
 * @param {number | null | undefined} max - The maximum length.
 * @param {Min} minValue - The value to return if the length is greater than the minimum.
 * @param {Max} maxValue - The value to return if the length is less than the maximum.
 * @returns {[Min | undefined, Max | undefined]} - An array containing the minimum and maximum values if the length restrictions are met.
 */
export function applyLengthRestrictions<Min, Max>(
  length: number,
  min: number | null | undefined,
  max: number | null | undefined,
  minValue: Min,
  maxValue: Max,
): [Min | undefined, Max | undefined] {
  return [
    min == null || length > min ? minValue : undefined,
    max == null || length < max ? maxValue : undefined,
  ];
}

/**
 * Finds the path to a field in the schema fields.
 * @param {SchemaField[]} fields - The schema fields to search in.
 * @param {string | undefined} fieldPath - The path to the field.
 * @returns {SchemaField[] | undefined} - An array of schema fields representing the path, or undefined if not found.
 */
export function findFieldPath(
  fields: SchemaField[],
  fieldPath: string | undefined,
): SchemaField[] | undefined {
  if (!fieldPath) return undefined;
  const fieldNames = fieldPath.split("/");
  const foundFields: SchemaField[] = [];
  let i = 0;
  let currentFields: SchemaField[] | undefined = fields;
  while (i < fieldNames.length && currentFields) {
    const cf = fieldNames[i];
    const nextField = findField(currentFields, cf);
    if (!nextField) return undefined;
    foundFields.push(nextField);
    currentFields =
      isCompoundField(nextField) && !nextField.collection
        ? nextField.children
        : undefined;
    i++;
  }
  return foundFields.length === fieldNames.length ? foundFields : undefined;
}

/**
 * Merges two objects.
 * @template A - The type of the objects to merge.
 * @param {A} o1 - The first object.
 * @param {A} o2 - The second object.
 * @param {(k: keyof NonNullable<A>, v1: unknown, v2: unknown) => unknown} [doMerge] - Optional function to merge values.
 * @returns {A} - The merged object.
 */
export function mergeObjects<A extends Record<string, any> | undefined>(
  o1: A,
  o2: A,
  doMerge: (k: keyof NonNullable<A>, v1: unknown, v2: unknown) => unknown = (
    _,
    v1,
    v2,
  ) => v1 ?? v2,
): A {
  if (!o1) return o2;
  if (!o2) return o1;
  const result = { ...o1 };
  for (const key in o2) {
    if (o2.hasOwnProperty(key)) {
      const value1 = o1[key];
      const value2 = o2[key];
      result[key] = doMerge(key, value1, value2) as any;
    }
  }
  return result;
}

export function deepMerge<A>(value: A, fallback: A): A {
  if (value == null) return fallback;
  if (typeof value !== "object") return value;
  // concat arrays
  if (Array.isArray(value)) {
    return (value as any[]).concat(fallback as any) as A;
  }
  return mergeObjects(value as A, fallback as any, (_, v1, fv) =>
    deepMerge(v1, fv),
  ) as A;
}

/**
 * Coerces a value to a string.
 * @param {unknown} v - The value to coerce.
 * @returns {string} - The coerced string.
 */
export function coerceToString(v: unknown) {
  return v == null
    ? ""
    : typeof v === "object"
      ? "error: " + JSON.stringify(v)
      : v.toString();
}

/**
 * Returns the group class overrides for a control definition.
 * @param {ControlDefinition} def - The control definition to get the group class overrides for.
 * @returns {ControlClasses} - The group class overrides.
 */
export function getGroupClassOverrides(def: ControlDefinition): ControlClasses {
  let go = getGroupRendererOptions(def);

  if (!go) return {};
  const { childLayoutClass, childStyleClass, childLabelClass } = go;
  const out: ControlClasses = {};
  if (childLayoutClass) out.layoutClass = childLayoutClass;
  if (childStyleClass) out.styleClass = childStyleClass;
  if (childLabelClass) out.labelClass = childLabelClass;
  return out;
}

/**
 * Combines multiple action handlers into a single handler.
 * @param {...(ControlActionHandler | undefined)[]} handlers - The action handlers to combine.
 * @returns {ControlActionHandler} - The combined action handler.
 */
export function actionHandlers(
  ...handlers: (ControlActionHandler | undefined)[]
): ControlActionHandler | undefined {
  const nonNullHandlers = handlers.filter((x) => x != null);
  if (nonNullHandlers.length === 0) return undefined;
  return (actionId, actionData, ctx) => {
    for (let i = 0; i < nonNullHandlers.length; i++) {
      const res = nonNullHandlers[i](actionId, actionData, ctx);
      if (res) return res;
    }
    return undefined;
  };
}

export function getDiffObject(dataNode: SchemaDataNode, force?: boolean): any {
  const c = dataNode.control;
  const sf = dataNode.schema.field;
  if (!c.dirty && !force) return undefined;
  if (c.isNull) return null;
  if (sf.collection && dataNode.elementIndex == null) {
    const idField = getTagParam(sf, SchemaTags.IdField);
    return c.as<any[]>().elements.map((x, i) => {
      const change = getDiffObject(
        dataNode.getChildElement(i),
        idField !== undefined,
      );
      return idField != null
        ? change
        : { old: getElementIndex(x)?.initialIndex, edit: change };
    });
  } else if (isCompoundField(sf)) {
    const children = dataNode.schema.getChildNodes();
    const idField = getTagParam(sf, SchemaTags.IdField);
    return Object.fromEntries(
      children.flatMap((c) => {
        const diff = getDiffObject(
          dataNode.getChild(c),
          idField === c.field.field,
        );
        return diff !== undefined ? [[c.field.field, diff]] : [];
      }),
    );
  }
  return c.value;
}

export function getNullToggler(c: Control<any>): Control<boolean> {
  return ensureMetaValue(c, "$nullToggler", () => {
    const lastDefined = getLastDefinedValue(c);
    const isEditing = getIsEditing(c);
    const currentNotNull = c.current.value != null;
    c.disabled = !currentNotNull;
    const notNull = newControl(currentNotNull);
    if (!currentNotNull) c.value = null;
    disableIfNotEditing();
    isEditing.subscribe(disableIfNotEditing, ControlChange.Value);
    notNull.subscribe(() => {
      const currentNotNull = notNull.current.value;
      c.value = currentNotNull ? lastDefined.current.value : null;
      c.disabled = !currentNotNull;
    }, ControlChange.Value);
    return notNull;
    function disableIfNotEditing() {
      notNull.disabled = isEditing.current.value === false;
    }
  });
}

export interface ExternalEditAction {
  action: ActionRendererProps;
  dontValidate?: boolean;
}
export interface ExternalEditData {
  data: unknown;
  actions: ExternalEditAction[];
}

export function getExternalEditData(
  c: Control<any>,
): Control<ExternalEditData | undefined> {
  return ensureMetaValue(c, "$externalEditIndex", () => newControl(undefined));
}

export function getLastDefinedValue<V>(control: Control<V>): Control<V> {
  return ensureMetaValue(control, "$lastDefined", () => {
    const lastDefined = newControl(control.current.value);
    control.subscribe(() => {
      const nv = control.current.value;
      if (nv != null) lastDefined.value = nv;
    }, ControlChange.Value);
    return lastDefined;
  });
}

export function getIsEditing(
  control: Control<any>,
): Control<boolean | undefined> {
  const lastDefined = getLastDefinedValue(control);
  return ensureMetaValue(control, "$willEdit", () => {
    const c = newControl(undefined);
    c.subscribe(() => {
      const currentEdit = c.current.value;
      if (currentEdit !== undefined) {
        control.value = currentEdit
          ? lastDefined.current.value
          : control.initialValue;
      }
    }, ControlChange.Value);
    return c;
  });
}

export function getAllValues(control: Control<any>): Control<unknown[]> {
  return ensureMetaValue(control, "$allValues", () =>
    newControl([control.value]),
  );
}

export function applyValues(dataNode: SchemaDataNode, value: unknown): void {
  const c = dataNode.control;
  const sf = dataNode.schema.field;
  if (c.isEqual(c.initialValue, value)) return;
  if (sf.collection) {
    return;
  } else if (isCompoundField(sf)) {
    if (value == null) return;
    dataNode.schema.getChildNodes().forEach((c) => {
      applyValues(
        dataNode.getChild(c),
        (value as Record<string, unknown>)[c.field.field],
      );
    });
  } else {
    const allValues = getAllValues(c);
    allValues.setValue((changes) =>
      changes.every((x) => !c.isEqual(x, value))
        ? [...changes, value]
        : changes,
    );
  }
}

export function collectDifferences(
  dataNode: SchemaDataNode,
  values: unknown[],
): () => { editable: number; editing: number } {
  values.forEach((v, i) => {
    if (i == 0) dataNode.control.setInitialValue(v);
    else applyValues(dataNode, v);
  });
  const allEdits: Control<boolean | undefined>[] = [];
  resetMultiValues(dataNode);
  return () => {
    let editable = 0;
    let editing = 0;
    allEdits.forEach((x) => {
      const b = x.value;
      if (b === undefined) return;
      editable++;
      if (b) editing++;
    });
    return { editing, editable };
  };

  function resetMultiValues(dataNode: SchemaDataNode): void {
    const c = dataNode.control;
    const sf = dataNode.schema.field;
    if (sf.collection) {
      return;
    } else if (isCompoundField(sf)) {
      if (c.value == null) return;
      dataNode.schema.getChildNodes().forEach((c) => {
        resetMultiValues(dataNode.getChild(c));
      });
    } else {
      allEdits.push(getIsEditing(c));
      const allValues = getAllValues(c);
      if (allValues.value.length > 1) {
        c.setInitialValue(undefined);
        getLastDefinedValue(c).value = null;
      }
    }
  }
}

export function validationVisitor(
  onInvalid: (data: Control<unknown>) => void,
): ControlDataVisitor<any> {
  return (s) => {
    if (isCompoundNode(s.schema)) return undefined;
    const v = s.control;
    v.touched = true;
    if (!v.validate()) {
      onInvalid(v);
    }
    return undefined;
  };
}

export function useExpression<T>(
  defaultValue: T,
  runExpression: RunExpression,
  expression: EntityExpression | null | undefined,
  coerce: (x: any) => T,
  bindings?: Record<string, any>,
): Control<T> {
  const value = useControl<T>(defaultValue);
  createScopedEffect((scope) => {
    if (expression?.type)
      runExpression(
        scope,
        expression,
        (x) => (value.value = coerce(x)),
        bindings,
      );
    else value.value = defaultValue;
  }, value);
  return value;
}
