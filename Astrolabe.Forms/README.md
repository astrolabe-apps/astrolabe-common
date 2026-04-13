# Astrolabe.Forms

A reusable, schema-driven forms platform library for .NET. Provides the full item/submission lifecycle — form/table definition management, workflow state machine, search/indexing, CSV export, audit trail, file attachments, and person tracking — without hardcoding any EF entity classes.

## Installation

Add a project reference to `Astrolabe.Forms`. EF Core is a direct dependency; no separate EF companion package is needed.

Key dependencies: `Microsoft.EntityFrameworkCore`, `Astrolabe.Workflow`, `Astrolabe.Schemas`, `Astrolabe.SearchState`, `Astrolabe.EF.Search`, `Astrolabe.Schemas.ExportCsv`, `Astrolabe.FileStorage`.

## Quick Start

### 1. Implement the Entity Interfaces

Your EF Core entities implement the 10 library interfaces. Navigation properties use generic type parameters so you can use **implicit** implementation — this is what enables EF Core LINQ translation through interface members.

```csharp
public class Item : IItem<Person, FormData, ItemTag, ItemNote>
{
    public Guid Id { get; set; }
    public Guid PersonId { get; set; }
    public string Status { get; set; }
    // ...
    public Person Person { get; set; }        // Implicit implementation — EF translates correctly
    public FormData FormData { get; set; }
    public ICollection<ItemTag> Tags { get; set; }
    public ICollection<ItemNote> Notes { get; set; }
}
```

### 2. Subclass FormsContext

All 10 type parameters are declared once. Provide your `DbContext` and override extension points as needed.

```csharp
public class AppFormsContext : FormsContext<
    Item, FormData, Person, FormDefinition, TableDefinition,
    AuditEvent, ItemTag, ItemNote, ItemFile, ExportDefinition>
{
    private readonly AppDbContext _db;
    protected override DbContext DbContext => _db;

    public AppFormsContext(AppDbContext db) => _db = db;

    public override Task<FormsUser> ResolveUser(ClaimsPrincipal claims) { /* ... */ }

    // Optional overrides
    public override List<FormRule> FormRules => _myRules.AllRules;
    public override WorkflowRuleList<string, IItemWorkflowContext> WorkflowRules => MyWorkflowRules.Rules;
}
```

### 3. Register and Use

```csharp
// DI registration
services.AddScoped<AppFormsContext>();

// Map API endpoints (minimal APIs)
app.MapFormsEndpoints<AppFormsContext>();
```

## Entity Interfaces

The library defines 10 interfaces. Six have generic navigation properties (for EF Core LINQ translation), four are scalar-only.

### With Navigation Properties

| Interface | Purpose | Navigation Properties |
|---|---|---|
| `IItem<TPerson, TFormData, TItemTag, TItemNote>` | Form submission record | Person, FormData, Tags, Notes |
| `IFormData<TPerson, TFormDef>` | Form data storage (JSON metadata) | Creator, Definition |
| `IFormDefinition<TTableDef>` | Form schema definition | Table |
| `IItemNote<TPerson>` | Comments/notes on items | Person |
| `IAuditEvent<TPerson>` | Audit log entries | Person |
| `IExportDefinition<TTableDef>` | CSV export definitions | TableDefinition |

### Without Navigation Properties

| Interface | Purpose |
|---|---|
| `IPerson` | User/creator entity (Id, name, email, roles, ExternalId) |
| `ITableDefinition` | Table schema for export/validation (JSON fields) |
| `IItemTag` | Searchable tags on items |
| `IItemFile` | File attachments |

## FormsContext API

The core abstraction is `FormsContext<...>`, an abstract partial class split across files by domain area. All methods operate directly on `DbSet<T>` — no repository abstractions.

### Items (`FormsContext.Items.cs`)

