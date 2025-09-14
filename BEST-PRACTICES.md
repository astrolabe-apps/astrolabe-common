# Development Guidelines

## DTO Naming Conventions

When creating Data Transfer Objects (DTOs) for the REST APIs, follow this standardized naming schema:

### Naming Pattern

- **{Entity}Edit** - Used for POST and PUT operations
  - Contains editable fields that can be modified by the client
  - Used for creating new entities and updating existing ones
  - Example: `GroupEdit`, `UserEdit`, `FormDefinitionEdit`

- **{Entity}Info** - Used for GET operations in lists
  - Contains summary/basic information suitable for list views
  - Lightweight objects for performance in collection responses
  - Example: `GroupInfo`, `UserInfo`, `FormDefinitionInfo`

- **{Entity}View** - Used for GET operations for full entity details
  - Contains complete read-only data including computed/derived fields
  - Should extend {Entity}Edit to include all editable fields plus additional read-only data
  - Example: `GroupView`, `UserView`, `FormDefinitionView`

### Implementation Guidelines

```csharp
// Example implementation
public class GroupEdit
{
    public string Name { get; set; }
    public Guid? ParentId { get; set; }
    public int OrderIndex { get; set; }
}

public class GroupInfo
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public int OrderIndex { get; set; }
}

public class GroupView : GroupEdit
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public GroupInfo? Parent { get; set; }
    public List<GroupInfo> Children { get; set; } = new();
}
```

### Usage in Controllers

- **POST /api/{entities}** - Accept `{Entity}Edit` as request body
- **PUT /api/{entities}/{id}** - Accept `{Entity}Edit` as request body  
- **GET /api/{entities}** - Return `List<{Entity}Info>`
- **GET /api/{entities}/{id}** - Return `{Entity}View`

This convention ensures consistency across the API and makes the purpose of each DTO clear to developers.

## Frontend Development Guidelines

### AppForms Usage

**Recommendation**: Pages containing editable controls should be implemented using AppForms when possible.

AppForms is the preferred way to create UI forms in the astrolabe applications. It uses a code generation approach with FormBuilder pattern.

#### Implementation Steps:
1. Create the form class (see Form Class Structure below)
2. Add the form definition to `Forms/AppForms.cs`
3. Use the generated form components in your Next.js pages

#### Form Class Structure:

**Preferred Approach**: Create a specific "Form" class with a property containing the "Edit" class:
```csharp
public class GroupEditorForm
{
    public GroupEdit Group { get; set; } = new();
    public List<UserInfo> AvailableUsers { get; set; } = new();
    public List<UserInfo> AssignedUsers { get; set; } = new();
}
```

**Simple Approach**: Only use when there really is no other data needed for the form:
```csharp
// Directly use GroupEdit if no additional form data is needed
```

#### Form Definition Pattern:
```csharp
// In AppForms.cs
Form<GroupEditorForm>("GroupEditorForm", "Group Editor", "Admin")
```

#### When AppForms is Recommended:
- ✅ Pages with editable form fields
- ✅ Create/Edit dialogs and pages
- ✅ Settings and configuration pages
- ✅ User input forms
- ✅ Dashboard pages

#### When AppForms May Not Be Needed:
- Simple read-only display pages
- Basic navigation pages
- Pages with only buttons/links (no form inputs)

This approach helps maintain consistency across the application and leverages the code generation benefits of the AppForms system.

### State Management with useControl

**Recommendation**: Use `useControl` from `@react-typed-forms/core` instead of `useState` for component state management.

This project uses a typed forms library that provides superior state management through `useControl`:

#### Why useControl over useState:
- ✅ **Type safety** - Full TypeScript integration with compile-time type checking
- ✅ **Deep object handling** - Automatically handles nested object updates without manual spreading
- ✅ **Form validation** - Built-in integration with validation libraries
- ✅ **Performance** - Optimized re-rendering and change detection
- ✅ **Developer experience** - Access to `.fields` for nested properties, `.value` for current state

#### Basic Usage Pattern:
```typescript
import { useControl } from "@react-typed-forms/core";

// Instead of useState
const [user, setUser] = useState({ name: "", email: "" });

// Use useControl
const user = useControl({ name: "", email: "" });

// Access and update values
console.log(user.value); // { name: "", email: "" }
user.fields.name.value = "John"; // Type-safe field access
user.value = { name: "John", email: "john@example.com" }; // Full object update
```

