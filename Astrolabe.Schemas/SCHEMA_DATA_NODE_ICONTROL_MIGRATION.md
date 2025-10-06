# SchemaDataNode Migration: JsonNode? to IControl

## Overview

This document outlines the plan to migrate `SchemaDataNode` from using `JsonNode?` for data storage to using `IControl`. This change aligns the C# implementation with the TypeScript version and enables reactive data handling.

## Current State

### C# Implementation
```csharp
public record SchemaDataNode(
    ISchemaNode Schema,
    JsonNode? Data,           // ← Currently uses JsonNode?
    SchemaDataNode? Parent,
    int? ElementIndex = null
);
```

### TypeScript Implementation (Already Correct)
```typescript
export class SchemaDataNode {
  constructor(
    public id: string,
    public schema: SchemaNode,
    public elementIndex: number | undefined,
    public control: Control<any>,  // ← Already uses Control
    public tree: SchemaDataTree,
    public parent?: SchemaDataNode,
  ) {}
}
```

## Migration Plan

### 1. Update SchemaDataNode Record

**File:** `Astrolabe.Schemas/SchemaDataNode.cs`

```csharp
using Astrolabe.Controls;  // Add this namespace

public record SchemaDataNode(
    ISchemaNode Schema,
    IControl Control,          // Changed from JsonNode? Data
    SchemaDataNode? Parent,
    int? ElementIndex = null
);
```

### 2. Update SchemaDataNodeExtensions Methods

**File:** `Astrolabe.Schemas/SchemaDataNode.cs`

#### 2.1. WithData (Keep Same API)
```csharp
public static SchemaDataNode WithData(this ISchemaNode schema, JsonNode? data)
{
    var control = JsonNodeToControl(data);  // Convert JsonNode? to IControl
    return new SchemaDataNode(schema, control, null);
}
```

#### 2.2. ElementCount
```csharp
// OLD:
public static int ElementCount(this SchemaDataNode dataNode)
{
    return dataNode.Data switch
    {
        JsonArray ja => ja.Count,
        _ => 0
    };
}

// NEW:
public static int ElementCount(this SchemaDataNode dataNode)
{
    return dataNode.Control.IsArray ? dataNode.Control.Count : 0;
}
```

#### 2.3. GetChildElement
```csharp
// OLD:
public static SchemaDataNode? GetChildElement(this SchemaDataNode dataNode, int element)
{
    return dataNode.Data switch
    {
        JsonArray jsonArray when element < jsonArray.Count
            => new SchemaDataNode(dataNode.Schema, jsonArray[element], dataNode, element),
        _ => null
    };
}

// NEW:
public static SchemaDataNode? GetChildElement(this SchemaDataNode dataNode, int element)
{
    if (!dataNode.Control.IsArray || element >= dataNode.Control.Count)
        return null;

    var childControl = dataNode.Control[element];
    return childControl != null
        ? new SchemaDataNode(dataNode.Schema, childControl, dataNode, element)
        : null;
}
```

#### 2.4. GetChild
```csharp
// OLD:
public static SchemaDataNode? GetChild(this SchemaDataNode dataNode, ISchemaNode schemaNode)
{
    return dataNode.Data switch
    {
        JsonObject jsonObject
            => jsonObject.TryGetPropertyValue(schemaNode.Field.Field, out var childField)
                ? new SchemaDataNode(schemaNode, childField, dataNode)
                : null,
        _ => null
    };
}

// NEW:
public static SchemaDataNode? GetChild(this SchemaDataNode dataNode, ISchemaNode schemaNode)
{
    if (!dataNode.Control.IsObject)
        return null;

    var childControl = dataNode.Control[schemaNode.Field.Field];
    return childControl != null
        ? new SchemaDataNode(schemaNode, childControl, dataNode)
        : null;
}
```

### 3. Create JsonNode to IControl Conversion Utility

**File:** `Astrolabe.Schemas/JsonNodeConverter.cs` (new file)

```csharp
using System.Text.Json.Nodes;
using Astrolabe.Controls;

namespace Astrolabe.Schemas;

public static class JsonNodeConverter
{
    /// <summary>
    /// Converts a JsonNode to an IControl by first converting to plain C# objects
    /// </summary>
    public static IControl JsonNodeToControl(JsonNode? jsonNode)
    {
        var data = JsonNodeToObject(jsonNode);
        return ControlFactory.Create(data);
    }

    /// <summary>
    /// Recursively converts JsonNode to plain C# objects:
    /// - JsonObject → IDictionary<string, object?>
    /// - JsonArray → IList<object?>
    /// - JsonValue → primitives
    /// </summary>
    private static object? JsonNodeToObject(JsonNode? node)
    {
        return node switch
        {
            null => null,
            JsonObject obj => ConvertObject(obj),
            JsonArray arr => ConvertArray(arr),
            JsonValue val => ConvertValue(val),
            _ => null
        };
    }

    private static IDictionary<string, object?> ConvertObject(JsonObject obj)
    {
        var dict = new Dictionary<string, object?>();
        foreach (var kvp in obj)
        {
            dict[kvp.Key] = JsonNodeToObject(kvp.Value);
        }
        return dict;
    }

    private static IList<object?> ConvertArray(JsonArray arr)
    {
        var list = new List<object?>();
        foreach (var item in arr)
        {
            list.Add(JsonNodeToObject(item));
        }
        return list;
    }

    private static object? ConvertValue(JsonValue val)
    {
        // Try to get the actual primitive value
        if (val.TryGetValue<string>(out var strVal)) return strVal;
        if (val.TryGetValue<long>(out var longVal)) return longVal;
        if (val.TryGetValue<int>(out var intVal)) return intVal;
        if (val.TryGetValue<double>(out var doubleVal)) return doubleVal;
        if (val.TryGetValue<bool>(out var boolVal)) return boolVal;
        if (val.TryGetValue<decimal>(out var decimalVal)) return decimalVal;
        if (val.TryGetValue<DateTime>(out var dateVal)) return dateVal;

        return val.ToString();
    }
}
```

