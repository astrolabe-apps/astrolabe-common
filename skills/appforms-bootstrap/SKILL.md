---
name: appforms-bootstrap
description: Guide for bootstrapping AppForms in a C#/TypeScript project with Astrolabe.Schemas code generation, @react-typed-forms/schemas for rendering, and the visual form editor. Use when setting up schema-driven forms with Next.js.
---

# AppForms Bootstrap Guide

## Overview

AppForms is a schema-driven form system that bridges C# backend types with TypeScript/React frontend forms. It provides:

- **Type-safe forms**: C# types automatically generate TypeScript schemas
- **Visual form designer**: Drag-and-drop editor for building form layouts
- **Runtime rendering**: Render forms from JSON control definitions
- **Tailwind styling**: Built-in support for Tailwind CSS theming

**When to use**: Use this guide when bootstrapping a new project that needs schema-driven forms with a C# backend and Next.js frontend.

## Prerequisites

### NuGet Packages (C#)

```xml
<PackageReference Include="Astrolabe.Schemas" Version="*" />
```

### npm Packages (TypeScript)

```bash
npm install @react-typed-forms/core @react-typed-forms/schemas @react-typed-forms/schemas-html
# For the form editor:
npm install @react-typed-forms/schemas-editor flexlayout-react
```

### Project Structure

```
MyProject/
├── MyProject.Api/                    # C# ASP.NET Core API
│   ├── Forms/
│   │   ├── AppForms.cs               # Form definitions
│   │   └── MyForm.cs                 # Form class
│   └── Controllers/
│       └── FormsController.cs        # Schema/form endpoints
│
└── ClientApp/                        # Next.js App Router
    ├── src/
    │   ├── app/
    │   │   ├── forms/[formId]/page.tsx
    │   │   └── editor/page.tsx
    │   ├── forms/                    # Form JSON files
    │   │   └── MyForm.json
    │   ├── generated/
    │   │   ├── schemas.ts            # Generated schemas
    │   │   └── forms.ts              # Generated form module
    │   └── lib/
    │       └── formRenderer.ts
    └── package.json
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
    private const string FormDefDir = "ClientApp/src/forms";

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
            .GenerateFormModule("FormDefinitions", AppForms.Forms, "./schemas", "./forms/")
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

## TypeScript Frontend Setup

### Step 1: Generate Schemas

Create a script to fetch generated TypeScript from the API:

```bash
# scripts/generate-schemas.sh
#!/bin/bash
API_URL="${API_URL:-http://localhost:5000}"

mkdir -p src/generated

curl -s "$API_URL/api/forms/Schemas" > src/generated/schemas.ts
curl -s "$API_URL/api/forms/Forms" > src/generated/forms.ts

echo "Schemas generated successfully"
```

Add to `package.json`:

```json
{
  "scripts": {
    "generate:schemas": "./scripts/generate-schemas.sh"
  }
}
```

### Step 2: Create Form Renderer

```typescript
// src/lib/formRenderer.ts
import {
  createFormRenderer,
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";

export const formRenderer = createFormRenderer(
  [], // Custom renderers (empty for defaults)
  createDefaultRenderers(defaultTailwindTheme)
);
```

### Step 3: Create Form Rendering Page

```typescript
// src/app/forms/[formId]/page.tsx
"use client";

import { useControl } from "@react-typed-forms/core";
import {
  RenderForm,
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  defaultValueForFields,
} from "@react-typed-forms/schemas";
import { formRenderer } from "@/lib/formRenderer";
import { FormDefinitions, SchemaMap } from "@/generated/schemas";
import { useParams } from "next/navigation";
import { useMemo } from "react";

export default function FormPage() {
  const params = useParams();
  const formId = params.formId as string;

  // Find the form definition
  const formDef = FormDefinitions.find((f) => f.value === formId);

  if (!formDef) {
    return <div>Form not found: {formId}</div>;
  }

  // Create schema lookup and tree
  const schemaLookup = useMemo(
    () => createSchemaLookup(SchemaMap),
    []
  );
  const schemaTree = schemaLookup.getSchemaTree(formDef.schemaName);
  const formTree = useMemo(
    () => createFormTree(formDef.controls),
    [formDef]
  );

  // Initialize form data with defaults
  const data = useControl(() => defaultValueForFields(formDef.schema));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{formDef.name}</h1>

      <RenderForm
        data={createSchemaDataNode(schemaTree.rootNode, data)}
        form={formTree.rootNode}
        renderer={formRenderer}
      />

      {/* Debug: Show current form values */}
      <pre className="mt-4 p-4 bg-gray-100 rounded">
        {JSON.stringify(data.value, null, 2)}
      </pre>
    </div>
  );
}
```

---

## Form Editor Setup

### Step 1: Create Editor Page

```typescript
// src/app/editor/page.tsx
"use client";

