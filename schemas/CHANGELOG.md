# Change Log - @react-typed-forms/schemas

This log was last generated on Thu, 17 Sep 2026 05:09:18 GMT and should not be manually modified.

## 19.0.0
Thu, 17 Sep 2026 05:09:18 GMT

### Breaking changes

- The peer dependency on `@react-typed-forms/core` moves from `^4.6.0` to `^5.0.0` and `@astroapps/forms-core` to `^3.0.0`. v5 folds the `@astroapps/controls` engine in and is ESM-only, and a consuming app must mount `<ControlContextProvider value={getCompatContext()}>` above its tree — v5 has no implicit control context and no no-provider fallback. The package re-exports `@astroapps/forms-core` wholesale, so its removal of `SchemaInterface.makeEqualityFunc`, `makeControlSetup`, `DefaultSchemaInterface.compoundFieldEquality`, `compoundFieldSetup` and the `EqualityFunc` type drops them from this surface too

## 18.0.1
Wed, 29 Jul 2026 23:41:04 GMT

### Patches

- Validate can't get response synchronously, wait 100ms

## 18.0.0
Fri, 08 May 2026 00:59:16 GMT

### Breaking changes

- Replace `actionOnClick` with `actionHandler` across components for improved clarity and consistency.
- BREAKING: Remove ResolvedDefinition.display/style/layoutStyle fields, remove DisplayRendererProps.display, change createEvaluatedDefinition signature, remove FormStateBaseImpl.allowedOptions, lazy children initialization via ensureChildren(), checkbox inline label rendering. Add schema form types from schemas-editor, withScripts/notExpr helpers, new ControlDefinition fields (noSelection, style, layoutStyle, allowedOptions), controlDefinitionSchema option.

### Minor changes

- Add makeActionHandler utility for mapping action IDs to handler functions
- Support collection=null for renderers who can do both

## 15.0.0
Tue, 25 Feb 2025 09:07:22 GMT

### Breaking changes

- Form Tree API refactor