### 4. Update FormDataNode

**File:** `Astrolabe.Schemas/IFormNode.cs`

No changes needed - already uses `SchemaDataNode`, will automatically work once SchemaDataNode is updated.

### 5. Update ControlDataVisitor

**File:** `Astrolabe.Schemas/ControlDataVisitor.cs`

#### 5.1. Update Visitor Delegates
```csharp
// OLD:
public delegate VisitorResult DataVisitor<in TJson, in TField>(
    DataControlDefinition dataControl,
    TJson data,
    TField field,
    ControlDataVisitorContext context);

public record ControlDataVisitor(
    DataVisitor<JsonNode?, SimpleSchemaField>? Data = null,
    DataVisitor<JsonArray, SimpleSchemaField>? DataCollection = null,
    DataVisitor<JsonObject, CompoundField>? Compound = null,
    DataVisitor<JsonArray, CompoundField>? CompoundCollection = null,
    DataVisitor<JsonNode?, SchemaField>? AnyData = null,
    Func<ControlDefinition, JsonNode?, SchemaField, ControlDataVisitorContext, VisitorResult>? Other = null
);

// NEW:
public delegate VisitorResult DataVisitor<in TField>(
    DataControlDefinition dataControl,
    IControl data,
    TField field,
    ControlDataVisitorContext context);

public record ControlDataVisitor(
    DataVisitor<SimpleSchemaField>? Data = null,
    DataVisitor<SimpleSchemaField>? DataCollection = null,
    DataVisitor<CompoundField>? Compound = null,
    DataVisitor<CompoundField>? CompoundCollection = null,
    DataVisitor<SchemaField>? AnyData = null,
    Func<ControlDefinition, IControl, SchemaField, ControlDataVisitorContext, VisitorResult>? Other = null
);
```

#### 5.2. Update ControlDataVisitorContext
```csharp
// OLD:
public record ControlDataVisitorContext(
    ControlDefinition Control,
    SchemaField Field,
    bool Element,
    JsonNode? Data,
    JsonPathSegments Path,
    ControlDataVisitorContext? Parent)

// NEW:
public record ControlDataVisitorContext(
    ControlDefinition Control,
    SchemaField Field,
    bool Element,
    IControl Data,
    JsonPathSegments Path,
    ControlDataVisitorContext? Parent)
{
    public static ControlDataVisitorContext RootContext(
        IEnumerable<ControlDefinition> controls,
        IEnumerable<SchemaField> fields,
        IControl data)  // Changed from JsonObject
    {
        return new ControlDataVisitorContext(
            new GroupedControlsDefinition { Children = controls },
            new CompoundField("", fields, false),
            false,
            data,
            JsonPathSegments.Empty,
            null);
    }
}
```

