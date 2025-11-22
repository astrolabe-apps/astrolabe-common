# Astrolabe.Workflow - Workflow Execution Framework

## Overview

Astrolabe.Workflow provides abstractions for implementing workflow execution patterns including declarative rule-based triggering, security for user-triggered actions, and efficient bulk operations. It's designed for CRUD operations that require state management, audit trails, and authorization.

**When to use**: Use this library when implementing entity workflows with state transitions, bulk operations, automated triggers, or when you need the AbstractWorkflowExecutor pattern for CRUD operations.

**Package**: `Astrolabe.Workflow`
**Dependencies**: Astrolabe.Common
**Related**: See AbstractWorkflowExecutor-Guide.md for detailed implementation patterns
**Target Framework**: .NET 7-8

## Key Concepts

### 1. Workflow Executor

`AbstractWorkflowExecutor<TContext, TLoadContext, TAction>` is responsible for:
- Loading data (possibly in bulk)
- Checking rule-based triggers and queuing actions
- Applying user-triggered or automatically queued actions
- Managing state transitions

### 2. Type Parameters

- **`TContext`**: Contains all data for editing a single entity plus associated entities (e.g., audit logs)
- **`TAction`**: Describes all possible actions and their parameters
- **`TLoadContext`**: Contains data required for bulk loading entities (usually a list of IDs)

### 3. Workflow Rules

Declarative rules that automatically trigger actions based on conditions (e.g., send email when status changes to "Published").

### 4. Action Security

Declarative security that determines which actions are allowed for specific users on specific entities.

## Common Patterns

### Basic Workflow Setup

```csharp
using Astrolabe.Workflow;

// 1. Define your action types
public abstract record CarAction
{
    public record Publish : CarAction;
    public record Unpublish : CarAction;
    public record Delete : CarAction;
    public record Edit(string Make, string Model, int Year) : CarAction;
}

// 2. Define your entity
public class CarItem
{
    public Guid Id { get; set; }
    public string Owner { get; set; } = string.Empty;
    public ItemStatus Status { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
}

public enum ItemStatus
{
    Draft,
    Published,
    Deleted
}

// 3. Define your context
public class CarContext
{
    public CarItem Car { get; set; } = null!;
    public List<AuditLog> AuditLogs { get; set; } = new();
}

// 4. Define load context
public class CarLoadContext
{
    public List<Guid> CarIds { get; set; } = new();
}
```

### Implementing the Workflow Executor

```csharp
using Astrolabe.Workflow;
using Microsoft.EntityFrameworkCore;

public class CarWorkflowExecutor
    : AbstractWorkflowExecutor<CarContext, CarLoadContext, CarAction>
{
    private readonly AppDbContext _context;
    private readonly string _currentUser;

    public CarWorkflowExecutor(AppDbContext context, string currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    // Load entities in bulk
    protected override async Task<IEnumerable<CarContext>> LoadContexts(CarLoadContext loadContext)
    {
        var cars = await _context.Cars
            .Where(c => loadContext.CarIds.Contains(c.Id))
            .ToListAsync();

        return cars.Select(car => new CarContext { Car = car });
    }

    // Get entity ID for tracking
    protected override object GetEntityId(CarContext context) => context.Car.Id;

    // Check which actions are allowed
    protected override IEnumerable<CarAction> GetAllowedActions(CarContext context)
    {
        var car = context.Car;
        var isOwner = car.Owner == _currentUser;

        return car.Status switch
        {
            ItemStatus.Draft when isOwner => new CarAction[]
            {
                new CarAction.Publish(),
                new CarAction.Edit("", "", 0),
                new CarAction.Delete()
            },
            ItemStatus.Published when isOwner => new CarAction[]
            {
                new CarAction.Unpublish(),
                new CarAction.Delete()
            },
            _ => Array.Empty<CarAction>()
        };
    }

    // Apply an action to the context
    protected override async Task ApplyAction(CarContext context, CarAction action)
    {
        var car = context.Car;

        switch (action)
        {
            case CarAction.Publish:
                car.Status = ItemStatus.Published;
                context.AuditLogs.Add(new AuditLog
                {
                    EntityId = car.Id,
                    Action = "Publish",
                    User = _currentUser,
                    Timestamp = DateTime.UtcNow
                });
                break;

            case CarAction.Unpublish:
                car.Status = ItemStatus.Draft;
                context.AuditLogs.Add(new AuditLog
                {
                    EntityId = car.Id,
                    Action = "Unpublish",
                    User = _currentUser,
                    Timestamp = DateTime.UtcNow
                });
                break;

            case CarAction.Delete:
                car.Status = ItemStatus.Deleted;
                context.AuditLogs.Add(new AuditLog
                {
                    EntityId = car.Id,
                    Action = "Delete",
                    User = _currentUser,
                    Timestamp = DateTime.UtcNow
                });
                break;

            case CarAction.Edit edit:
                car.Make = edit.Make;
                car.Model = edit.Model;
                car.Year = edit.Year;
                context.AuditLogs.Add(new AuditLog
                {
                    EntityId = car.Id,
                    Action = "Edit",
                    User = _currentUser,
                    Timestamp = DateTime.UtcNow
                });
                break;
        }

        await Task.CompletedTask;
    }

    // Save changes to database
    protected override async Task SaveContexts(IEnumerable<CarContext> contexts)
    {
        foreach (var context in contexts)
        {
            _context.AuditLogs.AddRange(context.AuditLogs);
        }

        await _context.SaveChangesAsync();
    }

    // Optional: Define automatic triggers
    protected override IEnumerable<CarAction> GetTriggeredActions(CarContext context)
    {
        var car = context.Car;

        // Auto-publish cars from current year
        if (car.Status == ItemStatus.Draft && car.Year == DateTime.Now.Year)
        {
            yield return new CarAction.Publish();
        }

        // Could trigger email notifications, etc.
    }
}
```

