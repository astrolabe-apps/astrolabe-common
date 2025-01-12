import {
  ControlActionHandler,
  ControlDefinition,
  ControlDefinitionType,
  DataControlDefinition,
  DataRenderType,
  DisplayOnlyRenderOptions,
  fieldPathForDefinition,
  GroupRenderOptions,
  isCheckEntryClasses,
  isDataControl,
  isDataGroupRenderer,
  isDisplayOnlyRenderer,
  isGroupControl,
} from "./controlDefinition";
import { act, MutableRefObject, useRef } from "react";
import clsx from "clsx";
import {
  CompoundField,
  FieldOption,
  findField,
  getTagParam,
  isCompoundField,
  isCompoundNode,
  isScalarField,
  rootSchemaNode,
  SchemaField,
  schemaForFieldPath,
  SchemaNode,
  SchemaTags,
} from "./schemaField";

/**
 * Interface representing the classes for a control.
 */
export interface ControlClasses {
  styleClass?: string;
  layoutClass?: string;
  labelClass?: string;
}

/**
 * Type representing a JSON path, which can be a string or a number.
 */
export type JsonPath = string | number;

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
 * @param forceNotNull - Flag indicating if the field should not be null.
 * @returns The default value for the schema field.
 */
export function defaultValueForField(
  sf: SchemaField,
  required?: boolean | null,
  forceNotNull?: boolean,
): any {
  if (sf.defaultValue !== undefined) return sf.defaultValue;
  const isRequired = !!(required || sf.required);
  if (isCompoundField(sf)) {
    if (isRequired) {
      const childValue = defaultValueForFields(sf.children);
      return sf.collection ? [childValue] : childValue;
    }
    return sf.notNullable || forceNotNull
      ? sf.collection
        ? []
        : {}
      : undefined;
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
    return defaultValueForFields(sf.children);
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
 * @returns The default control definition for the schema field.
 */
export function defaultControlForField(sf: SchemaField): DataControlDefinition {
  if (isCompoundField(sf)) {
    const ref = getTagParam(sf, SchemaTags.ControlRef);
    return {
      type: ControlDefinitionType.Data,
      title: sf.displayName,
      field: sf.field,
      required: sf.required,
      childRefId: ref,
      children: !ref
        ? sf.children
            .filter((x) => !fieldHasTag(x, SchemaTags.NoControl))
            .map(defaultControlForField)
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
 * Interface representing a control group lookup.
 */
export interface ControlGroupLookup {
  groups: ControlDefinition[];
  children: Record<string, ControlGroupLookup>;
}

/**
 * Finds compound groups in the provided schema fields and control definitions.
 * @param fields - The schema fields to search in.
 * @param controls - The control definitions to search in.
 * @returns A record of found compound groups.
 */
export function findCompoundGroups(
  fields: SchemaNode[],
  controls: ControlDefinition[],
): Record<string, ControlGroupLookup> {
  return Object.fromEntries(
    fields.filter(isCompoundNode).map((cf) => {
      const groups = controls.flatMap((x) => findControlsForCompound(cf, x));
      return [
        cf.field.field,
        {
          groups: groups.concat(
            findNonDataGroups(groups.flatMap((x) => x.children ?? [])),
          ),
          children: findCompoundGroups(
            cf.getChildNodes(),
            groups.flatMap((x) => x.children ?? []),
          ),
        },
      ];
    }),
  );
}

/**
 * Checks if a field exists in the provided control group lookup.
 * @param field - The field to check.
 * @param lookup - The control group lookup to check in.
 * @returns An array of tuples containing the field and the control group lookup.
 */
export function existsInGroups(
  field: SchemaNode,
  lookup: ControlGroupLookup,
): [SchemaNode, ControlGroupLookup][] {
  const fieldName = field.field.field;
  const itself = lookup.groups.find((c) =>
    c.children?.find(
      (x) =>
        (isDataControl(x) && x.field === fieldName) ||
        (isGroupControl(x) && x.compoundField === fieldName),
    ),
  );
  if (!itself) return [[field, lookup]];
  if (isCompoundNode(field)) {
    const childLookup = lookup.children[fieldName];
    if (!childLookup) return [[field, lookup]];
    return field.getChildNodes().flatMap((c) => existsInGroups(c, childLookup));
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
 * @returns The control definitions with missing controls added.
 */
export function addMissingControls(
  fields: SchemaField[],
  controls: ControlDefinition[],
) {
  return addMissingControlsForSchema(rootSchemaNode(fields), controls);
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
 * @returns The control definitions with missing controls added.
 */
export function addMissingControlsForSchema(
  schema: SchemaNode,
  controls: ControlDefinition[],
) {
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
    const existingControls = schemaControlMap[schemaNode.id];
    if (!existingControls) {
      const eligibleParents: string[] = [];
      let parent = schemaNode.parent;
      while (parent) {
        eligibleParents.push(parent.id);
        if (parent.field.collection) break;
        parent = parent.parent;
      }
      const desiredGroup = getTagParam(
        schemaNode.field,
        SchemaTags.ControlGroup,
      );
      let parentGroup = desiredGroup ? controlMap[desiredGroup] : undefined;
      if (!parentGroup && desiredGroup)
        console.warn("Missing group", desiredGroup);
      if (!eligibleParents.length) {
        console.warn("No eligible parents");
        debugger;
      }
      const eligibleControls = schemaControlMap[eligibleParents[0]];
      if (!eligibleControls) {
        console.warn("No eligible parents");
        debugger;
      }
      parentGroup ??= eligibleControls[0];
      const newControl = defaultControlForField(schemaNode.field);
      parentGroup.children.push(
        toControlAndSchema(newControl, parentGroup.schema!, parentGroup),
      );
      return;
    }
    schemaNode.getChildNodes(true).forEach(addMissing);
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
 * Checks if a control definition is readonly.
 * @param c - The control definition to check.
 * @returns True if the control definition is readonly, false otherwise.
 */
export function isControlReadonly(c: ControlDefinition): boolean {
  return isDataControl(c) && !!c.readonly;
}

/**
 * Checks if a control definition is disabled.
 * @param c - The control definition to check.
 * @returns True if the control definition is disabled, false otherwise.
 */
export function isControlDisabled(c: ControlDefinition): boolean {
  return isDataControl(c) && !!c.disabled;
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

/**
 * Cleans data for a schema based on the provided schema fields.
 * @param v - The data to clean.
 * @param fields - The schema fields to use for cleaning the data.
 * @param removeIfDefault - Flag indicating if default values should be removed.
 * @returns The cleaned data.
 */
export function cleanDataForSchema(
  v: { [k: string]: any } | undefined,
  fields: SchemaField[],
  removeIfDefault?: boolean,
): any {
  if (!v) return v;
  const typeField = fields.find((x) => x.isTypeField);
  const typeValue = typeField ? v[typeField.field] : undefined;
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
      const childFields = x.treeChildren ? fields : x.children;
      if (x.collection) {
        if (Array.isArray(childValue)) {
          out[x.field] = childValue.map((cv) =>
            cleanDataForSchema(cv, childFields, removeIfDefault),
          );
        }
      } else {
        out[x.field] = cleanDataForSchema(
          childValue,
          childFields,
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
  const tc = clsx(
    [
      c.styleClass,
      c.layoutClass,
      c.labelClass,
      ...Object.values(go),
      ...(collectExtra?.(c) ?? []),
      entryWrapperClass,
      selectedClass,
      notSelectedClass,
    ].map(getOverrideClass),
  );
  if (childClasses && !tc) return childClasses;
  if (!tc) return [];
  if (childClasses) return [tc, ...childClasses];
  return [tc];
}

/**
 * Converts a JSON path array to a string.
 * @param jsonPath - The JSON path array to convert.
 * @param customIndex - Optional function to customize the index format.
 * @returns The JSON path string.
 */
export function jsonPathString(
  jsonPath: JsonPath[],
  customIndex?: (n: number) => string,
) {
  let out = "";
  jsonPath.forEach((v, i) => {
    if (typeof v === "number") {
      out += customIndex?.(v) ?? "[" + v + "]";
    } else {
      if (i > 0) out += ".";
      out += v;
    }
  });
  return out;
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
 * Checks if a control definition is display-only.
 * @param {ControlDefinition} def - The control definition to check.
 * @returns {boolean} - True if the control definition is display-only, false otherwise.
 */
export function isControlDisplayOnly(def: ControlDefinition): boolean {
  return Boolean(getGroupRendererOptions(def)?.displayOnly);
}

/**
 * Combines multiple action handlers into a single handler.
 * @param {...(ControlActionHandler | undefined)[]} handlers - The action handlers to combine.
 * @returns {ControlActionHandler} - The combined action handler.
 */
export function actionHandlers(
  ...handlers: (ControlActionHandler | undefined)[]
): ControlActionHandler {
  return (actionId, actionData, ctx) => {
    for (let i = 0; i < handlers.length; i++) {
      const res = handlers[i]?.(actionId, actionData, ctx);
      if (res) return res;
    }
    return undefined;
  };
}
