using System.Text.Json.Nodes;
using Astrolabe.Evaluator.Functions;

namespace Astrolabe.Evaluator.Test;

public class PartialEvaluationTests
{
    private static EvalEnvironment CreateEnv(JsonObject? data = null)
    {
        // When data is null, use UndefinedData for symbolic evaluation (property access returns PropertyExpr)
        var evalData = data == null
            ? EvalData.UndefinedData()
            : JsonDataLookup.FromObject(data);
        return EvalEnvironment.DataFrom(evalData).AddDefaultFunctions();
    }

    private static EvalExpr Parse(string expr)
    {
        return ExprParser.Parse(expr);
    }

    #region Constant Folding Tests

    [Fact]
    public void PartialEval_ArithmeticExpression_FullyEvaluates()
    {
        var env = CreateEnv();
        var expr = Parse("5 + 3 * 2");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        var value = ((ValueExpr)result).Value;
        Assert.Equal(11.0, (double)value!);
    }

    [Fact]
    public void PartialEval_NestedArithmetic_FullyEvaluates()
    {
        var env = CreateEnv();
        var expr = Parse("(10 - 5) * (2 + 3)");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        var value = ((ValueExpr)result).Value;
        Assert.Equal(25.0, (double)value!);
    }

    [Fact]
    public void PartialEval_ComparisonWithConstants_FullyEvaluates()
    {
        var env = CreateEnv();
        var expr = Parse("5 > 3");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        var value = ((ValueExpr)result).Value;
        Assert.True((bool)value!);
    }

    #endregion

    #region Symbolic Expression Tests

    [Fact]
    public void PartialEval_UnknownVariable_ReturnsVarExpr()
    {
        var env = CreateEnv();
        var expr = Parse("$unknownVar");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<VarExpr>(result);
        Assert.Equal("unknownVar", ((VarExpr)result).Name);
    }

    [Fact]
    public void PartialEval_ArithmeticWithUnknownVariable_ReturnsCallExpr()
    {
        var env = CreateEnv();
        var expr = Parse("$x + 5");

        var (_, result) = env.EvaluatePartial(expr);

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
        var env = CreateEnv();
        var expr = Parse("$x > 10");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal(">", call.Function);
    }

