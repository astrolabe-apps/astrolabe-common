namespace Astrolabe.Evaluator;

/// <summary>
/// Partial evaluator that simplifies expressions by evaluating compile-time known values
/// while preserving runtime expressions.
/// </summary>
public static class PartialEvaluator
{
    /// <summary>
    /// Partially evaluates an expression given an environment with known values.
    /// Returns a simplified expression tree with compile-time values substituted.
    /// </summary>
    public static EvalExpr PartialEvaluate(this PartialEvalEnvironment env, EvalExpr expr)
    {
        return PartialEvaluateExpr(env, expr);
    }

    private static EvalExpr PartialEvaluateExpr(PartialEvalEnvironment env, EvalExpr expr)
    {
        return expr switch
        {
            // Already a value - return as-is
            ValueExpr v => v,

            // Variable - try to resolve
            VarExpr ve => PartialEvaluateVar(env, ve),

            // Property access - try to evaluate, keep as-is if it fails
            PropertyExpr pe => PartialEvaluateProperty(env, pe),

            // Function call - check for special cases
            CallExpr { Function: "?" } ce => PartialEvaluateTernary(env, ce),
            CallExpr { Function: "." } ce => PartialEvaluateFlatMap(env, ce),
            CallExpr ce => PartialEvaluateCall(env, ce),

            // Array literal
            ArrayExpr ae => PartialEvaluateArray(env, ae),

            // Let binding
            LetExpr le => PartialEvaluateLet(env, le),

            // Lambda - partially evaluate the body
            LambdaExpr lambda => PartialEvaluateLambda(env, lambda),

            _ => expr
        };
    }

    private static bool IsFullyEvaluated(EvalExpr expr)
    {
        return expr is ValueExpr;
    }

    private static EvalExpr PartialEvaluateVar(PartialEvalEnvironment env, VarExpr varExpr)
    {
        // Check if variable exists and get its value
        var value = env.TryGetVariable(varExpr.Name);
        if (value != null)
        {
            // Variable is defined with a compile-time value
            return value;
        }

        // Variable not found - keep as VarExpr (will be runtime value)
        return varExpr;
    }

    private static EvalExpr PartialEvaluateProperty(PartialEvalEnvironment env, PropertyExpr propExpr)
    {
        // Check if there's any data context at all
        if (!env.HasDataContext())
        {
            // No data context - this is a runtime field
            return propExpr;
        }

        // There's data context - evaluate the property access
        // (will return null/undefined if property doesn't exist, which is fine)
        var current = env.State.Current;

        if (current.Value is ObjectValue ov)
        {
            // Try to get the property value
            if (ov.Properties.TryGetValue(propExpr.Property, out var propValue))
            {
                return propValue;
            }
            // Property doesn't exist - return null ValueExpr
            return ValueExpr.Null;
        }

        // Current value is not an object - can't access property
        return ValueExpr.Null;
    }

    private static EvalExpr PartialEvaluateFlatMap(PartialEvalEnvironment env, CallExpr ce)
    {
        // ce.Args = [left, right] for the . operator
        var left = PartialEvaluateExpr(env, ce.Args[0]);
        var right = ce.Args[1];

        // If left is fully evaluated to an ObjectValue, update the environment's current context
        if (left is ValueExpr { Value: ObjectValue })
        {
            // Update environment with this value as current context
            var newEnv = (PartialEvalEnvironment)env.WithCurrent((ValueExpr)left);
            // Partially evaluate the right side with the new context
            return PartialEvaluateExpr(newEnv, right);
        }

        // If left is fully evaluated to an ArrayValue, we need to map over it
        if (left is ValueExpr { Value: ArrayValue av })
        {
            // For arrays, we'd need to map the partial evaluator over each element
            // For now, if we can't fully evaluate, keep as CallExpr
            var partialRight = PartialEvaluateExpr(env, right);
            if (IsFullyEvaluated(partialRight))
            {
                // Both sides evaluated, can try to execute
                try
                {
                    var reconstructed = new CallExpr(".", [left, partialRight], ce.Location);
                    var result = env.Evaluate(reconstructed);
                    return result.Value;
                }
                catch
                {
                    // Fall through to return CallExpr
                }
            }
            return new CallExpr(".", [left, partialRight], ce.Location);
        }

        // If left is null/undefined, return it
        if (left is ValueExpr ve && (ve.Value == null || ve == ValueExpr.Undefined))
        {
            return left;
        }

        // Otherwise, partially evaluate right and reconstruct
        var simplifiedRight = PartialEvaluateExpr(env, right);
        return new CallExpr(".", [left, simplifiedRight], ce.Location);
    }

