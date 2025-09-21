# AbstractWorkflowExecutor Pattern Guidelines

**Recommendation**: Use AbstractWorkflowExecutor for implementing CRUD operations on entities that require workflow states, audit events, bulk operations, or authorization checks.

AbstractWorkflowExecutor provides a structured approach to entity operations with built-in support for:
- Multi-step operations with action queuing
- Audit event tracking
- Authorization through workflow rules
- Bulk operations across multiple entities
- Simple workflow state management (Draft → Published → Rejected)

## Core Components

Every workflow executor implementation requires four main components:

1. **Edit Context** - Holds entity state and pending actions
2. **Load Context** - Defines what data to load and initial actions
3. **Action Types** - Define operations that can be performed
4. **Workflow Rules** - Define authorization for workflow actions

## Implementation Structure

```csharp
// 1. Define workflow context interface
public interface IMyEntityWorkflowContext
{
    MyEntityWorkflow EntityWorkflow { get; }
    Guid CurrentUser { get; }
    IList<PersonRole> Roles { get; }
}

// 2. Define your action interface and concrete actions
public interface IMyEntityAction;

public record EditEntityAction(MyEntityEdit Edit, bool AddEvent = true) : IMyEntityAction;
public record SimpleWorkflowAction(WorkflowAction Action) : IMyEntityAction;

// 3. Create the edit context (implements IWorkflowActionList)
public record MyEntityEditContext(
    AppDbContext DbContext,
    MyEntity Entity,
    Guid CurrentUserId,
    IList<PersonRole> UserRoles,
    IEnumerable<IMyEntityAction> Actions,
    bool IsNew = false,
    IEnumerable<AuditEvent>? Events = null
) : IMyEntityWorkflowContext, IWorkflowActionList<MyEntityEditContext, IMyEntityAction>
{
    public MyEntityWorkflow EntityWorkflow => Entity;
    public Guid CurrentUser => CurrentUserId;
    public IList<PersonRole> Roles => UserRoles;
    
    public (ICollection<IMyEntityAction>, MyEntityEditContext) NextActions()
    {
        return (Actions.ToList(), this with { Actions = [] });
    }
}

// 4. Create the load context
public record MyEntityLoadContext(
    AppDbContext DbContext,
    ICollection<Guid> EntityIds,
    Func<MyEntity, IEnumerable<IMyEntityAction>> ActionGenerator,
    ClaimsPrincipal User
);

// 5. Define workflow rules
public static class MyEntityWorkflowRules
{
    public static readonly WorkflowRuleList<WorkflowAction, IMyEntityWorkflowContext> Rules = new(
        [
            WorkflowAction.Submit.WhenStatusAndRoles(
                new Dictionary<EntityStatus, PersonRole[]>
                {
                    { EntityStatus.Draft, [PersonRole.User, PersonRole.Admin] },
                    { EntityStatus.Rejected, [PersonRole.User, PersonRole.Admin] }
                }
            ),
            WorkflowAction.Reject.WhenStatusAndRoles(
                new Dictionary<EntityStatus, PersonRole[]>
                {
                    { EntityStatus.Published, [PersonRole.Admin, PersonRole.Manager] }
                }
            )
        ]
    );
}

// 6. Implement the workflow executor
public class MyEntityWorkflowExecutor 
    : AbstractWorkflowExecutor<MyEntityEditContext, MyEntityLoadContext, IMyEntityAction>
{
    public override async Task<IEnumerable<MyEntityEditContext>> LoadData(MyEntityLoadContext loadContext)
    {
        var userId = loadContext.User.GetPersonId();
        var roles = loadContext.User.GetPersonRoles();
        var dbContext = loadContext.DbContext;
        
        if (loadContext.EntityIds.Count == 0)
        {
            // Create new entity
            var entity = new MyEntity
            {
                Status = EntityStatus.Draft,
                CreatedAt = DateTime.UtcNow,
                CreatedById = userId
            };
            dbContext.MyEntities.Add(entity);
            
            var actions = loadContext.ActionGenerator(entity);
            return [new MyEntityEditContext(
                dbContext, entity, userId, roles, actions, IsNew: true
            )];
        }
        
        // Load existing entities
        var entities = await dbContext.MyEntities
            .Where(x => loadContext.EntityIds.Contains(x.Id))
            .ToListAsync();
            
        return entities.Select(entity => {
            var actions = loadContext.ActionGenerator(entity);
            return new MyEntityEditContext(
                dbContext, entity, userId, roles, actions
            );
        });
    }
    
    public override async Task<MyEntityEditContext> PerformAction(MyEntityEditContext context, IMyEntityAction action)
    {
        return action switch
        {
            EditEntityAction(var edit, var addEvent) => await HandleEdit(context, edit, addEvent),
            SimpleWorkflowAction(var workflowAction) => HandleWorkflowAction(context, workflowAction),
            _ => throw new ArgumentOutOfRangeException(nameof(action))
        };
    }
    
    protected override async Task<MyEntityEditContext> AfterActions(MyEntityEditContext context)
    {
        // Add audit events to database
        if (context.Events != null)
            context.DbContext.AuditEvent.AddRange(context.Events);
            
        return context with { Events = null };
    }
    
    private async Task<MyEntityEditContext> HandleEdit(MyEntityEditContext context, MyEntityEdit edit, bool addEvent)
    {
        // Apply validation using FluentValidation
        var validator = new MyEntityEditValidator(context.DbContext);
        await validator.ValidateAndThrowAsync(edit);
        
        // Apply changes to entity
        context.Entity.Name = edit.Name;
        context.Entity.Description = edit.Description;
        context.Entity.UpdatedAt = DateTime.UtcNow;
        
        // Add audit event if requested
        if (addEvent)
        {
            context = context.AddEvent(AuditEventType.EntityEdited, "Entity updated");
        }
        
        return context;
    }
    
    private MyEntityEditContext HandleWorkflowAction(MyEntityEditContext context, WorkflowAction workflowAction)
    {
        // Check authorization using workflow rules
        if (!MyEntityWorkflowRules.Rules.GetMatchingActions(context).Contains(workflowAction))
            throw new UnauthorizedException();
            
        return workflowAction switch
        {
            WorkflowAction.Submit => context.ModifyStatus(EntityStatus.Published),
            WorkflowAction.Reject => context.ModifyStatus(EntityStatus.Rejected),
            _ => throw new ArgumentOutOfRangeException()
        };
    }
}
```

