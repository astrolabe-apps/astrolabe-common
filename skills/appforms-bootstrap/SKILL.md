---
name: appforms-bootstrap
description: Guide for bootstrapping AppForms in a C#/TypeScript project with Astrolabe.Schemas code generation, @react-typed-forms/schemas for rendering, and the visual form editor.
---

# AppForms Bootstrap Guide

## Overview

AppForms is a schema-driven form system that bridges C# backend types with TypeScript/React frontend forms. It provides:

- **Type-safe forms**: C# types automatically generate TypeScript schemas
- **Visual form designer**: Drag-and-drop editor for building form layouts
- **Runtime rendering**: Render forms from JSON control definitions
- **Tailwind styling**: Built-in support for Tailwind CSS theming

## Prerequisites

### NuGet Packages (C#)

```xml
<PackageReference Include="Astrolabe.Schemas" Version="*" />
```

### npm Packages

```bash
npm install @react-typed-forms/core @react-typed-forms/schemas @react-typed-forms/schemas-html @astroapps/schemas-datepicker
# For the form editor:
npm install @astroapps/schemas-editor flexlayout-react
```

---

## Project Structure

```
MyProject.Api/
├── Forms/
│   ├── AppForms.cs               # Form definitions
│   └── MyForm.cs                 # Form classes
├── Controllers/
│   └── FormsController.cs        # Schema/form endpoints
└── ClientApp/
    ├── package.json
    └── src/
        ├── schemas.ts            # Generated schemas
        ├── formDefs.ts           # Generated form module
        ├── formDefs/             # Form JSON files
        │   └── MyForm.json
        ├── renderer.tsx          # Form renderer setup
        ├── AppForm.tsx           # Main form component
        └── components/           # Reusable form components
```

---

## C# Backend Setup

### Step 1: Create Form Classes

Forms define the data structure for your UI. Use the **preferred pattern** with a dedicated Form class:

```csharp
// Forms/UserEditorForm.cs
public class UserEditorForm
{
    public UserEdit User { get; set; } = new();
    public List<RoleInfo> AvailableRoles { get; set; } = new();
    public List<DepartmentInfo> Departments { get; set; } = new();
}

// Your Edit DTO (for create/update operations)
public class UserEdit
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Guid? RoleId { get; set; }
    public Guid? DepartmentId { get; set; }
}

// Info DTOs (for dropdowns/lookups)
public record RoleInfo(Guid Id, string Name);
public record DepartmentInfo(Guid Id, string Name);
```

**Simple pattern** (only when no additional form data needed):

```csharp
public record SimpleSearchForm(string Query, int Page, int PageSize);
```

### Step 2: Create AppForms.cs

Register all forms in a central `AppForms` class:

```csharp
// Forms/AppForms.cs
using Astrolabe.Schemas.CodeGen;

public class AppForms : FormBuilder<FormConfig?>
{
    public static readonly FormDefinition<FormConfig?>[] Forms =
    [
        Form<UserEditorForm>("UserEditor", "User Editor", null),
        Form<SimpleSearchForm>("SimpleSearch", "Simple Search", null),
        // Add more forms here
    ];
}

// Optional: Custom config for grouping/styling
public record FormConfig(string? Style = null, string? Group = null);
```

### Step 3: Create FormsController

Expose endpoints for schema generation and form management:

```csharp
// Controllers/FormsController.cs
using System.Text.Json;
using Astrolabe.CodeGen.Typescript;
using Astrolabe.Schemas;
using Astrolabe.Schemas.CodeGen;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class FormsController : ControllerBase
{
    private const string FormDefDir = "ClientApp/src/formDefs";

    private static readonly JsonSerializerOptions Indented = new(FormDataJson.Options)
    {
        WriteIndented = true
    };

    /// <summary>
    /// Generate TypeScript schema definitions from C# types
    /// </summary>
    [HttpGet("Schemas")]
    public string GetSchemas()
    {
        var schemaTypes = AppForms.Forms.Select(x => x.GetSchema());
        var gen = new SchemaFieldsGenerator(
            new SchemaFieldsGeneratorOptions("./client")
        );
        var allGenSchemas = gen.CollectDataForTypes(schemaTypes.ToArray()).ToList();
        var file = TsFile.FromDeclarations(
            GeneratedSchema.ToDeclarations(allGenSchemas, "SchemaMap").ToList()
        );
        return file.ToSource();
    }

    /// <summary>
    /// Generate TypeScript form module with all form definitions
    /// </summary>
    [HttpGet("Forms")]
    public async Task<string> GetForms([FromServices] IHostEnvironment hostEnvironment)
    {
        // Create empty JSON files for new forms
        foreach (var appForm in AppForms.Forms)
        {
            var jsonFile = Path.Join(
                hostEnvironment.ContentRootPath,
                FormDefDir,
                appForm.Value + ".json"
            );
            if (!System.IO.File.Exists(jsonFile))
            {
                await System.IO.File.WriteAllTextAsync(
                    jsonFile,
                    JsonSerializer.Serialize(
                        new { Controls = Enumerable.Empty<object>(), Config = new { } },
                        Indented
                    )
                );
            }
        }

        return FormDefinition
            .GenerateFormModule("FormDefinitions", AppForms.Forms, "./schemas", "./formDefs/")
            .ToSource();
    }

    /// <summary>
    /// Get form control definition JSON for editor
    /// </summary>
    [HttpGet("ControlDefinition/{id}")]
    public async Task<IActionResult> GetControlDefinition(
        string id,
        [FromServices] IHostEnvironment hostEnvironment)
    {
        var path = Path.Join(hostEnvironment.ContentRootPath, FormDefDir, $"{id}.json");
        if (!System.IO.File.Exists(path))
        {
            return NotFound();
        }
        var content = await System.IO.File.ReadAllTextAsync(path);
        return Content(content, "application/json");
    }

    /// <summary>
    /// Save form control definition JSON from editor
    /// </summary>
    [HttpPut("ControlDefinition/{id}")]
    public async Task EditControlDefinition(
        string id,
        JsonElement formData,
        [FromServices] IHostEnvironment hostEnvironment)
    {
        var path = Path.Join(hostEnvironment.ContentRootPath, FormDefDir, $"{id}.json");
        await System.IO.File.WriteAllTextAsync(
            path,
            JsonSerializer.Serialize(formData, Indented)
        );
    }
}
```

