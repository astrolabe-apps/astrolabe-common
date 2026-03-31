# Form State Semantics

Reference document for clean-room implementation. Extracted from `@astroapps/forms-core` source.

## Architecture Overview

The forms library sits on top of the `@astroapps/controls` reactive control tree (documented separately in `controls-api/CONTROL-SEMANTICS.md`). It provides schema-driven form state management through three parallel hierarchies that are merged at runtime:

1. **Schema Layer** — Type structure definitions (`SchemaNode` / `SchemaField`)
2. **Form Definition Layer** — UI layout and rendering instructions (`FormNode` / `ControlDefinition`)
3. **Data Layer** — Schema-to-data binding (`SchemaDataNode` wrapping reactive `Control` instances)
4. **Form State Layer** — Merged runtime state (`FormStateNode`) combining all three

Each `FormStateNode` is the runtime join of a `ControlDefinition` (what to render), a `SchemaDataNode` (what data to bind), and computed flags (visible, disabled, readonly, valid, touched).

## A. Schema Layer

### SchemaField

Describes a single field in the data model:

```typescript
interface SchemaField {
  type: string;        // FieldType enum value
  field: string;       // field name (key in parent object)
  displayName?: string;
  tags?: string[];
  system?: boolean;
  meta?: boolean;          // stored in control meta, not data
  collection?: boolean;    // array field
  onlyForTypes?: string[]; // type-conditional visibility
  required?: boolean;
  notNullable?: boolean;   // default [] or {} instead of null
  defaultValue?: any;
  isTypeField?: boolean;   // discriminator field
  searchable?: boolean;
  options?: FieldOption[];
  validators?: SchemaValidator[];
}
```

### FieldType Enum

`String`, `Bool`, `Int`, `Date`, `DateTime`, `Time`, `Double`, `EntityRef`, `Compound`, `AutoId`, `Image`, `Any`

### CompoundField

Extends `SchemaField` with children:

```typescript
interface CompoundField extends SchemaField {
  type: FieldType.Compound;
  children: SchemaField[];
  treeChildren?: boolean;  // share parent's children (recursive types)
  schemaRef?: string;      // reference a named schema
}
```

### SchemaNode

A node in the schema tree. Each `SchemaNode` wraps a `SchemaField` and provides tree traversal:

- `getResolvedFields()` — returns child fields, following `schemaRef` and `treeChildren` references
- `getChildNodes()` — returns child `SchemaNode` instances
- `getChildNode(field)` — find or create child by field name
- `getResolvedParent()` — resolves through `schemaRef` / `treeChildren` to find the actual parent providing children

**schemaRef resolution**: If a `CompoundField` has `schemaRef`, the resolved parent is looked up from the `SchemaTree`'s lookup. This allows schema reuse (e.g. a "Address" schema used in multiple places).

**treeChildren resolution**: If a `CompoundField` has `treeChildren: true`, the resolved parent walks up to `this.parent.getResolvedParent()`. This supports recursive types (e.g. a tree node whose children are the same type as the parent).

### SchemaTree

Owns a `rootNode: SchemaNode` and provides cross-schema lookup via `getSchemaTree(schemaId)`.

**Creation**: `createSchemaTree(rootFields, lookup?)` — creates a tree from a flat field array with optional cross-schema lookup.

**Lookup**: `createSchemaLookup(schemaMap)` — creates a lookup from `{ schemaId: SchemaField[] }` map, enabling cross-schema references.

### Field Path Resolution

Paths use `/` as separator. Special segments:
- `"."` — current node (identity)
- `".."` — parent node
- Any other string — child field by name

`schemaForFieldPath(path, schema)` traverses from a starting node. Missing fields create a sentinel `missingField` node (type `Any`, field `__missing`).

## B. Data Layer (`SchemaDataNode`)

Maps schema structure to reactive `Control` data.

### SchemaDataNode

```typescript
class SchemaDataNode {
  id: string;
  schema: SchemaNode;          // the structural type
  elementIndex?: number;       // set when this is an array element
  control: Control<any>;       // the reactive data
  tree: SchemaDataTree;
  parent?: SchemaDataNode;

  getChild(childNode: SchemaNode): SchemaDataNode;
  getChildElement(elementIndex: number): SchemaDataNode;
}
```

