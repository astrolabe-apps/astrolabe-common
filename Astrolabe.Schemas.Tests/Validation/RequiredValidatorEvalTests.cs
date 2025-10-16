using Astrolabe.Controls;
using Astrolabe.Schemas;
using Astrolabe.Schemas.Validation;
using Astrolabe.Schemas.Validation.Validators;
using Xunit;

namespace Astrolabe.Schemas.Tests.Validation;

/// <summary>
/// Unit tests for RequiredValidatorEval
/// Tests the required field validation functionality
/// </summary>
public class RequiredValidatorEvalTests
{
    [Fact]
    public void Required_Should_Return_Error_For_Null_Value()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, null);
        var context = CreateValidationContext(dataNode);
        var definition = new DataControlDefinition("testField") { Required = true };

        // Act
        RequiredValidatorEval.Evaluate(definition, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](null, new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Equal("This field is required", error);
    }

    [Fact]
    public void Required_Should_Return_Error_For_Empty_String()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "");
        var context = CreateValidationContext(dataNode);
        var definition = new DataControlDefinition("testField") { Required = true };

        // Act
        RequiredValidatorEval.Evaluate(definition, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0]("", new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Equal("This field is required", error);
    }

    [Fact]
    public void Required_Should_Return_Error_For_Whitespace_String()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "   ");
        var context = CreateValidationContext(dataNode);
        var definition = new DataControlDefinition("testField") { Required = true };

        // Act
        RequiredValidatorEval.Evaluate(definition, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0]("   ", new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Equal("This field is required", error);
    }

    [Fact]
    public void Required_Should_Return_Null_For_Valid_String()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test");
        var context = CreateValidationContext(dataNode);
        var definition = new DataControlDefinition("testField") { Required = true };

        // Act
        RequiredValidatorEval.Evaluate(definition, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0]("test", new ChangeTracker());

        // Assert
        Assert.Null(error);
    }

    [Fact]
    public void Required_Should_Return_Error_For_Empty_Array()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string", collection: true);
        var dataNode = TestHelpers.CreateArrayDataNode(schema);
        var context = CreateValidationContext(dataNode);
        var definition = new DataControlDefinition("testField") { Required = true };

        // Act
        RequiredValidatorEval.Evaluate(definition, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](Array.Empty<object>(), new ChangeTracker());

        // Assert
        Assert.NotNull(error);
    }

    [Fact]
    public void Required_Should_Return_Null_For_Non_Empty_Array()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string", collection: true);
        var dataNode = TestHelpers.CreateArrayDataNode(schema, "item1");
        var context = CreateValidationContext(dataNode);
        var definition = new DataControlDefinition("testField") { Required = true };

        // Act
        RequiredValidatorEval.Evaluate(definition, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](new[] { "item1" }, new ChangeTracker());

        // Assert
        Assert.Null(error);
    }

    [Fact]
    public void Required_Should_Not_Add_Validator_When_Not_Required()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "");
        var context = CreateValidationContext(dataNode);
        var definition = new DataControlDefinition("testField") { Required = false };

        // Act
        RequiredValidatorEval.Evaluate(definition, context);
        var syncValidators = context.GetSyncValidators().ToList();

        // Assert - No validator should be added
        Assert.Empty(syncValidators);
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
