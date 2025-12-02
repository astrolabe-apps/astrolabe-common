namespace Astrolabe.Evaluator.Functions;

/// <summary>
/// FunctionHandler versions of the default functions that work with the new EvalEnv API.
/// </summary>
public static class DefaultFunctions
{
    /// <summary>
    /// Binary function that evaluates both args and applies operation.
    /// Returns symbolic CallExpr if either arg is not fully evaluated.
    /// Null propagation: returns null if either arg is null, even if other is symbolic.
    /// </summary>
    public static FunctionHandler BinFunction(
        string name,
        Func<object, object, EvalEnv, object?> evaluate
    )
    {
        return (env, call) =>
        {
            if (call.Args.Count != 2)
                return call.WithError($"${name} expects 2 arguments");

            var left = env.EvaluateExpr(call.Args[0]);
            var right = env.EvaluateExpr(call.Args[1]);

            var deps = new List<ValueExpr>();

            // Check left for null BEFORE checking if both are values
            // This ensures null propagation even when right is symbolic
            if (left is ValueExpr lv)
            {
                deps.Add(lv);
                if (lv.Value == null)
                {
                    // Left is null - collect right deps if available and return null
                    if (right is ValueExpr rv)
                        deps.Add(rv);
                    return env.WithDeps(ValueExpr.Null, deps);
                }
            }

            // Check right for null
            if (right is ValueExpr rv2)
            {
                deps.Add(rv2);
                if (rv2.Value == null)
                {
                    // Right is null - return null with collected deps
                    return env.WithDeps(ValueExpr.Null, deps);
                }
            }

            // Now check if both are fully evaluated (and neither is null)
            if (left is ValueExpr leftVal && right is ValueExpr rightVal)
            {
                return env.WithDeps(
                    new ValueExpr(evaluate(leftVal.Value!, rightVal.Value!, env)),
                    deps
                );
            }

            // Return symbolic call (at least one arg is not a ValueExpr)
            return new CallExpr(name, [left, right]);
        };
    }

    /// <summary>
    /// Comparison function with partial evaluation support.
    /// </summary>
    public static FunctionHandler ComparisonFunction(string name, Func<int, bool> toResult)
    {
        return BinFunction(name, (a, b, env) => toResult(env.Compare(a, b)));
    }

    /// <summary>
    /// Number operator with partial evaluation support.
    /// Handles both integer and floating-point operations.
    /// </summary>
    public static FunctionHandler NumberOp(
        string name,
        Func<double, double, double> doubleOp,
        Func<long, long, object> longOp
    )
    {
        return BinFunction(
            name,
            (o1, o2, _) =>
            {
                if (ValueExpr.MaybeInteger(o1) is { } l1 && ValueExpr.MaybeInteger(o2) is { } l2)
                {
                    return longOp(l1, l2);
                }
                return doubleOp(ValueExpr.AsDouble(o1), ValueExpr.AsDouble(o2));
            }
        );
    }

    /// <summary>
    /// Unary function with null propagation.
    /// </summary>
    public static FunctionHandler UnaryNullOp(string name, Func<object, object?> evaluate)
    {
        return (env, call) =>
        {
            if (call.Args.Count != 1)
                return call.WithError($"${name} expects 1 argument");

            var arg = env.EvaluateExpr(call.Args[0]);

            if (arg is ValueExpr v)
            {
                if (v.Value == null)
                    return env.WithDeps(new ValueExpr(null), [arg]);

                return env.WithDeps(new ValueExpr(evaluate(v.Value)), [arg]);
            }

            // Return symbolic call
            return new CallExpr(name, [arg]);
        };
    }

    /// <summary>
    /// Short-circuiting boolean operator (AND/OR) with partial evaluation.
    /// </summary>
    private static FunctionHandler ShortCircuitBoolOp(
        string name,
        bool shortCircuitValue,
        bool defaultResult
    )
    {
        return (env, call) =>
        {
            var deps = new List<ValueExpr>();
            var evaluatedArgs = new List<EvalExpr>();
            var identityValue = !shortCircuitValue; // true for AND, false for OR

            foreach (var arg in call.Args)
            {
                var argPartial = env.EvaluateExpr(arg);

                if (argPartial is ValueExpr argResult)
                {
                    deps.Add(argResult);

                    switch (argResult.Value)
                    {
                        // Short-circuit if we hit the short-circuit value
                        case bool b when b == shortCircuitValue:
                            return ValueExpr.WithDeps(shortCircuitValue, deps);
                        // If null, return null
                        case null:
                            return ValueExpr.WithDeps(null, deps);
                    }

                    // If not a boolean, return null (error case)
                    if (argResult.Value is not bool)
                    {
                        return ValueExpr.WithDeps(null, deps);
                    }
                }

                evaluatedArgs.Add(argPartial);
            }

            // Filter out identity values (true for AND, false for OR)
            var filteredArgs = evaluatedArgs
                .Where(arg => arg is not ValueExpr { Value: bool bv } || bv != identityValue)
                .ToList();

            return filteredArgs.Count switch
            {
                // If no args remain after filtering, all were identity values
                0 => ValueExpr.WithDeps(defaultResult, deps),
                // If only one arg remains, return it directly
                1 => filteredArgs[0],
                _ => new CallExpr(name, filteredArgs),
            };

            // Multiple args remain - return CallExpr with filtered args
        };
    }

