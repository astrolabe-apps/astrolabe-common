# Change Log - @astroapps/datagrid-search

This log was last generated on Thu, 17 Sep 2026 05:09:18 GMT and should not be manually modified.

## 1.0.0
Thu, 17 Sep 2026 05:09:18 GMT

### Breaking changes

- The peer dependency on `@react-typed-forms/core` moves from `^4.6.0` to `^5.0.0`. v5 folds the `@astroapps/controls` engine in and is ESM-only, and a consuming app must mount `<ControlContextProvider value={getCompatContext()}>` above its tree — v5 has no implicit control context and no no-provider fallback

## 0.3.0
Thu, 03 Sep 2026 07:35:03 GMT

### Minor changes

- Add filterMode: "immediate" | "apply" | "excel". Excel mode opens an unfiltered column with every value ticked and a select-all, stores no filter when everything is still ticked, and refuses an empty selection (canApply), since the empty array already means unfiltered; clear() re-ticks everything in that mode. useFilterDraft gains excel, setAll, canApply and canClear, and takes the column's loaded options. deferApply is kept as the older spelling of filterMode: "apply"

## 0.2.1
Thu, 03 Sep 2026 01:15:33 GMT

_Version update only_

## 0.2.0
Thu, 06 Aug 2026 05:52:07 GMT

### Minor changes

- Add page-scoped row selection: makeGridSelection, arraySelection and GridSelection, moved here from datagrid-fluent-ui so a second renderer doesn't duplicate the page arithmetic
- Add shouldIgnoreRowClick, for row-click handlers that must ignore clicks on interactive cell content and clicks that end a text selection
- Add pagerVisible, which decides whether a pager is worth rendering — including keeping it on a single page when a page-size selector would go with it

## 0.1.0
Wed, 05 Aug 2026 06:27:19 GMT

### Minor changes

- Initial release

