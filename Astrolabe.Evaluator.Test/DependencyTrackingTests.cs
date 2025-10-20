using System.Text.Json.Nodes;
using Astrolabe.Evaluator.Functions;

namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Comprehensive tests for dependency tracking in the Astrolabe.Evaluator.
///
/// Key Concepts:
/// 1. Parameter Binding:
///    - map(array, $x => ...) : $x is the element value
///    - filter/first/any/all(array, $i => ...) : $i is the index, use this() to access element
///
/// 2. Lazy Dependency Model:
///    - Array transformations (map, filter) preserve dependencies IN individual elements
///    - Consumption functions (sum, first, elem) aggregate dependencies from accessed elements
///
/// 3. Known Limitations:
///    - LIMITATION: array[propertyExpr] fails because property lookup is relative to array elements, not global scope.
///      When evaluating items[offset], it looks for 'offset' property on each element instead of global data.
///      Workaround: Use let expression to evaluate in global scope: let $idx := offset in items[$idx]
/// </summary>
public class DependencyTrackingTests
{
    private static EvalEnvironment CreateEnvWithData(JsonObject? data)
    {
        var evalData = JsonDataLookup.FromObject(data);
        return EvalEnvironment.DataFrom(evalData).AddDefaultFunctions();
    }

    private static List<string> GetDeps(ValueExpr result)
    {
        var paths = new List<string>();
        if (result.Path != null) paths.Add(result.Path.ToPathString());
        if (result.Deps != null) paths.AddRange(result.Deps.Select(d => d.ToPathString()));
        return paths.Distinct().OrderBy(x => x).ToList();
    }

    #region Parameter Binding Tests