    private static EvalExpr PartialEvaluateTernary(PartialEvalEnvironment env, CallExpr ce)
    {
        // ce.Args = [condition, trueBranch, falseBranch]
        var condition = PartialEvaluateExpr(env, ce.Args[0]);

        if (condition is ValueExpr condValue)
        {
            // Condition is known - pick the appropriate branch
            // Convert to bool - treat null/undefined/false as false, everything else as true
            bool isTrue = condValue.Value switch
            {
                null => false,
                bool b => b,
                _ => condValue != ValueExpr.Undefined
            };

            var selectedBranch = isTrue ? ce.Args[1] : ce.Args[2];
            return PartialEvaluateExpr(env, selectedBranch);
        }
        else
        {
            // Condition is unknown - simplify all three parts
            var trueBranch = PartialEvaluateExpr(env, ce.Args[1]);
            var falseBranch = PartialEvaluateExpr(env, ce.Args[2]);
            return new CallExpr("?", [condition, trueBranch, falseBranch], ce.Location);
        }
    }

    private static EvalExpr PartialEvaluateCall(PartialEvalEnvironment env, CallExpr ce)
    {
        // Partially evaluate all arguments
        var partialArgs = ce.Args.Select(arg => PartialEvaluateExpr(env, arg)).ToList();

        // If all arguments are fully evaluated, try to execute the function
        if (partialArgs.All(IsFullyEvaluated))
        {
            // All arguments are ValueExpr - we can call the function handler
            var reconstructed = new CallExpr(ce.Function, partialArgs, ce.Location);

            // Try to evaluate using the standard evaluator
            // The PartialEvalEnvironment.Evaluate accepts ValueExpr only, which is what we have
            try
            {
                var result = env.Evaluate(reconstructed);
                return result.Value;
            }
            catch
            {
                // Evaluation failed - keep as call expression
                // This can happen if the function doesn't exist or errors during execution
            }
        }

        // Reconstruct with simplified arguments
        return new CallExpr(ce.Function, partialArgs, ce.Location);
    }

    private static EvalExpr PartialEvaluateArray(PartialEvalEnvironment env, ArrayExpr ae)
    {
        var partialElements = ae.Values.Select(v => PartialEvaluateExpr(env, v)).ToList();

        // If all elements are fully evaluated, create an ArrayValue
        if (partialElements.All(IsFullyEvaluated))
        {
            var values = partialElements.Cast<ValueExpr>().ToList();
            return new ValueExpr(new ArrayValue(values));
        }

        // Otherwise, keep as ArrayExpr with simplified elements
        return new ArrayExpr(partialElements, ae.Location);
    }

    private static EvalExpr PartialEvaluateLet(PartialEvalEnvironment env, LetExpr le)
    {
        // Partially evaluate each binding and extend the environment
        var newEnv = env;
        var newVars = new List<(VarExpr, EvalExpr)>();

        foreach (var (varExpr, bindingExpr) in le.Vars)
        {
            var partialBinding = PartialEvaluateExpr(newEnv, bindingExpr);

            if (partialBinding is ValueExpr)
            {
                // Binding is fully evaluated - add to environment for future lookups
                newEnv = (PartialEvalEnvironment)newEnv.WithVariable(varExpr.Name, partialBinding);
            }
            else
            {
                // Binding has runtime dependencies - keep in let expression
                newVars.Add((varExpr, partialBinding));
            }
        }

        // Partially evaluate the body with the extended environment
        var partialBody = PartialEvaluateExpr(newEnv, le.In);

        // If no variables remain, just return the body
        if (newVars.Count == 0)
        {
            return partialBody;
        }

        // Reconstruct let expression with remaining variables
        return new LetExpr(newVars, partialBody, le.Location);
    }

    private static EvalExpr PartialEvaluateLambda(PartialEvalEnvironment env, LambdaExpr lambda)
    {
        // Lambda parameters are unknown at compile-time, but we can still partially
        // evaluate the body using the compile-time values available in the environment

        // The lambda parameter ($x, $i, etc.) is an unknown runtime value
        // We don't add it to the environment, so references to it will remain as VarExpr

        // Partially evaluate the lambda body
        var partialBody = PartialEvaluateExpr(env, lambda.Value);

        // If the body hasn't changed, return the original lambda
        if (ReferenceEquals(partialBody, lambda.Value))
        {
            return lambda;
        }

        // Reconstruct lambda with simplified body
        return new LambdaExpr(lambda.Variable, partialBody, lambda.Location);
    }
}
