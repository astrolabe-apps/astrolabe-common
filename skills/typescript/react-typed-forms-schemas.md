# @react-typed-forms/schemas - Schema-Driven Form Generation

## Overview

@react-typed-forms/schemas is a TypeScript/React library that provides schema-driven form generation on top of @react-typed-forms/core. Define forms using JSON-compatible schemas and automatically render UI for data entry.

**When to use**: Use this library when you want to generate forms automatically from schema definitions, especially when working with schemas generated from C# (Astrolabe.Schemas) or when you need highly dynamic, configurable forms.

**Package**: `@react-typed-forms/schemas`
**Dependencies**: @react-typed-forms/core, React 18+
**C# Counterpart**: Astrolabe.Schemas
**Published to**: npm

## Key Concepts

### 1. SchemaField

JSON objects describing form fields including type, validation, display name, and options. Can be defined in C# and consumed in TypeScript.

### 2. ControlDefinition

JSON objects describing what should be rendered in the UI. Types include:
- **DataControlDefinition**: Edits a field value
- **GroupedControlsDefinition**: Groups multiple controls
- **DisplayControlDefinition**: Shows readonly content
- **ActionControlDefinition**: Renders action buttons

### 3. FormRenderer

Pluggable rendering system that determines how controls are displayed. Supports multiple frameworks (Tailwind, Material-UI, React Native).

### 4. buildSchema

Type-safe helper for defining schemas from TypeScript interfaces, ensuring consistency between data types and schemas.

## Common Patterns

### Basic Schema-Driven Form

```typescript
import { useControl } from "@react-typed-forms/core";
import {
  buildSchema,
  createDefaultRenderers,
  createFormRenderer,
  defaultFormEditHooks,
  defaultTailwindTheme,
  defaultValueForFields,
  FormRenderer,
  intField,
  renderControl,
  stringField,
  useControlDefinitionForSchema,
} from "@react-typed-forms/schemas";

// 1. Define your form interface
interface SimpleForm {
  firstName: string;
  lastName: string;
  yearOfBirth: number;
}

// 2. Build schema with display names and validation
const simpleSchema = buildSchema<SimpleForm>({
  firstName: stringField("First Name"),
  lastName: stringField("Last Name", { required: true }),
  yearOfBirth: intField("Year of birth", { defaultValue: 1980 }),
});

// 3. Create renderer (Tailwind-based)
const renderer: FormRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);

// 4. Use in component
export default function SimpleSchemasExample() {
  // Create form state with default values from schema
  const data = useControl<SimpleForm>(() =>
    defaultValueForFields(simpleSchema),
  );

  // Generate control definition from schema
  const controlDefinition = useControlDefinitionForSchema(simpleSchema);

  return (
    <div className="container my-4 max-w-2xl">
      {/* Render the form */}
      {renderControl(controlDefinition, data, {
        fields: simpleSchema,
        renderer,
        hooks: defaultFormEditHooks,
      })}

      {/* Show current values */}
      <pre>{JSON.stringify(data.value, null, 2)}</pre>
    </div>
  );
}
```

### Field Types and Options

```typescript
import {
  stringField,
  intField,
  doubleField,
  boolField,
  dateField,
  dateTimeField,
  compoundField,
  buildSchema,
} from "@react-typed-forms/schemas";

interface UserForm {
  // String field
  username: string;

  // String with validation
  email: string;

  // String with options (dropdown)
  role: string;

  // Number fields
  age: number;
  salary: number;

  // Boolean
  active: boolean;

  // Dates
  dateOfBirth: string; // yyyy-MM-dd
  lastLogin: string; // ISO8601

  // Nested object
  address: {
    street: string;
    city: string;
  };
}

const userSchema = buildSchema<UserForm>({
  username: stringField("Username", {
    required: true,
    minLength: 3,
    maxLength: 20,
  }),

  email: stringField("Email Address", {
    required: true,
    pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
    validationMessage: "Please enter a valid email",
  }),

  role: stringField("Role", {
    required: true,
    options: [
      { name: "Administrator", value: "admin" },
      { name: "User", value: "user" },
      { name: "Guest", value: "guest" },
    ],
  }),

  age: intField("Age", {
    min: 18,
    max: 120,
    defaultValue: 18,
  }),

  salary: doubleField("Salary", {
    min: 0,
  }),

  active: boolField("Active", {
    defaultValue: true,
  }),

  dateOfBirth: dateField("Date of Birth", {
    required: true,
  }),

  lastLogin: dateTimeField("Last Login"),

  address: compoundField("Address", {
    street: stringField("Street"),
    city: stringField("City"),
  }),
});
```

