using System.Collections.Immutable;
using System.Text.Json.Nodes;
using Astrolabe.Evaluator;
using Astrolabe.Evaluator.Functions;

namespace Astrolabe.Validation;

/// <summary>
/// Validation metadata stored in ValueExpr.Data during rule evaluation.
/// Accumulated through Deps and collected at the end.
/// </summary>
public record ValidationData(
    IEnumerable<Failure> Failures,
    string? Message = null,
    ImmutableDictionary<string, object?>? Properties = null
);

public static class RuleValidator
{
    public const string RuleFunction = "ValidatorRule";

    /// <summary>
    /// Wrap a comparison function to track failures when result is false.
    /// </summary>
    private static FunctionHandler WrapValidation(FunctionHandler handler, string funcName)
    {
        return (env, call) =>
        {
            var result = handler(env, call);

            if (result is not ValueExpr { Value: false } ve)
                return result;
            // Evaluate args to capture in failure record
            var evaledArgs = call.Args.Select(env.EvaluateExpr).OfType<ValueExpr>().ToList();

            var failure = new Failure(call, evaledArgs);
            var validationData = new ValidationData([failure]);

            // Attach validation data, preserve existing deps
            return ve with
            {
                Data = validationData,
            };
        };
    }

    /// <summary>
    /// WithMessage($msg, $expr) - evaluate expr with message context.
    /// </summary>
    private static readonly FunctionHandler WithMessageHandler = (env, call) =>
    {
        if (call.Args.Count != 2)
            return ValueExpr.WithError(null, "WithMessage expects 2 arguments");

        var msgResult = env.EvaluateExpr(call.Args[0]);
        var exprResult = env.EvaluateExpr(call.Args[1]);

        if (exprResult is not ValueExpr ve)
            return exprResult;

        var message = (msgResult as ValueExpr)?.Value as string;
        var existingData = ve.Data as ValidationData ?? new ValidationData([]);

        var deps = (ve.Deps ?? []).ToList();
        if (msgResult is ValueExpr msgVal)
            deps.Add(msgVal);

        return ve with
        {
            Data = existingData with { Message = message },
            Deps = deps,
        };
    };

    /// <summary>
    /// WithProperty($key, $value, $expr) - add property to context.
    /// </summary>
    private static readonly FunctionHandler WithPropertyHandler = (env, call) =>
    {
        if (call.Args.Count != 3)
            return ValueExpr.WithError(null, "WithProperty expects 3 arguments");

        var keyResult = env.EvaluateExpr(call.Args[0]);
        var valueResult = env.EvaluateExpr(call.Args[1]);
        var exprResult = env.EvaluateExpr(call.Args[2]);

        if (exprResult is not ValueExpr ve)
            return exprResult;

        var key = (keyResult as ValueExpr)?.Value as string;
        var value = (valueResult as ValueExpr)?.Value;

        var existingData = ve.Data as ValidationData ?? new ValidationData([]);
        var props = existingData.Properties ?? ImmutableDictionary<string, object?>.Empty;

        if (key != null)
            props = props.SetItem(key, value);

        return ve with
        {
            Data = existingData with { Properties = props },
        };
    };

    /// <summary>
    /// ValidatorRule($path, $must, $props) - evaluate rule and collect results.
    /// </summary>
    private static readonly FunctionHandler ValidatorRuleHandler = (env, call) =>
    {
        if (call.Args.Count < 2)
            return ValueExpr.WithError(null, "ValidatorRule requires at least 2 arguments");

        var pathResult = env.EvaluateExpr(call.Args[0]) as ValueExpr;
        var mustResult = env.EvaluateExpr(call.Args[1]) as ValueExpr;

        // Evaluate props if provided (3rd argument)
        var propsResult = call.Args.Count > 2 ? env.EvaluateExpr(call.Args[2]) as ValueExpr : null;

        if (pathResult == null || mustResult == null)
            return ValueExpr.WithError(null, "ValidatorRule requires path and must expressions");

        // Collect all validation data from the must expression tree
        var validationData = CollectValidationData(mustResult);

        // Merge properties from props expression (if any)
        var properties = validationData.Properties ?? ImmutableDictionary<string, object?>.Empty;
        if (propsResult?.Data is ValidationData { Properties: not null } propsData)
        {
            foreach (var (key, value) in propsData.Properties)
            {
                properties = properties.SetItem(key, value);
            }
        }

        // Collect all errors from the must expression tree
        var errors = ValueExpr.CollectAllErrors(mustResult);

        // Create EvaluatedRule record
        var rule = new EvaluatedRule(
            pathResult.Path ?? DataPath.Empty,
            pathResult.Value,
            mustResult,
            validationData.Failures,
            errors,
            validationData.Message,
            ValueExpr.ExtractAllPaths(mustResult),
            properties
        );

        // Return path value with rule attached (for chaining)
        return pathResult with
        {
            Data = rule,
            Deps = [mustResult],
        };
    };

