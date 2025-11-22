# Astrolabe.Schemas - Schema Definition System

## Overview

Astrolabe.Schemas is a C# library for defining schemas that bridge .NET types to TypeScript/React form definitions. It enables schema-driven development where UI components are automatically generated from type-safe schema definitions.

**When to use**: Use this library when you need to generate TypeScript schema definitions from C# types, create form schemas for @react-typed-forms/schemas, or implement schema-driven UI generation.

**Package**: `Astrolabe.Schemas`
**Dependencies**: Astrolabe.Common, System.Text.Json
**TypeScript Counterpart**: `@react-typed-forms/schemas`
**Target Framework**: .NET 7-8

## Key Concepts

### 1. Schema-Driven Development

The core pattern is to define schemas in C# that get serialized to JSON and consumed by TypeScript/React components. This ensures type safety across the full stack.

### 2. Field Types

Schemas support these core field types that map to JSON:
- **String**: JSON string
- **Bool**: JSON boolean
- **Int**: JSON number
- **Double**: JSON number
- **Date**: JSON string (yyyy-MM-dd format)
- **DateTime**: JSON string (ISO8601 format)
- **Compound**: JSON object with nested fields
- **Collection**: JSON array of any field type

### 3. Schema Fields

A `SchemaField` describes a single property including:
- Field name and display name
- Type information
- Validation rules (required, min/max, patterns)
- Default values
- Field options (for enums/dropdowns)
- Visibility and edit rules

### 4. Form Schemas

Complete form schemas define the structure of data entry forms, combining multiple fields with layout and validation rules.

## Common Patterns

### Defining Schema Fields

```csharp
using Astrolabe.Schemas;

// String field
var nameField = new SimpleSchemaField(FieldType.String.ToString(), "name")
{
    DisplayName = "Full Name",
    Required = true
};

// Integer field with default
var ageField = new SimpleSchemaField(FieldType.Int.ToString(), "age")
{
    DisplayName = "Age",
    DefaultValue = 18
};

// Date field
var birthDateField = new SimpleSchemaField(FieldType.Date.ToString(), "birthDate")
{
    DisplayName = "Date of Birth"
};

// Boolean field
var activeField = new SimpleSchemaField(FieldType.Bool.ToString(), "isActive")
{
    DisplayName = "Active",
    DefaultValue = true
};

// Enum field with options
var statusField = new SimpleSchemaField(FieldType.String.ToString(), "status")
{
    DisplayName = "Status",
    Options = new[]
    {
        new FieldOption("Active", "active"),
        new FieldOption("Inactive", "inactive"),
        new FieldOption("Pending", "pending")
    }
};
```

### Building Schemas for C# Classes

```csharp
using Astrolabe.Schemas;

// Define your model
public class UserProfile
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public int Age { get; set; }
    public DateTime DateOfBirth { get; set; }
    public UserRole Role { get; set; }
}

public enum UserRole
{
    Admin,
    User,
    Guest
}

// Build schema manually
var userProfileSchema = new SchemaField[]
{
    new SimpleSchemaField(FieldType.String.ToString(), "firstName")
    {
        DisplayName = "First Name",
        Required = true
    },
    new SimpleSchemaField(FieldType.String.ToString(), "lastName")
    {
        DisplayName = "Last Name",
        Required = true
    },
    new SimpleSchemaField(FieldType.String.ToString(), "email")
    {
        DisplayName = "Email",
        Required = true,
        Validators = new[]
        {
            new SchemaValidator
            {
                Type = "pattern",
                Value = @"^[^\s@]+@[^\s@]+\.[^\s@]+$",
                Message = "Please enter a valid email"
            }
        }
    },
    new SimpleSchemaField(FieldType.Int.ToString(), "age")
    {
        DisplayName = "Age",
        DefaultValue = 18
    },
    new SimpleSchemaField(FieldType.Date.ToString(), "dateOfBirth")
    {
        DisplayName = "Date of Birth"
    },
    new SimpleSchemaField(FieldType.String.ToString(), "role")
    {
        DisplayName = "Role",
        Options = new[]
        {
            new FieldOption("Administrator", "Admin"),
            new FieldOption("User", "User"),
            new FieldOption("Guest", "Guest")
        }
    }
};
```

### Compound Fields (Nested Objects)

