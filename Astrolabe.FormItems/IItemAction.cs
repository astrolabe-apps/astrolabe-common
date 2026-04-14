using System.Text.Json;

namespace Astrolabe.FormItems;

/// <summary>
/// Marker interface for actions the item executor understands. The core library
/// defines three built-in records (<see cref="CreateItemAction"/>,
/// <see cref="SimpleWorkflowAction"/>, <see cref="EditMetadataAction"/>); consumers
/// may introduce their own records and handle them via
/// <see cref="AbstractItemExecutor{TContext,TLoadContext}.HandleUnknownAction"/>.
/// </summary>
public interface IItemAction;

/// <summary>
/// Requests creation of a new item of the given form type. The concrete executor
/// is responsible for materialising the entity and persisting it.
/// </summary>
public record CreateItemAction(Guid FormType) : IItemAction;

/// <summary>
/// Requests a named workflow transition (e.g. "Submit", "Approve", "Delete").
/// Permissibility is decided by the workflow rule list; semantics are decided by
/// the concrete executor.
/// </summary>
public record SimpleWorkflowAction(string Action) : IItemAction;

/// <summary>
/// Requests that the item's metadata be replaced with the given JSON payload.
/// Deserialization into the consumer's metadata type is an executor concern.
/// </summary>
public record EditMetadataAction(JsonElement Metadata) : IItemAction;

/// <summary>
/// Requests deletion of the item. Distinct from <see cref="SimpleWorkflowAction"/>
/// because delete is terminal (not a status transition) and typically needs its
/// own authorisation + side effects (cascade, audit, etc.). Whether this means
/// hard delete or a soft-delete status change is the executor's decision.
/// </summary>
public record DeleteItemAction : IItemAction;
