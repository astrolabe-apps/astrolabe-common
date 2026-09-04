# Change Log - @react-typed-forms/schemas-html

This log was last generated on Fri, 04 Sep 2026 03:36:41 GMT and should not be manually modified.

## 5.2.3
Fri, 04 Sep 2026 03:36:41 GMT

### Patches

- Honour FieldOption.disabled in the radio/checklist check buttons, so an individual option renders disabled and cannot be toggled, and make the Checkbox/ElementSelected renderers respect the form node's disabled state (previously the element-selected checkbox ignored it entirely, as it renders a synthetic control)

## 5.2.2
Wed, 29 Jul 2026 23:41:04 GMT

### Patches

- Validate can't get response synchronously, wait 100ms

## 5.2.1
Mon, 08 Jun 2026 11:54:21 GMT

### Patches

- Fix the ArrayElementRenderer for new version

## 5.2.0
Fri, 08 May 2026 00:59:16 GMT

### Minor changes

- Add multilineContentEditable option
- Add support for navigation children via placement and allow disappearing of nav buttons
- Add support for validation in wizard navigation actions + overridding all ActionRendererProps for nav buttons

### Patches

- Fix readonly support for checkbox and multiline textfield renderers.
- Fix ValueForFieldRenderer to reset meta flag and clear value on field change
- Support manual navigation
- Update for compatibility with @react-typed-forms/schemas breaking changes.

## 3.0.0
Tue, 25 Feb 2025 09:07:22 GMT

### Breaking changes

- Updates for new schema version