```csharp
using Astrolabe.Schemas;

public class Address
{
    public string Street { get; set; }
    public string City { get; set; }
    public string Country { get; set; }
}

public class Person
{
    public string Name { get; set; }
    public Address HomeAddress { get; set; }
}

// Build schema with nested object
var personSchema = new SchemaField[]
{
    new SimpleSchemaField(FieldType.String.ToString(), "name")
    {
        DisplayName = "Name",
        Required = true
    },
    new CompoundField(
        "homeAddress",
        new SchemaField[]
        {
            new SimpleSchemaField(FieldType.String.ToString(), "street")
            {
                DisplayName = "Street"
            },
            new SimpleSchemaField(FieldType.String.ToString(), "city")
            {
                DisplayName = "City"
            },
            new SimpleSchemaField(FieldType.String.ToString(), "country")
            {
                DisplayName = "Country"
            }
        },
        TreeChildren: false
    )
    {
        DisplayName = "Home Address"
    }
};
```

### Collection Fields (Arrays)

```csharp
using Astrolabe.Schemas;

public class Project
{
    public string Name { get; set; }
    public List<string> Tags { get; set; }
    public List<TeamMember> Members { get; set; }
}

public class TeamMember
{
    public string Name { get; set; }
    public string Role { get; set; }
}

// Build schema with collections
var projectSchema = new SchemaField[]
{
    new SimpleSchemaField(FieldType.String.ToString(), "name")
    {
        DisplayName = "Project Name",
        Required = true
    },
    // Simple collection
    new SimpleSchemaField(FieldType.String.ToString(), "tags")
    {
        DisplayName = "Tags",
        Collection = true
    },
    // Complex collection
    new CompoundField(
        "members",
        new SchemaField[]
        {
            new SimpleSchemaField(FieldType.String.ToString(), "name")
            {
                DisplayName = "Name",
                Required = true
            },
            new SimpleSchemaField(FieldType.String.ToString(), "role")
            {
                DisplayName = "Role"
            }
        },
        TreeChildren: false
    )
    {
        DisplayName = "Team Members",
        Collection = true
    }
};
```

### Exporting Schemas to TypeScript

```csharp
using Astrolabe.Schemas;
using System.Text.Json;

// Serialize schema to JSON for TypeScript consumption
var schema = SchemaBuilder.Build<UserProfile>(/* ... */);

var json = JsonSerializer.Serialize(schema, new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = true
});

// Write to file or API response
await File.WriteAllTextAsync("schemas/userProfile.json", json);
```

### Validation Rules

```csharp
using Astrolabe.Schemas;

// Required field
var requiredField = new SimpleSchemaField(FieldType.String.ToString(), "email")
{
    DisplayName = "Email",
    Required = true
};

// Pattern (regex) validation
var phoneField = new SimpleSchemaField(FieldType.String.ToString(), "phone")
{
    DisplayName = "Phone Number",
    Validators = new[]
    {
        new SchemaValidator
        {
            Type = "pattern",
            Value = @"^\d{3}-\d{3}-\d{4}$",
            Message = "Please enter a valid phone number (e.g., 555-555-5555)"
        }
    }
};

// Multiple validators with custom error messages
var emailField = new SimpleSchemaField(FieldType.String.ToString(), "email")
{
    DisplayName = "Email",
    Required = true,
    RequiredText = "Email is required",
    Validators = new[]
    {
        new SchemaValidator
        {
            Type = "pattern",
            Value = @"^[^\s@]+@[^\s@]+\.[^\s@]+$",
            Message = "Please enter a valid email address"
        }
    }
};
```

## Integration with TypeScript

### Consuming Schemas in React

```typescript
// TypeScript side - import and use schema
import userProfileSchema from './schemas/userProfile.json';
import { useControl } from '@react-typed-forms/core';
import { renderControl, useControlDefinitionForSchema } from '@react-typed-forms/schemas';

function UserProfileForm() {
  const data = useControl<UserProfile>(() => defaultValueForFields(userProfileSchema));
  const controlDefinition = useControlDefinitionForSchema(userProfileSchema);

  return renderControl(controlDefinition, data, {
    fields: userProfileSchema,
    renderer: myFormRenderer,
  });
}
```

## Best Practices

### 1. Use Proper Field Construction

```csharp
// ✅ DO - Use object initializers for clarity
var schema = new SimpleSchemaField(FieldType.String.ToString(), "propertyName")
{
    DisplayName = "Display Name",
    Required = true
};

// ⚠️ CAUTION - Be careful with field names (must match TypeScript/JSON property names)
var schema = new SimpleSchemaField(FieldType.String.ToString(), "propertyName") // camelCase
{
    DisplayName = "Property Name"
};
```

