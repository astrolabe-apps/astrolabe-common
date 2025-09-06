# Refactoring schemas-rn to not depend on schemas-html

## Goals

1. Make schemas-rn package independent of schemas-html package.
2. Make schemas-rn have it's own copy of the createDefaultRenderers.tsx file and other components/renderers/adornments from schemas-html.

## Other things

No need to run any tests or check dependencies outside of schemas, schemas-html and schemas-rn.
It needs to compile and work.

## Detailed File Analysis

### All Options Interfaces to Move from schemas-html to @react-typed-forms/schemas

**From `createDefaultRenderers.tsx`:**
- `DefaultRendererOptions` (line 105) - ✅ Currently used by schemas-rn
- `DefaultDataRendererOptions` (line 123) - ✅ Currently used by schemas-rn  
- `DefaultAccordionRendererOptions` (line 298)
- `DefaultHelpTextRendererOptions` (line 309)
- `DefaultAdornmentRendererOptions` (line 318)
- `DefaultLabelRendererOptions` (line 390) - non-exported interface

**From individual component files:**
- `DefaultOptionalAdornmentOptions` (optionalAdornment.tsx:27)
- `DefaultActionRendererOptions` (createButtonActionRenderer.tsx:12)
- `DefaultLayoutRendererOptions` (DefaultLayout.tsx:10)
- `SelectRendererOptions` (SelectDataRenderer.tsx:10) - ✅ Currently used by schemas-rn
- `DefaultWizardRenderOptions` (DefaultWizardRenderer.tsx:27)
- `DefaultTabsRenderOptions` (TabsRenderer.tsx:16)
- `ValueForFieldRenderOptions` (ValueForFieldRenderer.tsx:28)
- `ValueForFieldOptions` (ValueForFieldRenderer.tsx:49)
- `ArrayElementRendererOptions` (ArrayElementRenderer.tsx:24)
- `DefaultGroupRendererOptions` (DefaultGroupRenderer.tsx:43)
- `DefaultDisplayRendererOptions` (DefaultDisplay.tsx:17)
- `DefaultScrollListOptions` (ScrollListRenderer.tsx:17) - ✅ Currently used by schemas-rn
- `AutocompleteRendererOptions` (AutocompleteRenderer.tsx:19)
- `DefaultArrayRendererOptions` (DefaultArrayRenderer.tsx:98)
- `DefaultGridRenderOptions` (GridRenderer.tsx:11)
- `DefaultDialogRenderOptions` (DefaultDialogRenderer.tsx:17)

### Functions/Utilities to Copy from schemas-html to schemas-rn

**From `SelectDataRenderer.tsx`:**
- `createSelectConversion` function - ✅ Currently used by schemas-rn
- `SelectDataRendererProps` type - ✅ Currently used by schemas-rn

**From `tailwind.tsx`:**
- `defaultTailwindTheme` object - ✅ Currently used by schemas-rn

### Files to Copy/Adapt from schemas-html to schemas-rn

**Main file:**
- `createDefaultRenderers.tsx` → `createDefaultRNRenderers.tsx`

**Component files that may need copying (need to analyze dependencies):**
- All component files that createDefaultRenderers references
- All adornment files that createDefaultRenderers references

### Current schemas-rn Dependencies on schemas-html

**Files importing from schemas-html:**
1. `tailwind.tsx` imports: `DefaultRendererOptions`, `defaultTailwindTheme`
2. `RNSelectRenderer.tsx` imports: `createSelectConversion`, `SelectDataRendererProps`, `SelectRendererOptions`  
3. `RNDateTimePickerRenderer.tsx` imports: `DefaultDataRendererOptions`
4. `RNScrollListRenderer.tsx` imports: `DefaultScrollListOptions`

## Implementation Steps

1. **Move ALL Options interfaces to @react-typed-forms/schemas** (22 total interfaces)
2. **Copy utility functions** (`createSelectConversion`, `defaultTailwindTheme`)
3. **Copy createDefaultRenderers.tsx** and adapt for React Native
4. **Update all import statements** in both packages
5. **Remove schemas-html dependency** from schemas-rn package.json

