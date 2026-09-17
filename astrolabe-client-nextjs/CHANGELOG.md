# Change Log - @astroapps/client-nextjs

This log was last generated on Thu, 17 Sep 2026 05:09:18 GMT and should not be manually modified.

## 3.0.0
Thu, 17 Sep 2026 05:09:18 GMT

### Breaking changes

- The peer dependency on `@react-typed-forms/core` moves from `^4.6.0` to `^5.0.0`. v5 folds the `@astroapps/controls` engine in and is ESM-only, and a consuming app must mount `<ControlContextProvider value={getCompatContext()}>` above its tree — v5 has no implicit control context and no no-provider fallback

## 2.1.3
Wed, 12 Aug 2026 03:42:15 GMT

### Patches

- added next 16 to peer and dev dependencies

## 2.1.2
Wed, 29 Jul 2026 02:36:51 GMT

_Version update only_

## 2.0.3
Thu, 27 Feb 2025 00:21:07 GMT

_Initial release_