---

## TypeScript Setup

### Step 1: Generate Schemas

Add generation script to `package.json`:

```json
{
  "devDependencies": {
    "http-request-cli": "^0.2.0",
    "prettier": "^3.2.5"
  },
  "scripts": {
    "gencode": "h get http://localhost:5000/api/forms/Schemas > src/schemas.ts && h get http://localhost:5000/api/forms/Forms > src/formDefs.ts && prettier -w src/schemas.ts src/formDefs.ts"
  }
}
```

Run with the API server running:
```bash
npm run gencode
```

### Step 2: Create Form Renderer

```tsx
// src/renderer.tsx
import {
  createFormRenderer,
  createDefaultRenderers,
  defaultTailwindTheme,
  DefaultRendererOptions,
  createDataRenderer,
  deepMerge,
} from "@react-typed-forms/schemas-html";
import { createDatePickerRenderer } from "@astroapps/schemas-datepicker";

// Custom Switch renderer example
const SwitchRenderer = createDataRenderer(
  (props) => {
    const { control } = props;
    return (
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={control.value ?? false}
          onChange={() => control.setValue((x) => !x)}
          className="sr-only peer"
          disabled={control.disabled}
        />
        <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
      </label>
    );
  },
  { renderType: "Switch" }
);

// Default render options
const DefaultRenderOptions: DefaultRendererOptions = deepMerge(
  {
    label: {
      requiredElement: ({ Span }) => <Span className="text-red-500">*</Span>,
    },
    data: {
      inputClass: "border border-gray-300 rounded px-3 py-2 w-full",
      selectOptions: { className: "border border-gray-300 rounded px-3 py-2" },
    },
    group: {
      grid: { defaultColumns: 1 },
      defaultFlexGap: "1em",
    },
  },
  defaultTailwindTheme
);

export const formRenderer = createFormRenderer(
  [
    SwitchRenderer,
    createDatePickerRenderer("border border-gray-300 rounded px-3 py-2"),
  ],
  createDefaultRenderers(DefaultRenderOptions)
);
```

### Step 3: Create AppForm Component

```tsx
// src/AppForm.tsx
import { useMemo } from "react";
import { Control } from "@react-typed-forms/core";
import {
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  FormRenderer,
  RenderForm,
} from "@react-typed-forms/schemas";
import { FormDefinitions } from "./formDefs";
import { SchemaMap } from "./schemas";
import { formRenderer } from "./renderer";

export type FormType = keyof typeof FormDefinitions;

export const schemaLookup = createSchemaLookup(SchemaMap);

interface AppFormProps<T> {
  formType: FormType;
  data: Control<T>;
  renderer?: FormRenderer;
}

export function AppForm<T>({ formType, data, renderer }: AppFormProps<T>) {
  const formDef = FormDefinitions[formType];
  const formTree = useMemo(() => createFormTree(formDef.controls), [formDef]);
  const schemaTree = schemaLookup.getSchemaTree(formDef.schemaName);

  return (
    <RenderForm
      data={createSchemaDataNode(schemaTree.rootNode, data)}
      form={formTree.rootNode}
      renderer={renderer ?? formRenderer}
    />
  );
}
```

### Step 4: Create Feature Components

```tsx
// src/components/ContactPage.tsx
import { useControl } from "@react-typed-forms/core";
import { defaultValueForFields } from "@react-typed-forms/schemas";
import { AppForm } from "../AppForm";
import { FormDefinitions } from "../formDefs";

export function ContactPage() {
  const formDef = FormDefinitions.Contact;
  const data = useControl(() => defaultValueForFields(formDef.schema));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{formDef.name}</h1>
      <AppForm formType="Contact" data={data} />
    </div>
  );
}
```

