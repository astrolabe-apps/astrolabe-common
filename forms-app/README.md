# @astroapps/forms-app

A framework-agnostic React library for building schema-driven forms applications. Provides a complete set of pages — dashboard with search/filter/export, item view/edit with workflow actions, export definition management, and a visual forms editor — all decoupled from specific UI libraries, API clients, and routing frameworks.

## Installation

```bash
npm install @astroapps/forms-app
```

### Peer Dependencies

```
@react-typed-forms/core        ^4.4.2
@react-typed-forms/schemas     ^17.1.0
@react-typed-forms/schemas-html ^17.1.0
@astroapps/basic-editor        ^1.0.0
@astroapps/client              ^2.6.0
@astroapps/searchstate         ^2.0.0
clsx                           ^2.1.1
react                          ^18.2.0 || ^19
```

## Quick Start

### 1. Set Up the Provider

Wrap your app with `FormsAppProvider`, supplying API adapters, UI components, navigation, and form definitions.

```tsx
import { FormsAppProvider, FormsAppConfig } from "@astroapps/forms-app";

const config: FormsAppConfig = {
  api: myApiAdapter,               // Implements FormsAppApi
  ui: myUIComponents,              // Implements FormsAppUIComponents
  navigationHandler: (intent) => { /* route based on intent.type */ },
  formDefinitions: myFormDefs,     // Pre-loaded form schemas
  schemaMap: mySchemas,            // Schema definitions
  rendererConfig: myRendererConfig,
};

function App() {
  return (
    <FormsAppProvider config={config}>
      {/* your routes */}
    </FormsAppProvider>
  );
}
```

### 2. Use Library Pages

Each page accepts its own API interface — wire your API client to the interface shape.

```tsx
import { DashboardPage, ItemViewPage, ItemEditPage } from "@astroapps/forms-app";

// Dashboard with search, filters, and export
<DashboardPage />

// Item view with workflow actions and notes
<ItemViewPage
  itemId={id}
  api={{
    getItemView: (id) => client.getItemView(id),
    performAction: (id, action) => client.performAction(id, action),
    addItemNote: (id, note) => client.addItemNote(id, note),
    getFormForRender: (formId) => client.getFormForRender(formId),
  }}
/>

// Item edit with dynamic form rendering
<ItemEditPage
  itemId={id}
  api={{
    getItemView: (id) => client.getItemView(id),
    editItem: (id, edit) => client.editItem(id, edit),
    getFormForRender: (formId) => client.getFormForRender(formId),
  }}
/>
```

## Architecture

The library uses three main abstraction layers to stay framework-agnostic:

- **API interfaces** — each page accepts its own typed API prop; consumers wire NSwag/fetch clients to these interfaces
- **UI components** — primitives (Button, Dialog, Textfield, etc.) injected via `FormsAppUIComponents`
- **Navigation intents** — routing is decoupled via `NavigationIntent` union type and a handler callback

All form state is managed with `@react-typed-forms/core` controls, and forms are rendered dynamically from schema definitions via `@react-typed-forms/schemas`.

## Pages

### DashboardPage

Search and browse items with filtering, sorting, and pagination. Supports row actions (view, edit, delete) and bulk CSV export of selected items.

```tsx
<DashboardPage />
```

Uses the `FormsAppApi` from the provider context for search, filter options, delete, and export operations.

**Related hooks:**
- `useDashboardSearch()` — manages search state, debounced queries, and pagination
- `useExportDialog()` — manages export definition selection and CSV download
- `SelectionCheckbox` — row selection component for bulk export

### ItemViewPage

Read-only item view with workflow actions, audit event history, and notes.

```tsx
interface ItemViewPageProps {
  itemId: string | undefined;
  api: ItemViewApi;
  fileOperations?: FileOperations;
  viewFormType?: string;             // Default: "AdminItemViewForm"
  filterActions?: (action: string, navProps: CustomNavigationProps) => boolean;
  onAction?: DashboardActionHandlers;
}
```

### ItemEditPage

Item editing with dynamic form rendering and workflow action buttons.

```tsx
interface ItemEditPageProps {
  itemId: string | undefined;
  api: ItemEditApi;
  fileOperations?: FileOperations;
  filterActions?: (action: string, navProps: CustomNavigationProps) => boolean;
  hideSave?: boolean;
}
```

### ExportDashboardPage

List and manage CSV export definitions, grouped by table.

```tsx
interface ExportDashboardPageProps {
  api: ExportDashboardApi;
  formType?: string;    // Default: "ExportDefinitionDashboard"
  onAction?: DashboardActionHandlers;
}
```

### ExportEditPage

Create or edit export definitions with table selection and column mapping.

```tsx
interface ExportEditPageProps {
  definitionId: string | undefined;   // undefined = create, string = edit
  api: ExportEditApi;
  tableSelectionFormType?: string;
  editFormType?: string;
  createFieldSelectionRenderer?: (options: { schema: any }) => RendererRegistration;
}
```

### FormsEditorPage

Visual form builder with drag-and-drop field placement, live preview, schema tree, properties panel, and a debug window.

```tsx
interface FormsEditorPageProps {
  api: FormsEditorApi;
  editorComponents: FormsEditorComponents;
  createPreviewRenderer: (customRenderers?: RendererRegistration[]) => FormRenderer;
}
```

Editor components (`@astroapps/basic-editor` tree views, palettes, etc.) are injected via the `FormsEditorComponents` interface — no hard dependency on any editor package.

## Components

### DynamicFormRenderer

