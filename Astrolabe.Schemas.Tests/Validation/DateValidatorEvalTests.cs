using Astrolabe.Controls;
using Astrolabe.Schemas;
using Astrolabe.Schemas.Validation;
using Astrolabe.Schemas.Validation.Validators;
using Xunit;

namespace Astrolabe.Schemas.Tests.Validation;

/// <summary>
/// Unit tests for DateValidatorEval
/// </summary>
public class DateValidatorEvalTests
{
    [Fact]
    public void NotBefore_Should_Return_Error_When_Date_Too_Early()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "date");
        var testDate = new DateTime(2020, 1, 1);
        var minDate = new DateOnly(2021, 1, 1);
        var dataNode = TestHelpers.CreateTestDataNode(schema, testDate);
        var context = CreateValidationContext(dataNode);
        var validator = new DateValidator(
            Comparison: DateComparison.NotBefore,
            FixedDate: minDate,
            DaysFromCurrent: null);

        // Act
        DateValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](testDate, new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Contains("must not be before", error);
    }

    [Fact]
    public void NotBefore_Should_Return_Null_When_Date_Valid()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "date");
        var testDate = new DateTime(2022, 1, 1);
        var minDate = new DateOnly(2021, 1, 1);
        var dataNode = TestHelpers.CreateTestDataNode(schema, testDate);
        var context = CreateValidationContext(dataNode);
        var validator = new DateValidator(
            Comparison: DateComparison.NotBefore,
            FixedDate: minDate,
            DaysFromCurrent: null);

        // Act
        DateValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](testDate, new ChangeTracker());

        // Assert
        Assert.Null(error);
    }

    [Fact]
    public void NotAfter_Should_Return_Error_When_Date_Too_Late()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "date");
        var testDate = new DateTime(2023, 1, 1);
        var maxDate = new DateOnly(2022, 1, 1);
        var dataNode = TestHelpers.CreateTestDataNode(schema, testDate);
        var context = CreateValidationContext(dataNode);
        var validator = new DateValidator(
            Comparison: DateComparison.NotAfter,
            FixedDate: maxDate,
            DaysFromCurrent: null);

        // Act
        DateValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](testDate, new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Contains("must not be after", error);
    }

    [Fact]
    public void NotAfter_Should_Return_Null_When_Date_Valid()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "date");
        var testDate = new DateTime(2021, 1, 1);
        var maxDate = new DateOnly(2022, 1, 1);
        var dataNode = TestHelpers.CreateTestDataNode(schema, testDate);
        var context = CreateValidationContext(dataNode);
        var validator = new DateValidator(
            Comparison: DateComparison.NotAfter,
            FixedDate: maxDate,
            DaysFromCurrent: null);

        // Act
        DateValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](testDate, new ChangeTracker());

        // Assert
        Assert.Null(error);
    }

    [Fact]
    public void NotBefore_DaysFromCurrent_Should_Work_With_Relative_Dates()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "date");
        var yesterday = DateTime.Now.AddDays(-1);
        var dataNode = TestHelpers.CreateTestDataNode(schema, yesterday);
        var context = CreateValidationContext(dataNode);
        var validator = new DateValidator(
            Comparison: DateComparison.NotBefore,
            FixedDate: null,
            DaysFromCurrent: 0); // Today is minimum

        // Act
        DateValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](yesterday, new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Contains("must not be before", error);
    }

    [Fact]
    public void NotAfter_DaysFromCurrent_Should_Work_With_Relative_Dates()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "date");
        var tomorrow = DateTime.Now.AddDays(1);
        var dataNode = TestHelpers.CreateTestDataNode(schema, tomorrow);
        var context = CreateValidationContext(dataNode);
        var validator = new DateValidator(
            Comparison: DateComparison.NotAfter,
            FixedDate: null,
            DaysFromCurrent: 0); // Today is maximum

        // Act
        DateValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](tomorrow, new ChangeTracker());

        // Assert
        Assert.NotNull(error);
        Assert.Contains("must not be after", error);
    }

    [Fact]
    public void Should_Handle_DateOnly_Values()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "date");
        var testDate = new DateOnly(2022, 6, 1);
        var minDate = new DateOnly(2022, 1, 1);
        var dataNode = TestHelpers.CreateTestDataNode(schema, testDate);
        var context = CreateValidationContext(dataNode);
        var validator = new DateValidator(
            Comparison: DateComparison.NotBefore,
            FixedDate: minDate,
            DaysFromCurrent: null);

        // Act
        DateValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](testDate, new ChangeTracker());

        // Assert
        Assert.Null(error);
    }

    [Fact]
    public void Should_Handle_String_Date_Values()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "date");
        var testDateString = "2022-06-01";
        var minDate = new DateOnly(2022, 1, 1);
        var dataNode = TestHelpers.CreateTestDataNode(schema, testDateString);
        var context = CreateValidationContext(dataNode);
        var validator = new DateValidator(
            Comparison: DateComparison.NotBefore,
            FixedDate: minDate,
            DaysFromCurrent: null);

        // Act
        DateValidatorEval.Evaluate(validator, context);
        var syncValidators = context.GetSyncValidators().ToList();
        var error = syncValidators[0](testDateString, new ChangeTracker());

        // Assert
        Assert.Null(error);
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
