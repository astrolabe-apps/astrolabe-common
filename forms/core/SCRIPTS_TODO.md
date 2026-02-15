# Scripts migration: remaining work

The generic `scripts` system is implemented and working. Legacy `dynamic[]` is auto-migrated at runtime via `getMergedScripts`. Below are things not yet done.

## 1. Schema editor support for `scripts`

`astrolabe-schemas-editor/src/schemaSchemas.ts` is auto-generated from the C# classes. The C# classes have been updated with `scripts`, `style`, `layoutStyle`, and `allowedOptions` fields (see section 5). The schema generation should be moved into `forms/core` so it's driven from the TypeScript types directly.

Needs:
- Move schema generation for `ControlDefinition` and related types into `forms/core`
- Add editor UI for editing script key/expression pairs
- Potentially deprecate/remove the `dynamic` field from the editor UI
- Could reuse `ControlDefinitionScriptFields` from `forms/core` for type info

Files:
- `astrolabe-schemas-editor/src/schemaSchemas.ts` (currently auto-generated from C#)
- `astrolabe-schemas-editor/src/FormControlPreview.tsx`

## 2. ~~Basic editor support for `scripts`~~ (DONE)

`visibilityUtils.ts` now reads/writes `scripts.hidden` (with `Not` wrapper) and falls back to legacy `dynamic` for reading. `writeVisibilityCondition` always writes to `scripts` and cleans up legacy `dynamic` Visible entries. Unused `DynamicPropertyType` import removed from `FormControlPreview.tsx`.

## 3. ~~Test helpers still use legacy API~~ (DONE)

Added `withScript(control, key, expr?)` helper to `nodeTester.ts`. New script-based tests added alongside existing legacy `withDynamic` tests in `flags.test.ts`, `cleanup.test.ts`, and `validation.test.ts`. All legacy tests preserved to validate the runtime migration (`getMergedScripts`).

## 4. ~~Remove special-case `hidden` init block~~ (DONE)

`createScriptedProxy` now handles `ScriptNullInit` fields generically — after wiring scripts, it initializes the override for any `ScriptNullInit`-tagged fields not targeted by a script to their coerced static value. The special-case block in `createEvaluatedDefinition` has been removed.

## 5. ~~C# side~~ (DONE)

C# `ControlDefinition` (`Astrolabe.Schemas`) updated with `Scripts`, `Style`, `LayoutStyle`, and `AllowedOptions` properties. `DynamicPropertyHelpers.FindScriptExpression` added to check `Scripts` first, falling back to legacy `Dynamic`. All `Initialize*` methods in C# `FormStateNode` updated to use `FindScriptExpression`.
