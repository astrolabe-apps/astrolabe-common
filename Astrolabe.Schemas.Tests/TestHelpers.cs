using System.Text.Json.Nodes;
using Astrolabe.Controls;
using Astrolabe.JSON;
using Astrolabe.Schemas;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Helper utilities for creating test fixtures
/// </summary>
public static class TestHelpers
{
    /// <summary>
    /// Creates a simple test schema node with specified field name
    /// </summary>
    public static TestSchemaNode CreateTestSchema(string fieldName, string? type = "string", bool? collection = null, IEnumerable<FieldOption>? options = null)
    {
        return new TestSchemaNode(fieldName, type, collection, options);
    }

    /// <summary>
    /// Creates a test data node with specified value
    /// </summary>
    public static SchemaDataNode CreateTestDataNode(ISchemaNode schema, object? value = null)
    {
        var jsonNode = value != null ? JsonValue.Create(value) : null;
        var control = JsonNodeConverter.JsonNodeToControl(jsonNode);
        return new SchemaDataNode(schema, control, null);
    }

    /// <summary>
    /// Creates a parent schema with a child field, useful for testing field lookups
    /// </summary>
    public static (TestSchemaNode parent, TestSchemaNode child, SchemaDataNode parentData) CreateParentChildSchema(
        string parentFieldName,
        string childFieldName,
        object? childValue = null)
    {
        var parentSchema = CreateTestSchema(parentFieldName, "object");
        var childSchema = parentSchema.AddChild(childFieldName);

        // Create parent data node with child field
        var jsonObject = new JsonObject();
        if (childValue != null)
        {
            jsonObject[childFieldName] = JsonValue.Create(childValue);
        }
        var control = JsonNodeConverter.JsonNodeToControl(jsonObject);
        var parentData = new SchemaDataNode(parentSchema, control, null);

        return (parentSchema, childSchema, parentData);
    }

    /// <summary>
    /// Creates a test data node with array data
    /// </summary>
    public static SchemaDataNode CreateArrayDataNode(ISchemaNode schema, params object?[] values)
    {
        var jsonArray = new JsonArray(values.Select(v => v != null ? JsonValue.Create(v) : null).ToArray());
        var control = JsonNodeConverter.JsonNodeToControl(jsonArray);
        return new SchemaDataNode(schema, control, null);
    }

    /// <summary>
    /// Creates a test data node with object data
    /// </summary>
    public static SchemaDataNode CreateObjectDataNode(ISchemaNode schema, Dictionary<string, object?> values)
    {
        var jsonObject = new JsonObject();
        foreach (var (key, value) in values)
        {
            if (value == null)
            {
                jsonObject[key] = null;
            }
            else if (value is Array arr)
            {
                // Convert arrays to JsonArray
                var jsonArray = new JsonArray();
                foreach (var item in arr)
                {
                    jsonArray.Add(item != null ? JsonValue.Create(item) : null);
                }
                jsonObject[key] = jsonArray;
            }
            else
            {
                jsonObject[key] = JsonValue.Create(value);
            }
        }
        var control = JsonNodeConverter.JsonNodeToControl(jsonObject);
        return new SchemaDataNode(schema, control, null);
    }

    /// <summary>
    /// Creates a simple data control definition
    /// </summary>
    public static DataControlDefinition CreateDataControl(string field, bool? hidden = null, bool? readonly_ = null, bool? disabled = null)
    {
        return new DataControlDefinition(field)
        {
            Hidden = hidden,
            Readonly = readonly_,
            Disabled = disabled
        };
    }

    /// <summary>
    /// Creates a root FormStateNode with default parameters for testing
    /// </summary>
    public static FormStateNode CreateFormStateNode(
        DataControlDefinition? definition = null,
        SchemaDataNode? dataNode = null,
        ISchemaNode? schema = null,
        object? value = null,
        string childKey = "key1",
        int childIndex = 0,
        ControlEditor? editor = null)
    {
        // Use provided editor or create a new one
        var actualEditor = editor ?? new ControlEditor();

        // If dataNode not provided, create one from schema and value
        var actualDataNode = dataNode;
        if (actualDataNode == null)
        {
            var actualSchema = schema ?? CreateTestSchema("testField");
            actualDataNode = CreateTestDataNode(actualSchema, value);
        }

        // Use provided definition or create default one
        var actualDefinition = definition ?? CreateDataControl(".");

        return new FormStateNode(
            definition: actualDefinition,
            form: null,
            parent: actualDataNode,
            parentNode: null,
            dataNode: actualDataNode,
            childIndex: childIndex,
            childKey: childKey,
            editor: actualEditor
        );
    }

    /// <summary>
    /// Creates a child FormStateNode with a parent node
    /// </summary>
    public static FormStateNode CreateChildFormStateNode(
        FormStateNode parentNode,
        ControlEditor editor,
        DataControlDefinition? definition = null,
        SchemaDataNode? dataNode = null,
        SchemaDataNode? parent = null,
        string childKey = "child",
        int childIndex = 0)
    {
        // Use provided definition or create default one
        var actualDefinition = definition ?? CreateDataControl(".");

        // Use provided parent or use parent node's dataNode
        var actualParent = parent ?? parentNode.Parent;

        // Use provided dataNode or use parent
        var actualDataNode = dataNode ?? actualParent;

        return new FormStateNode(
            definition: actualDefinition,
            form: null,
            parent: actualParent,
            parentNode: parentNode,
            dataNode: actualDataNode,
            childIndex: childIndex,
            childKey: childKey,
            editor: editor
        );
    }
}

/// <summary>
/// Simple test implementation of ISchemaNode for unit testing
/// </summary>
public class TestSchemaNode : ISchemaNode
{
    private readonly Dictionary<string, TestSchemaNode> _children = new();

    public TestSchemaNode(string fieldName, string? type = "string", bool? collection = null, IEnumerable<FieldOption>? options = null)
    {
        Field = new SimpleSchemaField(type ?? "string", fieldName)
        {
            Collection = collection,
            Options = options?.ToList()
        };
    }

    public SchemaField Field { get; }

    public ISchemaNode? Parent { get; set; }

    public TestSchemaNode AddChild(string fieldName, string? type = "string", bool? collection = null, IEnumerable<FieldOption>? options = null)
    {
        var child = new TestSchemaNode(fieldName, type, collection, options) { Parent = this };
        _children[fieldName] = child;
        return child;
    }

    public ISchemaNode? GetChildNode(string field)
    {
        return _children.TryGetValue(field, out var child) ? child : null;
    }

    public IEnumerable<ISchemaNode> GetChildNodes(ISchemaNode? withParent = null)
    {
        return _children.Values;
    }

    public ISchemaNode? GetSchema(string schemaId)
    {
        return null; // Not needed for tests
    }
}
