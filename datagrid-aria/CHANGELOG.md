# Change Log - @astroapps/datagrid-aria

This log was last generated on Thu, 03 Sep 2026 07:35:03 GMT and should not be manually modified.

## 0.4.0
Thu, 03 Sep 2026 07:35:03 GMT

### Minor changes

- Render a (Select All) row in filter popups under filterMode: "excel", and drive Clear and Apply from the draft's canClear/canApply so an empty excel selection can't be applied. FilterOptionList takes a selectAll prop, with a new optionSelectAll class part

## 0.3.0
Thu, 03 Sep 2026 01:15:33 GMT

### Minor changes

- Emit data-row-key and data-row-index on the row wrapper, which is display: contents and so unreachable by role; rowAriaLabel on selectionColumn now also accepts (row, index) => string, so each row's checkbox can be named after the row it selects; the filter funnel's accessible name now always includes the column ("Filter (Kind)", and "Filter (Kind, filtered)" when active) rather than a bare "Filter" shared by every filterable column

## 0.2.0
Wed, 02 Sep 2026 23:57:14 GMT

### Minor changes

- Add renderHeaderExtra to the header options: a (column, search) => ReactNode rendered after the filter control, for header content that isn't sorting or filtering

## 0.1.0
Thu, 06 Aug 2026 05:52:07 GMT

### Minor changes

- Initial release: a tailwind-styled renderer for @astroapps/datagrid over a datagrid-search GridSearch, using react-aria-components for the filter popover, checkboxes and radios. Needs the astrolabe tailwind preset for its colours, and the package listed in the consuming app's tailwind content globs