### Child resolution

- **Object fields**: `getChild(childNode)` accesses `control.fields[childNode.field.field]`. If `childNode.field.meta` is true, the field is looked up on a lazy `metaFields` control (stored in `control.meta["metaFields"]`) rather than the data control itself.
- **Array elements**: `getChildElement(index)` accesses `control.elements[index]`.

### Data path resolution

`schemaDataForFieldPath(fieldPath, dataNode)` traverses both schema and data trees in parallel:
- `".."` goes to `dataNode.parent`
- `"."` stays at current node
- Field names resolve via schema, then access the corresponding data child
- Missing fields create a detached `SchemaDataNode` wrapping `newControl(undefined)`

### Conditional visibility (`validDataNode`)

A `SchemaDataNode` is "valid" (should be rendered) when:
1. If it has no parent, always valid
2. If parent is a collection without an element index, recurse on parent
3. Otherwise: check `onlyForTypes` — if the field has `onlyForTypes`, find the sibling `isTypeField` in the parent schema, read its value, and check if the current type is included

This is memoised per control via `ensureMetaValue` and reactive — if the type field changes, validity recomputes.

## C. Form Definition Layer

### ControlDefinition Types

Four types, discriminated by `type` field:

#### DataControlDefinition (`type: "Data"`)

Binds to a data field:
- `field: string` — field path (may contain `/` for nested, `..` for parent)
- `required?: boolean` — required validation
- `renderOptions?: RenderOptions` — how to render
- `defaultValue?: any` — applied when field becomes visible and value is undefined
- `validators?: SchemaValidator[]` — validation rules
- `hideTitle?: boolean`
- `dontClearHidden?: boolean` — don't clear value when hidden (overrides global `clearHidden`)
- `requiredErrorText?: string` — custom error message for required validation

#### GroupedControlsDefinition (`type: "Group"`)

Container for child controls:
- `compoundField?: string` — optional field path to a compound data field (shifts data context for children)
- `groupOptions?: GroupRenderOptions` — rendering mode (Standard, Grid, Flex, Tabs, Wizard, Dialog, Accordion, SelectChild, Inline, GroupElement, Contents)

#### DisplayControlDefinition (`type: "Display"`)

Static display element:
- `displayData: DisplayData` — content (Text, Html, Icon, Custom)

#### ActionControlDefinition (`type: "Action"`)

Button/action trigger:
- `actionId: string`
- `actionData?: string`
- `actionStyle?: ActionStyle` (Button, Secondary, Link, Group)
- `disableType?: ControlDisableType` (None, Self, Global)

### Common ControlDefinition Properties

All types share:
- `id?: string` — unique identifier for `childRefId` lookups
- `childRefId?: string` — reference to shared children (see Form Tree)
- `title?: string` — label
- `hidden?, disabled?, readonly?` — static boolean flags
- `dynamic?: DynamicProperty[]` — **deprecated**, use `$scripts`
- `adornments?: ControlAdornment[]` — decorative/functional additions
- `children?: ControlDefinition[]` — nested controls
- `style?, layoutStyle?` — CSS style objects
- `styleClass?, textClass?, layoutClass?, labelClass?, labelTextClass?` — CSS class strings
- `placement?: string`
- `allowedOptions?: any` — filter field options
- `noSelection?: boolean`

### RenderOptions Types (DataRenderType)

`Standard`, `Textfield`, `Radio`, `Checkbox`, `Dropdown`, `CheckList`, `Autocomplete`, `DateTime`, `DisplayOnly`, `HtmlEditor`, `Jsonata`, `Array`, `ArrayElement`, `ElementSelected`, `NullToggle`, `UserSelection`, `IconSelector`, `IconList`, `ScrollList`, `Synchronised`, `Group`

### GroupRenderOptions Types (GroupRenderType)

`Standard`, `Grid`, `Flex`, `Tabs`, `GroupElement`, `SelectChild`, `Inline`, `Wizard`, `Dialog`, `Contents`, `Accordion`

### Adornments

Optional additions to controls:

