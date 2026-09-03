# Change Log - @astroapps/datagrid-fluent-ui

This log was last generated on Thu, 03 Sep 2026 01:15:33 GMT and should not be manually modified.

## 0.4.0
Thu, 03 Sep 2026 01:15:33 GMT

### Minor changes

- Emit data-row-key and data-row-index on the row wrapper, which is display: contents and so unreachable by role; rowAriaLabel on selectionColumn now also accepts (row, index) => string, so each row's checkbox can be named after the row it selects; the filter funnel's accessible name now always includes the column ("Filter (Kind)", and "Filter (Kind, filtered)" when active) rather than a bare "Filter" shared by every filterable column

## 0.3.0
Wed, 02 Sep 2026 23:57:14 GMT

### Minor changes

- Add renderHeaderExtra to the header options: a (column, search) => ReactNode rendered after the filter control, for header content that isn't sorting or filtering

## 0.2.0
Thu, 06 Aug 2026 05:52:07 GMT

### Minor changes

- Require @astroapps/datagrid-search ^0.2.0: selection now lives there (still re-exported from here, so this package's own API is unchanged), along with the row-click and pager-visibility rules it now calls

### Patches

- Fix the pager disappearing on a single page when pageSizes was set, which removed the only control that could return to a smaller page size

## 0.1.0
Wed, 05 Aug 2026 06:27:19 GMT

### Minor changes

- Initial release