    [Fact]
    public void Map_Lambda_Variable_Is_Element_Value()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3) };
        var env = CreateEnvWithData(data);

        // Lambda variable $x should be the element value
        var expr = ExprParser.Parse("$map(nums, $x => $x * 2)");

        var (_, result) = env.Evaluate(expr);
        var values = ((ArrayValue)result.Value!).Values.Select(v => v.AsLong()).ToList();

        Assert.Equal([2L, 4L, 6L], values);
    }

    [Fact]
    public void Filter_Lambda_Variable_Is_Index_Use_This_For_Element()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(10, 20, 30, 40, 50) };
        var env = CreateEnvWithData(data);

        // Lambda variable $i is the INDEX
        // Filter where index >= 2 should give [30, 40, 50]
        var exprByIndex = ExprParser.Parse("nums[$i => $i >= 2]");

        var (_, resultByIndex) = env.Evaluate(exprByIndex);
        var valuesByIndex = ((ArrayValue)resultByIndex.Value!).Values.Select(v => v.AsLong()).ToList();
        Assert.Equal([30L, 40L, 50L], valuesByIndex);

        // Use $this() to access the ELEMENT
        // Filter where element > 25 should give [30, 40, 50]
        var exprByElement = ExprParser.Parse("nums[$i => $this() > 25]");

        var (_, resultByElement) = env.Evaluate(exprByElement);
        var valuesByElement = ((ArrayValue)resultByElement.Value!).Values.Select(v => v.AsLong()).ToList();
        Assert.Equal([30L, 40L, 50L], valuesByElement);
    }

    [Fact]
    public void First_Lambda_Variable_Is_Index_Use_This_For_Element()
    {
        var data = new JsonObject { ["items"] = new JsonArray("a", "b", "c", "d") };
        var env = CreateEnvWithData(data);

        // Lambda variable is index - find first where index >= 2 should give "c"
        var expr = ExprParser.Parse("$first(items, $i => $i >= 2)");

        var (_, result) = env.Evaluate(expr);
        Assert.Equal("c", result.Value);
    }

    #endregion

    #region Lazy Dependency Model Tests

    [Fact]
    public void Map_Preserves_Dependencies_In_Individual_Elements()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3) };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("$map(nums, $x => $x * 2)");

        var (_, result) = env.Evaluate(expr);
        var elements = ((ArrayValue)result.Value!).Values.ToList();

        // The array itself should NOT have dependencies at the array level
        Assert.Null(result.Deps);

        // But each ELEMENT should have dependencies
        for (int i = 0; i < elements.Count; i++)
        {
            var deps = GetDeps(elements[i]);
            Assert.Contains($"nums[{i}]", deps);
        }
    }

    [Fact]
    public void Filter_Preserves_Dependencies_In_Filtered_Elements()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3, 4, 5) };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("nums[$i => $this() > 2]");

        var (_, result) = env.Evaluate(expr);
        var elements = ((ArrayValue)result.Value!).Values.ToList();

        Assert.Equal(3, elements.Count);

        // Each filtered element preserves its source dependency
        var allDeps = elements.SelectMany(e => GetDeps(e)).Distinct().ToList();
        Assert.Contains("nums[2]", allDeps); // element 3
        Assert.Contains("nums[3]", allDeps); // element 4
        Assert.Contains("nums[4]", allDeps); // element 5
    }

    #endregion

    #region Dependency Aggregation Tests

    [Fact]
    public void Sum_Aggregates_Dependencies_From_All_Elements()
    {
        var data = new JsonObject { ["vals"] = new JsonArray(1, 2, 3) };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("$sum(vals)");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(6d, result.Value);

        var deps = GetDeps(result);
        Assert.Contains("vals[0]", deps);
        Assert.Contains("vals[1]", deps);
        Assert.Contains("vals[2]", deps);
    }

    [Fact]
    public void Elem_Tracks_Only_Accessed_Element()
    {
        var data = new JsonObject { ["items"] = new JsonArray(10, 20, 30) };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("$elem(items, 1)");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(20, result.AsInt());

        var deps = GetDeps(result);
        // Should ONLY track the accessed element
        Assert.Contains("items[1]", deps);
        Assert.DoesNotContain("items[0]", deps);
        Assert.DoesNotContain("items[2]", deps);
    }

    [Fact]
    public void Elem_With_Dynamic_Index_Tracks_Both_Element_And_Index_Dependencies()
    {
        var data = new JsonObject {
            ["items"] = new JsonArray(10, 20, 30),
            ["indexVar"] = 1
        };
        var env = CreateEnvWithData(data);

        // Dynamic index - should track both the element AND the index variable
        var expr = ExprParser.Parse("$elem(items, indexVar)");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(20, result.AsInt());

        var deps = GetDeps(result);
        // Should track the specific element accessed (THIS WORKS in C#)
        Assert.Contains("items[1]", deps);
        // Should ALSO track the index variable since it determines which element (CURRENTLY FAILS in C#)
        Assert.Contains("indexVar", deps);
        // Should NOT track the whole array
        Assert.DoesNotContain("items", deps);
    }

    [Fact]
    public void Array_Access_With_Dynamic_Index_Tracks_Both_Element_And_Index_Dependencies()
    {
        var data = new JsonObject {
            ["items"] = new JsonArray(10, 20, 30),
            ["offset"] = 2
        };
        var env = CreateEnvWithData(data);

        // Array access with dynamic index using let expression to evaluate offset in global scope
        // let $idx = offset in items[$idx]
        var expr = ExprParser.Parse("let $idx := offset in items[$idx]");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(30, result.AsInt());

        var deps = GetDeps(result);
        // Should track the specific element accessed
        Assert.Contains("items[2]", deps);
        // Should ALSO track the index variable since it determines which element
        Assert.Contains("offset", deps);
        // Should NOT track the whole array
        Assert.DoesNotContain("items", deps);
    }

    [Fact]
    public void Array_Access_With_Computed_Index_Tracks_All_Dependencies()
    {
        var data = new JsonObject {
            ["values"] = new JsonArray(100, 200, 300, 400),
            ["baseIndex"] = 1,
            ["indexOffset"] = 1
        };
        var env = CreateEnvWithData(data);

        // Array access with computed index using let expression: let $idx = baseIndex + indexOffset in values[$idx]
        // Should access values[2] = 300
        var expr = ExprParser.Parse("let $idx := baseIndex + indexOffset in values[$idx]");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(300, result.AsInt());

        var deps = GetDeps(result);
        // Should track the specific element accessed
        Assert.Contains("values[2]", deps);
        // Should track both variables used in the index computation
        Assert.Contains("baseIndex", deps);
        Assert.Contains("indexOffset", deps);
        // Should NOT track the whole array
        Assert.DoesNotContain("values", deps);
    }

    [Fact]
    public void First_Tracks_Dependencies_From_Evaluated_Elements()
    {
        var data = new JsonObject { ["items"] = new JsonArray(1, 5, 3, 8, 2) };
        var env = CreateEnvWithData(data);

        // Find first element > 4 (should be 5 at index 1)
        var expr = ExprParser.Parse("$first(items, $i => $this() > 4)");

        var (_, result) = env.Evaluate(expr);

        Assert.Equal(5L, result.AsLong());

        var deps = GetDeps(result);
        // Should track elements evaluated up to and including the match
        Assert.True(deps.Any(d => d.StartsWith("items[")),
            $"Expected dependencies from items array, got: {string.Join(", ", deps)}");
    }

    #endregion

    #region Pipeline Tests - Dependencies Flow Through Transformations

    [Fact]
    public void Map_Then_Sum_Aggregates_Dependencies_Correctly()
    {
        var data = new JsonObject { ["values"] = new JsonArray(1, 2, 3) };
        var env = CreateEnvWithData(data);

        // Map to double then sum in one expression
        var expr = ExprParser.Parse("$sum($map(values, $x => $x * 2))");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(12d, result.Value); // (1*2 + 2*2 + 3*2) = 12

        var deps = GetDeps(result);
        // Sum should aggregate deps from all mapped elements
        Assert.Contains("values[0]", deps);
        Assert.Contains("values[1]", deps);
        Assert.Contains("values[2]", deps);
    }

    [Fact]
    public void Filter_Then_Sum_Only_Tracks_Filtered_Elements()
    {
        var data = new JsonObject { ["scores"] = new JsonArray(50, 75, 90, 65, 85) };
        var env = CreateEnvWithData(data);

        // Filter scores >= 70 then sum in one expression (keeps 75, 90, 85; filters out 50 and 65)
        var expr = ExprParser.Parse("$sum(scores[$i => $this() >= 70])");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(250d, result.Value); // 75 + 90 + 85 = 250

        var deps = GetDeps(result);
        // Should track only the filtered elements
        Assert.Contains("scores[1]", deps); // 75
        Assert.Contains("scores[2]", deps); // 90
        Assert.Contains("scores[4]", deps); // 85
        // Should NOT have scores[0] (50) or scores[3] (65) - both filtered out
        Assert.DoesNotContain("scores[0]", deps);
        Assert.DoesNotContain("scores[3]", deps);
    }

    [Fact]
    public void Map_Then_Elem_Only_Tracks_Accessed_Element()
    {
        var data = new JsonObject { ["items"] = new JsonArray(10, 20, 30) };
        var env = CreateEnvWithData(data);

        // Map to double then access element 1 in one expression
        var expr = ExprParser.Parse("$elem($map(items, $x => $x * 2), 1)");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(40, result.AsInt()); // 20 * 2 = 40

        var deps = GetDeps(result);
        // Precision: only track the ONE element accessed
        Assert.Contains("items[1]", deps);
        Assert.DoesNotContain("items[0]", deps);
        Assert.DoesNotContain("items[2]", deps);
    }

    [Fact]
    public void Complex_Filter_Map_Sum_Pipeline()
    {
        var data = new JsonObject
        {
            ["products"] = new JsonArray(
                new JsonObject { ["name"] = "A", ["price"] = 10, ["stock"] = 5 },
                new JsonObject { ["name"] = "B", ["price"] = 20, ["stock"] = 0 },
                new JsonObject { ["name"] = "C", ["price"] = 15, ["stock"] = 3 }
            )
        };
        var env = CreateEnvWithData(data);

        // Filter products with stock > 0, map to prices, then sum - all in one expression
        var expr = ExprParser.Parse("$sum($map(products[$i => $this()[\"stock\"] > 0], $p => $p[\"price\"]))");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(25, result.AsInt()); // Product A (10) + Product C (15) = 25

        var deps = GetDeps(result);
        // Should track products[0] and products[2] (had stock > 0)
        Assert.True(deps.Any(d => d.Contains("products[0]")));
        Assert.True(deps.Any(d => d.Contains("products[2]")));
    }

    #endregion

    #region Basic Operation Tests

    [Fact]
    public void Arithmetic_Operations_Track_Dependencies()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 10 };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("a + b");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(15L, result.Value);

        var deps = GetDeps(result);
        Assert.Contains("a", deps);
        Assert.Contains("b", deps);
    }

    [Fact]
    public void Comparison_Operations_Track_Dependencies()
    {
        var data = new JsonObject { ["x"] = 5, ["y"] = 10 };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("x < y");
        var (_, result) = env.Evaluate(expr);

        Assert.True(result.IsTrue());

        var deps = GetDeps(result);
        Assert.Contains("x", deps);
        Assert.Contains("y", deps);
    }

    [Fact]
    public void Boolean_And_Tracks_Dependencies_From_All_Evaluated_Args()
    {
        var data = new JsonObject { ["cond1"] = true, ["cond2"] = true };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("cond1 and cond2");
        var (_, result) = env.Evaluate(expr);

        Assert.True(result.IsTrue());

        var deps = GetDeps(result);
        Assert.Contains("cond1", deps);
        Assert.Contains("cond2", deps);
    }

    [Fact]
    public void Boolean_And_Short_Circuits_And_Tracks_Only_Evaluated()
    {
        var data = new JsonObject { ["cond1"] = false, ["cond2"] = true };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("cond1 and cond2");
        var (_, result) = env.Evaluate(expr);

        Assert.True(result.IsFalse());

        var deps = GetDeps(result);
        // Short-circuited on cond1, so only it is tracked
        Assert.Contains("cond1", deps);
    }

    #endregion

    #region Conditional Operator Tests

    [Fact]
    public void Conditional_Should_Track_Only_Taken_Branch()
    {
        var data = new JsonObject { ["cond"] = true, ["thenVal"] = "A", ["elseVal"] = "B" };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("cond ? thenVal : elseVal");

        var (_, result) = env.Evaluate(expr);

        Assert.Equal("A", result.Value);

        var deps = GetDeps(result);
        // Should ONLY track the condition and the taken branch
        Assert.Contains("cond", deps);
        Assert.Contains("thenVal", deps);
        Assert.DoesNotContain("elseVal", deps); // Should NOT track the untaken branch
    }

    [Fact]
    public void Conditional_With_Complex_Condition_Should_Track_Only_Taken_Branch()
    {
        var data = new JsonObject { ["age"] = 25, ["minAge"] = 18, ["adult"] = "yes", ["minor"] = "no" };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("age >= minAge ? adult : minor");

        var (_, result) = env.Evaluate(expr);

        Assert.Equal("yes", result.Value);

        var deps = GetDeps(result);
        // Should track the condition parts
        Assert.Contains("age", deps);
        Assert.Contains("minAge", deps);
        // Should track the taken branch (adult)
        Assert.Contains("adult", deps);
        Assert.DoesNotContain("minor", deps); // Should NOT track untaken branch
    }

    #endregion

    #region String Operations Tests

    [Fact]
    public void String_Concatenation_Tracks_Dependencies()
    {
        var data = new JsonObject { ["first"] = "John", ["last"] = "Doe" };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("$string(first, \" \", last)");

        var (_, result) = env.Evaluate(expr);

        Assert.Equal("John Doe", result.Value);

        var deps = GetDeps(result);
        Assert.Contains("first", deps);
        Assert.Contains("last", deps);
    }

    [Fact]
    public void Lower_Tracks_Dependencies()
    {
        var data = new JsonObject { ["name"] = "HELLO" };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("$lower(name)");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal("hello", result.Value);

        var deps = GetDeps(result);
        Assert.Contains("name", deps);
    }

    #endregion

    #region Utility Functions Tests

    [Fact]
    public void NullCoalesce_Tracks_Dependencies_From_First_NonNull()
    {
        var data = new JsonObject { ["value"] = "exists" };
        var env = CreateEnvWithData(data);

        // nullField is null, so should use value
        var expr = ExprParser.Parse("nullField ?? value");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal("exists", result.Value);

        var deps = GetDeps(result);
        Assert.Contains("value", deps);
    }

    [Fact]
    public void Which_Tracks_Dependencies()
    {
        var data = new JsonObject
        {
            ["status"] = "pending",
            ["pendingMsg"] = "Please wait",
            ["activeMsg"] = "Active now"
        };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("$which(status, \"pending\", pendingMsg, \"active\", activeMsg)");

        var (_, result) = env.Evaluate(expr);

        Assert.Equal("Please wait", result.Value);

        var deps = GetDeps(result);
        Assert.Contains("status", deps);
        // BUG: which() doesn't track the returned value dependency
        // It should track pendingMsg but currently only tracks status
        // See DefaultFunctions.cs:414 - should be WithDeps(x.Value, [condValue, compValue, x])
        Assert.Contains("pendingMsg", deps); // Currently FAILS - which() bug
    }

    #endregion
}