## Service Integration

Integrate the workflow executor in your service with a generic workflow action method:

```csharp
public class MyEntityService
{
    private readonly AppDbContext _dbContext;
    private static readonly MyEntityWorkflowExecutor WorkflowRunner = new();
    
    public async Task<List<Guid>> PerformActions(
        Func<MyEntity, IEnumerable<IMyEntityAction>> actionGenerator,
        IEnumerable<Guid> entityIds,
        ClaimsPrincipal user,
        bool saveChanges = true)
    {
        var loadContext = new MyEntityLoadContext(
            _dbContext,
            entityIds.ToList(),
            actionGenerator,
            user
        );
        
        var entities = await WorkflowRunner.LoadData(loadContext);
        var finishedEntities = new List<MyEntityEditContext>();
        
        foreach (var entityContext in entities)
        {
            finishedEntities.Add(await WorkflowRunner.ApplyChanges(entityContext));
        }
        
        if (saveChanges)
            await _dbContext.SaveChangesAsync();
            
        return finishedEntities.Select(x => x.Entity.Id).ToList();
    }
    
    // Convenient methods for common operations
    public async Task<Guid> CreateEntity(MyEntityEdit entityEdit, ClaimsPrincipal user)
    {
        var results = await PerformActions(_ => [new EditEntityAction(entityEdit)], [], user);
        return results[0];
    }
    
    public async Task<Guid> UpdateEntity(Guid id, MyEntityEdit entityEdit, ClaimsPrincipal user)
    {
        var results = await PerformActions(_ => [new EditEntityAction(entityEdit)], [id], user);
        return results[0];
    }
    
    // Generic workflow action method - handles any WorkflowAction (single entity)
    public async Task PerformWorkflowAction(Guid id, WorkflowAction action, ClaimsPrincipal user)
    {
        await PerformActions(_ => [new SimpleWorkflowAction(action)], [id], user);
    }
    
    // Bulk workflow action method - handles any WorkflowAction (multiple entities)
    public async Task PerformWorkflowActionBulk(IEnumerable<Guid> ids, WorkflowAction action, ClaimsPrincipal user)
    {
        await PerformActions(_ => [new SimpleWorkflowAction(action)], ids, user);
    }
    
    // Example of conditional actions based on entity state (single entity)
    public async Task ProcessEntityWithConditionalActions(Guid id, ClaimsPrincipal user)
    {
        await PerformActions(entity => 
        {
            var actions = new List<IMyEntityAction>();
            
            // Always validate the entity
            actions.Add(new ValidateEntityAction());
            
            // Conditionally add actions based on entity state
            if (entity.Status == EntityStatus.Draft && entity.IsReadyForSubmission())
            {
                actions.Add(new SimpleWorkflowAction(WorkflowAction.Submit));
            }
            
            if (entity.RequiresNotification())
            {
                actions.Add(new SendNotificationAction(entity.GetNotificationRecipients()));
            }
            
            return actions;
        }, [id], user);
    }
    
    // Example of bulk processing with conditional actions
    public async Task ProcessEntitiesBulkWithConditionalActions(IEnumerable<Guid> ids, ClaimsPrincipal user)
    {
        await PerformActions(entity => 
        {
            var actions = new List<IMyEntityAction>();
            
            // Different actions based on each entity's state
            switch (entity.Status)
            {
                case EntityStatus.Draft when entity.IsReadyForSubmission():
                    actions.Add(new SimpleWorkflowAction(WorkflowAction.Submit));
                    break;
                    
                case EntityStatus.Published when entity.RequiresArchival():
                    actions.Add(new ArchiveEntityAction());
                    break;
                    
                case EntityStatus.Error:
                    actions.Add(new RetryProcessingAction());
                    break;
            }
            
            return actions;
        }, ids, user);
    }
    
    // Get available actions for user
    public async Task<IEnumerable<WorkflowAction>> GetUserActions(Guid id, ClaimsPrincipal user)
    {
        var existingEntity = await _dbContext.MyEntities
            .Where(x => x.Id == id)
            .AsNoTracking()
            .SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(existingEntity);
        
        var roles = user.GetPersonRoles();
        var context = new SimpleMyEntityWorkflowContext(existingEntity, user.GetPersonId(), roles);
        
        return MyEntityWorkflowRules.Rules.GetMatchingActions(context);
    }
}

// Simple context for authorization checks without full edit context
public record SimpleMyEntityWorkflowContext(
    MyEntityWorkflow EntityWorkflow,
    Guid CurrentUser,
    IList<PersonRole> Roles
) : IMyEntityWorkflowContext;
```

