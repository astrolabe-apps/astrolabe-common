# Change Log - @react-typed-forms/fluent-ui

This log was last generated on Thu, 17 Sep 2026 05:09:18 GMT and should not be manually modified.

## 2.0.0
Thu, 17 Sep 2026 05:09:18 GMT

### Breaking changes

- The peer dependency on `@react-typed-forms/core` moves from `^4.6.0` to `^5.0.0`. v5 folds the `@astroapps/controls` engine in and is ESM-only, and a consuming app must mount `<ControlContextProvider value={getCompatContext()}>` above its tree — v5 has no implicit control context and no no-provider fallback

## 0.0.2
Thu, 30 Jul 2026 23:33:06 GMT

### Patches

- Initial release

## 1.0.0
Fri, 22 May 2026 00:37:15 GMT

_Initial release_

