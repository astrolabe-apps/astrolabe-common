using Astrolabe.Controls;
using Astrolabe.Schemas;
using Astrolabe.Schemas.Validation;
using Astrolabe.Schemas.Validation.Validators;
using Xunit;

namespace Astrolabe.Schemas.Tests.Validation;

/// <summary>
/// Unit tests for LengthValidatorEval
/// </summary>
public class LengthValidatorEvalTests
{
    [Fact]
    public void MinLength_Should_Return_Error_When_String_Too_Short()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "ab");
        var context = CreateValidationContext(dataNode);
        var validator = new LengthValidator(Min: 5, Max: null);

        // Act
        LengthValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0]("ab", new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Contains("at least 5", error);
    }

    [Fact]
    public void MinLength_Should_Return_Null_When_String_Long_Enough()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "hello");
        var context = CreateValidationContext(dataNode);
        var validator = new LengthValidator(Min: 3, Max: null);

        // Act
        LengthValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0]("hello", new ChangeTracker());

        // Assert
        Assert.Null(error);
    }

    [Fact]
    public void MaxLength_Should_Return_Error_When_String_Too_Long()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "toolongstring");
        var context = CreateValidationContext(dataNode);
        var validator = new LengthValidator(Min: null, Max: 5);

        // Act
        LengthValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0]("toolongstring", new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Contains("no more than 5", error);
    }

    [Fact]
    public void MaxLength_Should_Return_Null_When_String_Short_Enough()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "hi");
        var context = CreateValidationContext(dataNode);
        var validator = new LengthValidator(Min: null, Max: 10);

        // Act
        LengthValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0]("hi", new ChangeTracker());

        // Assert
        Assert.Null(error);
    }

    [Fact]
    public void MinLength_Should_Return_Error_When_Array_Too_Short()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string", collection: true);
        var dataNode = TestHelpers.CreateArrayDataNode(schema, "item1");
        var context = CreateValidationContext(dataNode);
        var validator = new LengthValidator(Min: 3, Max: null);

        // Act
        LengthValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](new[] { "item1" }, new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Contains("at least 3", error);
    }

    [Fact]
    public void MinLength_Should_Return_Null_When_Array_Long_Enough()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string", collection: true);
        var dataNode = TestHelpers.CreateArrayDataNode(schema, "item1", "item2", "item3");
        var context = CreateValidationContext(dataNode);
        var validator = new LengthValidator(Min: 2, Max: null);

        // Act
        LengthValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](new[] { "item1", "item2", "item3" }, new ChangeTracker());

        // Assert
        Assert.Null(error);
    }

    [Fact]
    public void MaxLength_Should_Return_Error_When_Array_Too_Long()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string", collection: true);
        var dataNode = TestHelpers.CreateArrayDataNode(schema, "item1", "item2", "item3", "item4");
        var context = CreateValidationContext(dataNode);
        var validator = new LengthValidator(Min: null, Max: 2);

        // Act
        LengthValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](new[] { "item1", "item2", "item3", "item4" }, new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Contains("no more than 2", error);
    }

    [Fact]
    public void Both_MinMax_Should_Pass_When_Within_Range()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "hello");
        var context = CreateValidationContext(dataNode);
        var validator = new LengthValidator(Min: 3, Max: 10);

        // Act
        LengthValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0]("hello", new ChangeTracker());

        // Assert
        Assert.Null(error);
    }

    [Fact]
    public void Both_MinMax_Should_Fail_When_Below_Min()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "hi");
        var context = CreateValidationContext(dataNode);
        var validator = new LengthValidator(Min: 5, Max: 10);

        // Act
        LengthValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0]("hi", new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Contains("at least 5", error);
    }

    [Fact]
    public void Both_MinMax_Should_Fail_When_Above_Max()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "verylongstring");
        var context = CreateValidationContext(dataNode);
        var validator = new LengthValidator(Min: 5, Max: 10);

        // Act
        LengthValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0]("verylongstring", new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Contains("no more than 10", error);
    }

    private static ValidationEvalContext CreateValidationContext(SchemaDataNode dataNode)
    {
        return new ValidationEvalContext
        {
            Data = dataNode,
            ParentData = dataNode,
            ValidationEnabled = Control.Create(true),
            SchemaInterface = DefaultSchemaInterface.Instance,
            Variables = null
        };
    }
}