| Type | Purpose | Key Fields |
|------|---------|------------|
| `Tooltip` | Hover tooltip | `tooltip: string` |
| `HelpText` | Help text | `helpText: string`, `placement?` |
| `Icon` | Icon decoration | `iconClass`, `icon?`, `placement?` |
| `SetField` | Set another field | `field`, `expression?`, `defaultOnly?` |
| `Optional` | Mark field optional | `allowNull?`, `editSelectable?` |
| `Accordion` | Accordion wrapper | `title`, `defaultExpanded?` |

Placement options: `ControlStart`, `ControlEnd`, `LabelStart`, `LabelEnd`.

## D. Form Tree (`FormNode` / `FormTree`)

### FormNode

A node in the form definition tree. Each `FormNode` wraps a `ControlDefinition` and provides child resolution:

- `getResolvedChildren()` — follows `childRefId` references, returns `ControlDefinition[]`
- `getChildNodes()` — returns `FormNode[]` wrapping resolved children
- `createChildNode(childId, childDef)` — creates a child node

### childRefId Resolution

The `childRefId` string is parsed as follows:
- `"/formId/localId"` — look up external form tree, find control with that `id`
- `"/formId"` — use the external form's root children
- `"localId"` (no leading `/`) — look up in current tree's `controlMap`

The control map is built by scanning `id` fields in the definition tree.

### FormTree

Owns a `rootNode: FormNode`, a `controlMap` for `id` → `ControlDefinition` lookup, and a `FormTreeLookup` for cross-form references.

**Creation**: `createFormTree(controls, getForm?)` — wraps an array of definitions. If multiple definitions, wraps in a synthetic Group. `createFormLookup(formMap)` creates cross-referencing trees from `{ formId: ControlDefinition[] }`.

### Data context lookup

`lookupDataNode(definition, parentDataNode)` determines the `SchemaDataNode` for a `ControlDefinition`:
- For `Data` controls: uses `definition.field` as a field path
- For `Group` controls: uses `definition.compoundField` as a field path
- For `Display`/`Action`: returns `undefined` (no data binding)

Field paths are split on `/` and resolved via `schemaDataForFieldPath`.

## E. Form State Node (`FormStateNode`)

The runtime state node. One per rendered control definition.

### Properties

| Property | Type | Source |
|----------|------|--------|
| `childKey` | `string \| number` | Stable identity for element reuse |
| `uniqueId` | `string` | Globally unique (from underlying `Control.uniqueId`) |
| `definition` | `ControlDefinition` | The **evaluated** definition (after script proxy) |
| `resolved` | `ResolvedDefinition` | Contains evaluated `definition` + computed `fieldOptions` |
| `dataNode` | `SchemaDataNode \| undefined` | Computed from definition + parent data context |
| `visible` | `boolean \| null` | Computed (see Visibility) |
| `readonly` | `boolean` | Computed (see Readonly) |
| `disabled` | `boolean` | Computed (see Disabled) |
| `valid` | `boolean` | From underlying control's validity |
| `touched` | `boolean` | Bidirectionally synced with data control |
| `busy` | `boolean` | Async operation in progress |
| `children` | `FormStateNode[]` | Lazily initialised child nodes |
| `parent` | `SchemaDataNode` | Parent data context |
| `parentNode` | `FormStateNode \| undefined` | Parent form state |
| `form` | `FormNode \| undefined \| null` | Associated FormNode |
| `meta` | `Record<string, any>` | Arbitrary metadata |
| `schemaInterface` | `SchemaInterface` | Schema operations |
| `clearHidden` | `boolean` | Global option: clear data when hidden |
| `variables` | `VariablesFunc \| undefined` | Variable provider for expressions |

### FormNodeOptions

Per-node overrides that cascade to children:
- `forceReadonly?: boolean`
- `forceDisabled?: boolean`
- `forceHidden?: boolean`
- `variables?: VariablesFunc` — additional variables for expression evaluation

### FormGlobalOptions

Shared across the entire form state tree:
- `schemaInterface: SchemaInterface`
- `evalExpression: (e, ctx) => void`
- `resolveChildren: (c: FormStateNode) => ChildNodeSpec[]`
- `runAsync: (af: () => void) => void`
- `clearHidden: boolean`
- `controlDefinitionSchema?: SchemaNode`

