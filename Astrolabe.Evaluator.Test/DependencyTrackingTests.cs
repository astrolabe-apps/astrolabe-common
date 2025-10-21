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
        // Should track the specific element accessed
        Assert.Contains("items[1]", deps);
        // Should ALSO track the index variable since it determines which element
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
        // cond2 should NOT be tracked since it was never evaluated
        Assert.DoesNotContain("cond2", deps);
    }

    [Fact]
    public void Boolean_Or_Short_Circuits_And_Tracks_Only_Evaluated()
    {
        var data = new JsonObject { ["cond1"] = true, ["cond2"] = false };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("cond1 or cond2");
        var (_, result) = env.Evaluate(expr);

        Assert.True(result.IsTrue());

        var deps = GetDeps(result);
        // Short-circuited on cond1, so only it is tracked
        Assert.Contains("cond1", deps);
        // cond2 should NOT be tracked since it was never evaluated
        Assert.DoesNotContain("cond2", deps);
    }

    [Fact]
    public void Boolean_And_With_Multiple_Params_Short_Circuits_On_First_False()
    {
        var data = new JsonObject
        {
            ["cond1"] = true,
            ["cond2"] = false,
            ["cond3"] = true,
            ["cond4"] = true
        };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("cond1 and cond2 and cond3 and cond4");
        var (_, result) = env.Evaluate(expr);

        Assert.True(result.IsFalse());

        var deps = GetDeps(result);
        // Should track cond1 and cond2 (where it stopped)
        Assert.Contains("cond1", deps);
        Assert.Contains("cond2", deps);
        // Should NOT track cond3 or cond4 (never evaluated)
        Assert.DoesNotContain("cond3", deps);
        Assert.DoesNotContain("cond4", deps);
    }

    [Fact]
    public void Boolean_Or_With_Multiple_Params_Short_Circuits_On_First_True()
    {
        var data = new JsonObject
        {
            ["cond1"] = false,
            ["cond2"] = true,
            ["cond3"] = false,
            ["cond4"] = false
        };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("cond1 or cond2 or cond3 or cond4");
        var (_, result) = env.Evaluate(expr);

        Assert.True(result.IsTrue());

        var deps = GetDeps(result);
        // Should track cond1 and cond2 (where it stopped)
        Assert.Contains("cond1", deps);
        Assert.Contains("cond2", deps);
        // Should NOT track cond3 or cond4 (never evaluated)
        Assert.DoesNotContain("cond3", deps);
        Assert.DoesNotContain("cond4", deps);
    }

    [Fact]
    public void Boolean_And_With_Multiple_Params_Evaluates_All_When_All_True()
    {
        var data = new JsonObject
        {
            ["cond1"] = true,
            ["cond2"] = true,
            ["cond3"] = true
        };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("cond1 and cond2 and cond3");
        var (_, result) = env.Evaluate(expr);

        Assert.True(result.IsTrue());

        var deps = GetDeps(result);
        // Should track all since all were evaluated
        Assert.Contains("cond1", deps);
        Assert.Contains("cond2", deps);
        Assert.Contains("cond3", deps);
    }

    [Fact]
    public void Boolean_Or_With_Multiple_Params_Evaluates_All_When_All_False()
    {
        var data = new JsonObject
        {
            ["cond1"] = false,
            ["cond2"] = false,
            ["cond3"] = false
        };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("cond1 or cond2 or cond3");
        var (_, result) = env.Evaluate(expr);

        Assert.True(result.IsFalse());

        var deps = GetDeps(result);
        // Should track all since all were evaluated
        Assert.Contains("cond1", deps);
        Assert.Contains("cond2", deps);
        Assert.Contains("cond3", deps);
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
        // Should track both the condition and the matched value expression
        Assert.Contains("pendingMsg", deps);
    }

    #endregion

    #region Object Property Dependency Tracking Tests

    [Fact]
    public void Object_Property_Access_Tracks_Dependencies()
    {
        var data = new JsonObject { ["user"] = new JsonObject { ["name"] = "John", ["age"] = 30 } };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("user.name");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal("John", result.Value);

        var deps = GetDeps(result);
        // Should track the specific property accessed
        Assert.Contains("user.name", deps);
    }

    [Fact]
    public void Nested_Object_Property_Access_Tracks_Dependencies()
    {
        var data = new JsonObject
        {
            ["company"] = new JsonObject
            {
                ["department"] = new JsonObject
                {
                    ["manager"] = new JsonObject { ["name"] = "Alice", ["level"] = 5 }
                }
            }
        };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("company.department.manager.name");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal("Alice", result.Value);

        var deps = GetDeps(result);
        // Should track the full path
        Assert.Contains("company.department.manager.name", deps);
    }

    [Fact]
    public void Object_Created_With_Function_Tracks_Property_Dependencies()
    {
        var data = new JsonObject { ["x"] = 10, ["y"] = 20 };
        var env = CreateEnvWithData(data);

        // Create an object with computed properties
        var expr = ExprParser.Parse("$object(\"sum\", x + y, \"product\", x * y)");
        var (_, result) = env.Evaluate(expr);

        var deps = GetDeps(result);
        // Should track dependencies from the computed property values
        Assert.Contains("x", deps);
        Assert.Contains("y", deps);
    }

    [Fact]
    public void Accessing_Property_From_Constructed_Object_Preserves_Dependencies()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 10 };
        var env = CreateEnvWithData(data);

        // Create object and access property
        var expr = ExprParser.Parse("let $obj := $object(\"val\", a + b) in $obj.val");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(15L, result.Value);

        var deps = GetDeps(result);
        // Should track dependencies from the original computation
        Assert.Contains("a", deps);
        Assert.Contains("b", deps);
    }

    [Fact]
    public void Values_Function_Tracks_Dependencies_From_Object_Properties()
    {
        var data = new JsonObject
        {
            ["obj"] = new JsonObject { ["x"] = 10, ["y"] = 20, ["z"] = 30 }
        };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("$sum($values(obj))");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(60.0, result.Value);

        var deps = GetDeps(result);
        // Should track all property dependencies
        Assert.Contains("obj.x", deps);
        Assert.Contains("obj.y", deps);
        Assert.Contains("obj.z", deps);
    }

    #endregion

    #region Array Element Access Path Preservation Tests

    [Fact]
    public void Constant_Index_Access_Preserves_Path_Not_Deps()
    {
        var data = new JsonObject { ["array"] = new JsonArray { 1, 2, 3 } };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("array[0]");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(1, result.Value);

        // Should have path to the element
        Assert.NotNull(result.Path);
        Assert.Equal("array[0]", result.Path.ToPathString());

        // Should NOT have dependencies (it's direct data access)
        Assert.Null(result.Deps);
    }

    [Fact]
    public void Elem_With_Constant_Index_Preserves_Path()
    {
        var data = new JsonObject { ["items"] = new JsonArray { 10, 20, 30 } };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("$elem(items, 1)");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(20, result.Value);

        // Should have path to the element
        Assert.NotNull(result.Path);
        Assert.Equal("items[1]", result.Path.ToPathString());

        // Should NOT have dependencies
        Assert.Null(result.Deps);
    }

    [Fact]
    public void Dynamic_Index_Adds_Index_Dependencies_While_Preserving_Path()
    {
        var data = new JsonObject { ["array"] = new JsonArray { 10, 20, 30 }, ["idx"] = 1 };
        var env = CreateEnvWithData(data);

        // Use $elem for dynamic index (array[idx] doesn't work due to scoping limitation)
        var expr = ExprParser.Parse("$elem(array, idx)");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(20, result.Value);

        // Should have path to the actual element accessed
        Assert.NotNull(result.Path);
        Assert.Equal("array[1]", result.Path.ToPathString());

        // Should have dependency on idx variable
        var deps = GetDeps(result);
        Assert.Contains("idx", deps);
    }

    [Fact]
    public void Elem_With_Dynamic_Index_Adds_Dependencies()
    {
        var data = new JsonObject
        {
            ["values"] = new JsonArray { 100, 200, 300 },
            ["position"] = 2
        };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("$elem(values, position)");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(300, result.Value);

        // Should have path to the actual element
        Assert.Equal("values[2]", result.Path?.ToPathString());

        // Should track dependency on position variable
        var deps = GetDeps(result);
        Assert.Contains("position", deps);
    }

    [Fact]
    public void Computed_Index_Expression_Adds_All_Dependencies()
    {
        var data = new JsonObject
        {
            ["nums"] = new JsonArray { 1, 2, 3, 4, 5 },
            ["offset"] = 1,
            ["base"] = 2
        };
        var env = CreateEnvWithData(data);

        // Use $elem for computed index
        var expr = ExprParser.Parse("$elem(nums, base + offset)");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(4, result.Value); // nums[3]

        // Should have path to element
        Assert.Equal("nums[3]", result.Path?.ToPathString());

        // Should track both offset and base
        var deps = GetDeps(result);
        Assert.Contains("offset", deps);
        Assert.Contains("base", deps);
    }

    #endregion

    #region Object Filter with Dynamic Keys Tests

    [Fact]
    public void Constant_Key_Access_Preserves_Path_Not_Deps()
    {
        var data = new JsonObject
        {
            ["obj"] = new JsonObject { ["x"] = 10, ["y"] = 20, ["z"] = 30 }
        };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("obj[\"x\"]");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(10, result.Value);

        // Should have path to the property
        Assert.NotNull(result.Path);
        Assert.Equal("obj.x", result.Path.ToPathString());

        // Should NOT have dependencies (it's direct data access)
        Assert.Null(result.Deps);
    }

    [Fact]
    public void Dynamic_Key_With_Variable_Tracks_Key_Dependency()
    {
        var data = new JsonObject
        {
            ["user"] = new JsonObject { ["name"] = "Alice", ["age"] = 30 },
            ["field"] = "name"
        };
        var env = CreateEnvWithData(data);

        // Access object property using variable key
        var expr = ExprParser.Parse("user[field]");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal("Alice", result.Value);

        // Should have path to the actual property accessed
        Assert.NotNull(result.Path);
        Assert.Equal("user.name", result.Path.ToPathString());

        // Should have dependency on field variable
        var deps = GetDeps(result);
        Assert.Contains("field", deps);
    }

    [Fact]
    public void Dynamic_Key_With_Computed_Expression_Tracks_All_Dependencies()
    {
        var data = new JsonObject
        {
            ["config"] = new JsonObject
            {
                ["setting_a"] = "value1",
                ["setting_b"] = "value2"
            },
            ["prefix"] = "setting",
            ["suffix"] = "_a"
        };
        var env = CreateEnvWithData(data);

        // Access property with computed key: prefix + suffix
        var expr = ExprParser.Parse("config[$string(prefix, suffix)]");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal("value1", result.Value);

        // Should have path to the actual property
        Assert.Equal("config.setting_a", result.Path?.ToPathString());

        // Should track both prefix and suffix
        var deps = GetDeps(result);
        Assert.Contains("prefix", deps);
        Assert.Contains("suffix", deps);
    }

    [Fact]
    public void Nested_Object_Access_With_Dynamic_Key_Tracks_Dependencies()
    {
        var data = new JsonObject
        {
            ["company"] = new JsonObject
            {
                ["employees"] = new JsonObject
                {
                    ["alice"] = new JsonObject { ["role"] = "manager" },
                    ["bob"] = new JsonObject { ["role"] = "developer" }
                }
            },
            ["employeeName"] = "alice"
        };
        var env = CreateEnvWithData(data);

        var expr = ExprParser.Parse("company.employees[employeeName].role");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal("manager", result.Value);

        // Should have path to the final property
        Assert.Equal("company.employees.alice.role", result.Path?.ToPathString());

        // Should track employeeName dependency
        var deps = GetDeps(result);
        Assert.Contains("employeeName", deps);
    }

    [Fact]
    public void Object_Filter_With_Constant_Key_In_Constructed_Object()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 10 };
        var env = CreateEnvWithData(data);

        // Create object and access with constant key
        var expr = ExprParser.Parse("let $obj := $object(\"sum\", a + b) in $obj[\"sum\"]");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(15L, result.Value);

        var deps = GetDeps(result);
        // Should track dependencies from the original computation, no key dependency
        Assert.Contains("a", deps);
        Assert.Contains("b", deps);
    }

    #endregion

    #region FlatMap Dependency Tracking Tests

    [Fact]
    public void FlatMap_Preserves_Dependencies_In_Individual_Elements()
    {
        var data = new JsonObject
        {
            ["items"] = new JsonArray(
                new JsonObject { ["values"] = new JsonArray(1, 2) },
                new JsonObject { ["values"] = new JsonArray(3, 4) }
            )
        };
        var env = CreateEnvWithData(data);

        // Flatmap items to their values arrays
        var expr = ExprParser.Parse("items . values");

        var (_, result) = env.Evaluate(expr);
        var elements = ((ArrayValue)result.Value!).Values.ToList();

        // Should produce [1, 2, 3, 4]
        Assert.Equal(4, elements.Count);

        // Each ELEMENT should have dependencies tracking its source
        var allDeps = elements.SelectMany(e => GetDeps(e)).ToList();

        // Element 0 (value 1) should track items[0].values[0]
        Assert.Contains("items[0].values[0]", allDeps);
        // Element 1 (value 2) should track items[0].values[1]
        Assert.Contains("items[0].values[1]", allDeps);
        // Element 2 (value 3) should track items[1].values[0]
        Assert.Contains("items[1].values[0]", allDeps);
        // Element 3 (value 4) should track items[1].values[1]
        Assert.Contains("items[1].values[1]", allDeps);
    }

    [Fact]
    public void FlatMap_Then_Sum_Aggregates_Dependencies_Correctly()
    {
        var data = new JsonObject
        {
            ["groups"] = new JsonArray(
                new JsonObject { ["nums"] = new JsonArray(1, 2) },
                new JsonObject { ["nums"] = new JsonArray(3, 4, 5) }
            )
        };
        var env = CreateEnvWithData(data);

        // Flatmap to get all numbers then sum
        var expr = ExprParser.Parse("$sum(groups . nums)");
        var (_, result) = env.Evaluate(expr);

        Assert.Equal(15d, result.Value); // 1+2+3+4+5 = 15

        var deps = GetDeps(result);
        // Should track all individual elements
        Assert.Contains("groups[0].nums[0]", deps);
        Assert.Contains("groups[0].nums[1]", deps);
        Assert.Contains("groups[1].nums[0]", deps);
        Assert.Contains("groups[1].nums[1]", deps);
        Assert.Contains("groups[1].nums[2]", deps);
    }

    [Fact]
    public void FlatMap_With_Table_Lookup_Preserves_Dependencies_In_Returned_Array_Elements()
    {
        var data = new JsonObject
        {
            ["items"] = new JsonArray(
                new JsonObject { ["width"] = 2.5 },
                new JsonObject { ["width"] = 3.5 }
            )
        };
        var env = CreateEnvWithData(data);

        // Simpler version of the real scenario:
        // For each item, lookup based on width and return array from table
        var expr = ExprParser.Parse(@"
            let $table := $object(
                ""2.4"", [10, 20, 30],
                ""3.4"", [40, 50, 60]
            )
            in items.(
                let $key := $this().width < 3.0 ? ""2.4"" : ""3.4""
                in $table[$key]
            )
        ");
        var (_, result) = env.Evaluate(expr);

        Assert.IsType<ArrayValue>(result.Value);
        var elements = ((ArrayValue)result.Value!).Values.ToList();

        // Should have 6 elements total (3 from each of 2 items)
        Assert.Equal(6, elements.Count);

        // Each element should have dependencies from the key computation (which depends on width)
        var allDeps = elements.SelectMany(e => GetDeps(e)).ToList();

        // First 3 elements came from items[0], so should depend on items[0].width
        var firstThreeDeps = elements.Take(3)
            .SelectMany(e => GetDeps(e))
            .Where(d => d.Contains("items[0]"))
            .ToList();
        Assert.True(firstThreeDeps.Count > 0, "Expected dependencies from items[0]");
        Assert.Contains("items[0].width", firstThreeDeps);

        // Last 3 elements came from items[1], so should depend on items[1].width
        var lastThreeDeps = elements.Skip(3).Take(3)
            .SelectMany(e => GetDeps(e))
            .Where(d => d.Contains("items[1]"))
            .ToList();
        Assert.True(lastThreeDeps.Count > 0, "Expected dependencies from items[1]");
        Assert.Contains("items[1].width", lastThreeDeps);
    }

    #endregion
}