#### Real-world Examples from Codebase:
```typescript
// Form data management
const createData = useControl<Partial<ItemCreateFormForm>>({});
const itemData = useControl<any>({});
const editFullItem = useControl<FullItem>();

// List management
const formList = useControl<FormInfo[]>([]);
const actions = useControl<WorkflowAction[]>([WorkflowAction.Submit]);

// Complex objects
const dashboardForm = useControl<AdminItemDashboardForm>({
  searchTerm: "",
  status: "all"
});
```

#### Control Effects:
Use `useControlEffect` for reacting to control value changes:
```typescript
import { useControlEffect } from "@react-typed-forms/core";

useControlEffect(
  () => itemId.value, // Watch this value
  (v) => {           // React to changes
    if (!v) return;
    loadFormData(v);
  },
  true // Run on mount
);
```

#### When to Use Each Approach:
- ✅ **useControl** - For form data, complex objects, arrays, any data that needs validation
- ✅ **useState** - Only for simple primitive values that don't need validation (rare in this codebase)

### Component Architecture

**Recommendation**: Follow the established patterns for component structure and organization.

#### Page Component Structure:
```typescript
"use client";
import { useControl, useControlEffect } from "@react-typed-forms/core";
import { useApiClient } from "@astroapps/client";

export default function MyPage() {
  const client = useApiClient(MyClient);
  const formData = useControl<MyFormType>();
  
  // Load data effects
  useControlEffect(() => /* dependencies */, /* effect */, true);
  
  // Render logic
  return (
    <div>
      {/* Component content */}
    </div>
  );
  
  // Helper functions at bottom
  async function loadData() {
    // Implementation
  }
}
```

#### Client API Integration:
```typescript
// Always use useApiClient hook
const client = useApiClient(ItemClient);
const formClient = useApiClient(FormClient);

// API calls in async functions
async function loadFormData(id: string) {
  const result = await client.getFullItem(id);
  editFullItem.setInitialValue(result);
}
```

### Routing and Navigation

**Recommendation**: Use the established routing patterns with typed routes and navigation services.

#### Route Configuration:
```typescript
// Define routes in routes.tsx
export const appRoutes: Record<string, RouteData<AppRouteData>> = {
  dashboard: {
    label: "Dashboard",
    navLink: "main",
    icon: <i className="fa-solid fa-dashboard" />
  },
  "admin/edit": {
    label: "Admin Edit",
    noNav: true, // Hide from navigation
  }
};
```

#### Route Helper Functions:
```typescript
// Create URL helper functions
export function itemEditUrl(id: string) {
  return `/edit?id=${id}`;
}

export function adminItemViewUrl(id: string) {
  return `/admin/view?id=${id}`;
}
```

#### Query Parameter Handling:
```typescript
import { useQueryControl, useSyncParam, makeOptStringParam } from "@astroapps/client";

// In component
const queryControl = useQueryControl();
const itemId = useSyncParam(queryControl, "id", makeOptStringParam());
const formType = useSyncParam(
  queryControl, 
  "formType", 
  makeOptStringParam(),
  createData.fields.formType // Optional: sync with control
);
```

### Authentication and Security

**Recommendation**: Follow the established MSAL authentication patterns.

#### Layout Integration:
```typescript
// Wrap root layout with MSAL context
export default wrapWithMsalContext(
  RootLayout,
  new PublicClientApplication(msalConfig)
);

// Use security services
const security = useMsalSecurityService({
  getUserData: async (fetch) => {
    const roles: string[] = [];
    return { roles };
  }
});
```

#### Route Security:
```typescript
// Add security properties to routes
export type AppRouteData = PageSecurity & NavLinkRouteData & {
  roles?: string[];
  noLayout?: boolean;
  allowGuests?: boolean;
};

// Use page security hook
const busy = usePageSecurity();
if (busy) return <CircularProgress />;
```

### Styling and UI

**Recommendation**: Use the established Tailwind CSS patterns and component structure.

#### CSS Framework Stack:
- **Tailwind CSS** - Primary utility-first CSS framework
- **Flowbite** - Component library integration
- **FontAwesome** - Icon library (classes like `fa-solid fa-user-shield`)

#### Component Styling Patterns:
```typescript
// Use cn utility for conditional classes
import { cn } from "@astroapps/client";

<div className={cn("h-full flex flex-col", hasSidebar && "md:ml-64")}>
```

