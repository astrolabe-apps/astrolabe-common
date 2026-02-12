# Plan: Replace `dynamic[]` with generic `scripts` on ControlDefinition

## Context

Currently, scripting ControlDefinition fields uses a `dynamic: DynamicProperty[]` array with a fixed `DynamicPropertyType` enum (11 values). Adding a new scriptable field requires adding an enum value, updating evaluation code, and hardcoding a coercion function. The goal is to replace this with a generic `scripts: Record<string, EntityExpression>` where any field name (or dot-path) can be a key, with coercion derived automatically from the field's `SchemaField.type`.

## Approach

1. Add `scripts?: Record<string, EntityExpression>` to `ControlDefinition` (top-level only, dot-paths for nested)
2. Move `ControlDefinitionSchema` and related schemas from `astrolabe-schemas-editor/src/schemaSchemas.ts` into `forms/core/src/` so the runtime can look up field types
3. Derive coercion from `SchemaField.type` (Bool → `!!r`, Int → number check, String → `coerceString`, etc.)
4. Provide migration layer that reads both `scripts` and legacy `dynamic[]`
5. Deprecate `DynamicProperty`, `DynamicPropertyType`, `dynamic` field
6. TypeScript only (C# later)

## Key Design Decisions

**Schema-driven coercion**: Instead of a hardcoded coercion registry, look up the script key in the `ControlDefinitionSchema` (a `SchemaField[]`). The `SchemaField.type` determines coercion:
- `FieldType.Bool` → `(r) => !!r`
- `FieldType.Int` / `FieldType.Double` → `(r) => typeof r === "number" ? r : undefined`
- `FieldType.String` → `coerceString`
- `FieldType.Any` → identity
- `FieldType.Compound` (object values like style) → `coerceStyle`

**Dot-path resolution**: For `"groupOptions.columns"`, split on `.`, find `groupOptions` (a CompoundField) in `ControlDefinitionSchema`, then find `columns` in its `children`. The `FieldType.Int` of `columns` drives the coercion.

**`visible` virtual key**: `scripts.visible` maps to `hidden` with inversion. This is the one special case beyond schema-driven coercion since it requires boolean inversion, not just type coercion.

**State-level properties**: `style`, `layoutStyle`, `allowedOptions`, `display` are resolved state rather than definition fields. Add these as entries in the ControlDefinition schema so they can be looked up generically, or handle as a small fallback for keys not found in the schema.

## DynamicPropertyType → scripts key mapping

| Old DynamicPropertyType | New scripts key | Coercion source |
|---|---|---|
| Visible | `visible` (virtual → `hidden`, inverted) | Special case |
| Readonly | `readonly` | Schema: `FieldType.Bool` |
| Disabled | `disabled` | Schema: `FieldType.Bool` |
| Label | `title` | Schema: `FieldType.String` |
| DefaultValue | `defaultValue` | Schema: `FieldType.Any` |
| ActionData | `actionData` | Schema: `FieldType.String` |
| GridColumns | `groupOptions.columns` | Schema: `FieldType.Int` (via CompoundField children) |
| Display | `display` | State-level: `coerceString` |
| Style | `style` | State-level: `coerceStyle` |
| LayoutStyle | `layoutStyle` | State-level: `coerceStyle` |
| AllowedOptions | `allowedOptions` | State-level: identity |

## Files to Modify

### 1. New file: `forms/core/src/controlDefinitionSchemas.ts`
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

Then re-export from `astrolabe-schemas-editor/src/schemaSchemas.ts` to avoid breaking imports.

### 2. `forms/core/src/controlDefinition.ts` - Type changes
- Add `scripts?: Record<string, EntityExpression> | null` to `ControlDefinition`
- Mark `DynamicProperty`, `DynamicPropertyType`, `dynamic` as `@deprecated`

### 3. `forms/core/src/formStateNode.ts` - Core refactoring
- Add `coerceForFieldType(fieldType: FieldType): (v: unknown) => any` function
- Add `resolveScriptField(key: string, schema: SchemaField[]): { targetKey: string, overrideTarget: string, schemaField: SchemaField | undefined }` to resolve dot-paths
- Add `getMergedScripts(def)` helper normalizing both `scripts` and legacy `dynamic[]`
- Refactor `createEvaluatedDefinition` (lines 124-299): replace per-type blocks with generic loop that resolves each script key through the schema, determines coercion, and routes to the correct override proxy
- Refactor `initFormState` (lines 532-733): replace per-type `evalDynamic` calls with generic loop for state-level entries
- Keep the `display` → `displayData.text/html` special handling (sync effect)
- Keep `createOverrideProxy` pattern unchanged

### 4. `forms/core/src/controlBuilder.ts` - Builder updates
- Deprecate `dynamicDefaultValue`, `dynamicReadonly`, `dynamicVisibility`, `dynamicDisabled`
- Add: `withScripts(def, scripts)`, `scriptVisible(expr)`, etc.

### 5. `astrolabe-schemas-editor/src/schemaSchemas.ts`
- Replace all definitions with re-exports from `forms/core/src/controlDefinitionSchemas.ts`

### 6. Test files
- `forms/core/test/nodeTester.ts` - Update `withDynamic` → `withScript(c, key)` using `scripts`
- `forms/core/test/flags.test.ts`, `cleanup.test.ts`, `evalExpr.test.ts`, `validation.test.ts`, `builders.test.ts`

### 7. Consuming packages (~25 files)
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
  ]
}
```

**After:**
```typescript
{
  type: "Data", field: "name", title: "Name",
  scripts: {
    visible: { type: "Data", field: "showName" },
    title: { type: "Jsonata", expression: "$labelVar" },
    "groupOptions.columns": { type: "Data", field: "numCols" },
  }
}
```

## Phase 0: Write regression tests BEFORE refactoring

Add a new test file `forms/core/test/dynamicProperties.test.ts` covering all 11 DynamicPropertyType values. This ensures no regressions during refactoring.

### Missing test coverage (to add):

1. **Dynamic DefaultValue**: DataControlDefinition with DynamicPropertyType.DefaultValue, verify `definition.defaultValue` updates reactively
2. **Dynamic ActionData**: ActionControlDefinition with DynamicPropertyType.ActionData, verify `definition.actionData` updates
3. **Dynamic Display**: DisplayControlDefinition with DynamicPropertyType.Display, verify display text/html updates via `resolved.display`
4. **Dynamic Style**: Any control with DynamicPropertyType.Style, verify `resolved.style` becomes an object
5. **Dynamic LayoutStyle**: Same pattern, verify `resolved.layoutStyle`
6. **Dynamic AllowedOptions**: DataControlDefinition with options field, DynamicPropertyType.AllowedOptions, verify `resolved.fieldOptions` gets filtered
7. **Dynamic GridColumns**: GroupedControlsDefinition with Grid renderer, DynamicPropertyType.GridColumns, verify `definition.groupOptions.columns` updates
8. **Default value application**: DataControlDefinition with dynamic DefaultValue, verify the data node gets the default when field becomes visible
9. **Clear hidden**: DataControlDefinition that becomes hidden with clearHidden=true, verify data gets cleared
10. **Reactivity**: Verify dynamic properties update when underlying data changes (not just initial evaluation)

### Test structure:
- Use `testNodeState` from `nodeTester.ts` with mock `evalExpression` that returns controlled values
- Use `defaultEvaluators` for real expression evaluation where needed
- Use `createSyncEffect` for reactive tests (change a value, verify the dynamic property updates)

### Existing coverage (already tested):
- Dynamic Visible → `flags.test.ts` (property-based, with fc)
- Dynamic Disabled → `flags.test.ts`
- Dynamic Readonly → `flags.test.ts`
- Dynamic Label → `evalExpr.test.ts` (with real expression evaluators)
- Cleanup with dynamic props → `cleanup.test.ts`
- Validators with visibility → `validation.test.ts`

## Verification

1. Run `rush test` to verify all new tests pass on the current code
2. Then proceed with refactoring
3. Run `rush test` again after refactoring to catch regressions
4. Run `rush build` from `Astrolabe.TestTemplate/ClientApp` to verify compilation