| Method | Description |
|---|---|
| `SearchItems(options, includeTotal, userId)` | Search user's own items |
| `SearchItemsAdmin(options, includeTotal)` | Search all items (admin) |
| `GetItemView(id, userId, roles)` | Full item detail with audit events |
| `GetUserItem(id, userId, roles)` | User view (public notes only) |
| `CreateItem(formType, edit, userId, roles)` | Create a new item |
| `EditItem(id, edit, userId, roles)` | Update an existing item |
| `NewItem(formType, userId, roles)` | Initialize a new form (returns defaults) |
| `PerformActions(actions, id, userId, roles, ...)` | Execute workflow actions |
| `AddItemNote(itemId, message, isInternal, userId)` | Add a comment to an item |
| `DeleteItem(id)` | Delete an item |
| `GetFilterOptions()` | Get available filter values for search UI |
| `GetExportableItemIds(options)` | Get item IDs eligible for export |

### Form Definitions (`FormsContext.FormDefinitions.cs`)

| Method | Description |
|---|---|
| `ListForms(forPublic?, published?)` | List form definitions with optional filters |
| `GetFormAndSchemas(formId)` | Get form controls + schemas for rendering |
| `GetFormDefinition(formId)` | Get raw form definition entity |
| `DeleteForm(id)` | Delete a form definition |

### Table Definitions (`FormsContext.TableDefinitions.cs`)

| Method | Description |
|---|---|
| `ListTables()` | List all table definitions |
| `GetTable(tableId)` | Get table definition for editing |
| `DeleteTable(tableId)` | Delete a table definition |

### Export (`FormsContext.Export.cs`, `FormsContext.ExportDefinitions.cs`)

| Method | Description |
|---|---|
| `ListExportDefinitions()` | List export definitions grouped by table |
| `GetExportDefinition(id?)` | Get export definition for editing |
| `CreateOrUpdateExportDefinition(edit)` | Create or update an export definition |
| `DeleteExportDefinition(id)` | Delete an export definition |
| `GetCsvText(columns, itemIds, tableId, userId, roles)` | Generate CSV content |
| `GetExportDefinitionOfForms(formItemIds)` | Get applicable exports for items |

### Auth (`FormsContext.Auth.cs`)

| Method | Description |
|---|---|
| `ResolveUser(ClaimsPrincipal)` | Abstract — map auth claims to FormsUser |
| `GetOrCreatePerson(externalId, firstName, lastName, email?)` | Upsert a person record |

### Files (`FormsContext.Files.cs`)

| Method | Description |
|---|---|
| `UploadFile(personId, itemId?, stream, fileName)` | Upload a file attachment |
| `DeleteFile(personId, itemId?, fileId)` | Soft-delete a file |
| `DownloadFile(personId, itemId?, fileId)` | Download a file |

## API Endpoints

Call `app.MapFormsEndpoints<TFormsContext>()` to register all minimal API routes:

| Route | Method | Description |
|---|---|---|
| `/api/form` | GET | List forms |
| `/api/form/{formId}/forRender` | GET | Get form for rendering (anonymous) |
| `/api/form/{formId}` | DELETE | Delete form |
| `/api/table` | GET | List tables |
| `/api/table/{tableId}` | GET | Get table |
| `/api/table/{tableId}` | DELETE | Delete table |
| `/api/item/search` | POST | Search user's items |
| `/api/item/searchadmin` | POST | Search all items |
| `/api/item/filterOptions` | GET | Get filter options |
| `/api/item/admin/{id}` | GET | Get full item view |
| `/api/item/{id}` | GET | Get user item view |
| `/api/item/{formType}` | POST | Create item |
| `/api/item/{id}` | PUT | Edit item |
| `/api/item/{id}` | DELETE | Delete item |
| `/api/item/new/{formType}` | GET | Initialize new item |
| `/api/item/{id}/action` | PUT | Perform workflow action |
| `/api/item/note/{itemId}` | POST | Add note |
| `/api/itemfile/file` | POST | Upload file |
| `/api/itemfile/file/{fileId}` | DELETE | Delete file |
| `/api/itemfile/file/{fileId}` | GET | Download file |
| `/api/export/definition` | GET | List export definitions |
| `/api/export/definition` | POST | Save export definition |
| `/api/export/definition/{id}` | GET/DELETE | Get/delete export definition |
| `/api/export/definition/ids` | POST | Get exports for item IDs |
| `/api/export` | POST | Export CSV |

