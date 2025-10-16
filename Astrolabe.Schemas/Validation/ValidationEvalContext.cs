using Astrolabe.Controls;

namespace Astrolabe.Schemas.Validation;

/// <summary>
/// Interface for the validation evaluation context passed to validator evaluators.
/// Provides access to validation state, data, and methods for registering validators.
/// </summary>
public interface IValidationEvalContext
{
    /// <summary>
    /// Adds a synchronous validator function.
    /// The validator receives a ChangeTracker to enable reactive dependency tracking.
    /// </summary>
    /// <param name="validate">Function that validates a value and returns an error message (or null if valid)</param>
    void AddSync(Func<object?, ChangeTracker, string?> validate);

    /// <summary>
    /// Control tracking whether validation is enabled (based on visibility).
    /// </summary>
    IControl<bool> ValidationEnabled { get; }

    /// <summary>
    /// The parent data node containing this field.
    /// </summary>
    SchemaDataNode ParentData { get; }

    /// <summary>
    /// The data node being validated.
    /// </summary>
    SchemaDataNode Data { get; }

    /// <summary>
    /// The schema interface for field operations.
    /// </summary>
    ISchemaInterface SchemaInterface { get; }

    /// <summary>
    /// Optional variables dictionary for advanced scenarios.
    /// </summary>
    IDictionary<string, IControl>? Variables { get; }
}

/// <summary>
/// Default implementation of IValidationEvalContext.
/// Collects validator functions and provides access to validation state.
/// </summary>
public class ValidationEvalContext : IValidationEvalContext
{
    private readonly List<Func<object?, ChangeTracker, string?>> _syncValidators = new();

    /// <summary>
    /// Adds a synchronous validator to the collection.
    /// </summary>
    public void AddSync(Func<object?, ChangeTracker, string?> validate) => _syncValidators.Add(validate);

    /// <summary>
    /// Gets all registered sync validators.
    /// </summary>
    public IEnumerable<Func<object?, ChangeTracker, string?>> GetSyncValidators() => _syncValidators;

    public required IControl<bool> ValidationEnabled { get; init; }
    public required SchemaDataNode ParentData { get; init; }
    public required SchemaDataNode Data { get; init; }
    public required ISchemaInterface SchemaInterface { get; init; }
    public IDictionary<string, IControl>? Variables { get; init; }
}