import { BasicFormEditor, FormLoader, SchemaLoader } from "@react-typed-forms/schemas-editor";
import { formRenderer } from "@/lib/formRenderer";
import { FormDefinitions, SchemaMap } from "@/generated/schemas";
import { useMemo, useRef } from "react";

// Import editor CSS
import "flexlayout-react/style/light.css";

export default function EditorPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Form types for the editor sidebar
  const formTypes = useMemo(
    () =>
      FormDefinitions.map((f) => ({
        value: f.value,
        name: f.name,
        group: f.config?.group,
      })),
    []
  );

  // Load form definition from API
  const loadForm: FormLoader = async (formId) => {
    const formDef = FormDefinitions.find((f) => f.value === formId);
    if (!formDef) throw new Error(`Form not found: ${formId}`);

    // Fetch latest controls from API
    const response = await fetch(`/api/forms/ControlDefinition/${formId}`);
    const formJson = await response.json();

    return {
      controls: formJson.controls ?? formJson.Controls ?? [],
      schemaName: formDef.schemaName,
      config: formJson.config ?? formJson.Config ?? null,
      formFields: formJson.fields ?? formJson.Fields ?? [],
      configSchema: undefined,
    };
  };

  // Load schema for a form
  const loadSchema: SchemaLoader = async (schemaName) => {
    const schema = SchemaMap[schemaName as keyof typeof SchemaMap];
    if (!schema) throw new Error(`Schema not found: ${schemaName}`);
    return schema;
  };

  // Save form to API
  const saveForm = async (
    controls: any[],
    formId: string,
    config: any,
    formFields: any[]
  ) => {
    await fetch(`/api/forms/ControlDefinition/${formId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        controls,
        config,
        fields: formFields,
      }),
    });
  };

  return (
    <div ref={containerRef} className="h-screen w-full">
      <BasicFormEditor
        formTypes={formTypes}
        loadForm={loadForm}
        loadSchema={loadSchema}
        saveForm={saveForm}
        formRenderer={formRenderer}
      />
    </div>
  );
}
```

### Step 2: Configure Tailwind for Editor

The editor requires Tailwind classes. Ensure your `tailwind.config.js` includes:

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
// Forms/AppForms.cs
public static readonly FormDefinition<FormConfig?>[] Forms =
[
    Form<ContactForm>("Contact", "Contact Form", null),
];
```

### 3. Generate Schemas

```bash
npm run generate:schemas
```

### 4. Create Form JSON

The first time you call `/api/forms/Forms`, an empty `Contact.json` will be created. Use the editor to design the form layout, or create it manually:

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
      "renderOptions": {
        "type": "Select"
      }
    },
    {
      "type": "Data",
      "field": "contact/message",
      "title": "Message",
      "renderOptions": {
        "type": "Textarea"
      }
    }
  ],
  "config": {},
  "fields": []
}
```

### 5. View Form

Navigate to `/forms/Contact` to see your rendered form.

### 6. Edit Form

Navigate to `/editor` to open the visual form designer.

---

## Troubleshooting

### Schema Type Mismatches

**Problem**: TypeScript errors about missing properties

**Solution**: Regenerate schemas after changing C# types:
```bash
npm run generate:schemas
```

### Missing Form JSON Files

**Problem**: Form not loading in editor

**Solution**: Ensure the form JSON file exists in `src/forms/`. Call `GET /api/forms/Forms` to auto-create missing files.

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

### Form Data Not Binding

**Problem**: Changes in form don't update data control

**Solution**: Ensure you're using `useControl` from `@react-typed-forms/core` and passing the control to `createSchemaDataNode`.

---

## Best Practices

### 1. Use the Preferred Form Pattern

```csharp
// ✅ DO - Dedicated form class with Edit + lookup data
public class UserEditorForm
{
    public UserEdit User { get; set; } = new();
    public List<RoleInfo> AvailableRoles { get; set; } = new();
}

// ❌ DON'T - Using Edit class directly (loses lookup data)
Form<UserEdit>("UserEditor", "User Editor", null)
```

### 2. Organize Forms by Feature

```csharp
// ✅ DO - Group related forms
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
npm run generate:schemas
git diff --exit-code src/generated/
```
