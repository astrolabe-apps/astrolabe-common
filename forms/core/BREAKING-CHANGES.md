# Breaking Changes: `refactor/scripts-everywhere` vs `main`

## HIGH Severity

### 1. `schemaSchemas` exports moved package

All schema form types moved from `@astroapps/schemas-editor` to `@react-typed-forms/schemas`.

**Affected exports:** `ControlDefinitionForm`, `ControlDefinitionSchema`, `SchemaFieldForm`, `EntityExpressionForm`, `DynamicPropertyForm`, `IconReferenceForm`, `ControlAdornmentForm`, `GroupRenderOptionsForm`, `IconMappingForm`, `RenderOptionsForm`, `DisplayDataForm`, `FieldOptionForm`, `SchemaValidatorForm`, and all their associated `default*Form` and `to*Form` helpers, plus `ControlDefinitionSchemaMap`.

**Fix:** Change imports from `@astroapps/schemas-editor` to `@react-typed-forms/schemas`.

### 2. `ViewContext` split into multiple interfaces

The monolithic `ViewContext` in `@astroapps/schemas-editor` was split into 5 interfaces:

- `ViewContext` - Core infrastructure (editorControls, schemaEditorControls, editorFields, button, checkbox, getCurrentForm, getSchemaForForm)
- `FormListContext` - Form list navigation (formList, listHeader, currentForm, openForm)
- `FormEditContext` - Form editing (getForm, saveForm, saveSchema, updateTabTitle)
- `PreviewContext` - Preview functionality (previewOptions, validation, setupPreview, extraPreviewControls)
- `SnippetsContext` - Snippets (snippets)
- `BasicFormEditorViewContext` - Union of all above

**Fix:** Update component props to use the appropriate intersection type (e.g. `ViewContext & FormEditContext & PreviewContext`).

### 3. `ResolvedDefinition` fields removed

Three fields removed from `ResolvedDefinition`:
- `display` - was `string | undefined`
- `style` - was `object | undefined`
- `layoutStyle` - was `object | undefined`

These are now accessed through the scripted proxy on the `ControlDefinition` object directly (`definition.style`, `definition.layoutStyle`, `definition.displayData.text/html`).

**Fix:** Access `style`/`layoutStyle` from `state.definition` instead of `state.resolved`. For display text, read from `definition.displayData`.

### 4. `DisplayRendererProps.display` removed

The `display?: Control<string | undefined>` field was removed from `DisplayRendererProps`. A new `noSelection?: boolean | null` field was added.

Dynamic display text now flows through the scripted proxy on the definition object, not as a separate control.

**Fix:** Custom display renderers must read text/html from `definition.displayData` instead of from a `display` control.

### 5. `createEvaluatedDefinition` signature changed

**Old:** `createEvaluatedDefinition(def, evalExpr, scope, display: Control<string | undefined>)`
**New:** `createEvaluatedDefinition(def, evalExpr, scope, schema: SchemaNode = DefaultControlDefinitionSchemaNode)`

**Fix:** Update call sites to pass a `SchemaNode` instead of a `Control<string>`. The parameter has a default value so it can be omitted.

## MEDIUM Severity

### 6. `FormStateBaseImpl.allowedOptions` removed

Now read from `definition.allowedOptions` instead.

### 7. Lazy children initialization in `FormStateNode`

Children are now lazily initialized via `ensureChildren()` instead of eagerly during `initFormState()`. Code relying on children being available immediately after form state creation may need adjustment.

### 8. Checkbox label rendering changed

Checkboxes now use `LabelType.Inline` instead of suppressing labels. The label is rendered inline after the checkbox by the layout system. Visual appearance may change if custom CSS targets the old wrapping structure.

### 9. `ControlRef` tag format change (C#)

Tags changed from `_ControlRef:Expression` to `_ControlRef:/ExpressionForm`. The `/` prefix denotes an external form reference. Affects `ElementSelectedRenderOptions.ElementExpression` and `SelectChildRenderer.ChildIndexExpression`.

### 10. `ComponentTracker` cleanup deferred (`@react-typed-forms/core`)

Cleanup now uses `setTimeout(flushCleanups, 0)` for better React strict mode support. Subscription cleanup timing is now asynchronous instead of synchronous.

## Deprecations (still functional)

- `dynamic` property array on `ControlDefinition` - use `$scripts` instead
- `dynamicDefaultValue()` - use `withScripts(def, { defaultValue: expr })` instead
- `dynamicReadonly()` - use `withScripts(def, { readonly: expr })` instead
- `dynamicVisibility()` - use `withScripts(def, { hidden: notExpr(expr) })` instead
- `dynamicDisabled()` - use `withScripts(def, { disabled: expr })` instead

The old `dynamic[]` array is still processed via `buildLegacyScripts()`.

## New Additions

- `@astroapps/basic-editor` - new package
- `NotExpression` / `ExpressionType.Not` - new entity expression type
- `withScripts()`, `notExpr()` helpers
- `LabelType.Inline` enum value
- `parseChildRefId()` function
- `useViewContext` hook in `@astroapps/schemas-editor`
- `SchemaTags.ScriptNullInit`
- `createScriptedProxy`, `ScriptProvider`, `defaultScriptProvider` in `@astroapps/forms-core`
- New fields on `ControlDefinition`: `noSelection`, `style`, `layoutStyle`, `allowedOptions`
- `controlDefinitionSchema` option on `FormGlobalOptions`, `ControlRenderOptions`, `FormRenderer`
- `inlineLabel` on `RenderedLayout`
- `schemaExtension` on all renderer registration interfaces