    /// <summary>
    /// Conditional operator (if/else) with partial evaluation and branch selection.
    /// </summary>
    private static readonly FunctionHandler IfElseOp = (env, call) =>
    {
        if (call.Args.Count != 3)
        {
            return call.WithError("Conditional expects 3 arguments");
        }

        var (condExpr, thenExpr, elseExpr) = (call.Args[0], call.Args[1], call.Args[2]);
        var condPartial = env.EvaluateExpr(condExpr);

        if (condPartial is ValueExpr condVal)
        {
            return condVal.Value switch
            {
                true => EvaluateAndAddDeps(env, thenExpr, condVal),
                false => EvaluateAndAddDeps(env, elseExpr, condVal),
                null => env.WithDeps(new ValueExpr(null), [condVal]),
                _ => call.WithError($"Conditional expects boolean condition: {condVal.Print()}"),
            };
        }

        // Condition is symbolic - partially evaluate both branches
        var thenPartial = env.EvaluateExpr(thenExpr);
        var elsePartial = env.EvaluateExpr(elseExpr);
        return new CallExpr("?", [condPartial, thenPartial, elsePartial]);
    };

    private static EvalExpr EvaluateAndAddDeps(EvalEnv env, EvalExpr expr, ValueExpr condVal)
    {
        var result = env.EvaluateExpr(expr);
        if (result is ValueExpr resultVal)
        {
            return env.WithDeps(resultVal, [condVal]);
        }
        return result;
    }

    /// <summary>
    /// Null coalescing operator (??) with partial evaluation.
    /// </summary>
    private static readonly FunctionHandler NullCoalesceOp = (env, call) =>
    {
        if (call.Args.Count != 2)
        {
            return call.WithError("Null coalescing operator expects 2 arguments");
        }

        var left = env.EvaluateExpr(call.Args[0]);
        var right = env.EvaluateExpr(call.Args[1]);

        if (left is not ValueExpr lv)
            return new CallExpr("??", [left, right]);
        if (lv.Value != null)
        {
            return lv;
        }
        // Left is null, use right
        if (right is ValueExpr rv)
        {
            return env.WithDeps(rv, [lv, rv]);
        }

        // Return symbolic call
        return new CallExpr("??", [left, right]);
    };

    /// <summary>
    /// Sum aggregation function.
    /// </summary>
    private static readonly FunctionHandler SumOp = (env, call) =>
    {
        if (call.Args.Count == 0)
            return ValueExpr.WithDeps(0d, []);

        if (call.Args.Count == 1)
        {
            var arrayPartial = env.EvaluateExpr(call.Args[0]);

            if (arrayPartial is not ValueExpr arrayValue)
                return new CallExpr("sum", [arrayPartial]);

            return arrayValue.Value switch
            {
                ArrayValue av => ValueExpr.WithDeps(
                    av.Values.All(x => x.Value != null)
                        ? av.Values.Aggregate(
                            0d,
                            (acc, next) => acc + ValueExpr.AsDouble(next.Value)
                        )
                        : null,
                    av.Values.ToList()
                ),
                null => arrayValue,
                _ => call.WithError($"$sum requires an array: {arrayValue.Print()}"),
            };
        }

        // Multiple arguments - treat as array of values
        var partials = call.Args.Select(a => env.EvaluateExpr(a)).ToList();
        if (!partials.All(p => p is ValueExpr))
        {
            return new CallExpr("sum", partials);
        }

        var values = partials.Cast<ValueExpr>().ToList();
        return ValueExpr.WithDeps(
            values.All(x => x.Value != null)
                ? values.Aggregate(0d, (acc, next) => acc + ValueExpr.AsDouble(next.Value))
                : null,
            values
        );
    };

    /// <summary>
    /// Count function.
    /// </summary>
    private static readonly FunctionHandler CountOp = (env, call) =>
    {
        switch (call.Args.Count)
        {
            case 0:
                return ValueExpr.WithDeps(0L, []);
            case 1:
            {
                var arrayPartial = env.EvaluateExpr(call.Args[0]);

                if (arrayPartial is not ValueExpr arrayValue)
                    return new CallExpr("count", [arrayPartial]);

                return arrayValue.Value switch
                {
                    ArrayValue av => ValueExpr.WithDeps((long)av.Values.Count(), [arrayValue]),
                    null => ValueExpr.WithDeps(0L, [arrayValue]),
                    _ => call.WithError($"$count requires an array: {arrayValue.Print()}"),
                };
            }
            default:
                // Multiple arguments - count them directly
                return new ValueExpr((long)call.Args.Count);
        }
    };

