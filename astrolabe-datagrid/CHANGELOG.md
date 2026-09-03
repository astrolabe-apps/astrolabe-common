# Change Log - @astroapps/datagrid

This log was last generated on Thu, 03 Sep 2026 01:15:33 GMT and should not be manually modified.

## 1.3.0
Thu, 03 Sep 2026 01:15:33 GMT

### Minor changes

- Emit data-column (the column id) on every cell and data-row-index (the 0-based data row) on body cells, so a single cell can be addressed in tests and CSS; CellRenderProps gains the matching rowIndex, undefined for header cells

