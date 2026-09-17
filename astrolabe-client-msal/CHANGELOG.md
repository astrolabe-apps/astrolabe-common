# Change Log - @astroapps/client-msal

This log was last generated on Thu, 17 Sep 2026 05:09:18 GMT and should not be manually modified.

## 4.0.0
Thu, 17 Sep 2026 05:09:18 GMT

### Breaking changes

- The peer dependency on `@react-typed-forms/core` moves from `^4.6.0` to `^5.0.0`. v5 folds the `@astroapps/controls` engine in and is ESM-only, and a consuming app must mount `<ControlContextProvider value={getCompatContext()}>` above its tree — v5 has no implicit control context and no no-provider fallback

## 3.1.0
Mon, 31 Aug 2026 01:23:45 GMT

### Minor changes

- Send the active account and its id_token as id_token_hint when logging out, so the provider can identify the session being ended — MSAL never sends the hint unless the caller supplies it, which left RP-initiated logout unable to tell a federating provider which upstream identity provider issued the session
- Add logoutRequest option for overriding the end session request, e.g. pass { idTokenHint: undefined } to suppress the hint

## 3.0.5
Wed, 29 Jul 2026 02:36:51 GMT

### Patches

- Support getting the access token from the SecurityService

