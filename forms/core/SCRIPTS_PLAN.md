# Plan: Replace `dynamic[]` with generic `scripts` on ControlDefinition

## Context

Currently, scripting ControlDefinition fields uses a `dynamic: DynamicProperty[]` array with a fixed `DynamicPropertyType` enum (11 values). Adding a new scriptable field requires adding an enum value, updating evaluation code, and hardcoding a coercion function. The goal is to replace this with a generic `scripts: Record<string, EntityExpression>` where any field name (or dot-path) can be a key, with coercion derived automatically from the field's `SchemaField.type`.

## Approach

1. Add `scripts?: Record<string, EntityExpression>` to `ControlDefinition` (top-level only, dot-paths for nested)
2. Move `ControlDefinitionSchema` and related schemas from `astrolabe-schemas-editor/src/schemaSchemas.ts` into `forms/core/src/` so the runtime can look up field types
3. Derive coercion from `SchemaField.type` (Bool → `!!r`, Int → number check, String → `coerceString`, etc.)
4. Provide migration layer that converts legacy `dynamic[]` to `scripts` entries
5. Deprecate `DynamicProperty`, `DynamicPropertyType`, `dynamic` field
6. TypeScript only (C# later)

## Key Design Decisions

### All scriptable properties live on ControlDefinition

Move `style`, `layoutStyle`, `allowedOptions` from `ResolvedDefinition` onto `ControlDefinition`. This makes every scriptable property a definition-level override handled by the generic proxy system. No more state-level vs definition-level split.

`ResolvedDefinition` becomes:
```typescript
export interface ResolvedDefinition {
  definition: ControlDefinition;
  stateId?: string;
  fieldOptions?: FieldOption[];  // computed from definition.allowedOptions + schema options
}
```

### Schema-driven coercion

Look up the script key in the `ControlDefinitionSchema` (a `SchemaField[]`). The `SchemaField.type` determines coercion:
- `FieldType.Bool` → `(r) => !!r`
- `FieldType.Int` / `FieldType.Double` → `(r) => typeof r === "number" ? r : undefined`
- `FieldType.String` → `coerceString`
- `FieldType.Any` → identity
- `FieldType.Compound` (object values like style) → `coerceStyle`

### Dot-path resolution

For `"renderOptions.groupOptions.columns"`, split on `.`, walk the CompoundField children in the ControlDefinitionSchema. The leaf field's `FieldType.Int` drives the coercion. The override is routed to the correct nested proxy based on the path segments.

For `"groupOptions.columns"` on a GroupedControlsDefinition, the path resolves directly since `groupOptions` is a top-level field on that type.

### No `visible` alias — use `hidden` directly

The script key is `hidden`, matching the actual ControlDefinition field. Users write `hidden: expr` with the expression returning `true` to hide, `false` to show.

### `hidden` has special null-init semantics (schema tag)

A schema tag `_ScriptNullInit` on the `hidden` field tells the generic loop: when a script expression exists, init preserves the original field value (may be `null`, meaning "not yet determined" while async script is pending); when no script, coerce with `!!` to immediately resolve to `false`. This is the only field that needs this behavior — all other fields use their static value as init regardless.

### `display` is gone — migration maps to `displayData.text` or `displayData.html`

The `DynamicPropertyType.Display` migration statically inspects the `DisplayControlDefinition.displayData.type` to determine the correct script key: `displayData.text` for TextDisplay, `displayData.html` for HtmlDisplay. No more `resolved.display` or bridge effect.

**Note on current implementation**: Investigation confirmed that `resolved.display` is evaluated by `initFormState` and then consumed only by the bridge effect in `createEvaluatedDefinition`, which maps it to `displayOverrides.text` or `displayOverrides.html`. The `display` field on `DisplayRendererProps` is **never set** in the rendering pipeline — the `display ? display.value : ...` checks in `DefaultDisplay.tsx` (schemas-rn, schemas-html) are dead code. The renderer already reads dynamic display values via the proxied `definition.displayData`. Icon displays never supported dynamic Display (the bridge only writes text/html overrides).

**Cleanup**: Remove the `display` field from `DisplayRendererProps` and the dead `display` checks from all `DefaultDisplay.tsx` renderers. If someone wants dynamic icon overrides in the new system, they can use `scripts: { "displayData.iconClass": expr }` etc.

### New `Not` EntityExpression type

For migrating `DynamicPropertyType.Visible` (which inverted the expression result) to `hidden`, the migration wraps the original expression in a new `NotExpression`:
```typescript
export interface NotExpression extends EntityExpression {
  type: ExpressionType.Not;
  expression: EntityExpression;
}
```
With a corresponding evaluator that inverts the result.

### Type-conditional fields are harmless no-ops

If a script key like `defaultValue` is set on a Group control, the override proxy sets the value but nothing reads it. This is acceptable — no guards needed per control type.

## DynamicPropertyType → scripts key migration

| Old DynamicPropertyType | New scripts key | Migration notes |
|---|---|---|
| Visible | `hidden` | Wrap expr in `NotExpression` |
| Readonly | `readonly` | Direct |
| Disabled | `disabled` | Direct |
| Label | `title` | Direct |
| DefaultValue | `defaultValue` | Direct |
| ActionData | `actionData` | Direct |
| GridColumns | `groupOptions.columns` (Group) or `renderOptions.groupOptions.columns` (DataGroup) | Inspect control type to determine path |
| Display | `displayData.text` or `displayData.html` | Inspect `displayData.type` to determine path |
| Style | `style` | Direct (field moved to ControlDefinition) |
| LayoutStyle | `layoutStyle` | Direct (field moved to ControlDefinition) |
| AllowedOptions | `allowedOptions` | Direct (field moved to ControlDefinition) |

## ControlDefinition type changes

```typescript
export interface ControlDefinition {
  // ... existing fields ...
  scripts?: Record<string, EntityExpression> | null;  // NEW
  style?: object | null;           // MOVED from ResolvedDefinition
  layoutStyle?: object | null;     // MOVED from ResolvedDefinition
  allowedOptions?: any;            // MOVED from FormStateBaseImpl

  /** @deprecated Use scripts */
  dynamic?: DynamicProperty[] | null;
}
```

## Generic loop in createEvaluatedDefinition

Pseudocode for the refactored core:
```typescript
function createEvaluatedDefinition(def, evalExpr, scope) {
  const scripts = getMergedScripts(def); // merges scripts + legacy dynamic[]
  const schema = getControlDefinitionSchema();

  // Create override proxy hierarchy
  const overrideMap = buildOverrideProxies(def, scope);
  // e.g. { "": definitionOverrides, "groupOptions": groupOptionsOverrides, ... }

  for (const [key, expr] of Object.entries(scripts)) {
    const { segments, leafField } = resolveSchemaPath(key, schema);
    const coerce = coerceForFieldType(leafField.type);
    const { overrideControl, fieldName } = findOverrideTarget(segments, overrideMap);

    const hasNullInit = hasTag(leafField, SchemaTags.ScriptNullInit);
    const staticValue = getNestedValue(def, segments);
    const init = hasNullInit
      ? (exprExists) => exprExists ? staticValue : !!staticValue
      : () => staticValue;

    createScopedEffect((c) => {
      evalExpr(c, init(!!expr), overrideControl.fields[fieldName], expr, coerce);
    }, overrideControl);
  }

  return createOverrideProxy(def, overrideMap[""]);
}
```

## Files to Modify

### 1. `forms/core/src/entityExpression.ts`
- Add `ExpressionType.Not = "Not"`
- Add `NotExpression` interface with nested `expression: EntityExpression`

### 2. `forms/core/src/evalExpression.ts`
- Add `notEval` evaluator for `NotExpression`
- Register in `defaultEvaluators`

### 3. New file: `forms/core/src/controlDefinitionSchemas.ts`
Move the schema definitions from `astrolabe-schemas-editor/src/schemaSchemas.ts`:
- `ControlDefinitionSchema` (and its `Form` interface)
- `GroupRenderOptionsSchema`
- `RenderOptionsSchema`
- `DisplayDataSchema`
- `EntityExpressionSchema`
- `DynamicPropertySchema` (for backwards compat)
- `ControlAdornmentSchema`
- Supporting schemas: `FieldOptionSchema`, `SchemaValidatorSchema`, `SchemaFieldSchema`, `IconReferenceSchema`, `IconMappingSchema`
- `ControlDefinitionSchemaMap`
- All `Form` interfaces and `default*Form` / `to*Form` helpers
- Add `_ScriptNullInit` tag to the `hidden` field in `ControlDefinitionSchema`
- Add `style`, `layoutStyle`, `allowedOptions` fields to `ControlDefinitionSchema`

Then re-export from `astrolabe-schemas-editor/src/schemaSchemas.ts` to avoid breaking imports.

### 4. `forms/core/src/controlDefinition.ts` - Type changes
- Add `scripts?: Record<string, EntityExpression> | null` to `ControlDefinition`
- Add `style?: object | null` to `ControlDefinition`
- Add `layoutStyle?: object | null` to `ControlDefinition`
- Add `allowedOptions?: any` to `ControlDefinition`
- Mark `DynamicProperty`, `DynamicPropertyType`, `dynamic` as `@deprecated`

### 5. `forms/core/src/schemaField.ts` - New schema tag
- Add `ScriptNullInit = "_ScriptNullInit"` to `SchemaTags` enum

### 6. `forms/core/src/formStateNode.ts` - Core refactoring
- Add `coerceForFieldType(fieldType: FieldType): (v: unknown) => any`
- Add `resolveSchemaPath(key: string, schema: SchemaField[])` for dot-path resolution
- Add `getMergedScripts(def)` helper that converts legacy `dynamic[]` to scripts entries (wrapping Visible in NotExpression, mapping Display to displayData path, mapping GridColumns to correct path)
- Add `buildOverrideProxies(def, scope)` that creates the nested proxy hierarchy
- Refactor `createEvaluatedDefinition`: replace per-type blocks with generic loop
- Refactor `initFormState`: remove state-level `evalDynamic` calls for style/layoutStyle/display/allowedOptions (these are now definition-level overrides). Keep `fieldOptions` as a computed derivation from `definition.allowedOptions`.
- Remove `display` parameter from `createEvaluatedDefinition` and the bridge sync effect
- Remove `style`, `layoutStyle`, `display` from `ResolvedDefinition`
- Keep `createOverrideProxy` pattern unchanged

### 7. `forms/core/src/controlBuilder.ts` - Builder updates
- Deprecate `dynamicDefaultValue`, `dynamicReadonly`, `dynamicVisibility`, `dynamicDisabled`
- Add: `withScripts(def, scripts)` helper

### 8. `astrolabe-schemas-editor/src/schemaSchemas.ts`
- Replace moved definitions with re-exports from `forms/core/src/controlDefinitionSchemas.ts`

### 9. `schemas/src/RenderForm.tsx` - Consumer update
- Change `state.resolved.style` → `state.definition.style`
- Change `state.resolved.layoutStyle` → `state.definition.layoutStyle`

### 10. Test files
- `forms/core/test/dynamicProperties.test.ts` - Update assertions: `resolved.style` → `definition.style`, `resolved.layoutStyle` → `definition.layoutStyle`, `resolved.display` → `definition.displayData.text/html`
- `forms/core/test/nodeTester.ts` - Update `withDynamic` → `withScript(c, key)` using `scripts`
- `forms/core/test/flags.test.ts`, `cleanup.test.ts`, `evalExpr.test.ts`, `validation.test.ts`, `builders.test.ts`

### 11. Display renderer cleanup (dead code removal)
- `schemas/src/controlRender.tsx` - Remove `display` field from `DisplayRendererProps`
- `schemas-rn/src/components/DefaultDisplay.tsx` - Remove `display` prop and all `display ? display.value : ...` checks
- `schemas-html/src/components/DefaultDisplay.tsx` - Same cleanup

### 12. Consuming packages (~25 files)
- `astrolabe-schemas-editor/src/FormControlPreview.tsx`
- `astrolabe-basic-editor/src/visibilityUtils.ts`
- `astrolabe-basic-editor/src/FormControlPreview.tsx`
- `astrolabe-basic-editor/src/components/VisibilityConditionEditor.tsx`
- `astrolabe-schemas-datagrid/src/DataGridControlRenderer.tsx`
- `schemas/src/controlRender.tsx`
- Various TestTemplate files

## Example: Before vs After

**Before:**
```typescript
{
  type: "Data", field: "name", title: "Name",
  dynamic: [
    { type: "Visible", expr: { type: "Data", field: "showName" } },
    { type: "Label", expr: { type: "Jsonata", expression: "$labelVar" } },
    { type: "GridColumns", expr: { type: "Data", field: "numCols" } },
    { type: "Style", expr: { type: "Jsonata", expression: "{ 'color': 'red' }" } },
  ]
}
```

**After:**
```typescript
{
  type: "Data", field: "name", title: "Name",
  scripts: {
    hidden: { type: "Not", expression: { type: "Data", field: "showName" } },
    title: { type: "Jsonata", expression: "$labelVar" },
    "groupOptions.columns": { type: "Data", field: "numCols" },
    style: { type: "Jsonata", expression: "{ 'color': 'red' }" },
  }
}
```

## Phase 0: Write regression tests BEFORE refactoring ✅ DONE

Added `forms/core/test/dynamicProperties.test.ts` with 41 tests covering all 11 DynamicPropertyType values. All tests pass on the current code.

Also added `forms/core/REACTIVE_PROPERTIES.md` documenting the full reactive property system.

### Test coverage added (41 tests):

**Definition-level overrides (11 tests):**
- DefaultValue: overrides `definition.defaultValue`, reactive changes, only applies to DataControls
- ActionData: overrides `definition.actionData`, reactive changes, only applies to ActionControls
- GridColumns: overrides `groupOptions.columns`, coerces non-numbers to undefined, reactive changes
- Label: overrides `definition.title`, coerces to string

**State-level properties (12 tests):**
- Display: updates `resolved.display` and `displayData.text/html` for TextDisplay and HtmlDisplay, reactive
- Style: updates `resolved.style` with objects, coerces non-objects to undefined, reactive
- LayoutStyle: updates `resolved.layoutStyle`, coerces non-objects to undefined
- AllowedOptions: filters `fieldOptions`, empty array returns all, reactive, synthesizes unknown values

**Default value application (4 tests):**
- Applies defaultValue when becoming visible
- Does not overwrite existing values
- Respects Optional adornment
- Works with dynamic defaultValue expression

**Clear hidden (3 tests):**
- Clears data when hidden with `clearHidden: true`
- Respects `dontClearHidden` flag
- Does not clear without global `clearHidden` option

**Reactivity with real expressions (3 tests):**
- Visible, Label, DefaultValue all react to data field changes via `dataExpr`

**Visibility edge cases (5 tests):**
- No-script controls are immediately `visible = true` (not null)
- Dynamic Visible=true makes visibility explicitly `true`
- Default value application with visibility toggling
- Parent hidden propagates to children
- `forceHidden` overrides dynamic Visible

**Multiple dynamic properties (2 tests):**
- Visible + Label + Style simultaneously
- Disabled + Readonly simultaneously

**Async expression evaluation (1 test):**
- Dynamic Display with jsonata expression

### Test helpers added:
- `testNodeStateWithClearHidden()` — variant of `testNodeState` with `clearHidden: true`
- `testNodeStateMultiField()` — variant accepting multiple `SchemaField[]` for tests needing sibling data fields
- `reactiveEval()` — creates a mock `evalExpression` backed by a reactive `Control` for toggling values

### Existing coverage (unchanged):
- Dynamic Visible → `flags.test.ts` (property-based, with fc)
- Dynamic Disabled → `flags.test.ts`
- Dynamic Readonly → `flags.test.ts`
- Dynamic Label → `evalExpr.test.ts` (with real expression evaluators)
- Cleanup with dynamic props → `cleanup.test.ts`
- Validators with visibility → `validation.test.ts`

## Verification

1. ✅ All 41 new tests pass on current code (`npx jest --no-coverage test/dynamicProperties.test.ts`)
2. ✅ All existing tests remain unaffected (3 pre-existing property-based test flakes in other files are unrelated)
3. Proceed with refactoring (Phase 1+)
4. Run full test suite after refactoring to catch regressions
5. Run `rush build` from `Astrolabe.TestTemplate/ClientApp` to verify compilation