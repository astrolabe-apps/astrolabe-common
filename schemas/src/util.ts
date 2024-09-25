import {
  CompoundField,
  ControlDefinition,
  ControlDefinitionType,
  DataControlDefinition,
  DataRenderType,
  DisplayOnlyRenderOptions,
  FieldOption,
  findField,
  GroupedControlsDefinition,
  isCompoundField,
  isDataControl,
  isDataControlDefinition,
  isDisplayOnlyRenderer,
  isGroupControl,
  isGroupControlsDefinition,
  isScalarField,
  SchemaField,
  SchemaInterface,
  visitControlDefinition,
} from "./types";
import { MutableRefObject, useCallback, useRef } from "react";
import {
  Control,
  ControlChange,
  trackControlChange,
} from "@react-typed-forms/core";
import clsx from "clsx";
import {
  getJsonPath,
  getRootDataNode,
  getSchemaFieldList,
  SchemaDataNode,
} from "./treeNodes";

export type JsonPath = string | number;

export interface ControlDataContext {
  schemaInterface: SchemaInterface;
  dataNode: SchemaDataNode | undefined;
  parentNode: SchemaDataNode;
}

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

export function defaultValueForFields(fields: SchemaField[]): any {
  return Object.fromEntries(
    fields.map((x) => [x.field, defaultValueForField(x)]),
  );
}

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

export function elementValueForField(sf: SchemaField): any {
  if (isCompoundField(sf)) {
    return defaultValueForFields(sf.children);
  }
  return sf.defaultValue;
}

export function findScalarField(
  fields: SchemaField[],
  field: string,
): SchemaField | undefined {
  return findField(fields, field);
}

export function findCompoundField(
  fields: SchemaField[],
  field: string,
): CompoundField | undefined {
  return findField(fields, field) as CompoundField | undefined;
}

export function fieldHasTag(field: SchemaField, tag: string) {
  return Boolean(field.tags?.includes(tag));
}

export function fieldDisplayName(field: SchemaField) {
  return field.displayName ?? field.field;
}

export function hasOptions(o: { options: FieldOption[] | undefined | null }) {
  return (o.options?.length ?? 0) > 0;
}

