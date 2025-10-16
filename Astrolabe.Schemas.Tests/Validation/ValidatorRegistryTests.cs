using Astrolabe.Schemas.Validation;
using Astrolabe.Schemas.Validation.Validators;
using Xunit;

namespace Astrolabe.Schemas.Tests.Validation;

/// <summary>
/// Unit tests for ValidatorRegistry
/// </summary>
public class ValidatorRegistryTests
{
    [Fact]
    public void Should_Have_Length_Validator_Registered()
    {
        // Act
        var evaluator = ValidatorRegistry.Get(ValidatorType.Length.ToString());

        // Assert
        Assert.NotNull(evaluator);
    }

    [Fact]
    public void Should_Have_Date_Validator_Registered()
    {
        // Act
        var evaluator = ValidatorRegistry.Get(ValidatorType.Date.ToString());

        // Assert
        Assert.NotNull(evaluator);
    }

    [Fact]
    public void Should_Return_Null_For_Unknown_Validator()
    {
        // Act
        var evaluator = ValidatorRegistry.Get("UnknownValidator");

        // Assert
        Assert.Null(evaluator);
    }

    [Fact]
    public void Should_Return_Null_For_Jsonata_Validator_In_V1_0()
    {
        // JSONata validator is deferred to v1.1
        // Act
        var evaluator = ValidatorRegistry.Get(ValidatorType.Jsonata.ToString());

        // Assert
        Assert.Null(evaluator);
    }

    [Fact]
    public void Should_Allow_Custom_Validator_Registration()
    {
        // Arrange
        var customValidatorCalled = false;
        ValidatorRegistry.Register<SchemaValidator>(
            "CustomValidator",
            (validator, context) => { customValidatorCalled = true; });

        // Act
        var evaluator = ValidatorRegistry.Get("CustomValidator");
        evaluator?.Invoke(new LengthValidator(Min: null, Max: null), null!); // Context not needed for this test

        // Assert
        Assert.NotNull(evaluator);
        Assert.True(customValidatorCalled);
    }
}
