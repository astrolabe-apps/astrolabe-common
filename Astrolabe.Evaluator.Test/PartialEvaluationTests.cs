using System.Collections;
using System.Text.Json.Nodes;

namespace Astrolabe.Evaluator.Test;

public class PartialEvaluationTests
{
    #region Constant Folding Tests

    [Fact]
    public void PartialEval_ArithmeticExpression_FullyEvaluates()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("5 + 3 * 2");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        var value = ((ValueExpr)result).Value;
        TestHelpers.AssertNumericEqual(11, value);
    }

    [Fact]
    public void PartialEval_NestedArithmetic_FullyEvaluates()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("(10 - 5) * (2 + 3)");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        var value = ((ValueExpr)result).Value;
        TestHelpers.AssertNumericEqual(25, value);
    }

    [Fact]
    public void PartialEval_ComparisonWithConstants_FullyEvaluates()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("5 > 3");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        var value = ((ValueExpr)result).Value;
        Assert.True((bool)value!);
    }

    #endregion

    #region Symbolic Expression Tests

    [Fact]
    public void PartialEval_UnknownVariable_ReturnsVarExpr()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$unknownVar");

        var result = env.EvalPartial(expr);

        Assert.IsType<VarExpr>(result);
        Assert.Equal("unknownVar", ((VarExpr)result).Name);
    }

    [Fact]
    public void PartialEval_ArithmeticWithUnknownVariable_ReturnsCallExpr()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$x + 5");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("+", call.Function);
        Assert.Equal(2, call.Args.Count);
        Assert.IsType<VarExpr>(call.Args[0]);
        Assert.IsType<ValueExpr>(call.Args[1]);
    }

    [Fact]
    public void PartialEval_ComparisonWithUnknownVariable_ReturnsCallExpr()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$x > 10");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal(">", call.Function);
    }

    [Fact]
    public void PartialEval_MultipleUnknownVariables_ReturnsSymbolicExpression()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$x + $y * 2");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("+", call.Function);

        // First arg should be VarExpr for $x
        Assert.IsType<VarExpr>(call.Args[0]);

        // Second arg should be CallExpr for ($y * 2)
        Assert.IsType<CallExpr>(call.Args[1]);
    }

    #endregion

    #region Branch Selection Tests

    [Fact]
    public void PartialEval_ConditionalWithTrueCondition_SelectsThenBranch()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("true ? 100 : 200");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        TestHelpers.AssertNumericEqual(100, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_ConditionalWithFalseCondition_SelectsElseBranch()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("false ? 100 : 200");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        TestHelpers.AssertNumericEqual(200, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_ConditionalWithUnknownCondition_ReturnsSymbolicCall()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$unknown ? 100 : 200");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("?", call.Function);
        Assert.Equal(3, call.Args.Count);
    }

    [Fact]
    public void PartialEval_ConditionalWithTrueCondition_OnlyEvaluatesThenBranch()
    {
        var env = TestHelpers.CreatePartialEnv();
        // The else branch has an unknown variable, but shouldn't be evaluated
        var expr = TestHelpers.Parse("true ? 42 : $undefinedVar");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        TestHelpers.AssertNumericEqual(42, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_ConditionalWithPartiallyEvaluatedBranches_ReturnsPartialExpression()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$cond ? ($x + 5) : ($y * 2)");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("?", call.Function);

        // All three args should be present and partially evaluated
        Assert.IsType<VarExpr>(call.Args[0]); // condition
        Assert.IsType<CallExpr>(call.Args[1]); // then branch
        Assert.IsType<CallExpr>(call.Args[2]); // else branch
    }

    #endregion

    #region Let Expression Simplification Tests

    [Fact]
    public void PartialEval_LetWithConstant_InlinesAndSimplifies()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("let $x := 5 in $x + 3");

        var result = env.EvalPartial(expr);

        // Should fully evaluate to 8
        Assert.IsType<ValueExpr>(result);
        TestHelpers.AssertNumericEqual(8, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_LetWithMultipleConstants_InlinesAll()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("let $x := 5, $y := 3 in $x * $y");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        TestHelpers.AssertNumericEqual(15, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_LetWithUnusedVariable_EliminatesDeadCode()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("let $x := 5, $unused := $unknown in $x + 3");

        var result = env.EvalPartial(expr);

        // Should evaluate to 8, eliminating the unused variable
        Assert.IsType<ValueExpr>(result);
        TestHelpers.AssertNumericEqual(8, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_LetWithUnknownVariable_KeepsSymbolicBinding()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("let $x := $unknown in $x + 5");

        var result = env.EvalPartial(expr);

        // SimplifyLet inlines the variable reference since it's simple, resulting in CallExpr
        Assert.IsType<CallExpr>(result);
        var callExpr = (CallExpr)result;
        Assert.Equal("+", callExpr.Function);
        Assert.IsType<VarExpr>(callExpr.Args[0]); // $unknown
    }

    [Fact]
    public void PartialEval_LetWithChainedReferences_InlinesWherePossible()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("let $x := 5, $y := $x + 3, $z := $y * 2 in $z");

        var result = env.EvalPartial(expr);

        // Should fully evaluate to 16
        Assert.IsType<ValueExpr>(result);
        TestHelpers.AssertNumericEqual(16, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_LetWithPartiallyKnownExpression_SimplifiesPartially()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("let $x := 5 + 3, $y := $x + $unknown in $y");

        var result = env.EvalPartial(expr);

        // $x is fully known (8) so it gets inlined into $y's binding
        // $y is only used once, so it's not uninlined - result is just 8 + $unknown
        // (matching TypeScript behavior)
        Assert.IsType<CallExpr>(result);
        var callExpr = (CallExpr)result;
        Assert.Equal("+", callExpr.Function);
        // First arg should be 8
        Assert.IsType<ValueExpr>(callExpr.Args[0]);
        TestHelpers.AssertNumericEqual(8, ((ValueExpr)callExpr.Args[0]).Value);
        // Second arg should be $unknown
        Assert.IsType<VarExpr>(callExpr.Args[1]);
    }

    [Fact]
    public void PartialEval_NestedLet_SimplifiesCorrectly()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("let $x := 5 in let $y := $x + 3 in $y * 2");

        var result = env.EvalPartial(expr);

        // Should fully evaluate to 16
        Assert.IsType<ValueExpr>(result);
        TestHelpers.AssertNumericEqual(16, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_LetWithUnusedVariableInChain_EliminatesTransitively()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("let $x := $unknown, $y := $x + 5, $z := 10 in $z");

        var result = env.EvalPartial(expr);

        // Should eliminate both $x and $y as they're not used in the body
        Assert.IsType<ValueExpr>(result);
        TestHelpers.AssertNumericEqual(10, ((ValueExpr)result).Value);
    }

    #endregion

    #region Short-Circuit Evaluation Tests

    [Fact]
    public void PartialEval_AndWithFalseFirst_ShortCircuits()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("false and $unknown");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.False((bool)((ValueExpr)result).Value!);
    }

    [Fact]
    public void PartialEval_AndWithTrueFirst_EvaluatesSecond()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("true and $unknown");

        var result = env.EvalPartial(expr);

        // Should simplify to just $unknown (true is identity for AND)
        Assert.IsType<VarExpr>(result);
        Assert.Equal("unknown", ((VarExpr)result).Name);
    }

    [Fact]
    public void PartialEval_OrWithTrueFirst_ShortCircuits()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("true or $unknown");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.True((bool)((ValueExpr)result).Value!);
    }

    [Fact]
    public void PartialEval_OrWithFalseFirst_EvaluatesSecond()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("false or $unknown");

        var result = env.EvalPartial(expr);

        // Should simplify to just $unknown (false is identity for OR)
        Assert.IsType<VarExpr>(result);
        Assert.Equal("unknown", ((VarExpr)result).Name);
    }

    [Fact]
    public void PartialEval_AndWithMultipleArgs_ShortCircuitsAtFirstFalse()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("true and true and false and $unknown");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.False((bool)((ValueExpr)result).Value!);
    }

    #endregion

    #region Array Operations Tests

    [Fact]
    public void PartialEval_MapWithKnownArray_EvaluatesElements()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$map([1, 2, 3], $x => $x * 2)");

        var result = env.EvalPartial(expr);

        // Map uses Evaluate internally, so it can evaluate simple expressions
        Assert.IsType<ValueExpr>(result);
        var arrayValue = ((ValueExpr)result).Value as ArrayValue;
        Assert.NotNull(arrayValue);
        Assert.Equal(3, arrayValue.Values.Count());
        // Check that we got actual numeric values (2, 4, 6)
        Assert.True(arrayValue.Values.All(v => v.Value != null));
    }

    [Fact]
    public void PartialEval_MapWithUnknownArray_ReturnsSymbolicCall()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$map($unknownArray, $x => $x * 2)");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("map", call.Function);
    }

    [Fact]
    public void PartialEval_MapWithPartiallyEvaluableExpression_ReturnsArrayExpr()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$map([1, 2, 3], $x => $x + $unknown)");

        var result = env.EvalPartial(expr);

        // Map uses EvaluatePartial, so when $x + $unknown can't be fully evaluated,
        // it returns symbolic CallExpr for each element
        Assert.IsType<ArrayExpr>(result);
        var arrayExpr = (ArrayExpr)result;
        Assert.Equal(3, arrayExpr.Values.Count());
        // Each element should be a CallExpr for the addition operation
        Assert.All(arrayExpr.Values, v => Assert.IsType<CallExpr>(v));
    }

    [Fact]
    public void PartialEval_FilterWithKnownArray_FiltersElements()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("[1, 2, 3, 4, 5][$this() > 2]");

        var result = env.EvalPartial(expr);

        // Filter uses Evaluate internally
        Assert.IsType<ValueExpr>(result);
        var resultValue = result.AsValue().ToNative();
        Assert.Equal([3L, 4L, 5L], ((IEnumerable) resultValue).Cast<long>());
    }

    [Fact]
    public void PartialEval_FilterWithUnknownArray_ReturnsSymbolicCall()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$unknownArray[$x > 2]");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        Assert.Equal("[", ((CallExpr)result).Function);
    }

    [Fact]
    public void PartialEval_FirstWithKnownArray_FindsElement()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$first([1, 2, 3, 4, 5], $x => $x > 3)");

        var result = env.EvalPartial(expr);

        // First uses Evaluate internally and can find matching elements
        Assert.IsType<ValueExpr>(result);
        // Should find first element > 3, which is 4
        Assert.NotNull(result.MaybeValue());
    }

    [Fact]
    public void PartialEval_FirstWithUnknownArray_ReturnsSymbolicCall()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$first($unknownArray, $x => $x > 3)");

        var result = env.EvalPartial(expr);

        // When array is unknown, first returns a symbolic CallExpr
        // (matching TypeScript behavior)
        Assert.IsType<CallExpr>(result);
        var callExpr = (CallExpr)result;
        Assert.Equal("first", callExpr.Function);
    }

    #endregion

    #region Integration with Evaluate Tests
    
    [Fact]
    public void Evaluate_ExpressionWithUnknownVariable_ReturnsError()
    {
        var env = TestHelpers.CreateBasicEnv();
        var expr = TestHelpers.Parse("$unknown");

        var (result, errors) = env.EvalWithErrors(expr);

        Assert.Null(result.Value);
        Assert.NotEmpty(errors);
        Assert.Contains("unknown", errors.First());
    }

    [Fact]
    public void Evaluate_LetWithUnknownVariable_ReturnsError()
    {
        var env = TestHelpers.CreateBasicEnv();
        var expr = TestHelpers.Parse("let $x := $unknown in $x + 5");

        var (result, errors) = env.EvalWithErrors(expr);

        Assert.Null(result.Value);
        Assert.NotEmpty(errors);
    }

    [Fact]
    public void EvaluatePartial_ThenEvaluate_ProducesConsistentResults()
    {
        var partialEnv = TestHelpers.CreatePartialEnv();
        var basicEnv = TestHelpers.CreateBasicEnv();
        var expr = TestHelpers.Parse("let $x := 5 in $x * 2");

        // Partial evaluation
        var partialResult = partialEnv.EvalPartial(expr);

        // Full evaluation
        var fullResult = basicEnv.EvalResult(expr);

        // Both should produce the same result
        Assert.IsType<ValueExpr>(partialResult);
        Assert.Equal(fullResult.Value, ((ValueExpr)partialResult).Value);
    }

    #endregion

    #region Complex Expression Tests

    [Fact]
    public void PartialEval_ComplexExpressionWithMixedKnownUnknown_SimplifiesCorrectly()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("let $a := 10, $b := $unknown, $c := $a * 2 in ($c + $b) > 15");

        var result = env.EvalPartial(expr);

        // SimplifyLet inlines all variables, resulting in: (20 + $unknown) > 15
        Assert.IsType<CallExpr>(result);
        var callExpr = (CallExpr)result;
        Assert.Equal(">", callExpr.Function);
    }

    [Fact]
    public void PartialEval_ConditionalWithConstantFoldingInBranches_SelectsAndSimplifies()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("(5 > 3) ? (10 + 5) : (20 * 2)");

        var result = env.EvalPartial(expr);

        // Should fully evaluate to 15
        Assert.IsType<ValueExpr>(result);
        TestHelpers.AssertNumericEqual(15, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_NestedLetsWithPartialEvaluation_SimplifiesCorrectly()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse(
            "let $x := 5 in " +
            "let $y := $x + 3 in " +
            "let $z := $unknown in " +
            "$y * 2 + $z"
        );

        var result = env.EvalPartial(expr);

        // SimplifyLet inlines all variables, resulting in: 16 + $unknown
        Assert.IsType<CallExpr>(result);
        var callExpr = (CallExpr)result;
        Assert.Equal("+", callExpr.Function);
    }

    [Fact]
    public void PartialEval_ArrayWithMixedConstantsAndVariables_PartiallyEvaluates()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("[1 + 1, 2 * 3, $unknown, 4 + 5]");

        var result = env.EvalPartial(expr);

        Assert.IsType<ArrayExpr>(result);
        var arrayExpr = (ArrayExpr)result;
        Assert.Equal(4, arrayExpr.Values.Count());

        // First three should be values, last should be unknown
        Assert.IsType<ValueExpr>(arrayExpr.Values.ElementAt(0));
        TestHelpers.AssertNumericEqual(2, ((ValueExpr)arrayExpr.Values.ElementAt(0)).Value);

        Assert.IsType<ValueExpr>(arrayExpr.Values.ElementAt(1));
        TestHelpers.AssertNumericEqual(6, ((ValueExpr)arrayExpr.Values.ElementAt(1)).Value);

        Assert.IsType<VarExpr>(arrayExpr.Values.ElementAt(2));

        Assert.IsType<ValueExpr>(arrayExpr.Values.ElementAt(3));
        TestHelpers.AssertNumericEqual(9, ((ValueExpr)arrayExpr.Values.ElementAt(3)).Value);
    }

    #endregion

    #region Property Access Tests

    [Fact]
    public void PartialEval_PropertyAccessWithData_FullyEvaluates()
    {
        var data = new JsonObject { ["value"] = 42 };
        var env = TestHelpers.CreatePartialEnv(data);
        var expr = TestHelpers.Parse("value");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        // JSON numbers are Int32
        Assert.Equal(42, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_PropertyAccessWithArithmetic_FullyEvaluates()
    {
        var data = new JsonObject { ["x"] = 10, ["y"] = 5 };
        var env = TestHelpers.CreatePartialEnv(data);
        var expr = TestHelpers.Parse("x + y * 2");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        // JSON integers become longs through arithmetic operations
        TestHelpers.AssertNumericEqual(20, ((ValueExpr)result).Value);
    }

    #endregion

    #region Property Access Without Data Tests

    [Fact]
    public void PartialEval_PropertyAccessWithoutData_ReturnsPropertyExpr()
    {
        // Create environment with no data (null data)
        var env = TestHelpers.CreatePartialEnv(null);
        var expr = TestHelpers.Parse("name");

        var result = env.EvalPartial(expr);

        Assert.IsType<PropertyExpr>(result);
        Assert.Equal("name", ((PropertyExpr)result).Property);
    }
    
    #endregion

    #region Known Variable Tests

    [Fact]
    public void PartialEval_KnownVariable_EvaluatesFully()
    {
        var env = TestHelpers.CreatePartialEnv(null).WithVariables(("x", 42));
        var expr = TestHelpers.Parse("$x");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Equal(42, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_KnownVariableInExpression_EvaluatesPartially()
    {
        var env = TestHelpers.CreatePartialEnv(null).WithVariables(("x", 10));
        var expr = TestHelpers.Parse("$x + $unknown");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("+", call.Function);
    }

    #endregion

    #region Variable Shadowing Tests

    [Fact]
    public void PartialEval_InnerVariableShadowsOuter()
    {
        var env = TestHelpers.CreatePartialEnv(null);
        var expr = TestHelpers.Parse("let $x := 5 in let $x := 10 in $x");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        TestHelpers.AssertNumericEqual(10, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_ShadowingWithPartialEvaluation()
    {
        // Note: True variable shadowing like `let $x := 5 in let $x := $x + 3 in $x`
        // causes infinite recursion because the inner $x binding references itself.
        // This test uses non-conflicting variable names instead.
        var env = TestHelpers.CreatePartialEnv(null);
        var expr = TestHelpers.Parse("let $x := 5 in let $y := $x + 3 in $y");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        TestHelpers.AssertNumericEqual(8, ((ValueExpr)result).Value);
    }

    [Fact(Skip = "TODO: Implement circular reference detection - currently causes stack overflow")]
    public void PartialEval_ShadowingWithSelfReference_ShouldReturnErrorNotInfiniteLoop()
    {
        // This test documents the desired behavior for self-referential bindings.
        // Currently both C# and TypeScript infinitely recurse on this expression.
        // The expected behavior is to detect the circular reference and return
        // a ValueExpr with null value and an error message.
        var env = TestHelpers.CreatePartialEnv(null);
        var expr = TestHelpers.Parse("let $x := 5 in let $x := $x + 3 in $x");

        var (result, errors) = env.EvalWithErrors(expr);

        // Should return null with an error about circular reference
        Assert.Null(result.Value);
        Assert.NotEmpty(errors);
        Assert.Contains(errors, e => e.Contains("$x") || e.Contains("circular") || e.Contains("recursive"));
    }

    [Fact(Skip = "TODO: Implement circular reference detection - currently causes stack overflow")]
    public void PartialEval_DirectSelfReference_ShouldReturnErrorNotInfiniteLoop()
    {
        // Even simpler case: let $x := $x + 1 in $x
        // The binding directly references the variable being defined.
        var env = TestHelpers.CreatePartialEnv(null);
        var expr = TestHelpers.Parse("let $x := $x + 1 in $x");

        var (result, errors) = env.EvalWithErrors(expr);

        // Should return null with an error about circular reference
        Assert.Null(result.Value);
        Assert.NotEmpty(errors);
        Assert.Contains(errors, e => e.Contains("$x") || e.Contains("circular") || e.Contains("recursive"));
    }

    #endregion

    #region Array Edge Case Tests

    [Fact]
    public void PartialEval_ArrayWithUnknownElement_ReturnsArrayExpr()
    {
        var env = TestHelpers.CreatePartialEnv(null);
        var expr = TestHelpers.Parse("[1, 2, $unknown, 4]");

        var result = env.EvalPartial(expr);

        Assert.IsType<ArrayExpr>(result);
        var arrayExpr = (ArrayExpr)result;
        var values = arrayExpr.Values.ToList();
        Assert.Equal(4, values.Count);
        Assert.IsType<ValueExpr>(values[0]);
        Assert.IsType<VarExpr>(values[2]);
    }

    [Fact]
    public void PartialEval_ArrayWithMixedSymbolicElements_PartiallyEvaluates()
    {
        var env = TestHelpers.CreatePartialEnv(null);
        var expr = TestHelpers.Parse("[1 + 1, $x, 3 * 2]");

        var result = env.EvalPartial(expr);

        Assert.IsType<ArrayExpr>(result);
        var arrayExpr = (ArrayExpr)result;
        var values = arrayExpr.Values.ToList();
        Assert.Equal(3, values.Count);
        Assert.IsType<ValueExpr>(values[0]); // 1+1 = 2
        Assert.IsType<VarExpr>(values[1]);   // $x stays symbolic
        Assert.IsType<ValueExpr>(values[2]); // 3*2 = 6
    }

    #endregion

    #region Advanced Array Operation Tests

    [Fact]
    public void PartialEval_SumOverSymbolicArray_ReturnsSymbolicCall()
    {
        var env = TestHelpers.CreatePartialEnv(null);
        var expr = TestHelpers.Parse("$sum($unknownArray)");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("sum", call.Function);
    }

    [Fact]
    public void PartialEval_CountWithSymbolicArray_ReturnsSymbolicCall()
    {
        var env = TestHelpers.CreatePartialEnv(null);
        var expr = TestHelpers.Parse("$count($unknownArray)");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
    }

    [Fact]
    public void PartialEval_ElemWithSymbolicArrayIndex_ReturnsSymbolicCall()
    {
        var env = TestHelpers.CreatePartialEnv(null).WithVariables(
            ("arr", new ArrayValue([new ValueExpr(1), new ValueExpr(2), new ValueExpr(3)]))
        );
        var expr = TestHelpers.Parse("$elem($arr, $unknownIndex)");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
    }

    [Fact]
    public void PartialEval_ElemWithSymbolicArray_ReturnsSymbolicCall()
    {
        var env = TestHelpers.CreatePartialEnv(null);
        var expr = TestHelpers.Parse("$elem($unknownArray, 0)");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
    }

    [Fact]
    public void PartialEval_ObjectFunctionWithSymbolicValue_ReturnsCallExpr()
    {
        var env = TestHelpers.CreatePartialEnv(null);
        var expr = TestHelpers.Parse("$object(\"key\", $unknownValue)");

        var result = env.EvalPartial(expr);

        // Should return a CallExpr since value is symbolic
        Assert.IsType<CallExpr>(result);
    }

    #endregion

    #region Edge Case Tests

    // Note: Empty let expression test removed - C# parser doesn't support "let in <expr>" syntax
    // (would require grammar change to make variable assignments optional)

    [Fact]
    public void PartialEval_NullHandling_EvaluatesCorrectly()
    {
        var env = TestHelpers.CreatePartialEnv(null);
        var expr = TestHelpers.Parse("null + 5");

        var result = env.EvalPartial(expr);

        // null + anything should return null
        Assert.IsType<ValueExpr>(result);
        Assert.Null(((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_NullWithSymbolicInBinaryOp_SimplifiesToNull()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$x + null");

        var result = env.EvalPartial(expr);

        // $x + null should simplify to null
        Assert.IsType<ValueExpr>(result);
        Assert.Null(((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_NullWithSymbolicInComparison_SimplifiesToNull()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$x <= null");

        var result = env.EvalPartial(expr);

        // $x <= null should simplify to null
        Assert.IsType<ValueExpr>(result);
        Assert.Null(((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_NullWithSymbolicInAnd_SimplifiesToNull()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$x and null");

        var result = env.EvalPartial(expr);

        // $x and null should simplify to null
        Assert.IsType<ValueExpr>(result);
        Assert.Null(((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_NullWithSymbolicInOr_SimplifiesToNull()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("null or $y");

        var result = env.EvalPartial(expr);

        // null or $y should simplify to null
        Assert.IsType<ValueExpr>(result);
        Assert.Null(((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_ComparisonInBooleanExpr_SubstitutesDefinedVariables()
    {
        var env = TestHelpers.CreatePartialEnv().WithVariables(("FreightMaxWidth", 12));
        var expr = TestHelpers.Parse("height <= $FreightMaxHeight and width <= $FreightMaxWidth");

        var result = env.EvalPartial(expr);

        // Should partially evaluate: FreightMaxWidth should be substituted
        var printed = PrintExpr.Print(result);
        Assert.Contains("12", printed);
        Assert.DoesNotContain("FreightMaxWidth", printed);
        // Expected output: "height <= $FreightMaxHeight and width <= 12"
    }

    [Fact]
    public void PartialEval_AndWithTrueFirst_SimplifiesToSecondArg()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("true and $unknown");

        var result = env.EvalPartial(expr);

        // Should simplify to just $unknown
        Assert.IsType<VarExpr>(result);
        Assert.Equal("unknown", ((VarExpr)result).Name);
    }

    [Fact]
    public void PartialEval_OrWithFalseFirst_SimplifiesToSecondArg()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("false or $unknown");

        var result = env.EvalPartial(expr);

        // Should simplify to just $unknown
        Assert.IsType<VarExpr>(result);
        Assert.Equal("unknown", ((VarExpr)result).Name);
    }

    [Fact]
    public void PartialEval_AndWithTrueAndSymbolic_FiltersOutTrue()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$x and true and $y");

        var result = env.EvalPartial(expr);

        // Should simplify to: $x and $y (true filtered out)
        var printed = PrintExpr.Print(result);
        Assert.DoesNotContain("true", printed);
        Assert.Contains("$x", printed);
        Assert.Contains("$y", printed);
    }

    [Fact]
    public void PartialEval_OrWithFalseAndSymbolic_FiltersOutFalse()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$x or false or $y");

        var result = env.EvalPartial(expr);

        // Should simplify to: $x or $y (false filtered out)
        var printed = PrintExpr.Print(result);
        Assert.DoesNotContain("false", printed);
        Assert.Contains("$x", printed);
        Assert.Contains("$y", printed);
    }

    [Fact]
    public void PartialEval_AndAllIdentityValues_ReturnsTrue()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("true and true and true");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.True((bool)((ValueExpr)result).Value!);
    }

    [Fact]
    public void PartialEval_OrAllIdentityValues_ReturnsFalse()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("false or false or false");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.False((bool)((ValueExpr)result).Value!);
    }

    #endregion

    #region Which Partial Evaluation Tests

    [Fact]
    public void PartialEval_Which_SymbolicCondition_ReturnsCallWithAllArgsEvaluated()
    {
        var data = new JsonObject { ["known"] = "value1" };
        var env = TestHelpers.CreatePartialEnv(data);
        var expr = TestHelpers.Parse("$which($unknown, \"a\", known, \"b\", $other)");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        // All args should be partially evaluated
        Assert.Equal("$which($unknown, \"a\", \"value1\", \"b\", $other)", result.Print());
    }

    [Fact]
    public void PartialEval_Which_KnownConditionWithMatch_ReturnsResult()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$which(\"test\", \"test\", \"matched\", \"other\", \"not matched\")");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Equal("matched", ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_Which_NonMatchingValuesRemoved()
    {
        var env = TestHelpers.CreatePartialEnv();
        // condition="x", first case="a" (no match), second case=$unknown (symbolic)
        var expr = TestHelpers.Parse("$which(\"x\", \"a\", \"resultA\", $unknown, \"resultB\")");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        // "a"/"resultA" pair should be removed since "x" != "a"
        // Only the symbolic pair should remain
        Assert.Equal("$which(\"x\", $unknown, \"resultB\")", result.Print());
    }

    [Fact]
    public void PartialEval_Which_MultipleNonMatchingPairsRemoved()
    {
        var env = TestHelpers.CreatePartialEnv();
        // condition="x", cases "a", "b", "c" don't match, $unknown is symbolic
        var expr = TestHelpers.Parse("$which(\"x\", \"a\", \"A\", \"b\", \"B\", $unknown, \"X\", \"c\", \"C\")");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        // All known non-matching pairs removed, only symbolic pair remains
        Assert.Equal("$which(\"x\", $unknown, \"X\")", result.Print());
    }

    [Fact]
    public void PartialEval_Which_NoMatchesNoSymbolic_ReturnsNull()
    {
        var env = TestHelpers.CreatePartialEnv();
        var expr = TestHelpers.Parse("$which(\"x\", \"a\", \"A\", \"b\", \"B\")");

        var result = env.EvalPartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Null(((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_Which_SymbolicComparisonKeptContinuesProcessing()
    {
        var env = TestHelpers.CreatePartialEnv();
        // First pair is symbolic, second matches
        var expr = TestHelpers.Parse("$which(\"test\", $unknown, \"first\", \"test\", \"matched\")");

        var result = env.EvalPartial(expr);

        // Should return "matched" since second pair matches
        Assert.IsType<ValueExpr>(result);
        Assert.Equal("matched", ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_Which_ResultValuesAlsoEvaluated()
    {
        var data = new JsonObject { ["resultVal"] = "computed" };
        var env = TestHelpers.CreatePartialEnv(data);
        var expr = TestHelpers.Parse("$which(\"x\", $unknown, resultVal)");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        // The result value should be evaluated
        Assert.Equal("$which(\"x\", $unknown, \"computed\")", result.Print());
    }

    [Fact]
    public void PartialEval_Which_OriginalIssue_AllArgsPreserved()
    {
        // This was the original bug: $blah was being dropped
        var data = new JsonObject
        {
            ["thing"] = "test",
            ["match"] = "test1",
            ["result"] = "ok"
        };
        var env = TestHelpers.CreatePartialEnv(data);
        var expr = TestHelpers.Parse("$which(thing, match, result, $derp, $blah)");

        var result = env.EvalPartial(expr);

        Assert.IsType<CallExpr>(result);
        // "test1"/"ok" pair doesn't match "test", so removed
        // $derp/$blah pair should be preserved
        Assert.Equal("$which(\"test\", $derp, $blah)", result.Print());
    }

    #endregion
}