#### Layout Structure:
```typescript
// Standard layout pattern
return (
  <div className="h-dvh min-h-screen">
    {hasSidebar && <Sidebar />}
    <div className={cn("h-full flex flex-col", hasSidebar && "md:ml-64")}>
      <Header hasSidebar={hasSidebar} />
      <main className="container mx-auto flex-grow">{children}</main>
      <Footer />
    </div>
  </div>
);
```

### Data Loading and Effects

**Recommendation**: Use the established patterns for data loading and side effects.

#### Data Loading Pattern:
```typescript
// Use useEffect for initial loading
useEffect(() => {
  loadForms();
}, []);

// Use useControlEffect for reactive loading
useControlEffect(
  () => itemId.value,
  (v) => {
    if (!v) return;
    loadFormData(v);
  },
  true
);

// Async loading functions
async function loadForms() {
  formList.value = await formClient.listForms(undefined, undefined);
}
```

#### Loading States:
```typescript
import { RenderOptional } from "@react-typed-forms/core";

return (
  <RenderOptional control={editFullItem} notDefined={<CircularProgress />}>
    {(c) => {
      return (
        <div>
          {/* Render when data is loaded */}
        </div>
      );
    }}
  </RenderOptional>
);
```

### Error Handling

**Recommendation**: Use try-catch blocks for API calls and let the global error handler manage responses.

```typescript
async function doAction(action?: WorkflowAction | null) {
  try {
    await client.editItem(itemId.value!, {
      metadata: metadata.value,
      action: action ?? null,
    });
  } catch (e) {
    console.error(e);
    // Global error handler will manage user-facing errors
  }
}
```

## API Development Guidelines

### Audit Events

**Important**: All API endpoints that perform write operations (POST, PUT, DELETE) should create appropriate AuditEvents.

This includes:
- Entity creation
- Entity updates  
- Entity deletion
- Relationship changes (assignments, removals)

Ensure audit events capture the necessary context for compliance and debugging purposes.

### Entity Framework Configuration

**Preference**: Use data annotations for Entity Framework configuration instead of fluent API configuration.

Use these essential annotations:
- Primary keys: `[Key]`
- Required fields: `[Required]`
- String lengths: `[MaxLength(200)]`
- Indexes: `[Index(nameof(Property1), nameof(Property2), IsUnique = true)]`
- Composite keys: `[Key, Column(Order = 0)]`

Avoid unnecessary annotations like `[Table]` and `[InverseProperty]` - let EF Core use conventions.

### Service Layer Guidelines

**Preference**: Do not create interfaces for services unless there will be multiple implementations.

Services should be implemented as concrete classes and injected directly:
- ✅ `public class GroupService` with direct injection
- ❌ `public interface IGroupService` with single implementation

Only create service interfaces when:
- Multiple implementations are expected (e.g., different data providers)
- Mock testing requires interface abstraction
- Plugin architecture demands interface contracts

This reduces unnecessary abstraction and keeps the codebase simpler.

### Method Naming Guidelines

**Preference**: Do not add "Async" suffix to method names, even for async methods.

Method names should be clean and descriptive without implementation details:
- ✅ `public async Task<GroupView> GetGroupById(Guid id)`
- ❌ `public async Task<GroupView> GetGroupByIdAsync(Guid id)`

The `async Task<T>` return type already indicates the method is asynchronous. Adding "Async" to the name is redundant and clutters the API.

### Validation Guidelines

**Preference**: Use FluentValidation for complex business rule validation instead of manual exception throwing.

FluentValidation provides a clean, declarative approach to validation:

#### Implementation Pattern:
```csharp
public class GroupEditValidator : AbstractValidator<GroupEdit>
{
    private readonly AppDbContext _context;
    private readonly Guid? _excludeId;

    public GroupEditValidator(AppDbContext context, Guid? excludeId = null)
    {
        _context = context;
        _excludeId = excludeId;

        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Group name is required.")
            .MaximumLength(200)
            .WithMessage("Group name cannot exceed 200 characters.")
            .MustAsync(BeUniqueNameInParent)
            .WithMessage("A group with this name already exists in the same parent group.");
    }

    private async Task<bool> BeUniqueNameInParent(GroupEdit groupEdit, string name, CancellationToken cancellationToken)
    {
        // Database validation logic here
        return await SomeAsyncValidation();
    }
}
```

