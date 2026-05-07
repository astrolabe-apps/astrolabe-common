---
name: react-typed-forms-schemas
description: Schema-driven form generation on @react-typed-forms/core. Use buildSchema to define forms, use renderers for automatic UI generation. Use when generating forms from C# schemas or building dynamic configurable forms.
---

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

```tsx
import { useControl } from "@react-typed-forms/core";
import {
  buildSchema,
  createFormRenderer,
  createFormTree,
  createSchemaDataNode,
  createSchemaTree,
  defaultValueForFields,
  FormRenderer,
  intField,
  RenderForm,
  stringField,
  useControlDefinitionForSchema,
} from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";

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

// 3. Create renderer (Tailwind-based, lives in @react-typed-forms/schemas-html)
const renderer: FormRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);

// 4. Build the schema tree once at module scope
const schemaTree = createSchemaTree(simpleSchema);

// 5. Use in component
export default function SimpleSchemasExample() {
  const data = useControl<SimpleForm>(() => defaultValueForFields(simpleSchema));

  // Auto-generate a GroupedControlsDefinition from the schema (one Data control per field)
  const controlDefinition = useControlDefinitionForSchema(simpleSchema);
  const formTree = useMemo(
    () => createFormTree([controlDefinition]),
    [controlDefinition],
  );

  return (
    <div className="container my-4 max-w-2xl">
      <RenderForm
        data={createSchemaDataNode(schemaTree.rootNode, data)}
        form={formTree.rootNode}
        renderer={renderer}
      />
      <pre>{JSON.stringify(data.value, null, 2)}</pre>
    </div>
  );
}
```

> **Note:** The legacy `renderControl(definition, control, { fields, renderer, hooks })` function and the `defaultFormEditHooks` export no longer exist. Rendering now goes through the `<RenderForm>` React component (or `<RenderFormNode>` if you have a pre-built `FormStateNode`). Internally `RenderForm` builds the `FormStateNode` for you from `data` (a `SchemaDataNode`) and `form` (a `FormNode`).

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

### Custom Renderers

Use `createDataRenderer` (or the matching `createGroupRenderer`, `createDisplayRenderer`, `createActionRenderer`, `createAdornmentRenderer`, `createLayoutRenderer`) to register a custom renderer keyed on `schemaType`, `renderType`, or a `match(node, renderOptions)` predicate. The render function receives `(props, renderers)` — labels, visibility, and validation are handled by the surrounding layout pipeline, not by the renderer.

```tsx
import { TextField } from "@mui/material";
import {
  createDataRenderer,
  createFormRenderer,
  DataRendererProps,
  FieldType,
} from "@react-typed-forms/schemas";
import { createDefaultRenderers, defaultTailwindTheme }
  from "@react-typed-forms/schemas-html";

const muiTextFieldRenderer = createDataRenderer(
  (props: DataRendererProps) => (
    <TextField
      fullWidth
      required={props.required}
      value={props.control.value ?? ""}
      onChange={(e) => props.control.setValue(e.target.value)}
      error={!!props.control.error}
      helperText={props.control.error}
    />
  ),
  { schemaType: FieldType.String, renderType: "Standard" },
);

const muiRenderer = createFormRenderer(
  [muiTextFieldRenderer],
  createDefaultRenderers(defaultTailwindTheme),
);
```

Pin to a specific `renderOptions.type` (e.g. `renderType: "Switch"` for a custom toggle) by setting it on the schema's render options or in the form JSON. See the [appforms-bootstrap](../appforms-bootstrap/SKILL.md) skill for the full renderer wiring.

### Consuming C# Generated Schemas

```tsx
import { useControl } from "@react-typed-forms/core";
import {
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  defaultValueForFields,
  RenderForm,
  useControlDefinitionForSchema,
} from "@react-typed-forms/schemas";
import { SchemaMap } from "./schemas"; // generated by SchemaFieldsGenerator

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  role: string;
}

const schemaLookup = createSchemaLookup(SchemaMap);
const userProfileTree = schemaLookup.getSchema("UserProfile")!;
const userProfileFields = SchemaMap.UserProfile;

function UserProfileForm() {
  const data = useControl<UserProfile>(() =>
    defaultValueForFields(userProfileFields),
  );
  const controlDefinition = useControlDefinitionForSchema(userProfileFields);
  const formTree = useMemo(
    () => createFormTree([controlDefinition]),
    [controlDefinition],
  );

  return (
    <RenderForm
      data={createSchemaDataNode(userProfileTree, data)}
      form={formTree.rootNode}
      renderer={myRenderer}
    />
  );
}
```

> When you generated `schemas.ts` via `SchemaFieldsGenerator`, the `SchemaMap` constant contains a `SchemaField[]` for each registered C# type. `createSchemaLookup(SchemaMap).getSchema(name)` returns the `SchemaNode` to root your form on; `SchemaMap[name]` gives the raw `SchemaField[]` for `defaultValueForFields` and `useControlDefinitionForSchema`.

### Custom Control Definitions (Layout)

Use the `dataControl` / `groupedControl` builder helpers — they're tagged with the right `type` discriminants (`"Data"` / `"Group"`, capitalised) and play nicely with TypeScript without casts.

```tsx
import {
  buildSchema,
  createFormTree,
  createSchemaDataNode,
  createSchemaTree,
  dataControl,
  defaultValueForFields,
  groupedControl,
  intField,
  RenderForm,
  stringField,
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

const employeeSchemaTree = createSchemaTree(employeeSchema);

const customLayout = groupedControl(
  [
    groupedControl(
      [dataControl("firstName"), dataControl("lastName"), dataControl("email")],
      "Personal Information",
    ),
    groupedControl(
      [dataControl("department"), dataControl("salary")],
      "Employment Information",
    ),
  ],
  "Employee Information",
);

const employeeFormTree = createFormTree([customLayout]);

function EmployeeFormView() {
  const data = useControl<EmployeeForm>(() =>
    defaultValueForFields(employeeSchema),
  );
  return (
    <RenderForm
      data={createSchemaDataNode(employeeSchemaTree.rootNode, data)}
      form={employeeFormTree.rootNode}
      renderer={myRenderer}
    />
  );
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
- **Solution**: `useControlDefinitionForSchema(fields)` produces a `GroupedControlsDefinition` that wires schema-level validators (`required`, regex, etc.) into the rendered controls — feed it through `createFormTree` and `<RenderForm>`.

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
