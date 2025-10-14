using Astrolabe.Controls;
using Astrolabe.Schemas;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Tests for reactive expression evaluation
/// </summary>
public class ReactiveExpressionEvaluatorTests
{
    // Simple schema interface implementation for testing
    private class TestSchemaInterface : ISchemaInterface
    {
        public bool IsEmptyValue(SchemaField field, object? value)
        {
            return value == null ||
                   (value is string s && string.IsNullOrWhiteSpace(s)) ||
                   (value is System.Collections.ICollection c && c.Count == 0);
        }
    }

    [Fact]
    public void DataExpression_Should_Return_Field_Value()
    {
        // Arrange
        var (parent, child, parentData) = TestHelpers.CreateParentChildSchema("parent", "name", "John");
        var expression = new DataExpression("name");
        var context = new ExpressionEvalContext(parentData, new TestSchemaInterface());
        var editor = new ControlEditor();

        object? result = null;
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        // Assert
        Assert.Equal("John", result);

        subscription.Dispose();
    }

    [Fact]
    public void DataExpression_Should_Return_Null_For_Missing_Field()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?> { ["other"] = "value" });
        var expression = new DataExpression("missing");
        var context = new ExpressionEvalContext(dataNode, new TestSchemaInterface());

        object? result = "not null";
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        // Assert
        Assert.Null(result);

        subscription.Dispose();
    }

    [Fact]
    public void DataExpression_Should_Update_When_Field_Changes()
    {
        // Arrange
        var (parent, child, parentData) = TestHelpers.CreateParentChildSchema("parent", "name", "John");
        var expression = new DataExpression("name");
        var context = new ExpressionEvalContext(parentData, new TestSchemaInterface());
        var editor = new ControlEditor();

        object? result = null;
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        Assert.Equal("John", result);

        // Act - change the field value
        var childNode = parentData.GetChildForFieldRef("name");
        editor.SetValue(childNode!.Control, "Jane");

        // Assert - result should update
        Assert.Equal("Jane", result);

        subscription.Dispose();
    }

    [Fact]
    public void DataMatchExpression_Should_Return_True_For_Matching_Value()
    {
        // Arrange
        var (parent, child, parentData) = TestHelpers.CreateParentChildSchema("parent", "role", "admin");
        var expression = new DataMatchExpression("role", "admin");
        var context = new ExpressionEvalContext(parentData, new TestSchemaInterface());

        object? result = null;
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        // Assert
        Assert.Equal(true, result);

        subscription.Dispose();
    }

    [Fact]
    public void DataMatchExpression_Should_Return_False_For_Non_Matching_Value()
    {
        // Arrange
        var (parent, child, parentData) = TestHelpers.CreateParentChildSchema("parent", "role", "user");
        var expression = new DataMatchExpression("role", "admin");
        var context = new ExpressionEvalContext(parentData, new TestSchemaInterface());

        object? result = null;
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        // Assert
        Assert.Equal(false, result);

        subscription.Dispose();
    }

    [Fact]
    public void DataMatchExpression_Should_Update_When_Value_Changes()
    {
        // Arrange
        var (parent, child, parentData) = TestHelpers.CreateParentChildSchema("parent", "role", "user");
        var expression = new DataMatchExpression("role", "admin");
        var context = new ExpressionEvalContext(parentData, new TestSchemaInterface());
        var editor = new ControlEditor();

        object? result = null;
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        Assert.Equal(false, result);

        // Act - change to matching value
        var childNode = parentData.GetChildForFieldRef("role");
        editor.SetValue(childNode!.Control, "admin");

        // Assert - should now return true
        Assert.Equal(true, result);

        subscription.Dispose();
    }

    [Fact]
    public void DataMatchExpression_Should_Check_Array_Contains()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        var arraySchema = schema.AddChild("roles", "string", collection: true);
        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["roles"] = new[] { "user", "admin", "moderator" }
        });

        var expression = new DataMatchExpression("roles", "admin");
        var context = new ExpressionEvalContext(dataNode, new TestSchemaInterface());

        object? result = null;
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        // Assert
        Assert.Equal(true, result);

        subscription.Dispose();
    }

    [Fact]
    public void NotEmptyExpression_Should_Return_True_For_Non_Empty_Value()
    {
        // Arrange
        var (parent, child, parentData) = TestHelpers.CreateParentChildSchema("parent", "email", "user@example.com");
        var expression = new NotEmptyExpression("email", Empty: false);
        var context = new ExpressionEvalContext(parentData, new TestSchemaInterface());

        object? result = null;
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        // Assert
        Assert.Equal(true, result);

        subscription.Dispose();
    }

    [Fact]
    public void NotEmptyExpression_Should_Return_False_For_Empty_String()
    {
        // Arrange
        var (parent, child, parentData) = TestHelpers.CreateParentChildSchema("parent", "email", "");
        var expression = new NotEmptyExpression("email", Empty: false);
        var context = new ExpressionEvalContext(parentData, new TestSchemaInterface());

        object? result = null;
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        // Assert
        Assert.Equal(false, result);

        subscription.Dispose();
    }

    [Fact]
    public void NotEmptyExpression_Should_Return_False_For_Null_Value()
    {
        // Arrange
        var (parent, child, parentData) = TestHelpers.CreateParentChildSchema("parent", "email", null);
        var expression = new NotEmptyExpression("email", Empty: false);
        var context = new ExpressionEvalContext(parentData, new TestSchemaInterface());

        object? result = null;
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        // Assert
        Assert.Equal(false, result);

        subscription.Dispose();
    }

    [Fact]
    public void NotEmptyExpression_Should_Update_When_Value_Changes_From_Empty_To_NonEmpty()
    {
        // Arrange
        var (parent, child, parentData) = TestHelpers.CreateParentChildSchema("parent", "email", "");
        var expression = new NotEmptyExpression("email", Empty: false);
        var context = new ExpressionEvalContext(parentData, new TestSchemaInterface());
        var editor = new ControlEditor();

        object? result = null;
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        Assert.Equal(false, result);

        // Act - change to non-empty value
        var childNode = parentData.GetChildForFieldRef("email");
        editor.SetValue(childNode!.Control, "user@example.com");

        // Assert - should now return true
        Assert.Equal(true, result);

        subscription.Dispose();
    }

    [Fact]
    public void NotEmptyExpression_With_Empty_True_Should_Return_True_For_Empty_Value()
    {
        // Arrange
        var (parent, child, parentData) = TestHelpers.CreateParentChildSchema("parent", "email", "");
        var expression = new NotEmptyExpression("email", Empty: true);
        var context = new ExpressionEvalContext(parentData, new TestSchemaInterface());

        object? result = null;
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        // Assert - checking if empty (and it is), so return true
        Assert.Equal(true, result);

        subscription.Dispose();
    }

    [Fact]
    public void UuidExpression_Should_Generate_Valid_Guid()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent");
        var dataNode = TestHelpers.CreateTestDataNode(schema);
        var expression = new SimpleExpression(nameof(ExpressionType.UUID));
        var context = new ExpressionEvalContext(dataNode, new TestSchemaInterface());

        object? result = null;
        var subscription = ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            value => result = value
        );

        // Assert
        Assert.NotNull(result);
        Assert.IsType<string>(result);
        Assert.True(Guid.TryParse((string)result!, out _));

        subscription.Dispose();
    }

    [Fact]
    public void SetupReactiveExpression_Should_Update_Target_Control()
    {
        // Arrange
        var (parent, child, parentData) = TestHelpers.CreateParentChildSchema("parent", "name", "John");
        var expression = new DataExpression("name");
        var context = new ExpressionEvalContext(parentData, new TestSchemaInterface());
        var editor = new ControlEditor();

        var targetControl = Control.Create<object?>(null);

        // Act
        var subscription = targetControl.SetupReactiveExpression(expression, context, editor);

        // Assert
        Assert.Equal("John", targetControl.Value);

        // Change the source value
        var childNode = parentData.GetChildForFieldRef("name");
        editor.SetValue(childNode!.Control, "Jane");

        // Target control should update automatically
        Assert.Equal("Jane", targetControl.Value);

        subscription?.Dispose();
    }

    [Fact]
    public void SetupReactiveExpression_Should_Apply_Coercion()
    {
        // Arrange
        var (parent, child, parentData) = TestHelpers.CreateParentChildSchema("parent", "role", "admin");
        var expression = new DataMatchExpression("role", "admin");
        var context = new ExpressionEvalContext(parentData, new TestSchemaInterface());
        var editor = new ControlEditor();

        var targetControl = Control.Create<object?>(null, null);

        // Act - with coercion to ensure boolean type
        var subscription = targetControl.SetupReactiveExpression(
            expression,
            context,
            editor,
            coerce: result => (bool?)result ?? false
        );

        // Assert
        Assert.IsType<bool>(targetControl.Value);
        Assert.True((bool)targetControl.Value!);

        subscription?.Dispose();
    }

    [Fact]
    public void SetupReactiveExpression_Should_Return_Null_For_Null_Expression()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent");
        var dataNode = TestHelpers.CreateTestDataNode(schema);
        var context = new ExpressionEvalContext(dataNode, new TestSchemaInterface());
        var editor = new ControlEditor();
        var targetControl = Control.Create<object?>(null, null);

        // Act
        var subscription = targetControl.SetupReactiveExpression(null, context, editor);

        // Assert
        Assert.Null(subscription);
    }

    [Fact]
    public void Multiple_Expressions_Should_Track_Independently()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("firstName", "string");
        schema.AddChild("lastName", "string");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["firstName"] = "John",
            ["lastName"] = "Doe"
        });

        var firstNameExpr = new DataExpression("firstName");
        var lastNameExpr = new DataExpression("lastName");
        var context = new ExpressionEvalContext(dataNode, new TestSchemaInterface());
        var editor = new ControlEditor();

        object? firstNameResult = null;
        object? lastNameResult = null;

        var sub1 = ReactiveExpressionEvaluators.Evaluate(firstNameExpr, context, value => firstNameResult = value);
        var sub2 = ReactiveExpressionEvaluators.Evaluate(lastNameExpr, context, value => lastNameResult = value);

        Assert.Equal("John", firstNameResult);
        Assert.Equal("Doe", lastNameResult);

        // Act - change only first name
        var firstNameNode = dataNode.GetChildForFieldRef("firstName");
        editor.SetValue(firstNameNode!.Control, "Jane");

        // Assert - only firstName result should update
        Assert.Equal("Jane", firstNameResult);
        Assert.Equal("Doe", lastNameResult);

        sub1.Dispose();
        sub2.Dispose();
    }
}