#### Service Usage:
```csharp
public async Task<GroupView> CreateGroup(GroupEdit groupEdit)
{
    // Instantiate validator directly - no factory needed for simple cases
    var validator = new GroupEditValidator(_context);
    await validator.ValidateAndThrowAsync(groupEdit);
    
    // Continue with business logic...
}
```

#### When to Use FluentValidation:
- ✅ Complex business rule validation
- ✅ Database-dependent validation (async rules)
- ✅ Multiple validation rules per property
- ✅ Context-dependent validation (create vs update)
- ✅ When you need structured error responses

#### When NOT to Use FluentValidation:
- Simple null checks or basic validation (use data annotations)
- One-time business logic constraints (manual validation is fine)
- Performance-critical paths where instantiation overhead matters

The existing `ExceptionHandler` automatically converts FluentValidation exceptions to proper HTTP 400 responses with detailed error information.

### Controller Error Handling Guidelines

**Preference**: Throw exceptions instead of returning ActionResult status codes in controllers.

The project has a centralized `ExceptionHandler` that automatically converts exceptions to appropriate HTTP responses. Controllers should focus on business logic and throw exceptions for error cases.

#### Available Exceptions:
```csharp
// From <BaseNamespace>.Exceptions namespace
- NotFoundException → 404 Not Found
- ForbiddenException → 403 Forbidden  
- NotAllowedException → For authorization failures
- ValidationException (FluentValidation) → 400 Bad Request with validation errors
- InvalidOperationException → Use for business logic violations (returns 409 Conflict when appropriate)
```

#### Controller Implementation Pattern:

**✅ DO - Throw exceptions for errors:**
```csharp
[HttpGet("{id}")]
public async Task<GroupView> GetGroup(Guid id)
{
    var group = await _groupService.GetGroupById(id);
    if (group == null)
    {
        throw new NotFoundException($"Group with ID {id} not found.");
    }
    return group;
}

[HttpPost]
public async Task<GroupView> CreateGroup(GroupEdit groupEdit)
{
    // Validation exceptions are thrown by FluentValidation automatically
    return await _groupService.CreateGroup(groupEdit);
}

[HttpDelete("{id}")]
public async Task DeleteGroup(Guid id)
{
    // Service throws NotFoundException if not found
    // Service throws InvalidOperationException for business rule violations
    await _groupService.DeleteGroup(id);
}
```

**❌ DON'T - Return ActionResult status codes:**
```csharp
[HttpGet("{id}")]
public async Task<ActionResult<GroupView>> GetGroup(Guid id)
{
    var group = await _groupService.GetGroupById(id);
    if (group == null)
    {
        return NotFound($"Group with ID {id} not found."); // Don't do this
    }
    return Ok(group); // Don't wrap in Ok()
}
```

#### Benefits:
- **Cleaner controller code** - No ActionResult boilerplate
- **Consistent error handling** - All errors handled in one place
- **Better separation of concerns** - Controllers focus on orchestration, not HTTP
- **Type safety** - Return types are clear without ActionResult wrapper
- **Testability** - Easier to unit test without HTTP concerns

#### Service Layer Pattern:
Services should also throw appropriate exceptions rather than returning null or bool:
```csharp
public async Task<GroupView> GetGroupById(Guid id)
{
    var group = await _context.Groups.FindAsync(id);
    NotFoundException.ThrowIfNull(group); // Helper method available
    return MapToGroupView(group);
}
```

The `ExceptionHandler` will automatically convert these exceptions to the appropriate HTTP responses with proper status codes and error formatting.

## Control Styling with Class Properties

**Important**: Every control has three distinct class properties for proper styling separation.

Each control in the astrolabe-schemas system supports three class properties that serve different purposes:

### **Class Property Types:**

```typescript
// Control styling structure
interface ControlStyling {
  layoutClass: string;    // Overall layout and positioning of the control container
  labelClass: string;     // Styling for the title/label text
  styleClass: string;     // Styling for the actual control element (input, button, etc.)
}
```

### **Usage Examples:**

