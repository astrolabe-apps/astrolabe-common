# Scripts migration: remaining work

The generic `scripts` system is implemented and working. Legacy `dynamic[]` is auto-migrated at runtime via `getMergedScripts`. Below are things not yet done.

## 1. Schema editor support for `scripts`

`astrolabe-schemas-editor/src/schemaSchemas.ts` still defines its own `DynamicPropertySchema` / `DynamicPropertyForm` and `ControlDefinitionSchema` with a `dynamic` field. Needs:

- Add `scripts` field to `ControlDefinitionForm` and `ControlDefinitionSchema`
- Add editor UI for editing script key/expression pairs
- Potentially deprecate/remove the `dynamic` field from the editor UI
- Could reuse `ControlDefinitionScriptFields` from `forms/core` for type info

Files:
- `astrolabe-schemas-editor/src/schemaSchemas.ts`
- `astrolabe-schemas-editor/src/FormControlPreview.tsx`

## 2. Basic editor support for `scripts`

`astrolabe-basic-editor` still references `DynamicProperty` / `DynamicPropertyType` for visibility condition editing.

Files:
- `astrolabe-basic-editor/src/components/VisibilityConditionEditor.tsx`
- `astrolabe-basic-editor/src/FormControlPreview.tsx`
- `astrolabe-basic-editor/src/visibilityUtils.ts`

## 3. Test helpers still use legacy API

`nodeTester.ts` still has `withDynamic()` which creates legacy `DynamicProperty` entries. Should add a `withScript(control, key, expr?)` helper using the new `scripts` field, and update tests that are specifically testing the new API.

Files:
- `forms/core/test/nodeTester.ts`
- `forms/core/test/cleanup.test.ts`
- `forms/core/test/flags.test.ts`
- `forms/core/test/validation.test.ts`

## 4. Remove special-case `hidden` init block

`createEvaluatedDefinition` has a special block that inits `hidden` to `!!def.hidden` when no script targets it. This exists because `visible` is derived as `definition.hidden == null ? null : !definition.hidden`, and without the block the proxy falls through to the raw `def.hidden` (typically `undefined`), which `== null` is true, so visibility would appear "pending" forever.

Could be cleaned up by changing the `visible` derivation to distinguish `undefined` (no opinion → visible) from `null` (pending script): `definition.hidden === null ? null : !definition.hidden`. Then the special block could be removed entirely.

## 5. C# side

The plan was TypeScript only. The C# `ControlDefinition` types (`Astrolabe.Schemas`) have not been updated with `scripts`, `style`, `layoutStyle`, or `allowedOptions` fields.