### Controller Integration

```csharp
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/cars")]
public class CarsController : ControllerBase
{
    private readonly AppDbContext _context;

    public CarsController(AppDbContext context)
    {
        _context = context;
    }

    private string GetCurrentUser() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CarEdit edit)
    {
        var car = new CarItem
        {
            Id = Guid.NewGuid(),
            Owner = GetCurrentUser(),
            Status = ItemStatus.Draft,
            Make = edit.Make,
            Model = edit.Model,
            Year = edit.Year
        };

        _context.Cars.Add(car);
        await _context.SaveChangesAsync();

        // Run workflow to check triggers
        var executor = new CarWorkflowExecutor(_context, GetCurrentUser());
        await executor.ExecuteWorkflow(new CarLoadContext
        {
            CarIds = new List<Guid> { car.Id }
        });

        return Ok(car.Id);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Edit(Guid id, [FromBody] CarEdit edit)
    {
        var executor = new CarWorkflowExecutor(_context, GetCurrentUser());

        await executor.ExecuteUserAction(
            new CarLoadContext { CarIds = new List<Guid> { id } },
            id,
            new CarAction.Edit(edit.Make, edit.Model, edit.Year)
        );

        return NoContent();
    }

    [HttpPost("{id}/publish")]
    public async Task<IActionResult> Publish(Guid id)
    {
        var executor = new CarWorkflowExecutor(_context, GetCurrentUser());

        await executor.ExecuteUserAction(
            new CarLoadContext { CarIds = new List<Guid> { id } },
            id,
            new CarAction.Publish()
        );

        return NoContent();
    }

    [HttpPost("{id}/unpublish")]
    public async Task<IActionResult> Unpublish(Guid id)
    {
        var executor = new CarWorkflowExecutor(_context, GetCurrentUser());

        await executor.ExecuteUserAction(
            new CarLoadContext { CarIds = new List<Guid> { id } },
            id,
            new CarAction.Unpublish()
        );

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var executor = new CarWorkflowExecutor(_context, GetCurrentUser());

        await executor.ExecuteUserAction(
            new CarLoadContext { CarIds = new List<Guid> { id } },
            id,
            new CarAction.Delete()
        );

        return NoContent();
    }

    [HttpGet("{id}/actions")]
    public async Task<IActionResult> GetAllowedActions(Guid id)
    {
        var executor = new CarWorkflowExecutor(_context, GetCurrentUser());

        var actions = await executor.GetAllowedActionsForEntity(
            new CarLoadContext { CarIds = new List<Guid> { id } },
            id
        );

        return Ok(actions.Select(a => a.GetType().Name));
    }
}

public record CarEdit(string Make, string Model, int Year);
```

### Bulk Operations

```csharp
using Astrolabe.Workflow;

public class BulkOperationService
{
    private readonly AppDbContext _context;

    public async Task PublishAllDrafts(string userId)
    {
        // Get all draft car IDs for user
        var draftIds = await _context.Cars
            .Where(c => c.Owner == userId && c.Status == ItemStatus.Draft)
            .Select(c => c.Id)
            .ToListAsync();

        if (draftIds.Count == 0) return;

        // Execute workflow with bulk load
        var executor = new CarWorkflowExecutor(_context, userId);

        // Load all contexts at once (efficient bulk operation)
        await executor.ExecuteBulkActions(
            new CarLoadContext { CarIds = draftIds },
            draftIds.Select(id => (id, (CarAction)new CarAction.Publish()))
        );
    }

    public async Task DeleteOldCars(int olderThanYear)
    {
        var oldCarIds = await _context.Cars
            .Where(c => c.Year < olderThanYear)
            .Select(c => c.Id)
            .ToListAsync();

        var executor = new CarWorkflowExecutor(_context, "system");

        await executor.ExecuteBulkActions(
            new CarLoadContext { CarIds = oldCarIds },
            oldCarIds.Select(id => (id, (CarAction)new CarAction.Delete()))
        );
    }
}
```