Loads a form definition from the API and renders it dynamically. Supports read-only mode, file operations, and custom renderers.

```tsx
interface DynamicFormRendererProps {
  formId: string;
  itemId?: string;
  formData: Control<any>;
  readonly?: boolean;
  customRenderers?: RendererRegistration[];
  noNavigation?: boolean;
  getFormForRender: (formId: string) => Promise<FormRenderData>;
  fileOperations?: FileOperations;
}
```

### AppFormRenderer

Renders a pre-loaded form by type from the form definitions registry (via `useFormsApp()` context).

```tsx
<AppFormRenderer formType="MyFormType" data={control} />
```

### Workflow Utilities

```tsx
import { createWorkflowActions, createActionWizardNavigation, wrapFormControls } from "@astroapps/forms-app";
```

- `wrapFormControls(controls, config)` — wraps form controls in wizard/tabs navigation based on form config
- `createActionWizardNavigation(actions, onAction, ...)` — creates wizard renderer with workflow action buttons
- `createWorkflowActions(actions, onAction, ui)` — generates action buttons from available workflow actions

## API Interfaces

Each page defines its own API interface. Consumers implement these by wiring their API clients.

### FormsAppApi (provider-level)

Used by `DashboardPage` and shared functionality:

```ts
interface FormsAppApi {
  searchItems(options: SearchOptions): Promise<ItemSearchResults>;
  getFilterOptions(): Promise<Record<string, FieldOptionData[]>>;
  deleteItem(id: string): Promise<void>;
  exportRecords(request: ExportRecordsEdit): Promise<string>;
  getExportDefinitionOfForms(ids: string[]): Promise<ExportDefinitionGroupData[]>;
}
```

### Per-Page APIs

| Interface | Used By | Methods |
|---|---|---|
| `ItemViewApi` | ItemViewPage | getItemView, performAction, addItemNote, getFormForRender |
| `ItemEditApi` | ItemEditPage | getItemView, editItem, getFormForRender |
| `ExportDashboardApi` | ExportDashboardPage | listExportDefinitions, deleteExportDefinition |
| `ExportEditApi` | ExportEditPage | getExportDefinition, saveExportDefinition, listTables, getTable |
| `FormsEditorApi` | FormsEditorPage | listForms, createForm, getForm, editForm, deleteForm, createTable, getTable, editTable, deleteTable |

## Types

### Data Types

All data interfaces use a `Data` suffix. TypeScript's structural typing means NSwag-generated types automatically satisfy these interfaces when shapes match.

| Type | Description |
|---|---|
| `ItemViewData` | Full item detail (actions, metadata, status, events, notes) |
| `ItemInfoData` | Item search result row |
| `ItemEventData` | Audit event record |
| `ItemNoteResultData` | Note display data |
| `ItemNoteEditData` | Note submission payload |
| `ItemEditData` | Item edit payload (action + metadata) |
| `FormRenderData` | Form controls + schemas for rendering |
| `FormConfigData` | Layout config (layoutMode, navigationStyle, public, published) |
| `FormInfoData` | Form listing info |
| `FormDefinitionEditData` | Form creation/editing payload |
| `FormUploadData` | File upload result |
| `TableDefinitionEditData` | Table definition payload |
| `ExportDefinitionEditData` | Export definition payload |
| `ExportColumnData` | Column mapping for exports |
| `ExportDefinitionGroupData` | Export definitions grouped by table |

### Constants

```ts
import { WorkflowActions, WorkflowStatuses, AuditEventTypes, FormLayoutMode, PageNavigationStyle } from "@astroapps/forms-app";

WorkflowActions.Submit    // "Submit"
WorkflowStatuses.Draft    // "Draft"
AuditEventTypes.Note      // "Note"
FormLayoutMode.MultiPage  // 1
PageNavigationStyle.Tabs  // 2
```

### UI Components Interface

Consumers provide UI primitives via `FormsAppUIComponents`:

```ts
interface FormsAppUIComponents {
  useDialog: () => DialogHook;
  useConfirmDialog: () => ConfirmDialogHook;
  Button: ComponentType<{ onClick: () => void; children: ReactNode; ... }>;
  Textfield: ComponentType<{ control: Control<string>; label?: string; ... }>;
  CircularProgress: ComponentType<{}>;
}
```

### Navigation

```ts
type NavigationIntent =
  | { type: "viewItem"; itemId: string }
  | { type: "editItem"; itemId: string }
  | { type: "dashboard" }
  | { type: "exportDashboard" }
  | { type: "exportCreate" }
  | { type: "exportEdit"; definitionId: string }
  | { type: "custom"; data: any };
```

### File Operations

```ts
interface FileOperations {
  downloadFile: (file: { id: string }) => Promise<void>;
  uploadFile: (file: File) => Promise<FormUploadData>;
  deleteFile: (file: { id: string }) => Promise<void>;
}
```

## Consumer Migration Pattern

After migration, each Next.js page becomes a thin wrapper:

```tsx
"use client";
import { ItemViewPage } from "@astroapps/forms-app";

export default function AdminItemView() {
  const itemClient = useApiClient(ItemClient);
  const formClient = useApiClient(FormClient);
  const itemId = useParam("id");

  return (
    <ItemViewPage
      itemId={itemId}
      api={{
        getItemView: (id) => itemClient.getItemView(id),
        performAction: (id, action) => itemClient.performAction(id, action),
        addItemNote: (id, note) => itemClient.addItemNote(id, note),
        getFormForRender: (formId) => formClient.getFormForRender(formId),
      }}
    />
  );
}
```