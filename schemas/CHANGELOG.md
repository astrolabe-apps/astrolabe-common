# Change Log - @react-typed-forms/schemas

This log was last generated on Fri, 08 May 2026 00:59:16 GMT and should not be manually modified.

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