### Automated Workflow Rules

```csharp
public class CarWorkflowExecutor
    : AbstractWorkflowExecutor<CarContext, CarLoadContext, CarAction>
{
    protected override IEnumerable<CarAction> GetTriggeredActions(CarContext context)
    {
        var car = context.Car;

        // Rule 1: Auto-publish recent year cars
        if (car.Status == ItemStatus.Draft && car.Year >= DateTime.Now.Year - 1)
        {
            yield return new CarAction.Publish();
        }

        // Rule 2: Auto-delete very old cars
        if (car.Status == ItemStatus.Published && car.Year < 1980)
        {
            yield return new CarAction.Delete();
        }

        // Rule 3: Send notification on publish
        if (car.Status == ItemStatus.Published && !_notificationSent)
        {
            yield return new CarAction.SendNotification();
        }
    }
}
```

## Best Practices

### 1. Use Record Types for Actions

```csharp
// ✅ DO - Use discriminated unions with records
public abstract record CarAction
{
    public record Publish : CarAction;
    public record Edit(string Make, string Model, int Year) : CarAction;
}

// ❌ DON'T - Use strings or enums for complex actions
public enum CarAction { Publish, Edit } // Can't carry parameters!
```

### 2. Implement Proper Authorization

```csharp
// ✅ DO - Check permissions in GetAllowedActions
protected override IEnumerable<CarAction> GetAllowedActions(CarContext context)
{
    var isOwner = context.Car.Owner == _currentUser;
    var isAdmin = _userRoles.Contains("Admin");

    if (!isOwner && !isAdmin)
        return Array.Empty<CarAction>();

    // Return allowed actions based on state and permissions
    return GetActionsForStatus(context.Car.Status);
}

// ❌ DON'T - Skip authorization checks
protected override IEnumerable<CarAction> GetAllowedActions(CarContext context)
{
    return AllActions; // Anyone can do anything!
}
```

### 3. Create Audit Logs

```csharp
// ✅ DO - Log all actions
protected override async Task ApplyAction(CarContext context, CarAction action)
{
    // Apply the action
    UpdateEntity(context, action);

    // Always create audit log
    context.AuditLogs.Add(new AuditLog
    {
        EntityId = context.Car.Id,
        Action = action.GetType().Name,
        User = _currentUser,
        Timestamp = DateTime.UtcNow,
        Details = JsonSerializer.Serialize(action)
    });
}

// ❌ DON'T - Skip audit trails
```

### 4. Use Bulk Operations for Performance

```csharp
// ✅ DO - Load and process in bulk
var loadContext = new CarLoadContext { CarIds = allIds };
await executor.ExecuteBulkActions(loadContext, actions);

// ❌ DON'T - Process one at a time in a loop
foreach (var id in allIds)
{
    var loadContext = new CarLoadContext { CarIds = new List<Guid> { id } };
    await executor.ExecuteUserAction(loadContext, id, action); // N+1 queries!
}
```

## Troubleshooting

### Common Issues

**Issue: Action not allowed / ForbiddenException**
- **Cause**: Action not returned by `GetAllowedActions` for current user/state
- **Solution**: Check authorization logic in `GetAllowedActions`. Verify user permissions and entity state.

**Issue: Triggered actions not executing**
- **Cause**: `GetTriggeredActions` not implemented or returning empty
- **Solution**: Implement `GetTriggeredActions` and ensure it returns appropriate actions based on entity state

**Issue: Changes not persisting to database**
- **Cause**: `SaveContexts` not implemented or not calling `SaveChangesAsync`
- **Solution**: Ensure `SaveContexts` saves all changes to database

**Issue: Bulk operations timing out**
- **Cause**: Loading too many entities at once
- **Solution**: Process in batches:
  ```csharp
  var batches = allIds.Chunk(100); // Process 100 at a time
  foreach (var batch in batches)
  {
      await executor.ExecuteBulkActions(
          new CarLoadContext { CarIds = batch.ToList() },
          /* ... */
      );
  }
  ```

**Issue: Concurrent modification errors**
- **Cause**: Multiple users editing same entity
- **Solution**: Implement optimistic concurrency with row versions:
  ```csharp
  public class CarItem
  {
      [Timestamp]
      public byte[] RowVersion { get; set; }
  }
  ```

## Project Structure Location

- **Path**: `Astrolabe.Workflow/`
- **Project File**: `Astrolabe.Workflow.csproj`
- **Namespace**: `Astrolabe.Workflow`

## Related Documentation

- [AbstractWorkflowExecutor-Guide.md](../../AbstractWorkflowExecutor-Guide.md) - Detailed implementation guide
- [Astrolabe.Common](./astrolabe-common.md) - Base exceptions
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines
