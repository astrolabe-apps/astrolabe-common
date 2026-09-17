# Change Log - @react-typed-forms/schemas-rn

This log was last generated on Thu, 17 Sep 2026 05:09:18 GMT and should not be manually modified.

## 3.0.0
Thu, 17 Sep 2026 05:09:18 GMT

### Breaking changes

- The peer dependency on `@react-typed-forms/core` moves from `^4.6.0` to `^5.0.0`. v5 folds the `@astroapps/controls` engine in and is ESM-only, and a consuming app must mount `<ControlContextProvider value={getCompatContext()}>` above its tree — v5 has no implicit control context and no no-provider fallback. The `@astroapps/controls` peer dependency is dropped: nothing in the package has imported it since the engine moved into core

## 2.3.1
Thu, 17 Sep 2026 00:41:12 GMT

### Patches

- Fix default label styles

## 2.3.0
Wed, 16 Sep 2026 05:48:22 GMT

### Minor changes

- The default label renderer now renders `View`/`Text` directly instead of going through `HtmlComponents` (`Label`/`Span`), and `labelEnd` markup (help text, icons, optional adornments) is rendered inside the label container after the text rather than as a sibling of it. Adds a `textClassLabelEnd` label option, applied to the label text only when `labelEnd` markup is present, and the tailwind theme now gives the label `flex flex-row items-center` plus `mr-2` between the text and the adornment (without the row direction the label end would stack below the text)

### Patches

- Fix the dropdown renderer throwing `Cannot read properties of undefined (reading 'requiredText')` on a data control that has options but no explicit `renderOptions` - `requiredText` and `portalHost` are now read optionally, matching SelectDataRenderer

## 2.2.8
Fri, 04 Sep 2026 03:36:41 GMT

### Patches

- Honour FieldOption.disabled in the radio/checklist check buttons, so an individual option renders disabled and cannot be toggled, and make the Checkbox/ElementSelected renderers respect the form node's disabled state (previously the element-selected checkbox ignored it entirely, as it renders a synthetic control)

## 2.2.7
Wed, 29 Jul 2026 23:41:04 GMT

### Patches

- Validate can't get response synchronously, wait 100ms

## 2.2.6
Wed, 08 Jul 2026 02:36:27 GMT

### Patches

- Add multi-slot navigation (left/middle/right) to the RN wizard renderer, laid out vertically for mobile

## 2.2.5
Fri, 08 May 2026 00:59:16 GMT

### Patches

- Fix readonly support for checkbox renderer.
- Update for compatibility with @react-typed-forms/schemas breaking changes.