---

## Form Editor Setup

```tsx
// src/editor.tsx
import { BasicFormEditor, readOnlySchemas } from "@react-typed-forms/schemas-editor";
import { FormDefinitions } from "./formDefs";
import { SchemaMap } from "./schemas";
import { formRenderer } from "./renderer";
import { FormType } from "./AppForm";
import "flexlayout-react/style/light.css";

export function FormEditor() {
  return (
    <div className="h-screen w-full">
      <BasicFormEditor<FormType>
        formTypes={Object.values(FormDefinitions).map((x) => ({
          name: x.name,
          id: x.value,
          folder: x.defaultConfig?.group,
        }))}
        loadForm={async (formType) => FormDefinitions[formType]}
        loadSchema={readOnlySchemas(SchemaMap)}
        saveForm={async (controls, formType, config, fields) => {
          await fetch(`/api/forms/ControlDefinition/${formType}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ controls, config, fields }),
          });
        }}
        formRenderer={formRenderer}
      />
    </div>
  );
}
```

### Configure Tailwind for Editor

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@react-typed-forms/schemas-html/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@react-typed-forms/schemas-editor/**/*.{js,ts,jsx,tsx}",
  ],
  // ... rest of config
};
```

---

## Complete Working Example

### 1. C# Form Class

```csharp
// Forms/ContactForm.cs
public class ContactForm
{
    public ContactEdit Contact { get; set; } = new();
    public List<CountryInfo> Countries { get; set; } = new();
}

public class ContactEdit
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string? Phone { get; set; }
    public string? CountryCode { get; set; }

    [MaxLength(500)]
    public string? Message { get; set; }
}

public record CountryInfo(string Code, string Name);
```

### 2. Register in AppForms

```csharp
public static readonly FormDefinition<FormConfig?>[] Forms =
[
    Form<ContactForm>("Contact", "Contact Form", null),
];
```

### 3. Generate Schemas

```bash
npm run gencode
```

### 4. Create Form JSON

The first time you call the Forms endpoint, an empty `Contact.json` will be created. Use the editor to design the form layout, or create it manually:

```json
{
  "controls": [
    {
      "type": "Data",
      "field": "contact/name",
      "title": "Name"
    },
    {
      "type": "Data",
      "field": "contact/email",
      "title": "Email"
    },
    {
      "type": "Data",
      "field": "contact/phone",
      "title": "Phone"
    },
    {
      "type": "Data",
      "field": "contact/countryCode",
      "title": "Country",
      "renderOptions": { "type": "Select" }
    },
    {
      "type": "Data",
      "field": "contact/message",
      "title": "Message",
      "renderOptions": { "type": "Textarea" }
    }
  ],
  "config": {},
  "fields": []
}
```

---

## Troubleshooting

### Schema Type Mismatches

**Problem**: TypeScript errors about missing properties

**Solution**: Regenerate schemas after changing C# types:
```bash
npm run gencode
```

### Missing Form JSON Files

**Problem**: Form not loading in editor

**Solution**: Ensure the form JSON file exists. Call `GET /api/forms/Forms` to auto-create missing files.

### Editor Not Loading Forms

**Problem**: Editor shows blank or errors when loading form

**Solution**:
1. Check browser console for errors
2. Verify `loadForm` returns correct structure
3. Ensure schema name matches generated `SchemaMap` keys

### Tailwind Classes Not Applying

**Problem**: Form renders but unstyled

**Solution**:
1. Verify Tailwind config includes schema package paths
2. Check that CSS is imported in your layout
3. Ensure `defaultTailwindTheme` is passed to `createDefaultRenderers`

---

## Best Practices

### 1. Use the Preferred Form Pattern

```csharp
// DO - Dedicated form class with Edit + lookup data
public class UserEditorForm
{
    public UserEdit User { get; set; } = new();
    public List<RoleInfo> AvailableRoles { get; set; } = new();
}

// DON'T - Using Edit class directly (loses lookup data)
Form<UserEdit>("UserEditor", "User Editor", null)
```

### 2. Organize Forms by Feature

```csharp
public static readonly FormDefinition<FormConfig?>[] Forms =
[
    Form<UserListForm>("UserList", "User List", new FormConfig(Group: "Users")),
    Form<UserEditorForm>("UserEditor", "User Editor", new FormConfig(Group: "Users")),
    Form<RoleListForm>("RoleList", "Role List", new FormConfig(Group: "Admin")),
];
```

### 3. Version Control Form JSON

Always commit your form JSON files to version control. They define your UI layout and should be reviewed like code.

### 4. Regenerate After Schema Changes

Create a pre-commit hook or CI step to ensure schemas are up-to-date:

```bash
npm run gencode
git diff --exit-code src/schemas.ts src/formDefs.ts
```