## F. Form State Initialisation

`initFormState(definition, impl, parentNode)` sets up all reactive bindings for a `FormStateNode`. Order matters:

### Step 1: Expression evaluator

Creates an `evalExpr` function from `evalExpression` callback + context (schemaInterface, variables, dataNode, runAsync).

### Step 2: Evaluated definition

`createEvaluatedDefinition(def, evalExpr, scope, schema)` wraps the raw definition in a scripted proxy that computes dynamic overrides (see section I). The result is a `ControlDefinition` where reading any property may return a dynamically computed value.

Legacy `dynamic[]` array entries are converted to `$scripts` format via `buildLegacyScripts()`.

### Step 3: Data node binding

`dataNode` is a computed value: `lookupDataNode(evaluatedDefinition, parent)`. This reacts to changes in the evaluated definition (e.g. if a script changes the `field` property).

### Step 4: Computed flags

**Visible** (computed):
1. If `forceHidden` is true → `false`
2. If parent exists and `parentNode.visible` is falsy → inherit parent's visible (propagates `false` and `null`)
3. If data node exists and `validDataNode(dn)` is false → `false`
4. If data node exists and `hideDisplayOnly(dn, ...)` is true → `false` (display-only fields with empty values and no `emptyText`)
5. Otherwise: `definition.hidden == null ? null : !definition.hidden`

**Note**: `null` visibility means "no opinion" — the UI decides. `false` means explicitly hidden.

**Readonly** (computed):
- `parentNode?.readonly || forceReadonly || definition.readonly`

**Disabled** (computed):
- `parentNode?.disabled || forceDisabled || definition.disabled`

### Step 5: Field options

Computed from `schemaInterface.getDataOptions(dataNode)`, filtered by `definition.allowedOptions`:
- If `allowedOptions` is non-empty array: filter/map options (object entries pass through, scalar entries are looked up by value in the full options list)
- Otherwise: use all options from schema

### Step 6: Sync effects

Six sync effects are created:

1. **Disabled → data**: `dataNode.control.disabled = disabled.value`
2. **Touched → data**: `dataNode.control.touched = base.touched`
3. **Touched ← data**: `base.touched = dataNode.control.touched` (bidirectional)
4. **Errors ← data**: `base.setErrors(dataNode.control.errors)` (mirrors data control errors to form state)
5. **Validation setup**: See section G
6. **Default value / clear hidden**: See section H

### Step 7: Children

If the definition does NOT have a `childRefId` (avoiding potential recursion), children are eagerly initialised. Otherwise, they are lazy (created on first access to `.children`).

## G. Validation

### Validation Setup

`setupValidation()` creates:

1. A `validationEnabled` computed control: `!!visible.value` (validation only runs when visible)
2. A `validatorsScope` cleanup scope for validator lifetime
3. An outer effect that watches `dataNode` — when it changes, tears down old validators and creates new ones
4. An inner effect that runs sync validators when enabled

### Validator Types

**Required** (from `definition.required`):
- Checks `schemaInterface.isEmptyValue(field, value)`
- Error message: `definition.requiredErrorText` or `schemaInterface.validationMessageText(field, NotEmpty, ...)`

**Length** (from `definition.validators`, type `"Length"`):
- Checks `schemaInterface.controlLength(field, control)`
- If `min` set and length < min: for collections, auto-extends the array; for scalars, returns MinLength error
- If `max` set and length > max: returns MaxLength error

**Date** (from `definition.validators`, type `"Date"`):
- Compares field value against a reference date
- Reference date: `fixedDate` (parsed) or today + `daysFromCurrent`
- Comparison: `NotAfter` (value must be <= ref) or `NotBefore` (value must be >= ref)

**Jsonata** (from `definition.validators`, type `"Jsonata"`):
- Evaluates a JSONata expression asynchronously
- Sets error under key `"jsonata"` (not `"default"`)
- Tracks dependencies and re-evaluates reactively

### Validation execution

Sync validators run in a `createEffect`:
1. Check `validationEnabled` — if false, skip (returns undefined → clears error)
2. Track `ControlChange.Validate` on the data control (so `validate()` triggers re-run)
3. Read `control.value`
4. Run sync validators in order — first error wins
5. Set `control.setError("default", error)` via effect callback