    /// <summary>
    /// Element access function.
    /// Constant index: returns element with its path preserved, no deps added.
    /// Dynamic index: adds the index as a dependency (with its path preserved).
    /// </summary>
    private static readonly FunctionHandler ElemOp = (env, call) =>
    {
        if (call.Args.Count != 2)
        {
            return call.WithError("elem expects 2 arguments");
        }

        var arrayPartial = env.EvaluateExpr(call.Args[0]);
        var indexPartial = env.EvaluateExpr(call.Args[1]);

        if (arrayPartial is not ValueExpr arrayVal || indexPartial is not ValueExpr indexVal)
        {
            return new CallExpr("elem", [arrayPartial, indexPartial]);
        }

        // Handle null index - return null with index as dependency
        if (indexVal.Value == null)
            return env.WithDeps(ValueExpr.Null, [indexVal]);

        if (arrayVal.Value is not ArrayValue av)
            return env.WithDeps(ValueExpr.Null, [arrayVal, indexVal]);

        var ind = ValueExpr.MaybeIndex(indexVal.Value);
        if (ind == null)
            return env.WithDeps(ValueExpr.Null, [arrayVal, indexVal]);

        var values = av.Values.ToList();
        if (ind < 0 || ind >= values.Count)
            return ValueExpr.Null;

        var element = values[ind.Value];

        // Check if index is CONSTANT or DYNAMIC
        var indexHasDeps = indexVal.Deps?.Any() == true || indexVal.Path != null;

        if (!indexHasDeps)
        {
            // CONSTANT index - preserve element's path, no deps needed
            return element;
        }
        else
        {
            // DYNAMIC index - add index as dep (with its path preserved)
            return env.WithDeps(element, [indexVal]);
        }
    };

    /// <summary>
    /// Map function with lambda support.
    /// </summary>
    private static readonly FunctionHandler MapOp = (env, call) =>
    {
        if (call.Args.Count != 2)
        {
            return call.WithError("map expects 2 arguments");
        }

        var left = call.Args[0];
        var right = call.Args[1];

        var leftPartial = env.EvaluateExpr(left);

        if (leftPartial is not ValueExpr leftValue)
        {
            return new CallExpr("map", [leftPartial, right]);
        }

        if (leftValue.Value is not ArrayValue av)
        {
            return leftValue.Value == null
                ? leftValue
                : call.WithError($"$map requires an array: {leftValue.Print()}");
        }

        var partialResults = av.Values.Select(elem => EvalWithElement(env, elem, right)).ToList();

        // Check if all results are fully evaluated
        if (partialResults.All(r => r is ValueExpr))
        {
            return new ValueExpr(new ArrayValue(partialResults.Cast<ValueExpr>()));
        }

        // Return symbolic array for partially evaluated results
        return new ArrayExpr(partialResults);
    };

    /// <summary>
    /// Filter function with lambda support.
    /// </summary>
    private static readonly FunctionHandler FilterOp = (env, call) =>
    {
        if (call.Args.Count != 2)
        {
            return call.WithError("filter expects 2 arguments");
        }

        var left = call.Args[0];
        var right = call.Args[1];

        var leftPartial = env.EvaluateExpr(left);

        if (leftPartial is not ValueExpr leftValue)
        {
            return new CallExpr("[", [leftPartial, right]);
        }

        switch (leftValue.Value)
        {
            // Handle null
            case null:
                return leftValue;
            // Handle OBJECT property access (obj[key])
            case ObjectValue ov:
            {
                // Evaluate key expression with object as context
                var keyResult = EvalWithIndex(env, leftValue, 0, right);

                if (keyResult is not ValueExpr keyVal)
                    return new CallExpr("[", [leftPartial, right]);

                // Handle null key
                if (keyVal.Value == null)
                    return env.WithDeps(ValueExpr.Null, [keyVal, leftValue]);

                // Get property by key
                var keyStr = keyVal.Value?.ToString();
                if (keyStr == null || !ov.Properties.TryGetValue(keyStr, out var propValue))
                    return ValueExpr.Null;
                // Track key dependency for dynamic keys
                var hasKeyDeps = keyVal.Deps?.Any() == true || keyVal.Path != null;
                var hasObjDeps = leftValue.Deps?.Any() == true;

                if (!hasKeyDeps && !hasObjDeps)
                    return propValue;

                // Key is dynamic OR object has deps
                // Add parent reference with path preserved (matching TypeScript structure)
                var parentWithDeps = new ValueExpr(null) with
                {
                    Deps = [keyVal, .. (leftValue.Deps ?? [])],
                    Path = propValue.Path,
                };

                return propValue with
                {
                    Deps = (propValue.Deps?.ToList() ?? []).Concat([parentWithDeps]).ToList(),
                };
            }
        }

        // Handle ARRAY filtering/indexing
        if (leftValue.Value is not ArrayValue av)
        {
            return call.WithError($"filter expects an array or object: {leftValue.Print()}");
        }

        var values = av.Values.ToList();
        var empty = values.Count == 0;

        // Evaluate filter expression with first element to determine type
        var firstElem = empty ? ValueExpr.Null : values[0];
        var indexResult = EvalWithIndex(env, firstElem, empty ? null : 0, right);

        if (indexResult is not ValueExpr indexVal)
        {
            // Filter is symbolic - return symbolic call
            return new CallExpr("[", [leftPartial, right]);
        }

        var firstFilter = indexVal.Value;

        // Handle null index - return null with preserved dependencies
        if (firstFilter == null)
        {
            var additionalDeps = new List<ValueExpr> { indexVal };
            if (leftValue.Deps != null)
                additionalDeps.AddRange(leftValue.Deps);
            return env.WithDeps(ValueExpr.Null, additionalDeps);
        }

        // Handle numeric index - array element access
        if (ValueExpr.MaybeIndex(firstFilter) is { } numIndex)
        {
            if (numIndex < 0 || numIndex >= values.Count)
                return ValueExpr.Null;

            var element = values[numIndex];

            // Check if index or array has dependencies
            var indexHasDeps = indexVal.Deps?.Any() == true || indexVal.Path != null;
            var arrayHasDeps = leftValue.Deps?.Any() == true;

            // If neither index nor array has deps, return element as-is
            if (!indexHasDeps && !arrayHasDeps)
                return element;

            // Index is dynamic OR array has deps
            // Add parent reference with path preserved
            var parentWithDeps = new ValueExpr(null) with
            {
                Deps = [indexVal, .. (leftValue.Deps ?? [])],
                Path = element.Path,
            };

            return element with
            {
                Deps = (element.Deps?.ToList() ?? []).Concat([parentWithDeps]).ToList(),
            };
        }

        // Handle boolean filtering - keep elements where condition is true
        var results = new List<ValueExpr>();
        if (firstFilter is true)
            results.Add(values[0]);

        for (var i = 1; i < values.Count; i++)
        {
            var condResult = EvalWithIndex(env, values[i], i, right);

            if (condResult is not ValueExpr condVal)
            {
                return new CallExpr("[", [leftPartial, right]);
            }

            if (condVal.Value is true)
            {
                results.Add(values[i]);
            }
        }

        return new ValueExpr(new ArrayValue(results));
    };

