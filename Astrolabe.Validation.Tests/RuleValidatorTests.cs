using System.Text.Json.Nodes;
using Astrolabe.Evaluator;
using Xunit;

namespace Astrolabe.Validation.Tests;

public class RuleValidatorTests
{
    [Fact]
    public void ValidateJson_SimpleComparison_FailsWhenInvalid()
    {
        // Simplest possible failing case - direct comparison
        var data = JsonNode.Parse("""{"value": 5}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("value"),
            ValueExpr.Null,
            ExprParser.Parse("value > 10")
        );

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        var failures = results[0].Failures.ToList();
        Assert.Single(failures); // 5 > 10 should fail

        // Check failure contents
        var failure = failures[0];
        Assert.Equal(">", failure.Call.Function);
        Assert.Equal(2, failure.EvaluatedArgs.Count);
        Assert.Equal(5L, failure.EvaluatedArgs[0].Value); // left arg: value = 5
        Assert.Equal(10L, failure.EvaluatedArgs[1].Value); // right arg: 10
    }

    [Fact]
    public void ValidateJson_SimpleEqualityRule_PassesWhenValid()
    {
        var data = JsonNode.Parse("""{"name": "John"}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("name"),
            ValueExpr.Null,
            ExprParser.Parse("name = \"John\"")
        );

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Empty(results[0].Failures);
        Assert.Equal("John", results[0].PathValue);
    }

    [Fact]
    public void ValidateJson_SimpleEqualityRule_FailsWhenInvalid()
    {
        var data = JsonNode.Parse("""{"name": "Jane"}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("name"),
            ValueExpr.Null,
            ExprParser.Parse("name = \"John\"")
        );

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Single(results[0].Failures);
        Assert.Equal("Jane", results[0].PathValue);

        // Check failure contents
        var failure = results[0].Failures.First();
        Assert.Equal("=", failure.Call.Function);
        Assert.Equal(2, failure.EvaluatedArgs.Count);
        Assert.Equal("Jane", failure.EvaluatedArgs[0].Value); // actual value
        Assert.Equal("John", failure.EvaluatedArgs[1].Value); // expected value
    }

    [Fact]
    public void ValidateJson_NotEmptyRule_PassesForNonEmptyString()
    {
        var data = JsonNode.Parse("""{"email": "test@example.com"}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("email"),
            ValueExpr.Null,
            ExprParser.Parse("$notEmpty(email)")
        );

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Empty(results[0].Failures);
    }

    [Fact]
    public void ValidateJson_NotEmptyRule_FailsForEmptyString()
    {
        var data = JsonNode.Parse("""{"email": ""}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("email"),
            ValueExpr.Null,
            ExprParser.Parse("$notEmpty(email)")
        );

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Single(results[0].Failures);

        // Check failure contents
        var failure = results[0].Failures.First();
        Assert.Equal("notEmpty", failure.Call.Function);
        Assert.Single(failure.EvaluatedArgs);
        Assert.Equal("", failure.EvaluatedArgs[0].Value); // empty string
    }

    [Fact]
    public void ValidateJson_NotEmptyRule_FailsForNull()
    {
        var data = JsonNode.Parse("""{"email": null}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("email"),
            ValueExpr.Null,
            ExprParser.Parse("$notEmpty(email)")
        );

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Single(results[0].Failures);

        // Check failure contents
        var failure = results[0].Failures.First();
        Assert.Equal("notEmpty", failure.Call.Function);
        Assert.Single(failure.EvaluatedArgs);
        Assert.Null(failure.EvaluatedArgs[0].Value); // null value
    }

    [Fact]
    public void ValidateJson_ComparisonRule_PassesWhenValid()
    {
        var data = JsonNode.Parse("""{"age": 25}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("age"),
            ValueExpr.Null,
            ExprParser.Parse("age >= 18")
        );

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Empty(results[0].Failures);
    }

    [Fact]
    public void ValidateJson_ComparisonRule_FailsWhenInvalid()
    {
        var data = JsonNode.Parse("""{"age": 15}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("age"),
            ValueExpr.Null,
            ExprParser.Parse("age >= 18")
        );

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Single(results[0].Failures);

        // Check failure contents
        var failure = results[0].Failures.First();
        Assert.Equal(">=", failure.Call.Function);
        Assert.Equal(2, failure.EvaluatedArgs.Count);
        Assert.Equal(15L, failure.EvaluatedArgs[0].Value); // actual age
        Assert.Equal(18L, failure.EvaluatedArgs[1].Value); // minimum required
    }