#### 5.3. Update Visit Method Pattern Matching
```csharp
// OLD:
public static VisitorResult Visit(this ControlDataVisitorContext context, ControlDataVisitor visitor)
{
    var visitChildren = (context.Control, context.Field, context.Data) switch
    {
        (DataControlDefinition dcd, SimpleSchemaField { Collection: not true } ssf, var value)
            when visitor is { Data: { } df } => df(dcd, value, ssf, context),
        (DataControlDefinition dcd, SimpleSchemaField { Collection: true } ssf, JsonArray value)
            when !context.Element && visitor is { DataCollection: { } df } => df(dcd, value, ssf, context),
        // ... etc
    };
}

// NEW:
public static VisitorResult Visit(this ControlDataVisitorContext context, ControlDataVisitor visitor)
{
    var visitChildren = (context.Control, context.Field, context.Data) switch
    {
        (DataControlDefinition dcd, SimpleSchemaField { Collection: not true } ssf, var value)
            when visitor is { Data: { } df } => df(dcd, value, ssf, context),
        (DataControlDefinition dcd, SimpleSchemaField { Collection: true } ssf, var value)
            when !context.Element && value.IsArray && visitor is { DataCollection: { } df }
            => df(dcd, value, ssf, context),
        (DataControlDefinition dcd, CompoundField { Collection: not true } cf, var value)
            when value.IsObject && visitor is { Compound: { } df }
            => df(dcd, value, cf, context),
        (DataControlDefinition dcd, CompoundField { Collection: true } cf, var value)
            when !context.Element && value.IsArray && visitor is { CompoundCollection: { } df }
            => df(dcd, value, cf, context),
        // ... etc
    };

    // Update collection iteration
    if ((context.Field.Collection ?? false) && !context.Element)
    {
        if (!context.Data.IsArray) return VisitorResult.Continue;

        for (var i = 0; i < context.Data.Count; i++)
        {
            var childControl = context.Data[i];
            if (childControl == null) continue;

            var childContext = context with
            {
                Element = true,
                Data = childControl,
                Parent = context,
                Path = context.Path.Index(i)
            };
            if (childContext.Visit(visitor) == VisitorResult.Stop)
                return VisitorResult.Stop;
        }
        return VisitorResult.Continue;
    }

    // Update child control access
    if (context is not { Field: CompoundField cf, Data: var data } || !data.IsObject)
    {
        // ... handle non-compound cases
    }

    foreach (var childControl in childControls)
    {
        var childContext = childControl.FindChildField(context.Data, cf.Children) is var (childData, childField)
            ? new ControlDataVisitorContext(childControl, childField, false,
                childData, context.Path.Field(childField.Field), context)
            : context.ChildContext(childControl);
        // ...
    }
}
```

#### 5.4. Update FindChildField Method
```csharp
// This method needs to be updated to work with IControl instead of JsonObject
// OLD signature:
private static (JsonNode?, SchemaField) FindChildField(
    this ControlDefinition control,
    JsonObject data,
    IEnumerable<SchemaField> fields)

// NEW signature:
private static (IControl?, SchemaField) FindChildField(
    this ControlDefinition control,
    IControl data,
    IEnumerable<SchemaField> fields)
{
    // Implementation needs to use data[fieldName] instead of data.TryGetPropertyValue
}
```

### 6. Add Project Reference

**File:** `Astrolabe.Schemas/Astrolabe.Schemas.csproj`

```xml
<ItemGroup>
  <ProjectReference Include="..\Astrolabe.Controls\Astrolabe.Controls.csproj" />
  <!-- other existing references -->
</ItemGroup>
```

### 7. Update All Usages

Need to search for all code that:
- Creates `SchemaDataNode` directly with JsonNode (should use `WithData` instead)
- Accesses `SchemaDataNode.Data` property (should use `.Control` instead)
- Pattern matches on JsonNode types when working with SchemaDataNode

**Search patterns:**
```bash
# Find direct SchemaDataNode construction
grep -r "new SchemaDataNode" --include="*.cs"

# Find Data property access
grep -r "\.Data\s*switch\|\.Data\?" --include="*.cs"

# Find JsonNode pattern matching with SchemaDataNode
grep -r "JsonArray\|JsonObject\|JsonValue" Astrolabe.Schemas/ --include="*.cs"
```

## Benefits

1. **Type Safety**: IControl provides strongly-typed access patterns with `IsArray`, `IsObject`, indexers
2. **Consistency**: Aligns C# implementation with TypeScript version
3. **Reactive Data**: IControl supports subscriptions and change tracking via `Subscribe` method
4. **Better Abstraction**: Separates data structure from JSON representation
5. **Backward Compatibility**: `WithData` extension method maintains the same public API

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking change for direct SchemaDataNode construction | Medium | Most code uses `WithData`, provide migration guide |
| Conversion overhead (JsonNode → object → IControl) | Low | One-time conversion at boundary, cached in SchemaDataNode |
| Missing ControlFactory.Create method | High | Verify Astrolabe.Controls has this or implement it |
| IControl might not support all JsonNode scenarios | Medium | Add comprehensive tests, fallback handling |

## Testing Strategy

1. **Unit Tests**: Test JsonNode conversion utility with various data structures
2. **Integration Tests**: Test SchemaDataNode navigation with IControl
3. **Visitor Tests**: Ensure ControlDataVisitor works correctly with IControl
4. **Regression Tests**: Run existing test suite to catch breaking changes

## Migration Checklist

- [ ] Add Astrolabe.Controls project reference
- [ ] Create JsonNodeConverter utility class
- [ ] Update SchemaDataNode record definition
- [ ] Update SchemaDataNodeExtensions methods
- [ ] Update ControlDataVisitor delegates and context
- [ ] Update ControlDataVisitor.Visit method
- [ ] Find and update all direct usages
- [ ] Add/update unit tests
- [ ] Run full test suite
- [ ] Update documentation

## Open Questions

1. Does `Astrolabe.Controls` have a `ControlFactory.Create(object?)` method? If not, where should it be implemented?
2. Should we keep the `Data` property name or rename to `Control` to match TypeScript?
3. Are there performance benchmarks we should maintain?
4. Should we support reverse conversion (IControl → JsonNode) for serialization?