    /// <summary>
    /// FlatMap (.) function with lambda support.
    /// </summary>
    private static readonly FunctionHandler FlatMapOp = (env, call) =>
    {
        if (call.Args.Count != 2)
        {
            return call.WithError("flatMap expects 2 arguments");
        }

        var left = call.Args[0];
        var right = call.Args[1];

        var leftPartial = env.EvaluateExpr(left);

        if (leftPartial is not ValueExpr leftValue)
        {
            return new CallExpr(".", [leftPartial, right]);
        }

        if (leftValue.Value is not ArrayValue av)
        {
            return leftValue.Value == null
                ? leftValue
                :
                // Single value - evaluate right side with it as context (index null)
                EvalWithIndex(env, leftValue, 0, right);
        }

        var partialResults = av.Values.Select((x, i) => EvalWithIndex(env, x, i, right)).ToList();

        // Check if all results are fully evaluated
        if (!partialResults.All(r => r is ValueExpr))
            return new ArrayExpr(partialResults);
        // Flatten results with dependency propagation
        var flattened = new List<ValueExpr>();
        foreach (var result in partialResults.Cast<ValueExpr>())
        {
            flattened.AddRange(AllElems(result));
        }
        return new ValueExpr(new ArrayValue(flattened));
    };

    /// <summary>
    /// Extract all elements from a ValueExpr, propagating parent dependencies to children.
    /// When extracting elements from nested arrays, if the parent has deps, those get added to each child.
    /// </summary>
    private static IEnumerable<ValueExpr> AllElems(ValueExpr v, ValueExpr? parent = null)
    {
        if (v.Value is ArrayValue av)
        {
            // Recurse into nested arrays, passing v as the parent
            return av.Values.SelectMany(child => AllElems(child, v));
        }

        // Leaf element (including null) - propagate parent deps if parent has deps
        if (parent?.Deps?.Any() != true)
            return [v];
        var newDeps = v.Deps?.ToList() ?? [];
        newDeps.Add(parent);
        return [v with { Deps = newDeps }];
    }

    /// <summary>
    /// String conversion function.
    /// </summary>
    private static FunctionHandler StringOp(string name, Func<string, string> transform)
    {
        return (env, call) =>
        {
            var partials = call.Args.Select(env.EvaluateExpr).ToList();

            if (!partials.All(p => p is ValueExpr))
            {
                return new CallExpr(name, partials);
            }

            var values = partials.Cast<ValueExpr>().ToList();
            var strings = values.Select(ValueToString).ToList();
            var result = transform(string.Join("", strings.Select(s => s.Value)));

            // Use original values (with their deps) instead of transformed strings
            return env.WithDeps(new ValueExpr(result), values);
        };
    }

    private static ValueExpr ValueToString(ValueExpr value)
    {
        return value.Value switch
        {
            ArrayValue av => new ValueExpr(
                string.Join("", av.Values.Select(v => ValueToString(v).Value))
            ),
            null => new ValueExpr("null"),
            bool b => new ValueExpr(b ? "true" : "false"),
            var o => new ValueExpr(o.ToString()),
        };
    }