### Validate method

`formStateNode.validate()`:
1. Recursively calls `validate()` on all children
2. Calls `dataNode.control.validate()` to trigger the Validate change flag
3. Returns `this.valid`

## H. Default Values and Clear Hidden

A sync effect handles both behaviours:

**Clear on hidden**: When `visible === false` AND global `clearHidden` is true AND `!definition.dontClearHidden`:
- Sets `dataNode.control.value = undefined`

**Apply default**: When `visible` is truthy AND `control.value === undefined` AND `definition.defaultValue != null` AND the field is not optional (no `Optional` adornment) AND the render type is not `NullToggle`:
- Sets `dataNode.control.value = definition.defaultValue`

## I. Dynamic Property System (Scripted Proxy)

### Overview

Control definitions can have dynamically computed properties via the `$scripts` field (or the deprecated `dynamic[]` array). The system works by wrapping each `ControlDefinition` in a `Proxy` that intercepts property reads and returns computed values when scripts are defined.

### Architecture

Three layers:
1. **Base object** — the original `ControlDefinition`
2. **Override controls** — reactive `Control<Record<string, any>>` for computed values
3. **Proxy** — intercepts reads, returns override value if set, otherwise falls through to base

### Legacy conversion

`buildLegacyScripts(def)` converts `dynamic[]` entries to a `Map<path, Record<key, EntityExpression>>`:

| DynamicPropertyType | Script key | Notes |
|---|---|---|
| Visible | `hidden` (with Not wrapper) | Inverted semantics |
| DefaultValue | `defaultValue` | |
| Readonly | `readonly` | |
| Disabled | `disabled` | |
| Label | `title` | |
| ActionData | `actionData` | |
| Style | `style` | |
| LayoutStyle | `layoutStyle` | |
| AllowedOptions | `allowedOptions` | |
| Display | `displayData.text` or `displayData.html` or `renderOptions.overrideText` | Varies by control type |
| GridColumns | `groupOptions.columns` or `renderOptions.groupOptions.columns` | |

### ScriptProvider

```typescript
type ScriptProvider = (target: any, path: string) => Record<string, EntityExpression>;
```

Returns the scripts for a given object at a given path. The default implementation merges `$scripts` from the target with legacy scripts (legacy has lower priority).

### Override levels

`buildOverrideLevels(schemaNode, scope)` recursively creates a tree of `{ overrides: Control<Record<string, any>>, children: Map<string, OverrideLevel> }` matching the schema structure. Only non-collection compound fields get child levels.

### Script evaluation

`evaluateScripts(target, level, schemaNode, evalExpr, getScripts, path)`:
1. Gets scripts from `getScripts(target, path)`
2. For each script entry, finds matching schema field
3. Creates a `createScopedEffect` that runs `evalExpr(scope, initValue, targetField, expr, coerce)`
4. For `ScriptNullInit`-tagged fields without scripts, initialises override to coerced static value

### Nested proxy wiring

`wireProxies()` handles compound fields:
- **Non-collection compounds**: Creates an `OverrideProxy` for the nested object, evaluates its scripts, recurses
- **Collection compounds**: Maps each array element through `createScriptedProxy` (each element gets its own proxy, using `defaultScriptProvider`)

### OverrideProxy

`createOverrideProxy(target, handlers)`:
- `get` trap: if override control exists for property and value !== `NoOverride`, return override; else return target property
- `has` trap: true if in either overrides or target
- `ownKeys` trap: union of both
- Read-only (no `set` trap)

## J. Expression System

### EntityExpression Types

| Type | Interface | Purpose |
|------|-----------|---------|
| `"Data"` | `DataExpression` | Read field value: `{ field: string }` |
| `"FieldValue"` | `DataMatchExpression` | Compare field to value: `{ field, value }` |
| `"NotEmpty"` | `NotEmptyExpression` | Check emptiness: `{ field, empty? }` |
| `"Jsonata"` | `JsonataExpression` | JSONata expression: `{ expression: string }` |
| `"UUID"` | `EntityExpression` | Generate UUID v4 |
| `"Not"` | `NotExpression` | Logical NOT: `{ innerExpression }` |
| `"UserMatch"` | `UserMatchExpression` | Match current user: `{ userMatch }` |

