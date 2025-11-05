namespace Astrolabe.Evaluator;

/// <summary>
/// Specialized environment for partial evaluation that distinguishes between
/// compile-time values (variables) and runtime fields (properties).
/// </summary>
public class PartialEvalEnvironment : EvalEnvironment
{
    public PartialEvalEnvironment(EvalEnvironmentState state)
        : base(state) { }

    /// <summary>
    /// Override Evaluate to accept ValueExpr and CallExpr with all ValueExpr arguments.
    /// This allows calling function handlers during partial evaluation.
    /// </summary>
    public override EnvironmentValue<ValueExpr> Evaluate(EvalExpr evalExpr)
    {
        switch (evalExpr)
        {
            case ValueExpr ve:
                return this.WithValue(ve);

            case CallExpr ce when ce.Args.All(arg => arg is ValueExpr):
                // All arguments are ValueExpr - can call function handler
                return this.DefaultEvaluate(ce);

            default:
                throw new InvalidOperationException(
                    "PartialEvalEnvironment.Evaluate only accepts ValueExpr or CallExpr with all ValueExpr arguments. " +
                    "Use PartialEvaluator methods for partial evaluation."
                );
        }
    }

    /// <summary>
    /// Check if a variable is defined in the environment (compile-time value).
    /// </summary>
    public bool HasVariable(string name)
    {
        var current = State;
        while (current != null)
        {
            if (current.LocalVariables.ContainsKey(name))
                return true;
            current = current.Parent;
        }
        return false;
    }

    /// <summary>
    /// Check if there is any data context (for PropertyExpr evaluation).
    /// Returns false if current value is Undefined or null (no data context).
    /// </summary>
    public bool HasDataContext()
    {
        var current = State.Current;
        // If current value is Undefined or null, there's no data context
        return current != ValueExpr.Undefined && current.Value != null;
    }

    /// <summary>
    /// Try to get a variable value if it exists.
    /// Returns null if the variable is not found.
    /// </summary>
    public ValueExpr? TryGetVariable(string name)
    {
        var expr = State.LookupVariable(name);
        return expr as ValueExpr;
    }

    /// <summary>
    /// Override NewEnv to return PartialEvalEnvironment instances.
    /// </summary>
    protected override EvalEnvironment NewEnv(EvalEnvironmentState newState)
    {
        return new PartialEvalEnvironment(newState);
    }

    /// <summary>
    /// Override WithVariable to not evaluate the variable value.
    /// In partial evaluation, we want to keep the raw EvalExpr.
    /// </summary>
    public override EvalEnvironment WithVariable(string name, EvalExpr value)
    {
        // Don't evaluate - just add the value as-is
        return NewEnv(
            State with
            {
                LocalVariables = State.LocalVariables.Add(name, value),
                Parent = State
            }
        );
    }
}
