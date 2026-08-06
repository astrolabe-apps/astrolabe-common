# Change Log - @astroapps/datagrid-fluent-ui

This log was last generated on Thu, 06 Aug 2026 05:52:07 GMT and should not be manually modified.

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