### Expression evaluation context

```typescript
interface ExpressionEvalContext {
  scope: CleanupScope;
  returnResult: (k: unknown) => void;  // callback to deliver result
  dataNode: SchemaDataNode;            // data context
  schemaInterface: SchemaInterface;
  variables?: VariablesFunc;
  runAsync(effect: () => void): void;
}
```

### evalExpr wrapper

`createEvalExpr(evalExpression, context)` returns an `evalExpr` function that:
1. Sets `control.value = init` (the static/default value)
2. Unwraps nested `Not` expressions iteratively, composing negation into the coercion function
3. Calls the `evalExpression` callback with modified context (returnResult writes to the control via coercion)
4. Returns `true` if the expression was evaluated, `false` if not (no type or no expression)

### Built-in evaluators

**Data**: Creates a sync effect that reads `schemaDataForFieldRef(expr.field, dataNode).control.value` and returns it.

**DataMatch**: Creates a sync effect that reads the referenced field's value. For arrays: checks `value.includes(matchExpr.value)`. For scalars: checks `value === matchExpr.value`.

**NotEmpty**: Creates a sync effect that reads the field, checks `schemaInterface.isEmptyValue(field, value)`, returns `empty === isEmpty`.

**Jsonata**: 
1. Parses the expression with path context (`pathString + ".(" + expr + ")"`)
2. Creates an async effect that:
   - Collects tracked variables from `variables?.(effect.collectUsage)`
   - Reads root data with tracking
   - Evaluates via jsonata library
   - Returns result via `returnResult`
3. Schedules initial run via `runAsync`

**UUID**: Immediately returns `uuidv4()`.

## K. Child Resolution

### ChildNodeSpec

```typescript
interface ChildNodeSpec {
  childKey: string | number;  // stable identity for reuse
  create: (scope: CleanupScope, meta: Record<string, any>) => ChildNodeInit;
}

interface ChildNodeInit {
  definition?: ControlDefinition;
  parent?: SchemaDataNode;        // data context for child
  node?: FormNode | null;         // form node for child
  variables?: VariablesFunc;      // additional variables
  resolveChildren?: ChildResolverFunc;  // custom child resolver
}
```

### Default resolver (`defaultResolveChildNodes`)

1. **CheckList/Radio data controls with options**: Creates one child per `fieldOption`. Each child gets a `Contents` group wrapper and variables: `formData.option` (the `FieldOption`), `formData.optionSelected` (boolean). `childKey` is `option.value.toString()`.

2. **Collection data controls** (field is `collection` and not an element): Delegates to `resolveArrayChildren`.

3. **All other controls**: Maps `formNode.getChildNodes()` 1-to-1. `childKey` is the FormNode's `id`. Data context is `dataNode ?? parent`.

### Array children (`resolveArrayChildren`)

For each element in `dataNode.control.elements`:
- `childKey = element.uniqueId + "/" + index`
- `parent = dataNode.getChildElement(index)`
- `definition`: If no child definitions → synthesises a `Data` control with field `"."` (self-reference). If single child → uses it directly. If multiple children → wraps in empty `Group`.
- `node`: single child's FormNode, or parent's FormNode (for multiple children resolution)

### Child initialisation (`initChildren`)

A sync effect that:
1. Calls `resolveChildren(formStateNode)` to get child specs
2. Checks if parent data context changed — if so, clears cache (forces recreation)
3. Calls `updateElements(children, ...)` with the resolved specs
4. For cached children: updates `childIndex` only
5. For new children: creates `FormStateNodeImpl` with:
   - `nodeOptions`: `{ forceHidden: false, forceDisabled: false, forceReadonly: false, variables: combined }`
   - Variables are combined: `combineVariables(parent.variables, child.variables)`
   - If `ChildNodeInit.node` is `undefined`, inherits parent's `form`; if `null`, no form node
   - If `ChildNodeInit.definition` is missing, uses `groupedControl([])` (empty group)
   - If `ChildNodeInit.parent` is missing, inherits parent's data context