```typescript
// Text input with proper styling
dataControl("email", "Email Address", {
  required: true,
  layoutClass: "mb-4",                              // Container spacing
  labelClass: "text-sm font-medium text-gray-700 mb-1 block", // Label styling
  styleClass: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500", // Input styling
  ...textfieldOptions({
    placeholder: "Enter your email address",
  }),
});

// Action button with layout control
actionControl("Save", "saveAction", {
  layoutClass: "flex justify-end mt-4",             // Right-aligned button container
  styleClass: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors",
});

// Read-only display with status styling
dataControl("status", "Current Status", {
  readonly: true,
  layoutClass: "mb-2",                              // Container spacing
  labelClass: "text-xs font-medium text-gray-600 mb-1 block", // Small label
  styleClass: "text-sm bg-gray-50 px-3 py-2 rounded-md border font-mono", // Display styling
});

// Grouped controls with container styling
groupedControl([
  // ... child controls
], "User Information", {
  styleClass: "bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4", // Group container styling
});
```

### **Best Practices for Control Styling:**

1. **Separation of Concerns**: Use each class property for its intended purpose
   - `layoutClass`: Flexbox, grid, margins, positioning
   - `labelClass`: Typography, colors, spacing for labels
   - `styleClass`: Input appearance, buttons, borders, backgrounds

2. **Consistent Spacing**: Use systematic spacing classes
   ```typescript
   layoutClass: "mb-3"        // Standard field spacing
   layoutClass: "mb-4"        // Section spacing
   labelClass: "mb-1 block"   // Standard label spacing
   ```

3. **Accessibility Considerations**:
   ```typescript
   // Hide labels when not needed (e.g., in data tables)
   labelClass: "sr-only"
   
   // Proper label structure for form fields
   labelClass: "text-sm font-medium text-gray-700 mb-1 block"
   ```

4. **Dynamic Styling**: Combine with dynamic properties for conditional styling
   ```typescript
   dataControl("status", "Status", {
     styleClass: "px-2 py-1 rounded text-sm",
     dynamic: [
       {
         type: "StyleClass",
         expr: jsonataExpr("success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"),
       }
     ],
   });
   ```

5. **Responsive Design**: Use responsive Tailwind classes
   ```typescript
   layoutClass: "mb-4 md:mb-6"              // Responsive spacing
   styleClass: "w-full md:w-1/2 lg:w-1/3"  // Responsive width
   ```

### **Common Styling Patterns:**

```typescript
// Form section headers
groupedControl(controls, "📊 Section Title", {
  styleClass: "bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 shadow-sm",
});

// Command/action areas
groupedControl(controls, "🤖 Actions", {
  styleClass: "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4",
});

// Status/info displays
groupedControl(controls, "📋 Information", {
  styleClass: "bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4",
});

// Warning/error sections
groupedControl(controls, "⚠️ Warnings", {
  styleClass: "bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4",
});
```

### **❌ Common Mistakes to Avoid:**

```typescript
// DON'T mix concerns
styleClass: "mb-4 text-sm bg-blue-500"  // ❌ Layout + styling mixed

// DO separate properly  
layoutClass: "mb-4"                      // ✅ Layout
styleClass: "text-sm bg-blue-500"       // ✅ Styling

// DON'T use wrong property names
className: "px-4 py-2"                   // ❌ Wrong property name

// DO use correct property names
styleClass: "px-4 py-2"                  // ✅ Correct property
```

## Control Definition System

The framework uses a comprehensive control definition system defined in `forms/core/src/controlDefinition.ts` that provides a structured way to define form controls and their behaviors.

### Core Control Types

**Control Definition Types:**
- `DataControlDefinition` - Form input controls (text fields, dropdowns, checkboxes, etc.)
- `GroupedControlsDefinition` - Container controls that group other controls
- `ActionControlDefinition` - Interactive buttons and action triggers
- `DisplayControlDefinition` - Read-only display elements (text, icons, HTML)

**Type Safety Pattern:**
```typescript
export type AnyControlDefinition =
  | DataControlDefinition
  | GroupedControlsDefinition
  | ActionControlDefinition
  | DisplayControlDefinition;
```

### Data Control Rendering

**Render Options System:**
Data controls use a render options pattern to specify how they should be displayed:

```typescript
interface DataControlDefinition extends ControlDefinition {
  type: ControlDefinitionType.Data;
  field: string;                    // Field name for data binding
  renderOptions?: RenderOptions;    // Rendering configuration
  validators?: SchemaValidator[];   // Validation rules
  defaultValue?: any;              // Default field value
}
```

**Common Render Types:**
- `Standard` - Default renderer based on field type
- `Textfield` - Text input with optional multiline support
- `Dropdown` - Select dropdown with options
- `Radio` - Radio button group
- `Checkbox` - Checkbox input
- `DateTime` - Date/time picker with format options
- `Autocomplete` - Type-ahead search input
- `Array` - Dynamic array editor with add/remove capabilities
- `DisplayOnly` - Read-only field display

### Group Control Rendering

**Group Render Types:**
- `Standard` - Basic container
- `Grid` - CSS Grid layout with configurable columns
- `Flex` - Flexbox layout with direction and gap options
- `Tabs` - Tabbed interface
- `Dialog` - Modal dialog container
- `Accordion` - Collapsible sections
- `Wizard` - Step-by-step navigation

**Group Options Pattern:**
```typescript
interface GroupRenderOptions {
  type: string;
  hideTitle?: boolean;
  childStyleClass?: string;
  childLayoutClass?: string;
  displayOnly?: boolean;
}
```

### Dynamic Properties

Controls support dynamic behavior through expressions:

```typescript
interface DynamicProperty {
  type: string;           // Property type (Visible, DefaultValue, etc.)
  expr: EntityExpression; // Expression for dynamic evaluation
}
```

**Dynamic Property Types:**
- `Visible` - Show/hide based on conditions
- `DefaultValue` - Dynamic default values
- `Readonly` - Conditional read-only state
- `Disabled` - Conditional disabled state
- `AllowedOptions` - Dynamic option filtering
- `Label` - Dynamic label text

### Control Adornments

Adornments add auxiliary functionality to controls:

**Adornment Types:**
- `Tooltip` - Contextual help text
- `HelpText` - Extended help information
- `Icon` - Visual indicators (FontAwesome, Material, CSS classes)
- `Accordion` - Collapsible wrapper
- `SetField` - Automatic field value setting
- `Optional` - Null value handling

**Icon Integration:**
```typescript
interface IconReference {
  library: string; // FontAwesome, Material, CssClass
  name: string;    // Icon identifier
}
```

### Form Manipulation Utilities

**Key Utility Functions:**
```typescript
// Type guards
isDataControl(c: ControlDefinition): c is DataControlDefinition
isGroupControl(c: ControlDefinition): c is GroupedControlsDefinition
isActionControl(c: ControlDefinition): c is ActionControlDefinition

// Renderer type guards
isGridRenderer(options: GroupRenderOptions): options is GridRendererOptions
isTextfieldRenderer(options: RenderOptions): options is TextfieldRenderOptions
isArrayRenderer(options: RenderOptions): options is ArrayRenderOptions

// State utilities
isControlReadonly(c: ControlDefinition): boolean
isControlDisabled(c: ControlDefinition): boolean
isControlDisplayOnly(def: ControlDefinition): boolean
```

### Schema Path Navigation

The system provides utilities for navigating control hierarchies:

```typescript
// Get JSON path for data binding
getJsonPath(dataNode: SchemaDataNode): (string | number)[]

// Get schema field hierarchy
getSchemaPath(schemaNode: SchemaNode): SchemaField[]

// Traverse parent relationships
traverseParents<A, B>(current: B, get: (b: B) => A, until?: (b: B) => boolean): A[]
```

### Working with Control Definitions

**When Creating Controls:**
1. Always specify the correct `ControlDefinitionType`
2. Use appropriate render options for the desired UI behavior
3. Add validators for data controls that require validation
4. Consider using adornments for enhanced UX
5. Use dynamic properties for conditional behavior

**When Manipulating Forms:**
1. Use type guards to safely cast control definitions
2. Preserve existing structure when making modifications
3. Update both the control definition and any related schema fields
4. Consider the impact on data binding when changing field names

**Integration Points:**
- Control definitions are rendered by `RenderForm` components
- Schema fields provide type information for control generation
- Form state is managed through @react-typed-forms
- Validation is integrated with the schema validator system

This control definition system enables the creation of sophisticated, type-safe forms with rich interaction patterns while maintaining consistency across the framework.

## AbstractWorkflowExecutor Pattern

**Recommendation**: Use AbstractWorkflowExecutor for implementing CRUD operations on entities that require workflow states, audit events, bulk operations, or authorization checks.

For detailed implementation guidance, see [AbstractWorkflowExecutor Guide](./AbstractWorkflowExecutor-Guide.md).