    /// <summary>
    /// Collect all validation data from a ValueExpr tree.
    /// Mirrors CollectAllErrors/ExtractAllPaths patterns.
    /// </summary>
    public static ValidationData CollectValidationData(ValueExpr expr)
    {
        var failures = new List<Failure>();
        string? message = null;
        var properties = ImmutableDictionary<string, object?>.Empty;
        var seen = new HashSet<ValueExpr>();

        Collect(expr);
        return new ValidationData(failures, message, properties);

        void Collect(ValueExpr ve)
        {
            if (!seen.Add(ve))
                return; // Cycle detection

            if (ve.Data is ValidationData vd)
            {
                failures.AddRange(vd.Failures);
                if (vd.Message != null)
                    message ??= vd.Message; // First message wins
                if (vd.Properties != null)
                    properties = properties.SetItems(vd.Properties);
            }

            if (ve.Deps == null)
                return;
            foreach (var dep in ve.Deps)
                Collect(dep);
        }
    }

    /// <summary>
    /// Create a validator environment with wrapped comparison functions.
    /// </summary>
    public static BasicEvalEnv CreateValidatorEnv(
        object? data = null,
        Func<object?, object?, int>? compare = null
    )
    {
        var functions = new Dictionary<string, EvalExpr>();

        // Add default functions with validation wrappers for comparisons
        foreach (var (name, handler) in DefaultFunctions.FunctionHandlers)
        {
            var wrappedHandler = name switch
            {
                "=" or "!=" or ">" or "<" or ">=" or "<=" or "notEmpty" => WrapValidation(
                    handler,
                    name
                ),
                _ => handler,
            };
            functions[name] = new ValueExpr(wrappedHandler);
        }

        // Add validator-specific functions
        functions[RuleFunction] = new ValueExpr(ValidatorRuleHandler);
        functions["WithMessage"] = new ValueExpr(WithMessageHandler);
        functions["WithProperty"] = new ValueExpr(WithPropertyHandler);

        return EvalEnvFactory.CreateBasicEnv(data, functions, compare);
    }

    /// <summary>
    /// Validate JSON data against a rule.
    /// </summary>
    public static List<EvaluatedRule> ValidateJson(JsonNode data, Rule rule, LetExpr? variables)
    {
        var env = CreateValidatorEnv(JsonDataLookup.FromObject(data));
        return ValidateRules(env, rule, variables);
    }

    /// <summary>
    /// Validate rules using an existing environment.
    /// </summary>
    public static List<EvaluatedRule> ValidateRules(
        BasicEvalEnv baseEnv,
        Rule rule,
        LetExpr? variables
    )
    {
        var ruleExpr = ToExpr(rule);
        if (variables != null)
            ruleExpr = variables with { In = ruleExpr };

        var result = baseEnv.EvaluateExpr(ruleExpr);

        // Collect all rules from result tree
        return CollectRules(result as ValueExpr);
    }

    /// <summary>
    /// Collect all EvaluatedRule instances from a ValueExpr tree.
    /// </summary>
    private static List<EvaluatedRule> CollectRules(ValueExpr? expr)
    {
        if (expr == null)
            return [];

        var rules = new List<EvaluatedRule>();
        var seen = new HashSet<ValueExpr>();

        Collect(expr);
        return rules;

        void Collect(ValueExpr ve)
        {
            if (!seen.Add(ve))
                return;

            if (ve.Data is EvaluatedRule rrd)
                rules.Add(rrd);

            // Also check array values
            if (ve.Value is ArrayValue av)
                foreach (var elem in av.Values)
                    Collect(elem);

            if (ve.Deps == null)
                return;
            foreach (var dep in ve.Deps)
                Collect(dep);
        }
    }

    private static EvalExpr ToExpr(Rule rule)
    {
        return rule switch
        {
            ForEachRule rulesForEach => DoRulesForEach(rulesForEach),
            SingleRule pathRule => DoPathRule(pathRule),
            MultiRule multi => DoMultiRule(multi),
            _ => throw new ArgumentException($"Unknown rule type: {rule.GetType()}"),
        };

        EvalExpr DoMultiRule(MultiRule multiRule)
        {
            return new ArrayExpr(multiRule.Rules.Select(ToExpr));
        }

        EvalExpr DoPathRule(SingleRule pathRule)
        {
            return new CallExpr(RuleFunction, [pathRule.Path, pathRule.Must, pathRule.Props]);
        }

        EvalExpr DoRulesForEach(ForEachRule rules)
        {
            var ruleExpr = ToExpr(rules.Rule);
            if (rules.Variables != null)
                ruleExpr = rules.Variables with { In = ruleExpr };
            return CallExpr.Map(rules.Path, new LambdaExpr(rules.Index.Name, ruleExpr));
        }
    }
}

public record Failure(CallExpr Call, IList<ValueExpr> EvaluatedArgs);

public record EvaluatedRule(
    DataPath Path,
    object? PathValue,
    ValueExpr Result,
    IEnumerable<Failure> Failures,
    IEnumerable<string> Errors,
    string? Message,
    IEnumerable<DataPath> DependentData,
    IDictionary<string, object?> Properties
)
{
    public T? GetProperty<T>(string key)
    {
        if (Properties.TryGetValue(key, out var res) && res is T asT)
        {
            return asT;
        }
        return default;
    }
}