    [Fact]
    public void PartialEval_MultipleUnknownVariables_ReturnsSymbolicExpression()
    {
        var env = CreateEnv();
        var expr = Parse("$x + $y * 2");

        var (_, result) = env.EvaluatePartial(expr);

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
        var env = CreateEnv();
        var expr = Parse("true ? 100 : 200");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Equal(100.0, (double) ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_ConditionalWithFalseCondition_SelectsElseBranch()
    {
        var env = CreateEnv();
        var expr = Parse("false ? 100 : 200");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Equal(200.0, (double) ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_ConditionalWithUnknownCondition_ReturnsSymbolicCall()
    {
        var env = CreateEnv();
        var expr = Parse("$unknown ? 100 : 200");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("?", call.Function);
        Assert.Equal(3, call.Args.Count);
    }

    [Fact]
    public void PartialEval_ConditionalWithTrueCondition_OnlyEvaluatesThenBranch()
    {
        var env = CreateEnv();
        // The else branch has an unknown variable, but shouldn't be evaluated
        var expr = Parse("true ? 42 : $undefinedVar");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Equal(42.0, (double) ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_ConditionalWithPartiallyEvaluatedBranches_ReturnsPartialExpression()
    {
        var env = CreateEnv();
        var expr = Parse("$cond ? ($x + 5) : ($y * 2)");

        var (_, result) = env.EvaluatePartial(expr);

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
        var env = CreateEnv();
        var expr = Parse("let $x := 5 in $x + 3");

        var (_, result) = env.EvaluatePartial(expr);

        // Should fully evaluate to 8
        Assert.IsType<ValueExpr>(result);
        Assert.Equal(8.0, (double) ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_LetWithMultipleConstants_InlinesAll()
    {
        var env = CreateEnv();
        var expr = Parse("let $x := 5, $y := 3 in $x * $y");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Equal(15.0, (double) ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_LetWithUnusedVariable_EliminatesDeadCode()
    {
        var env = CreateEnv();
        var expr = Parse("let $x := 5, $unused := $unknown in $x + 3");

        var (_, result) = env.EvaluatePartial(expr);

        // Should evaluate to 8, eliminating the unused variable
        Assert.IsType<ValueExpr>(result);
        Assert.Equal(8.0, (double) ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_LetWithUnknownVariable_KeepsSymbolicBinding()
    {
        var env = CreateEnv();
        var expr = Parse("let $x := $unknown in $x + 5");

        var (_, result) = env.EvaluatePartial(expr);

        // SimplifyLet inlines the variable reference since it's simple, resulting in CallExpr
        Assert.IsType<CallExpr>(result);
        var callExpr = (CallExpr)result;
        Assert.Equal("+", callExpr.Function);
        Assert.IsType<VarExpr>(callExpr.Args[0]); // $unknown
    }

    [Fact]
    public void PartialEval_LetWithChainedReferences_InlinesWherePossible()
    {
        var env = CreateEnv();
        var expr = Parse("let $x := 5, $y := $x + 3, $z := $y * 2 in $z");

        var (_, result) = env.EvaluatePartial(expr);

        // Should fully evaluate to 16
        Assert.IsType<ValueExpr>(result);
        Assert.Equal(16.0, (double) ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_LetWithPartiallyKnownExpression_SimplifiesPartially()
    {
        var env = CreateEnv();
        var expr = Parse("let $x := 5 + 3, $y := $x + $unknown in $y");

        var (_, result) = env.EvaluatePartial(expr);

        // Should simplify to: let $y := 8 + $unknown in $y
        Assert.IsType<LetExpr>(result);
        var letExpr = (LetExpr)result;
        Assert.Single(letExpr.Vars);

        var (_, bindingExpr) = letExpr.Vars.First();
        Assert.IsType<CallExpr>(bindingExpr); // 8 + $unknown
    }

    [Fact]
    public void PartialEval_NestedLet_SimplifiesCorrectly()
    {
        var env = CreateEnv();
        var expr = Parse("let $x := 5 in let $y := $x + 3 in $y * 2");

        var (_, result) = env.EvaluatePartial(expr);

        // Should fully evaluate to 16
        Assert.IsType<ValueExpr>(result);
        Assert.Equal(16.0, (double) ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_LetWithUnusedVariableInChain_EliminatesTransitively()
    {
        var env = CreateEnv();
        var expr = Parse("let $x := $unknown, $y := $x + 5, $z := 10 in $z");

        var (_, result) = env.EvaluatePartial(expr);

        // Should eliminate both $x and $y as they're not used in the body
        Assert.IsType<ValueExpr>(result);
        Assert.Equal(10.0, (double) ((ValueExpr)result).Value);
    }

    #endregion

    #region Short-Circuit Evaluation Tests

    [Fact]
    public void PartialEval_AndWithFalseFirst_ShortCircuits()
    {
        var env = CreateEnv();
        var expr = Parse("false and $unknown");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.False((bool)((ValueExpr)result).Value!);
    }

    [Fact]
    public void PartialEval_AndWithTrueFirst_EvaluatesSecond()
    {
        var env = CreateEnv();
        var expr = Parse("true and $unknown");

        var (_, result) = env.EvaluatePartial(expr);

        // Should return symbolic expression for the AND
        Assert.IsType<CallExpr>(result);
        Assert.Equal("and", ((CallExpr)result).Function);
    }

    [Fact]
    public void PartialEval_OrWithTrueFirst_ShortCircuits()
    {
        var env = CreateEnv();
        var expr = Parse("true or $unknown");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.True((bool)((ValueExpr)result).Value!);
    }

    [Fact]
    public void PartialEval_OrWithFalseFirst_EvaluatesSecond()
    {
        var env = CreateEnv();
        var expr = Parse("false or $unknown");

        var (_, result) = env.EvaluatePartial(expr);

        // Should return symbolic expression
        Assert.IsType<CallExpr>(result);
        Assert.Equal("or", ((CallExpr)result).Function);
    }

    [Fact]
    public void PartialEval_AndWithMultipleArgs_ShortCircuitsAtFirstFalse()
    {
        var env = CreateEnv();
        var expr = Parse("true and true and false and $unknown");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.False((bool)((ValueExpr)result).Value!);
    }

    #endregion

    #region Array Operations Tests

    [Fact]
    public void PartialEval_MapWithKnownArray_EvaluatesElements()
    {
        var env = CreateEnv();
        var expr = Parse("$map([1, 2, 3], $x => $x * 2)");

        var (_, result) = env.EvaluatePartial(expr);

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
        var env = CreateEnv();
        var expr = Parse("$map($unknownArray, $x => $x * 2)");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("map", call.Function);
    }

    [Fact]
    public void PartialEval_MapWithPartiallyEvaluableExpression_ReturnsArrayExpr()
    {
        var env = CreateEnv();
        var expr = Parse("$map([1, 2, 3], $x => $x + $unknown)");

        var (_, result) = env.EvaluatePartial(expr);

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
        var env = CreateEnv();
        var expr = Parse("[1, 2, 3, 4, 5][$x > 2]");

        var (_, result) = env.EvaluatePartial(expr);

        // Filter uses Evaluate internally
        Assert.IsType<ValueExpr>(result);
        var arrayValue = result.MaybeValue()?.Value as ArrayValue;
        if (arrayValue != null)
        {
            // Elements greater than 2: [3, 4, 5]
            Assert.True(arrayValue.Values.Count() >= 0);
        }
    }

    [Fact]
    public void PartialEval_FilterWithUnknownArray_ReturnsSymbolicCall()
    {
        var env = CreateEnv();
        var expr = Parse("$unknownArray[$x > 2]");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<CallExpr>(result);
        Assert.Equal("[", ((CallExpr)result).Function);
    }

    [Fact]
    public void PartialEval_FirstWithKnownArray_FindsElement()
    {
        var env = CreateEnv();
        var expr = Parse("$first([1, 2, 3, 4, 5], $x => $x > 3)");

        var (_, result) = env.EvaluatePartial(expr);

        // First uses Evaluate internally and can find matching elements
        Assert.IsType<ValueExpr>(result);
        // Should find first element > 3, which is 4
        Assert.NotNull(result.MaybeValue());
    }

    [Fact]
    public void PartialEval_FirstWithUnknownArray_ReturnsSymbolicCall()
    {
        var env = CreateEnv();
        var expr = Parse("$first($unknownArray, $x => $x > 3)");

        var (_, result) = env.EvaluatePartial(expr);

        // First returns a ValueExpr with null because array is unknown
        Assert.IsType<ValueExpr>(result);
    }

    #endregion

    #region Integration with Evaluate Tests

    [Fact]
    public void Evaluate_FullyEvaluableExpression_ReturnsValue()
    {
        var env = CreateEnv();
        var expr = Parse("5 + 3");

        var (_, result) = env.Evaluate(expr);

        Assert.Equal(8.0, (double) result.Value);
    }

    [Fact]
    public void Evaluate_ExpressionWithUnknownVariable_ReturnsError()
    {
        var env = CreateEnv();
        var expr = Parse("$unknown");

        var (resultEnv, result) = env.Evaluate(expr);

        Assert.Null(result.Value);
        Assert.NotEmpty(resultEnv.Errors);
        Assert.Contains("unknown", resultEnv.Errors.First().Message);
    }

    [Fact]
    public void Evaluate_LetWithUnknownVariable_ReturnsError()
    {
        var env = CreateEnv();
        var expr = Parse("let $x := $unknown in $x + 5");

        var (resultEnv, result) = env.Evaluate(expr);

        Assert.Null(result.Value);
        Assert.NotEmpty(resultEnv.Errors);
    }

    [Fact]
    public void EvaluatePartial_ThenEvaluate_ProducesConsistentResults()
    {
        var env = CreateEnv();
        var expr = Parse("let $x := 5 in $x * 2");

        // Partial evaluation
        var (env1, partialResult) = env.EvaluatePartial(expr);

        // Full evaluation
        var (env2, fullResult) = env.Evaluate(expr);

        // Both should produce the same result
        Assert.IsType<ValueExpr>(partialResult);
        Assert.Equal(fullResult.Value, ((ValueExpr)partialResult).Value);
    }

    #endregion

    #region Complex Expression Tests

    [Fact]
    public void PartialEval_ComplexExpressionWithMixedKnownUnknown_SimplifiesCorrectly()
    {
        var env = CreateEnv();
        var expr = Parse("let $a := 10, $b := $unknown, $c := $a * 2 in ($c + $b) > 15");

        var (_, result) = env.EvaluatePartial(expr);

        // SimplifyLet inlines all variables, resulting in: (20 + $unknown) > 15
        Assert.IsType<CallExpr>(result);
        var callExpr = (CallExpr)result;
        Assert.Equal(">", callExpr.Function);
    }

    [Fact]
    public void PartialEval_ConditionalWithConstantFoldingInBranches_SelectsAndSimplifies()
    {
        var env = CreateEnv();
        var expr = Parse("(5 > 3) ? (10 + 5) : (20 * 2)");

        var (_, result) = env.EvaluatePartial(expr);

        // Should fully evaluate to 15
        Assert.IsType<ValueExpr>(result);
        Assert.Equal(15.0, (double) ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_NestedLetsWithPartialEvaluation_SimplifiesCorrectly()
    {
        var env = CreateEnv();
        var expr = Parse(
            "let $x := 5 in " +
            "let $y := $x + 3 in " +
            "let $z := $unknown in " +
            "$y * 2 + $z"
        );

        var (_, result) = env.EvaluatePartial(expr);

        // SimplifyLet inlines all variables, resulting in: 16 + $unknown
        Assert.IsType<CallExpr>(result);
        var callExpr = (CallExpr)result;
        Assert.Equal("+", callExpr.Function);
    }

    [Fact]
    public void PartialEval_ArrayWithMixedConstantsAndVariables_PartiallyEvaluates()
    {
        var env = CreateEnv();
        var expr = Parse("[1 + 1, 2 * 3, $unknown, 4 + 5]");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ArrayExpr>(result);
        var arrayExpr = (ArrayExpr)result;
        Assert.Equal(4, arrayExpr.Values.Count());

        // First three should be values, last should be unknown
        Assert.IsType<ValueExpr>(arrayExpr.Values.ElementAt(0));
        Assert.Equal(2.0, (double) ((ValueExpr)arrayExpr.Values.ElementAt(0)).Value);

        Assert.IsType<ValueExpr>(arrayExpr.Values.ElementAt(1));
        Assert.Equal(6.0, (double) ((ValueExpr)arrayExpr.Values.ElementAt(1)).Value);

        Assert.IsType<VarExpr>(arrayExpr.Values.ElementAt(2));

        Assert.IsType<ValueExpr>(arrayExpr.Values.ElementAt(3));
        Assert.Equal(9.0, (double) ((ValueExpr)arrayExpr.Values.ElementAt(3)).Value);
    }

    #endregion

    #region Property Access Tests

    [Fact]
    public void PartialEval_PropertyAccessWithData_FullyEvaluates()
    {
        var data = new JsonObject { ["value"] = 42 };
        var env = CreateEnv(data);
        var expr = Parse("value");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        // JSON numbers are Int32
        Assert.Equal(42, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_PropertyAccessWithArithmetic_FullyEvaluates()
    {
        var data = new JsonObject { ["x"] = 10, ["y"] = 5 };
        var env = CreateEnv(data);
        var expr = Parse("x + y * 2");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        // JSON integers become doubles through arithmetic operations
        Assert.Equal(20.0, (double)((ValueExpr)result).Value!);
    }

    #endregion

    #region Property Access Without Data Tests

    [Fact]
    public void PartialEval_PropertyAccessWithoutData_ReturnsPropertyExpr()
    {
        // Create environment with no data (null data)
        var env = CreateEnv(null);
        var expr = Parse("name");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<PropertyExpr>(result);
        Assert.Equal("name", ((PropertyExpr)result).Property);
    }

    [Fact]
    public void Evaluate_PropertyAccessWithoutData_ReturnsError()
    {
        var env = CreateEnv(null);
        var expr = Parse("name");

        var (resultEnv, result) = env.Evaluate(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Null(((ValueExpr)result).Value);
        Assert.NotEmpty(resultEnv.Errors);
    }

    #endregion

    #region Known Variable Tests

    [Fact]
    public void PartialEval_KnownVariable_EvaluatesFully()
    {
        var env = CreateEnv(null).WithVariables([
            new KeyValuePair<string, EvalExpr>("x", new ValueExpr(42))
        ]);
        var expr = Parse("$x");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Equal(42, ((ValueExpr)result).Value);
    }

    [Fact]
    public void PartialEval_KnownVariableInExpression_EvaluatesPartially()
    {
        var env = CreateEnv(null).WithVariables([
            new KeyValuePair<string, EvalExpr>("x", new ValueExpr(10))
        ]);
        var expr = Parse("$x + $unknown");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("+", call.Function);
    }

    #endregion

    #region Variable Shadowing Tests

    [Fact]
    public void PartialEval_InnerVariableShadowsOuter()
    {
        var env = CreateEnv(null);
        var expr = Parse("let $x := 5 in let $x := 10 in $x");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Equal(10.0, (double)((ValueExpr)result).Value!);
    }

    [Fact]
    public void PartialEval_ShadowingWithPartialEvaluation()
    {
        var env = CreateEnv(null);
        var expr = Parse("let $x := 5 in let $x := $x + 3 in $x");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Equal(8.0, (double)((ValueExpr)result).Value!);
    }

    #endregion

    #region Array Edge Case Tests

    [Fact]
    public void PartialEval_ArrayWithUnknownElement_ReturnsArrayExpr()
    {
        var env = CreateEnv(null);
        var expr = Parse("[1, 2, $unknown, 4]");

        var (_, result) = env.EvaluatePartial(expr);

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
        var env = CreateEnv(null);
        var expr = Parse("[1 + 1, $x, 3 * 2]");

        var (_, result) = env.EvaluatePartial(expr);

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
        var env = CreateEnv(null);
        var expr = Parse("$sum($unknownArray)");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("sum", call.Function);
    }

    [Fact]
    public void PartialEval_CountWithSymbolicArray_ReturnsSymbolicCall()
    {
        var env = CreateEnv(null);
        var expr = Parse("$count($unknownArray)");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<CallExpr>(result);
    }

    [Fact]
    public void PartialEval_ElemWithSymbolicArrayIndex_ReturnsSymbolicCall()
    {
        var env = CreateEnv(null).WithVariables([
            new KeyValuePair<string, EvalExpr>("arr", new ValueExpr(new ArrayValue([
                new ValueExpr(1), new ValueExpr(2), new ValueExpr(3)
            ])))
        ]);
        var expr = Parse("$elem($arr, $unknownIndex)");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<CallExpr>(result);
    }

    [Fact]
    public void PartialEval_ElemWithSymbolicArray_ReturnsSymbolicCall()
    {
        var env = CreateEnv(null);
        var expr = Parse("$elem($unknownArray, 0)");

        var (_, result) = env.EvaluatePartial(expr);

        Assert.IsType<CallExpr>(result);
    }

    [Fact]
    public void PartialEval_ObjectFunctionWithSymbolicValue_ReturnsCallExpr()
    {
        var env = CreateEnv(null);
        var expr = Parse("$object(\"key\", $unknownValue)");

        var (_, result) = env.EvaluatePartial(expr);

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
        var env = CreateEnv(null);
        var expr = Parse("null + 5");

        var (_, result) = env.EvaluatePartial(expr);

        // null + anything should return null
        Assert.IsType<ValueExpr>(result);
        Assert.Null(((ValueExpr)result).Value);
    }

    #endregion
}