### Custom Renderers for Different UI Frameworks

```typescript
import {
  createFormRenderer,
  createDefaultRenderers,
  DataRendererRegistration,
  FieldType,
  DataRenderType,
} from "@react-typed-forms/schemas";

// Material-UI TextField renderer
import { TextField } from "@mui/material";

const muiTextFieldRenderer: DataRendererRegistration = {
  type: "data",
  schemaType: FieldType.String,
  renderType: DataRenderType.Standard,
  render: (props, makeLabel, { renderVisibility }) => {
    const { title, required } = makeLabel();

    return renderVisibility(
      props.visible,
      <TextField
        fullWidth
        required={required}
        label={title}
        value={props.control.value ?? ""}
        onChange={(e) => props.control.setValue(e.target.value)}
        error={!!props.control.error}
        helperText={props.control.error}
      />,
    );
  },
};

// Create renderer with custom MUI renderer
const muiRenderer = createFormRenderer(
  [muiTextFieldRenderer],
  createDefaultRenderers(defaultTailwindTheme),
);
```

### Consuming C# Generated Schemas

```typescript
import { useControl } from "@react-typed-forms/core";
import { renderControl, useControlDefinitionForSchema } from "@react-typed-forms/schemas";
import userProfileSchema from "./schemas/userProfile.json";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  role: string;
}

function UserProfileForm() {
  // Use schema from C# Astrolabe.Schemas
  const data = useControl<UserProfile>(() =>
    defaultValueForFields(userProfileSchema),
  );

  const controlDefinition = useControlDefinitionForSchema(userProfileSchema);

  return (
    <div>
      {renderControl(controlDefinition, data, {
        fields: userProfileSchema,
        renderer: myRenderer,
      })}
    </div>
  );
}
```

### Custom Control Definitions (Layout)

```typescript
import {
  buildSchema,
  stringField,
  intField,
  GroupedControlsDefinition,
  DataControlDefinition,
} from "@react-typed-forms/schemas";

interface EmployeeForm {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  salary: number;
}

const employeeSchema = buildSchema<EmployeeForm>({
  firstName: stringField("First Name", { required: true }),
  lastName: stringField("Last Name", { required: true }),
  email: stringField("Email", { required: true }),
  department: stringField("Department"),
  salary: intField("Salary"),
});

// Custom layout with groups
const customLayout: GroupedControlsDefinition = {
  type: "group",
  title: "Employee Information",
  children: [
    // Personal info group
    {
      type: "group",
      title: "Personal Information",
      children: [
        { type: "data", field: "firstName" } as DataControlDefinition,
        { type: "data", field: "lastName" } as DataControlDefinition,
        { type: "data", field: "email" } as DataControlDefinition,
      ],
    },
    // Employment info group
    {
      type: "group",
      title: "Employment Information",
      children: [
        { type: "data", field: "department" } as DataControlDefinition,
        { type: "data", field: "salary" } as DataControlDefinition,
      ],
    },
  ],
};

function EmployeeForm() {
  const data = useControl<EmployeeForm>(defaultValueForFields(employeeSchema));

  return renderControl(customLayout, data, {
    fields: employeeSchema,
    renderer: myRenderer,
  });
}
```

### Collections (Arrays)

```typescript
import { buildSchema, stringField, intField } from "@react-typed-forms/schemas";

interface ProjectForm {
  name: string;
  tags: string[];
  teamMembers: TeamMember[];
}

interface TeamMember {
  name: string;
  role: string;
}

const projectSchema = buildSchema<ProjectForm>({
  name: stringField("Project Name", { required: true }),

  // Simple array of strings
  tags: {
    type: "collection",
    field: "tags",
    displayName: "Tags",
    children: stringField("Tag", { field: "tag" }),
  },

  // Array of objects
  teamMembers: {
    type: "collection",
    field: "teamMembers",
    displayName: "Team Members",
    children: {
      type: "compound",
      children: buildSchema<TeamMember>({
        name: stringField("Name", { required: true }),
        role: stringField("Role"),
      }),
    },
  },
});
```

### Display and Action Controls

