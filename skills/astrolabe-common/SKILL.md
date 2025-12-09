---
name: astrolabe-common
description: Base .NET utilities library providing exceptions (NotFoundException, ForbiddenException), LINQ extensions, list editing with change tracking, and reflection utilities. Use when working with Astrolabe.Common or needing common .NET utilities.
---

# Astrolabe.Common - Base Utilities Library

## Overview

Astrolabe.Common is the foundational library of the Astrolabe Apps stack. It provides essential utilities that depend only on the .NET SDK, making it the base for all other Astrolabe libraries.

**When to use**: Import this library whenever you need common utilities for exceptions, string handling, list editing with change tracking, reflection operations, or LINQ extensions.

**Package**: `Astrolabe.Common`
**Dependencies**: Only .NET SDK
**Target Framework**: .NET 7-8 with nullable reference types enabled

## Key Concepts

### 1. Exception Handling

Common exception types used across the Astrolabe stack:

- **`NotFoundException`**: Entity not found errors (typically maps to HTTP 404)
- **`ForbiddenException`**: Authorization failures (typically maps to HTTP 403)
- **`NotAllowedException`**: Permission denied errors

### 2. List Editing with Change Tracking

The library provides utilities to track additions, edits, and deletions in lists, essential for data synchronization scenarios.

### 3. Reflection Utilities

Helper methods for working with .NET reflection, particularly useful for generic type operations and property access.

### 4. LINQ Extensions

Extension methods that enhance LINQ capabilities for common operations.

## Common Patterns

### Exception Throwing

```csharp
using Astrolabe.Common;

// Throw NotFoundException
public async Task<User> GetUser(Guid id)
{
    var user = await _context.Users.FindAsync(id);
    if (user == null)
    {
        throw new NotFoundException($"User with ID {id} not found.");
    }
    return user;
}

// Using the helper method (if available)
public async Task<User> GetUser(Guid id)
{
    var user = await _context.Users.FindAsync(id);
    NotFoundException.ThrowIfNull(user);
    return user;
}

// Throw ForbiddenException
public void ValidateAccess(User user, Resource resource)
{
    if (!resource.AllowedUsers.Contains(user.Id))
    {
        throw new ForbiddenException($"User {user.Id} cannot access resource {resource.Id}");
    }
}
```

### String Escaping

```csharp
using Astrolabe.Common;

// Escape strings for various contexts
string htmlSafe = StringEscaper.EscapeHtml(userInput);
string sqlSafe = StringEscaper.EscapeSql(userInput);
```

### List Editing and Change Tracking

```csharp
using Astrolabe.Common;

// Track changes to a list of entities
public class ListEditor<T>
{
    // Original list
    private List<T> original;

    // Current list after edits
    private List<T> current;

    // Get added items
    public IEnumerable<T> GetAdded() => current.Except(original);

    // Get removed items
    public IEnumerable<T> GetRemoved() => original.Except(current);

    // Get items that exist in both (potentially edited)
    public IEnumerable<T> GetExisting() => current.Intersect(original);
}
```

### Reflection Utilities

```csharp
using Astrolabe.Common;

// Get property info dynamically
var propertyInfo = ReflectionUtils.GetProperty<MyClass>("PropertyName");

// Create instances dynamically
var instance = ReflectionUtils.CreateInstance(typeof(MyClass));

// Work with generic types
var genericType = typeof(List<>).MakeGenericType(typeof(string));
```

### LINQ Extensions

```csharp
using Astrolabe.Common;

// Use extended LINQ operations
var items = collection
    .DistinctBy(x => x.Key)
    .WhereNotNull()
    .ToList();
```

## Integration with Other Libraries

Astrolabe.Common is the foundation for:

- **Astrolabe.Schemas**: Uses reflection utilities for type introspection
- **Astrolabe.ColumnEditor**: Uses list editing for change tracking
- **Astrolabe.Web.Common**: Uses common exceptions for HTTP responses
- **Astrolabe.Workflow**: Uses exceptions for validation and error handling

All Astrolabe libraries depend on this package.

## Best Practices

### 1. Use Appropriate Exceptions

```csharp
// ✅ DO - Use specific exceptions
throw new NotFoundException($"Entity {id} not found");
throw new ForbiddenException("Access denied");

// ❌ DON'T - Use generic exceptions for domain errors
throw new Exception("Entity not found");
```

### 2. Leverage LINQ Extensions

```csharp
// ✅ DO - Use built-in extensions when available
var distinct = items.DistinctBy(x => x.Key);

// ❌ DON'T - Implement manually
var distinct = items.GroupBy(x => x.Key).Select(g => g.First());
```

### 3. Use Reflection Utilities Carefully

```csharp
// ✅ DO - Cache reflection results when used in loops
var propertyInfo = ReflectionUtils.GetProperty<MyClass>("PropertyName");
foreach (var item in items)
{
    propertyInfo.SetValue(item, value);
}

// ❌ DON'T - Repeat reflection lookups
foreach (var item in items)
{
    var propertyInfo = ReflectionUtils.GetProperty<MyClass>("PropertyName");
    propertyInfo.SetValue(item, value);
}
```

## Troubleshooting

### Common Issues

**Issue: NotFoundException not being caught**
- **Cause**: Exception is thrown but not handled by middleware
- **Solution**: Ensure you have exception handling middleware configured in your ASP.NET Core application that catches `NotFoundException` and returns appropriate HTTP responses

**Issue: String escaping not working as expected**
- **Cause**: Using wrong escaper for the context
- **Solution**: Use the appropriate escaper for your context (HTML, SQL, etc.)

**Issue: LINQ extension not found**
- **Cause**: Missing using directive
- **Solution**: Add `using Astrolabe.Common;` to access extension methods

**Issue: Reflection utils throwing NullReferenceException**
- **Cause**: Property or type name is incorrect
- **Solution**: Verify that the property/type name matches exactly (case-sensitive)

## Project Structure Location

- **Path**: `Astrolabe.Common/`
- **Project File**: `Astrolabe.Common.csproj`
- **Namespace**: `Astrolabe.Common`