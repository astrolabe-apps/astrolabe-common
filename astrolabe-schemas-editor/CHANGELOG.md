# Change Log - @astroapps/schemas-editor

This log was last generated on Thu, 17 Sep 2026 05:09:18 GMT and should not be manually modified.

## 20.0.0
Thu, 17 Sep 2026 05:09:18 GMT

### Breaking changes

- The peer dependency on `@react-typed-forms/core` moves from `^4.6.0` to `^5.0.0`. v5 folds the `@astroapps/controls` engine in and is ESM-only, and a consuming app must mount `<ControlContextProvider value={getCompatContext()}>` above its tree — v5 has no implicit control context and no no-provider fallback

## 19.0.0
Fri, 08 May 2026 00:59:16 GMT

### Breaking changes

- BREAKING: Move schema form types (ControlDefinitionForm, SchemaFieldForm, etc.) to @react-typed-forms/schemas. Split ViewContext into ViewContext, FormListContext, FormEditContext, PreviewContext, SnippetsContext. Add

## 16.0.1
Tue, 25 Feb 2025 10:32:35 GMT

### Patches

- Fix control tree node types to allow dropping onto nodes with no children

## 16.0.0
Tue, 25 Feb 2025 09:07:22 GMT

### Breaking changes

- Support editor extension UI