6. Detached children (removed from list) get `cleanup()` called

## L. SchemaInterface

Contract for schema-specific behaviour. Implementations handle type-specific operations:

```typescript
interface SchemaInterface {
  isEmptyValue(field, value): boolean;
  textValue(field, value, element?, options?): string | undefined;
  textValueForData(dataNode): string | undefined;
  controlLength(field, control): number;
  valueLength(field, value): number;
  getDataOptions(node: SchemaDataNode): FieldOption[] | null | undefined;
  getNodeOptions(node: SchemaNode): FieldOption[] | null | undefined;
  getOptions(field: SchemaField): FieldOption[] | null | undefined;
  getFilterOptions(array, field): FieldOption[] | null | undefined;
  parseToMillis(field, v: string): number;
  validationMessageText(field, messageType, actual, expected): string;
  compareValue(field, v1, v2): number;
  searchText(field, value): string;
  makeEqualityFunc(field: SchemaNode, element?): EqualityFunc;
  makeControlSetup(field: SchemaNode, element?): ControlSetup<any>;
}
```

This is an abstract interface — implementations provide type-specific behaviour (e.g. date parsing, empty value checks for different field types, localised validation messages).

## M. Variables System

Variables provide contextual data to expressions.

```typescript
type VariablesFunc = (changes: ChangeListenerFunc<any>) => Record<string, any>;
```

The function is called with a change listener for dependency tracking. It returns a `Record<string, any>` of variable values. Used by JSONata evaluation to inject contextual values.

**Combining**: `combineVariables(parent, child)` merges both into a single function: `(c) => ({ ...parent(c), ...child(c) })`.

**Usage in child resolution**: CheckList/Radio resolvers inject `formData.option` and `formData.optionSelected` as variables.

## N. Utility Functions

### hideDisplayOnly

Hides display-only data fields when:
- The field has `DisplayOnly` render options
- No `emptyText` is configured
- The value is empty per `schemaInterface.isEmptyValue`

### traverseParents

```typescript
traverseParents<A, B>(current, get, until?): A[]
```
Walks the parent chain, collecting values. Returns in root-to-leaf order (reversed).

### getJsonPath

Returns the data path from root to a `SchemaDataNode` as `(string | number)[]`. Uses field names for object children and element indices for array elements.

### visitFormState

```typescript
visitFormState<A>(node, visitFn): A | undefined
```
Depth-first traversal. Calls `visitFn(node)` — if it returns non-undefined, stops and returns that value. Otherwise recurses into children.

### visitFormData / visitFormDataInContext

Traverses form definitions in data context. Handles collection fields by iterating elements. Calls visitor with `(dataNode, dataControlDefinition)` pairs.

## O. FormNodeUi

UI integration interface, set via `attachUi()`:

```typescript
interface FormNodeUi {
  ensureVisible(): void;
  ensureChildVisible(childIndex: number): void;
  getDisabler(type: ControlDisableType): () => () => void;
}
```

Default is a no-op implementation. UI renderers attach real implementations for scroll-into-view and disabling behaviour.

## Key Invariants

1. Schema, form definition, and data trees are separate hierarchies joined at `FormStateNode`
2. Visible/readonly/disabled propagate downward from parent to children (parent state takes priority)
3. Touched is bidirectionally synced between form state and data control
4. Errors flow from data control to form state (data control is the source of truth)
5. Validation only runs when the field is visible (`validationEnabled = !!visible`)
6. Hidden fields optionally have their value cleared (global `clearHidden` + per-field `dontClearHidden`)
7. Default values are applied when: visible becomes true AND value is undefined AND defaultValue exists AND field is not optional/NullToggle
8. Children are lazily initialised for `childRefId` definitions (avoiding recursion), eagerly otherwise
9. Expression evaluation is pluggable — `evalExpression` is injected, not hardcoded
10. Variables combine additively down the tree (parent + child merged)
11. Array child identity is based on `element.uniqueId + "/" + index` — survives reordering as long as the underlying control identity is stable
12. The scripted proxy system is transparent — reading a property returns the computed value if a script exists, otherwise the static value
13. `validDataNode` handles type-conditional fields via `onlyForTypes` + `isTypeField` discriminator matching