# Change Log - @astroapps/datagrid-search

This log was last generated on Thu, 06 Aug 2026 05:52:07 GMT and should not be manually modified.

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

