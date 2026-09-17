# Change Log - @astroapps/schemas-datagrid

This log was last generated on Thu, 17 Sep 2026 05:09:18 GMT and should not be manually modified.

## 9.0.0
Thu, 17 Sep 2026 05:09:18 GMT

### Breaking changes

- The peer dependency on `@react-typed-forms/core` moves from `^4.6.0` to `^5.0.0`. v5 folds the `@astroapps/controls` engine in and is ESM-only, and a consuming app must mount `<ControlContextProvider value={getCompatContext()}>` above its tree — v5 has no implicit control context and no no-provider fallback

## 8.2.1
Wed, 05 Aug 2026 06:27:19 GMT

_Version update only_

## 8.2.0
Fri, 08 May 2026 00:59:16 GMT

### Minor changes

- Support row class

### Patches

- Update for compatibility with @react-typed-forms/schemas breaking changes.

## 6.0.0
Tue, 25 Feb 2025 09:07:22 GMT

### Breaking changes

- Nicer editor UI