## Workflow

### Status Constants

```csharp
WorkflowStatuses.NotStarted  // "NotStarted"
WorkflowStatuses.Draft        // "Draft"
WorkflowStatuses.Submitted    // "Submitted"
WorkflowStatuses.Approved     // "Approved"
WorkflowStatuses.Rejected     // "Rejected"
```

### Action Constants

```csharp
WorkflowActions.Submit        // "Submit"
WorkflowActions.Approve       // "Approve"
WorkflowActions.Reject        // "Reject"
WorkflowActions.Export        // "Export"
WorkflowActions.ForceReindex  // "ForceReindex"
```

### Default Workflow Rules

The library provides sensible defaults. Override `WorkflowRules` on your FormsContext to customize.

```csharp
// Default rules
Submit  → allowed when status is Draft
Approve → allowed when status is Submitted
Reject  → allowed when status is Submitted

// Custom rules example
public override WorkflowRuleList<string, IItemWorkflowContext> WorkflowRules => new([
    WorkflowActions.Submit.WhenStatus(WorkflowStatuses.Draft),
    WorkflowActions.Approve.WhenStatusAndRoles(WorkflowStatuses.Submitted, ["Admin"]),
    WorkflowActions.Reject.WhenStatusAndRoles(WorkflowStatuses.Submitted, ["Admin"]),
    WorkflowActions.Export.WhenStatusNot(WorkflowStatuses.Draft).AndHasRole("Admin"),
]);
```

### Item Actions

Actions are dispatched through `PerformActions()`. The library provides four built-in action types via the `ItemAction` interface:

| Action | Purpose |
|---|---|
| `SimpleWorkflowAction(action)` | Trigger a workflow status transition |
| `EditMetadataAction(editFunc, addEvent)` | Transform form data with optional audit |
| `LoadMetadataAction` | Load form data without editing |
| `ExportCsvAction(exportFunc, addEvent)` | Run a CSV export |

Define custom actions by implementing `ItemAction` and overriding `HandleUnknownAction` or `PerformAction` on your FormsContext.

## Extension Points

| Override | Purpose |
|---|---|
| `FormRules` | Custom form rule logic (metadata transforms, person sync, indexing) |
| `WorkflowRules` | Workflow transition rules with status/role conditions |
| `ItemFilterer(field)` | Custom search filter implementations |
| `ItemSorts(field, getter)` | Custom sort column implementations |
| `FileStorage` | File storage provider (IFileStorage) |
| `GetFormConfig(formDef)` | Form configuration extraction |
| `PerformAction(context, action)` | Full action dispatch override |
| `HandleUnknownAction(context, action)` | Handle custom action types |
| `ApplyItemChanges(context)` | Custom post-action persistence logic |

## Data Types

Key DTOs used by the API:

| Type | Usage |
|---|---|
| `ItemView` | Full item detail response (actions, metadata, events, notes) |
| `ItemInfo` | Item search result (id, name, status, dates) |
| `ItemEdit` | Item create/edit request (action + metadata JSON) |
| `FormInfo` | Form listing (id, name, folder) |
| `FormAndSchemas` | Form rendering data (controls, config, schemas) |
| `ExportDefinitionGroup` | Export definitions grouped by table |
| `ExportDefinitionEdit` | Export definition CRUD payload |
| `TableDefinitionEdit` | Table definition CRUD payload |
| `FormUpload` | File upload response |
| `ItemNoteEdit` | Note submission payload |

## EF Core Interface Translation

This library relies on EF Core 3.0+ translating LINQ expressions through generic interface constraints ([dotnet/efcore#16759](https://github.com/dotnet/efcore/issues/16759)). This works for **implicit** implementations — which the generic type parameters on entity interfaces ensure. Explicit interface implementations will not translate correctly ([dotnet/efcore#20920](https://github.com/dotnet/efcore/issues/20920)).