    /// <summary>
    /// This function - returns current value.
    /// </summary>
    private static readonly FunctionHandler ThisOp = (env, _) =>
    {
        var current = env.GetCurrentValue();
        return current ?? ValueExpr.Null;
    };

    /// <summary>
    /// Aggregate function helper for min/max.
    /// </summary>
    private static FunctionHandler AggFunction(
        string name,
        double? init,
        Func<double, double, double> accumulator
    )
    {
        return (env, call) =>
        {
            switch (call.Args.Count)
            {
                case 0:
                    return init.HasValue ? new ValueExpr(init.Value) : ValueExpr.Null;
                case 1:
                {
                    var arrayPartial = env.EvaluateExpr(call.Args[0]);

                    if (arrayPartial is not ValueExpr arrayValue)
                        return new CallExpr(name, [arrayPartial]);

                    return arrayValue.Value switch
                    {
                        ArrayValue av when av.Values.Any() => av.Values.All(x => x.Value != null)
                            ? ValueExpr.WithDeps(
                                av.Values.Skip(1)
                                    .Aggregate(
                                        ValueExpr.AsDouble(av.Values.First().Value),
                                        (acc, next) =>
                                            accumulator(acc, ValueExpr.AsDouble(next.Value))
                                    ),
                                av.Values.ToList()
                            )
                            : ValueExpr.WithDeps(null, av.Values.ToList()),
                        ArrayValue => init.HasValue ? new ValueExpr(init.Value) : ValueExpr.Null,
                        null => arrayValue,
                        _ => call.WithError($"${name} requires an array: {arrayValue.Print()}"),
                    };
                }
            }

            // Multiple arguments - treat as array of values
            var partials = call.Args.Select(a => env.EvaluateExpr(a)).ToList();
            if (!partials.All(p => p is ValueExpr))
            {
                return new CallExpr(name, partials);
            }

            var values = partials.Cast<ValueExpr>().ToList();
            if (values.Count == 0)
                return init.HasValue ? new ValueExpr(init.Value) : ValueExpr.Null;

            return ValueExpr.WithDeps(
                values.All(x => x.Value != null)
                    ? values
                        .Skip(1)
                        .Aggregate(
                            ValueExpr.AsDouble(values.First().Value),
                            (acc, next) => accumulator(acc, ValueExpr.AsDouble(next.Value))
                        )
                    : null,
                values
            );
        };
    }

    /// <summary>
    /// Helper for evaluating lambda with element bound to BOTH lambda variable and _.
    /// Used by Map function where $x gets the element value.
    /// </summary>
    private static EvalExpr EvalWithElement(EvalEnv env, ValueExpr element, EvalExpr expr)
    {
        var vars = new Dictionary<string, EvalExpr> { ["_"] = element };
        EvalExpr toEval;

        if (expr is LambdaExpr lambda)
        {
            vars[lambda.Variable] = element; // Lambda variable gets ELEMENT
            toEval = lambda.Value;
        }
        else
        {
            toEval = expr;
        }

        return env.NewScope(vars).EvaluateExpr(toEval);
    }

    /// <summary>
    /// Helper for evaluating lambda with index bound to lambda variable.
    /// Used by Filter, FlatMap, First, etc. where $i gets the index and $this() gets element.
    /// </summary>
    private static EvalExpr EvalWithIndex(EvalEnv env, ValueExpr element, int? index, EvalExpr expr)
    {
        var vars = new Dictionary<string, EvalExpr> { ["_"] = element };
        EvalExpr toEval;

        if (expr is LambdaExpr lambda)
        {
            vars[lambda.Variable] = new ValueExpr(index); // Lambda variable gets INDEX
            toEval = lambda.Value;
        }
        else
        {
            toEval = expr;
        }

        return env.NewScope(vars).EvaluateExpr(toEval);
    }

    /// <summary>
    /// First/search function helper.
    /// </summary>
    private static FunctionHandler FirstFunction(
        string name,
        Func<int, ValueExpr, EvalEnv, ValueExpr> onFound,
        Func<EvalEnv, ValueExpr> onNotFound
    )
    {
        return (env, call) =>
        {
            if (call.Args.Count != 2)
                return call.WithError($"${name} expects 2 arguments");

            var left = call.Args[0];
            var right = call.Args[1];

            var leftPartial = env.EvaluateExpr(left);

            if (leftPartial is not ValueExpr leftValue)
                return new CallExpr(name, [leftPartial, right]);

            if (leftValue.Value is not ArrayValue av)
            {
                return leftValue.Value == null
                    ? leftValue
                    : call.WithError($"${name} requires an array: {leftValue.Print()}");
            }

            var deps = new List<ValueExpr> { leftValue };
            var index = 0;
            foreach (var elem in av.Values)
            {
                var condResult = EvalWithIndex(env, elem, index, right);

                if (condResult is not ValueExpr condVal)
                {
                    // Partially evaluated - return symbolic
                    return new CallExpr(name, [leftPartial, right]);
                }

                deps.Add(condVal);

                if (condVal.Value is true)
                {
                    var result = onFound(index, elem, env);
                    return env.WithDeps(result, deps);
                }

                index++;
            }

            return env.WithDeps(onNotFound(env), deps);
        };
    }