export function defaultControlForField(sf: SchemaField): DataControlDefinition {
  if (isCompoundField(sf)) {
    return {
      type: ControlDefinitionType.Data,
      title: sf.displayName,
      field: sf.field,
      required: sf.required,
      children: sf.children.map(defaultControlForField),
    };
  } else if (isScalarField(sf)) {
    const htmlEditor = sf.tags?.includes("_HtmlEditor");
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
  compound: CompoundField,
  definition: ControlDefinition,
): ControlDefinition[] {
  if (
    isDataControlDefinition(definition) &&
    compound.field === definition.field
  ) {
    return [definition];
  }
  if (isGroupControlsDefinition(definition)) {
    if (definition.compoundField === compound.field) return [definition];
    return (
      definition.children?.flatMap((d) =>
        findControlsForCompound(compound, d),
      ) ?? []
    );
  }
  return [];
}

export interface ControlGroupLookup {
  groups: ControlDefinition[];
  children: Record<string, ControlGroupLookup>;
}
export function findCompoundGroups(
  fields: SchemaField[],
  controls: ControlDefinition[],
): Record<string, ControlGroupLookup> {
  return Object.fromEntries(
    fields.filter(isCompoundField).map((cf) => {
      const groups = controls.flatMap((x) => findControlsForCompound(cf, x));
      return [
        cf.field,
        {
          groups: groups.concat(
            findNonDataGroups(groups.flatMap((x) => x.children ?? [])),
          ),
          children: findCompoundGroups(
            cf.children,
            groups.flatMap((x) => x.children ?? []),
          ),
        },
      ];
    }),
  );
}

export function existsInGroups(
  field: SchemaField,
  lookup: ControlGroupLookup,
): [SchemaField, ControlGroupLookup][] {
  const itself = lookup.groups.find((c) =>
    c.children?.find(
      (x) =>
        (isDataControlDefinition(x) && x.field === field.field) ||
        (isGroupControlsDefinition(x) && x.compoundField === field.field),
    ),
  );
  if (!itself) return [[field, lookup]];
  if (isCompoundField(field)) {
    const childLookup = lookup.children[field.field];
    if (!childLookup) return [[field, lookup]];
    return field.children.flatMap((c) => existsInGroups(c, childLookup));
  }
  return [];
}

export function findNonDataGroups(
  controls: ControlDefinition[],
): ControlDefinition[] {
  return controls.flatMap((control) =>
    isGroupControlsDefinition(control) && !control.compoundField
      ? [control, ...findNonDataGroups(control.children ?? [])]
      : [],
  );
}

function cloneChildren(c: ControlDefinition): ControlDefinition {
  return { ...c, children: c.children?.map(cloneChildren) };
}

export function addMissingControls(
  fields: SchemaField[],
  controls: ControlDefinition[],
) {
  controls = controls.map(cloneChildren);
  const rootMapping = findCompoundGroups(fields, controls);
  const rootGroups = findNonDataGroups([
    {
      type: ControlDefinitionType.Group,
      children: controls,
    },
  ]);
  const rootLookup = { children: rootMapping, groups: rootGroups };
  const missingFields = fields
    .filter((x) => !fieldHasTag(x, "_NoControl"))
    .flatMap((x) => existsInGroups(x, rootLookup));
  missingFields.forEach(([f, lookup]) => {
    const groupToAdd = f.tags?.find((x) => x.startsWith("_ControlGroup:"));
    let insertGroup: ControlDefinition | undefined = undefined;
    if (groupToAdd) {
      const groupName = groupToAdd.substring(14);
      insertGroup = lookup.groups.find((x) => x.title === groupName);
    }
    if (!insertGroup) insertGroup = lookup.groups[0];
    if (insertGroup) {
      const newControl = defaultControlForField(f);
      if (insertGroup.children) insertGroup.children.push(newControl);
      else insertGroup.children = [newControl];
    }
  });
  return controls;
}
export function useUpdatedRef<A>(a: A): MutableRefObject<A> {
  const r = useRef(a);
  r.current = a;
  return r;
}

export function isControlReadonly(c: ControlDefinition): boolean {
  return isDataControl(c) && !!c.readonly;
}

export function isControlDisabled(c: ControlDefinition): boolean {
  return isDataControl(c) && !!c.disabled;
}

export function getDisplayOnlyOptions(
  d: ControlDefinition,
): DisplayOnlyRenderOptions | undefined {
  return isDataControlDefinition(d) &&
    d.renderOptions &&
    isDisplayOnlyRenderer(d.renderOptions)
    ? d.renderOptions
    : undefined;
}

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

export function getAllReferencedClasses(
  c: ControlDefinition,
  collectExtra?: (c: ControlDefinition) => (string | undefined | null)[],
): string[] {
  const childClasses = c.children?.flatMap((x) =>
    getAllReferencedClasses(x, collectExtra),
  );
  const tc = clsx(
    [
      c.styleClass,
      c.layoutClass,
      c.labelClass,
      ...(collectExtra?.(c) ?? []),
    ].map(getOverrideClass),
  );
  if (childClasses && !tc) return childClasses;
  if (!tc) return [];
  if (childClasses) return [tc, ...childClasses];
  return [tc];
}

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

export function getOverrideClass(className?: string | null) {
  if (className && className.startsWith("@ ")) {
    return className.substring(2);
  }
  return className;
}

export function rendererClass(
  controlClass?: string | null,
  globalClass?: string | null,
) {
  const oc = getOverrideClass(controlClass);
  if (oc === controlClass) return clsx(controlClass, globalClass);
  return oc ? oc : undefined;
}

export type HookDep = string | number | undefined | null;

export interface DynamicHookGenerator<A, P> {
  deps: HookDep;
  state: any;
  runHook(ctx: P, state: any): A;
}

export function makeHook<A, P, S = undefined>(
  runHook: (ctx: P, state: S) => A,
  state: S,
  deps?: HookDep,
): DynamicHookGenerator<A, P> {
  return { deps, state, runHook };
}

export type DynamicHookValue<A> =
  A extends DynamicHookGenerator<infer V, any> ? V : never;

export function makeHookDepString<A>(
  deps: A[],
  asHookDep: (a: A) => HookDep,
): string {
  return deps.map((x) => toDepString(asHookDep(x))).join(",");
}
export function useDynamicHooks<
  P,
  Hooks extends Record<string, DynamicHookGenerator<any, P>>,
>(
  hooks: Hooks,
): (p: P) => {
  [K in keyof Hooks]: DynamicHookValue<Hooks[K]>;
} {
  const hookEntries = Object.entries(hooks);
  const deps = makeHookDepString(hookEntries, (x) => x[1].deps);
  const ref = useRef<Record<string, any>>({});
  const s = ref.current;
  hookEntries.forEach((x) => (s[x[0]] = x[1].state));
  return useCallback(
    (p: P) => {
      return Object.fromEntries(
        hookEntries.map(([f, hg]) => [f, hg.runHook(p, ref.current[f])]),
      ) as any;
    },
    [deps],
  );
}

export function toDepString(x: any): string {
  if (x === undefined) return "_";
  if (x === null) return "~";
  return x.toString();
}

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