### 2. Create Options from Enums

```csharp
// ✅ DO - Create options from enum values
public enum Status { Active, Inactive, Pending }

var statusField = new SimpleSchemaField(FieldType.String.ToString(), "status")
{
    DisplayName = "Status",
    Options = Enum.GetValues<Status>()
        .Select(s => new FieldOption(s.ToString(), s.ToString()))
        .ToArray()
};

// Or with custom display names
var statusFieldCustom = new SimpleSchemaField(FieldType.String.ToString(), "status")
{
    DisplayName = "Status",
    Options = new[]
    {
        new FieldOption("Active", Status.Active.ToString()),
        new FieldOption("Inactive", Status.Inactive.ToString()),
        new FieldOption("Pending", Status.Pending.ToString())
    }
};
```

### 3. Keep Display Names User-Friendly

```csharp
// ✅ DO - Use clear, user-friendly display names
new SimpleSchemaField(FieldType.String.ToString(), "firstName")
{
    DisplayName = "First Name"
};

new SimpleSchemaField(FieldType.Date.ToString(), "dateOfBirth")
{
    DisplayName = "Date of Birth"
};

// ❌ DON'T - Use technical names
new SimpleSchemaField(FieldType.String.ToString(), "firstName")
{
    DisplayName = "firstName" // Not user-friendly
};
```

### 4. Define Meaningful Validation Messages

```csharp
// ✅ DO - Provide helpful error messages
var emailField = new SimpleSchemaField(FieldType.String.ToString(), "email")
{
    DisplayName = "Email",
    Required = true,
    RequiredText = "Email address is required",
    Validators = new[]
    {
        new SchemaValidator
        {
            Type = "pattern",
            Value = @"^[^\s@]+@[^\s@]+\.[^\s@]+$",
            Message = "Please enter a valid email address (e.g., user@example.com)"
        }
    }
};

// ❌ DON'T - Use generic or no messages
var emailField = new SimpleSchemaField(FieldType.String.ToString(), "email")
{
    Required = true,
    Validators = new[]
    {
        new SchemaValidator
        {
            Type = "pattern",
            Value = @"^[^\s@]+@[^\s@]+\.[^\s@]+$"
            // No message!
        }
    }
};
```

## Troubleshooting

### Common Issues

**Issue: Schema not generating options for enum**
- **Cause**: Enum type not properly recognized
- **Solution**: Ensure the enum is a standard C# enum type and properly referenced in the schema builder

**Issue: TypeScript can't import schema JSON**
- **Cause**: Schema not serialized with camelCase naming
- **Solution**: Use `JsonNamingPolicy.CamelCase` when serializing:
  ```csharp
  JsonSerializer.Serialize(schema, new JsonSerializerOptions
  {
      PropertyNamingPolicy = JsonNamingPolicy.CamelCase
  });
  ```

**Issue: Nested objects not rendering correctly**
- **Cause**: Compound field not properly defined
- **Solution**: Use `builder.Compound()` for nested objects, not regular `Field()`

**Issue: Collection validation not working**
- **Cause**: Validation rules on wrong level
- **Solution**: Apply validation to the collection item definition, not the collection itself

**Issue: Date fields showing wrong format**
- **Cause**: Using DateTime instead of Date field type
- **Solution**: Use `SchemaField.Date()` for date-only values, `SchemaField.DateTime()` for date+time

## Project Structure Location

- **Path**: `Astrolabe.Schemas/`
- **Project File**: `Astrolabe.Schemas.csproj`
- **Namespace**: `Astrolabe.Schemas`

## Related Documentation

- [react-typed-forms-schemas](../typescript/react-typed-forms-schemas.md) - TypeScript counterpart
- [Astrolabe.Common](./astrolabe-common.md) - Base utilities
- [BEST-PRACTICES.md](../../BEST-PRACTICES.md) - Development guidelines

## Advanced Topics

### Dynamic Schema Generation

```csharp
// Generate schemas at runtime based on configuration
public SchemaField GenerateSchema(Type modelType)
{
    var builder = new SchemaBuilder();
    return builder.BuildDynamic(modelType);
}
```

### Schema Caching

```csharp
// Cache schemas for performance
private static readonly Dictionary<Type, SchemaField> _schemaCache = new();

public SchemaField GetSchema<T>()
{
    var type = typeof(T);
    if (!_schemaCache.ContainsKey(type))
    {
        _schemaCache[type] = SchemaBuilder.Build<T>(/* ... */);
    }
    return _schemaCache[type];
}
```