    /// <summary>
    /// Contains function - checks if value is in array using Compare.
    /// </summary>
    private static readonly FunctionHandler ContainsOp = (env, call) =>
    {
        if (call.Args.Count != 2)
            return call.WithError("contains expects 2 arguments");

        var left = call.Args[0];
        var right = call.Args[1];

        var leftPartial = env.EvaluateExpr(left);

        if (leftPartial is not ValueExpr leftValue)
            return new CallExpr("contains", [leftPartial, right]);

        if (leftValue.Value is not ArrayValue av)
        {
            return leftValue.Value == null
                ? leftValue
                : call.WithError($"$contains requires an array: {leftValue.Print()}");
        }

        var deps = new List<ValueExpr> { leftValue };

        foreach (var elem in av.Values)
        {
            // Evaluate the value expression for each element
            var valueResult = EvalWithIndex(env, elem, 0, right);

            if (valueResult is not ValueExpr valueVal)
                return new CallExpr("contains", [leftPartial, right]);

            deps.Add(valueVal);

            if (env.Compare(elem.Value, valueVal.Value) == 0)
            {
                return env.WithDeps(ValueExpr.True, deps);
            }
        }

        return env.WithDeps(ValueExpr.False, deps);
    };

    /// <summary>
    /// IndexOf function - returns index where value is found.
    /// </summary>
    private static readonly FunctionHandler IndexOfOp = (env, call) =>
    {
        if (call.Args.Count != 2)
            return call.WithError("indexOf expects 2 arguments");

        var left = call.Args[0];
        var right = call.Args[1];

        var leftPartial = env.EvaluateExpr(left);

        if (leftPartial is not ValueExpr leftValue)
            return new CallExpr("indexOf", [leftPartial, right]);

        if (leftValue.Value is not ArrayValue av)
        {
            return leftValue.Value == null
                ? leftValue
                : call.WithError($"$indexOf requires an array: {leftValue.Print()}");
        }

        var deps = new List<ValueExpr> { leftValue };
        var index = 0;

        foreach (var elem in av.Values)
        {
            var valueResult = EvalWithIndex(env, elem, index, right);

            if (valueResult is not ValueExpr valueVal)
                return new CallExpr("indexOf", [leftPartial, right]);

            deps.Add(valueVal);

            if (env.Compare(elem.Value, valueVal.Value) == 0)
            {
                return env.WithDeps(new ValueExpr(index), deps);
            }

            index++;
        }

        return env.WithDeps(ValueExpr.Null, deps);
    };

    /// <summary>
    /// Keys function - returns array of object property names.
    /// </summary>
    private static readonly FunctionHandler KeysOp = (env, call) =>
    {
        if (call.Args.Count != 1)
            return call.WithError("keys expects 1 argument");

        var arg = env.EvaluateExpr(call.Args[0]);

        if (arg is not ValueExpr argValue)
            return new CallExpr("keys", [arg]);

        return argValue.Value switch
        {
            ObjectValue ov => env.WithDeps(
                new ValueExpr(new ArrayValue(ov.Properties.Keys.Select(k => new ValueExpr(k)))),
                [argValue]
            ),
            null => argValue,
            _ => call.WithError($"$keys requires an object: {argValue.Print()}"),
        };
    };

    /// <summary>
    /// Values function - returns array of object property values.
    /// </summary>
    private static readonly FunctionHandler ValuesOp = (env, call) =>
    {
        if (call.Args.Count != 1)
            return call.WithError("values expects 1 argument");

        var arg = env.EvaluateExpr(call.Args[0]);

        if (arg is not ValueExpr argValue)
            return new CallExpr("values", [arg]);

        return argValue.Value switch
        {
            ObjectValue ov => env.WithDeps(
                new ValueExpr(new ArrayValue(ov.Properties.Values)),
                [argValue]
            ),
            null => argValue,
            _ => call.WithError($"$values requires an object: {argValue.Print()}"),
        };
    };

    /// <summary>
    /// Merge function - merges multiple objects.
    /// </summary>
    private static readonly FunctionHandler MergeOp = (env, call) =>
    {
        if (call.Args.Count == 0)
            return call.WithError("merge requires at least 1 argument");

        var partials = call.Args.Select(env.EvaluateExpr).ToList();

        if (!partials.All(p => p is ValueExpr))
            return new CallExpr("merge", partials);

        var values = partials.Cast<ValueExpr>().ToList();

        // Check if any is null - return null
        if (values.Any(v => v.Value == null))
            return env.WithDeps(ValueExpr.Null, values);

        var merged = new Dictionary<string, ValueExpr>();

        foreach (var val in values)
        {
            if (val.Value is not ObjectValue ov)
                continue;
            foreach (var (key, propVal) in ov.Properties)
            {
                merged[key] = propVal;
            }
            // Skip non-object arguments (as per TypeScript behavior)
        }

        return env.WithDeps(new ValueExpr(new ObjectValue(merged)), values);
    };