## Controller Usage

The controller can then use the generic workflow action method:

```csharp
[ApiController]
[Route("api/[controller]")]
public class MyEntitiesController : ControllerBase
{
    private readonly MyEntityService _entityService;
    
    public MyEntitiesController(MyEntityService entityService)
    {
        _entityService = entityService;
    }
    
    [HttpPost]
    public async Task<MyEntityView> CreateEntity(MyEntityEdit entityEdit)
    {
        var id = await _entityService.CreateEntity(entityEdit, User);
        return await GetEntity(id);
    }
    
    [HttpPut("{id}")]
    public async Task<MyEntityView> UpdateEntity(Guid id, MyEntityEdit entityEdit)
    {
        await _entityService.UpdateEntity(id, entityEdit, User);
        return await GetEntity(id);
    }
    
    // Generic workflow action endpoint
    [HttpPost("{id}/actions/{action}")]
    public async Task PerformWorkflowAction(Guid id, WorkflowAction action)
    {
        await _entityService.PerformWorkflowAction(id, action, User);
    }
    
    [HttpGet("{id}/actions")]
    public async Task<IEnumerable<WorkflowAction>> GetUserActions(Guid id)
    {
        return await _entityService.GetUserActions(id, User);
    }
}
```

## Extension Methods for Context Manipulation