```typescript
import {
  GroupedControlsDefinition,
  DisplayControlDefinition,
  ActionControlDefinition,
} from "@react-typed-forms/schemas";

const formWithActionsAndDisplay: GroupedControlsDefinition = {
  type: "group",
  children: [
    // Display control (readonly)
    {
      type: "display",
      displayType: "text",
      content: "Please fill out the form below:",
    } as DisplayControlDefinition,

    // Data controls...
    { type: "data", field: "name" },
    { type: "data", field: "email" },

    // Action button
    {
      type: "action",
      actionId: "save",
      label: "Save Draft",
    } as ActionControlDefinition,

    {
      type: "action",
      actionId: "submit",
      label: "Submit",
    } as ActionControlDefinition,
  ],
};

// Handle actions in component
function FormWithActions() {
  const data = useControl<MyForm>(defaultValue);

  const handleAction = (actionId: string) => {
    if (actionId === "save") {
      saveDraft(data.value);
    } else if (actionId === "submit") {
      submitForm(data.value);
    }
  };

  return renderControl(formWithActionsAndDisplay, data, {
    fields: mySchema,
    renderer: myRenderer,
    hooks: {
      ...defaultFormEditHooks,
      onAction: handleAction,
    },
  });
}
```

## Best Practices

### 1. Generate Schemas from C# When Possible

```typescript
// ✅ DO - Use C# generated schemas for consistency
import userSchema from "./schemas/userProfile.json";

// ❌ DON'T - Manually maintain parallel schemas
const userSchema = buildSchema<UserProfile>({
  // Duplicating C# definitions...
});
```

### 2. Use buildSchema for Type Safety

```typescript
// ✅ DO - Use buildSchema with TypeScript interface
const schema = buildSchema<MyForm>({
  field1: stringField("Field 1"),
  field2: intField("Field 2"),
});

// ❌ DON'T - Create raw schema objects (loses type safety)
const schema = {
  field1: { type: "String", displayName: "Field 1" }, // Typo won't be caught
};
```

### 3. Provide Clear Display Names

```typescript
// ✅ DO - User-friendly display names
firstName: stringField("First Name")
dateOfBirth: dateField("Date of Birth")

// ❌ DON'T - Technical names
firstName: stringField("firstName")
dateOfBirth: dateField("DOB")
```

### 4. Set Default Values for Better UX

```typescript
// ✅ DO - Provide sensible defaults
yearOfBirth: intField("Year of Birth", { defaultValue: 2000 })
country: stringField("Country", { defaultValue: "United States" })

// ⚠️ CAUTION - Empty defaults can be confusing
yearOfBirth: intField("Year of Birth") // Defaults to 0
```

## Troubleshooting

### Common Issues

**Issue: Schema field not rendering**
- **Cause**: Field name mismatch between schema and interface
- **Solution**: Ensure field names in `buildSchema` exactly match TypeScript interface property names

**Issue: Custom renderer not being used**
- **Cause**: Renderer registration order or matching conditions
- **Solution**: Put custom renderers first in the array passed to `createFormRenderer`

**Issue: Validation not working from schema**
- **Cause**: Validation defined in schema but not connected to control
- **Solution**: Use `useControlDefinitionForSchema` which automatically applies schema validation

**Issue: Default values not applying**
- **Cause**: Not using `defaultValueForFields`
- **Solution**: Use `defaultValueForFields(schema)` to generate default value object

**Issue: Collections not adding/removing items**
- **Cause**: Missing renderer for array operations
- **Solution**: Ensure your renderer has an `ArrayRendererRegistration` or use default renderers

**Issue: TypeScript errors with schema definition**
- **Cause**: Schema definition doesn't match interface structure
- **Solution**: Use `buildSchema<YourInterface>` and let TypeScript catch mismatches

## Package Information

- **Package**: `@react-typed-forms/schemas`
- **Path**: `schemas/`
- **Published to**: npm
- **GitHub**: https://github.com/doolse/react-typed-forms

## Related Documentation

- [react-typed-forms-core](./react-typed-forms-core.md) - Core form state management
- [react-typed-forms-mui](./react-typed-forms-mui.md) - Material-UI renderers
- [Astrolabe.Schemas](../dotnet/astrolabe-schemas.md) - C# schema generation
- [astrolabe-ui](./astrolabe-ui.md) - Radix UI-based renderers