    [Fact]
    public void ValidateJson_MultipleRules_ValidatesAll()
    {
        var data = JsonNode.Parse("""{"name": "", "age": 15}""")!;
        var rules = MultiRule.For(
            new SingleRule(
                ExprParser.Parse("name"),
                ValueExpr.Null,
                ExprParser.Parse("$notEmpty(name)")
            ),
            new SingleRule(
                ExprParser.Parse("age"),
                ValueExpr.Null,
                ExprParser.Parse("age >= 18")
            )
        );

        var results = RuleValidator.ValidateJson(data, rules, null);

        Assert.Equal(2, results.Count);
        Assert.Single(results[0].Failures); // name is empty
        Assert.Single(results[1].Failures); // age < 18

        // Check first failure (name notEmpty)
        var nameFailure = results[0].Failures.First();
        Assert.Equal("notEmpty", nameFailure.Call.Function);
        Assert.Equal("", nameFailure.EvaluatedArgs[0].Value);

        // Check second failure (age >= 18)
        var ageFailure = results[1].Failures.First();
        Assert.Equal(">=", ageFailure.Call.Function);
        Assert.Equal(15L, ageFailure.EvaluatedArgs[0].Value);
        Assert.Equal(18L, ageFailure.EvaluatedArgs[1].Value);
    }

    [Fact]
    public void ValidateJson_WithMessage_AttachesMessageToResult()
    {
        var data = JsonNode.Parse("""{"name": ""}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("name"),
            ValueExpr.Null,
            ExprParser.Parse("$notEmpty(name)")
        ).WithMessage(new ValueExpr("Name is required"));

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Equal("Name is required", results[0].Message);
    }

    [Fact]
    public void ValidateJson_ForEachRule_ValidatesEachItem()
    {
        var data = JsonNode.Parse("""{"items": [{"value": 10}, {"value": 5}, {"value": 20}]}""")!;
        var rule = new ForEachRule(
            ExprParser.Parse("items"),
            new VarExpr("i"),
            null,
            new SingleRule(
                ExprParser.Parse("value"),
                ValueExpr.Null,
                ExprParser.Parse("value > 7")
            )
        );

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Equal(3, results.Count);
        Assert.Empty(results[0].Failures);  // 10 > 7
        Assert.Single(results[1].Failures); // 5 <= 7
        Assert.Empty(results[2].Failures);  // 20 > 7

        // Check the failure for item with value 5
        var failure = results[1].Failures.First();
        Assert.Equal(">", failure.Call.Function);
        Assert.Equal(2, failure.EvaluatedArgs.Count);
        Assert.Equal(5L, failure.EvaluatedArgs[0].Value); // actual value
        Assert.Equal(7L, failure.EvaluatedArgs[1].Value); // threshold
    }

    [Fact]
    public void ValidateJson_AndMust_CombinesConditions()
    {
        var data = JsonNode.Parse("""{"value": 15}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("value"),
            ValueExpr.Null,
            ExprParser.Parse("value >= 10")
        ).AndMust(ExprParser.Parse("value <= 20"));

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Empty(results[0].Failures);
    }

    [Fact]
    public void ValidateJson_AndMust_FailsWhenOneConditionFails()
    {
        var data = JsonNode.Parse("""{"value": 25}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("value"),
            ValueExpr.Null,
            ExprParser.Parse("value >= 10")
        ).AndMust(ExprParser.Parse("value <= 20"));

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Single(results[0].Failures); // 25 > 20

        // Check failure contents - the <= 20 condition fails
        var failure = results[0].Failures.First();
        Assert.Equal("<=", failure.Call.Function);
        Assert.Equal(2, failure.EvaluatedArgs.Count);
        Assert.Equal(25L, failure.EvaluatedArgs[0].Value); // actual value
        Assert.Equal(20L, failure.EvaluatedArgs[1].Value); // max threshold
    }

    [Fact]
    public void ValidateJson_DependentData_TracksFieldDependencies()
    {
        var data = JsonNode.Parse("""{"min": 5, "max": 10, "value": 7}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("value"),
            ValueExpr.Null,
            ExprParser.Parse("$and(value >= min, value <= max)")
        );

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Empty(results[0].Failures);
        // Should track dependency on min and max fields
        var paths = results[0].DependentData.Select(p => p.ToPathString()).ToList();
        Assert.Contains("min", paths);
        Assert.Contains("max", paths);
    }

    [Fact]
    public void ValidateJson_WithProperty_AttachesPropertyToResult()
    {
        var data = JsonNode.Parse("""{"name": ""}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("name"),
            ValueExpr.Null,
            ExprParser.Parse("$notEmpty(name)")
        ).WithProp(new ValueExpr("severity"), new ValueExpr("error"));

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Equal("error", results[0].GetProperty<string>("severity"));
    }

    [Fact]
    public void ValidateJson_PathValue_ContainsActualValue()
    {
        var data = JsonNode.Parse("""{"count": 42}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("count"),
            ValueExpr.Null,
            ExprParser.Parse("count < 100")
        );

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Equal(42L, results[0].PathValue);
    }

    [Fact]
    public void ValidateJson_NestedPath_ValidatesNestedField()
    {
        var data = JsonNode.Parse("""{"user": {"profile": {"age": 30}}}""")!;
        var rule = new SingleRule(
            ExprParser.Parse("user.profile.age"),
            ValueExpr.Null,
            ExprParser.Parse("user.profile.age >= 18")
        );

        var results = RuleValidator.ValidateJson(data, rule, null);

        Assert.Single(results);
        Assert.Empty(results[0].Failures);
        Assert.Equal("user.profile.age", results[0].Path.ToPathString());
    }
}