```csharp
public static class MyEntityEditContextExtensions
{
    public static MyEntityEditContext ModifyStatus(this MyEntityEditContext context, EntityStatus status)
    {
        return context
            .AddEvent(AuditEventType.StatusChange, $"Status changed from {context.Entity.Status} to {status}")
            .ModifyEntity(x => x.Status = status);
    }
    
    public static MyEntityEditContext ModifyEntity(this MyEntityEditContext context, Action<MyEntity> changeEntity)
    {
        changeEntity(context.Entity);
        return context;
    }
    
    public static MyEntityEditContext AddEvent(
        this MyEntityEditContext context, 
        AuditEventType eventType, 
        string message)
    {
        var currentEvents = context.Events ?? [];
        var newEvent = new AuditEvent
        {
            EventType = eventType,
            Message = message,
            PersonId = context.CurrentUserId,
            Timestamp = DateTime.UtcNow,
            EntityKey = AuditEvent.EntityKeyFor(context.Entity.Id)
        };
        return context with { Events = currentEvents.Append(newEvent) };
    }
}
```

## Workflow Rules Extension Methods

```csharp
public static class MyEntityWorkflowExtensions
{
    public static IWorkflowRule<WorkflowAction, IMyEntityWorkflowContext> WhenStatusAndRoles(
        this WorkflowAction action,
        IDictionary<EntityStatus, PersonRole[]> statusAndRoles
    )
    {
        return ActionWhen(
            action,
            (IMyEntityWorkflowContext x) =>
            {
                return x.EntityWorkflow.Status switch
                {
                    var status when statusAndRoles.ContainsKey(status) => x.Roles.Any(
                        statusAndRoles[status].Contains
                    ),
                    _ => false,
                };
            }
        );
    }
    
    public static IWorkflowRule<WorkflowAction, IMyEntityWorkflowContext> WhenStatus(
        this WorkflowAction action,
        params EntityStatus[] statuses
    )
    {
        return ActionWhen(
            action,
            (IMyEntityWorkflowContext x) => statuses.Contains(x.EntityWorkflow.Status)
        );
    }
    
    public static IWorkflowRule<WorkflowAction, IMyEntityWorkflowContext> WhenRoles(
        this WorkflowAction action,
        params PersonRole[] roles
    )
    {
        return ActionWhen(
            action,
            (IMyEntityWorkflowContext x) => x.Roles.Any(roles.Contains)
        );
    }
}
```

## Database Context Flexibility

While Entity Framework Core is assumed, the pattern works with any data context:

```csharp
// For Dataverse/Power Platform:
public record DataverseLoadContext(
    ServiceContext DataverseContext,  // Instead of AppDbContext
    ICollection<Guid> EntityIds,
    IEnumerable<IMyEntityAction> Actions,
    ClaimsPrincipal User
);

// Usage remains the same, just different context type
```

## Core Benefits

1. **Consistent Audit Trail**: All operations automatically generate audit events
2. **Authorization**: Role-based and status-based authorization through workflow rules
3. **Generic Workflow Actions**: Single method handles all workflow state changes
4. **Bulk Operations**: Handle multiple entities with the same action set  
5. **Testability**: Each component can be unit tested independently
6. **Type Safety**: Strongly typed actions and contexts prevent runtime errors
7. **Separation of Concerns**: Business logic separated from HTTP/API concerns

## When to Use AbstractWorkflowExecutor

✅ **Recommended for**:
- Entities with workflow states (Draft, Published, Rejected, etc.)
- Operations requiring audit trails
- Authorization-dependent operations
- Bulk operations across multiple entities  
- CRUD operations with business logic

❌ **Not needed for**:
- Simple lookup/reference data
- Read-only entities
- High-frequency operations where performance is critical
- Operations without business logic or audit requirements

This pattern provides a robust foundation for entity operations with a clean, generic approach to workflow actions while maintaining separation between business logic and API concerns.