    /// <summary>
    /// Object function - creates object from key-value pairs.
    /// </summary>
    private static readonly FunctionHandler ObjectOp = (env, call) =>
    {
        if (call.Args.Count % 2 != 0)
            return call.WithError("object requires pairs of key-value arguments");

        var partials = call.Args.Select(a => env.EvaluateExpr(a)).ToList();

        if (!partials.All(p => p is ValueExpr))
            return new CallExpr("object", partials);

        var values = partials.Cast<ValueExpr>().ToList();
        var props = new Dictionary<string, ValueExpr>();

        for (var i = 0; i < values.Count; i += 2)
        {
            var key = values[i].Value?.ToString();
            if (key == null)
                continue;
            props[key] = values[i + 1];
        }

        return env.WithDeps(new ValueExpr(new ObjectValue(props)), values);
    };

    /// <summary>
    /// Which function - switch/case expression.
    /// </summary>
    private static readonly FunctionHandler WhichOp = (env, call) =>
    {
        if (call.Args.Count < 3 || call.Args.Count % 2 != 1)
            return call.WithError("which expects odd number of arguments >= 3");

        // 1. Partially evaluate ALL arguments upfront
        var evaluatedArgs = call.Args.Select(env.EvaluateExpr).ToList();
        var condPartial = evaluatedArgs[0];

        // 2. If condition is symbolic, return call with all evaluated args
        if (condPartial is not ValueExpr valueExpr)
            return new CallExpr("which", evaluatedArgs);

        // 3. If condition has an error, return it directly
        if (valueExpr.Error != null)
            return valueExpr;

        var deps = new List<ValueExpr> { valueExpr };
        var resultPairs = new List<EvalExpr>();

        // 3. Process pairs - remove non-matching, keep symbolic, return on match
        for (var i = 1; i < evaluatedArgs.Count; i += 2)
        {
            var compPartial = evaluatedArgs[i];
            var valuePartial = evaluatedArgs[i + 1];

            if (compPartial is not ValueExpr caseVal)
            {
                // Symbolic comparison - keep the pair
                resultPairs.Add(compPartial);
                resultPairs.Add(valuePartial);
                continue;
            }

            deps.Add(caseVal);

            bool matches;

            // Check if case is an array (matches any element)
            if (caseVal.Value is ArrayValue caseArray)
            {
                matches = caseArray.Values.Any(v => env.Compare(valueExpr.Value, v.Value) == 0);
            }
            else
            {
                matches = env.Compare(valueExpr.Value, caseVal.Value) == 0;
            }

            if (!matches)
                continue;
            // Match found - return the result
            if (valuePartial is ValueExpr resultVal)
            {
                return env.WithDeps(resultVal, deps);
            }
            return valuePartial;
            // No match - pair is removed (not added to resultPairs)
        }

        // 4. If we have remaining symbolic pairs, return symbolic call
        if (resultPairs.Count > 0)
        {
            return new CallExpr("which", [condPartial, .. resultPairs]);
        }

        // 5. No matches found
        return env.WithDeps(ValueExpr.Null, deps);
    };

    /// <summary>
    /// Fixed function - format number with fixed decimal places.
    /// </summary>
    private static readonly FunctionHandler FixedOp = (env, call) =>
    {
        if (call.Args.Count != 2)
            return call.WithError("fixed expects 2 arguments");

        var numPartial = env.EvaluateExpr(call.Args[0]);
        var digitsPartial = env.EvaluateExpr(call.Args[1]);

        if (numPartial is not ValueExpr numVal || digitsPartial is not ValueExpr digitsVal)
            return new CallExpr("fixed", [numPartial, digitsPartial]);

        if (numVal.Value == null || digitsVal.Value == null)
            return env.WithDeps(ValueExpr.Null, [numVal, digitsVal]);

        var num = ValueExpr.MaybeDouble(numVal.Value);
        var digits = ValueExpr.MaybeIndex(digitsVal.Value);

        if (num == null || digits == null)
            return env.WithDeps(ValueExpr.Null, [numVal, digitsVal]);

        var result = num.Value.ToString($"F{digits.Value}");
        return env.WithDeps(new ValueExpr(result), [numVal, digitsVal]);
    };

    /// <summary>
    /// All default function handlers for the new EvalEnv system.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, FunctionHandler> FunctionHandlers =
        new Dictionary<string, FunctionHandler>
        {
            // Arithmetic
            { "+", NumberOp("+", (a, b) => a + b, (a, b) => a + b) },
            { "-", NumberOp("-", (a, b) => a - b, (a, b) => a - b) },
            { "*", NumberOp("*", (a, b) => a * b, (a, b) => a * b) },
            { "/", NumberOp("/", (a, b) => a / b, (a, b) => (double)a / b) },
            { "%", NumberOp("%", (a, b) => a % b, (a, b) => (double)a % b) },
            // Comparison
            { "=", ComparisonFunction("=", v => v == 0) },
            { "!=", ComparisonFunction("!=", v => v != 0) },
            { "<", ComparisonFunction("<", x => x < 0) },
            { "<=", ComparisonFunction("<=", x => x <= 0) },
            { ">", ComparisonFunction(">", x => x > 0) },
            { ">=", ComparisonFunction(">=", x => x >= 0) },
            // Boolean
            { "and", ShortCircuitBoolOp("and", shortCircuitValue: false, defaultResult: true) },
            { "or", ShortCircuitBoolOp("or", shortCircuitValue: true, defaultResult: false) },
            { "!", UnaryNullOp("!", a => a is bool b ? !b : null) },
            // Control flow
            { "?", IfElseOp },
            { "??", NullCoalesceOp },
            // Array operations
            { "sum", SumOp },
            { "count", CountOp },
            { "elem", ElemOp },
            { "map", MapOp },
            { "[", FilterOp },
            { ".", FlatMapOp },
            { "min", AggFunction("min", null, Math.Min) },
            { "max", AggFunction("max", null, Math.Max) },
            { "first", FirstFunction("first", (i, elem, _) => elem, _ => ValueExpr.Null) },
            {
                "firstIndex",
                FirstFunction("firstIndex", (i, _, _2) => new ValueExpr(i), _ => ValueExpr.Null)
            },
            { "any", FirstFunction("any", (_, _2, _3) => ValueExpr.True, _ => ValueExpr.False) },
            {
                "all",
                (env, call) =>
                {
                    // all is inverted - return false on first non-match
                    if (call.Args.Count != 2)
                        return call.WithError("all expects 2 arguments");

                    var left = call.Args[0];
                    var right = call.Args[1];

                    var leftPartial = env.EvaluateExpr(left);

                    if (leftPartial is not ValueExpr leftValue)
                        return new CallExpr("all", [leftPartial, right]);

                    if (leftValue.Value is not ArrayValue av)
                    {
                        if (leftValue.Value == null)
                            return leftValue;
                        return call.WithError($"$all requires an array: {leftValue.Print()}");
                    }

                    var deps = new List<ValueExpr> { leftValue };
                    var index = 0;
                    foreach (var elem in av.Values)
                    {
                        var condResult = EvalWithIndex(env, elem, index, right);

                        if (condResult is not ValueExpr condVal)
                            return new CallExpr("all", [leftPartial, right]);

                        deps.Add(condVal);

                        if (condVal.Value is false)
                        {
                            return env.WithDeps(ValueExpr.False, deps);
                        }

                        index++;
                    }

                    return env.WithDeps(ValueExpr.True, deps);
                }
            },
            { "contains", ContainsOp },
            { "indexOf", IndexOfOp },
            // Object operations
            { "keys", KeysOp },
            { "values", ValuesOp },
            { "merge", MergeOp },
            { "object", ObjectOp },
            // Control flow
            { "which", WhichOp },
            { "fixed", FixedOp },
            // String operations
            { "string", StringOp("string", x => x) },
            { "lower", StringOp("lower", x => x.ToLower()) },
            { "upper", StringOp("upper", x => x.ToUpper()) },
            // Utility
            { "this", ThisOp },
            {
                "notEmpty",
                (env, call) =>
                {
                    if (call.Args.Count < 1)
                        return call.WithError("notEmpty expects 1 argument");

                    var arg = env.EvaluateExpr(call.Args[0]);

                    if (arg is ValueExpr v)
                    {
                        // notEmpty returns false for null or empty string, true otherwise
                        var result = v.Value switch
                        {
                            null => false,
                            string s => !string.IsNullOrWhiteSpace(s),
                            _ => true,
                        };
                        return env.WithDeps(new ValueExpr(result), [arg]);
                    }

                    return new CallExpr("notEmpty", [arg]);
                }
            },
            {
                "array",
                (env, call) =>
                {
                    var partials = call.Args.Select(a => env.EvaluateExpr(a)).ToList();
                    if (!partials.All(p => p is ValueExpr))
                    {
                        return new CallExpr("array", partials);
                    }

                    var values = partials.Cast<ValueExpr>().SelectMany(x => x.AllValues()).ToList();
                    return new ValueExpr(new ArrayValue(values));
                }
            },
            {
                "floor",
                UnaryNullOp(
                    "floor",
                    a => ValueExpr.MaybeDouble(a) is { } num ? Math.Floor(num) : null
                )
            },
            {
                "ceil",
                UnaryNullOp(
                    "ceil",
                    a => ValueExpr.MaybeDouble(a) is { } num ? Math.Ceiling(num) : null
                )
            },
        };

    /// <summary>
    /// Convert FunctionHandler dictionary to ValueExpr dictionary for use with EvalEnv.
    /// </summary>
    public static IReadOnlyDictionary<string, EvalExpr> AsValueExprs(
        this IReadOnlyDictionary<string, FunctionHandler> handlers
    )
    {
        return handlers.ToDictionary(kvp => kvp.Key, kvp => (EvalExpr)new ValueExpr(kvp.Value));
    }
}
