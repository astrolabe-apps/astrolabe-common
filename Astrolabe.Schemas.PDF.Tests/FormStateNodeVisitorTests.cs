using System.Text.Json;
using Astrolabe.Controls;
using Astrolabe.Schemas;
using Astrolabe.Schemas.CodeGen;
using Astrolabe.Schemas.Tests;
using Xunit;

namespace Astrolabe.Schemas.PDF.Tests;

public class FormStateNodeVisitorTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [Fact]
    public void VisitFormState_Should_Return_First_NonNull_Result()
    {
        // Arrange
        var formStateTree = CreateSimpleTree();

        // Act - Find first DataControl node
        var result = formStateTree.VisitFormState<string>(node =>
        {
            if (node.Definition is DataControlDefinition dataControl)
            {
                return $"Found: {dataControl.Field}";
            }
            return null;
        });

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Found: name", result); // Should find "name" first
    }

    [Fact]
    public void VisitFormState_Should_Return_Null_When_No_Match()
    {
        // Arrange
        var formStateTree = CreateSimpleTree();

        // Act - Try to find something that doesn't exist
        var result = formStateTree.VisitFormState<string>(node =>
        {
            if (node.Definition is DisplayControlDefinition)
            {
                return "Found display control";
            }
            return null;
        });

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void VisitFormState_Should_Stop_At_First_Match()
    {
        // Arrange
        var formStateTree = CreateSimpleTree();
        var visitedCount = 0;

        // Act
        var result = formStateTree.VisitFormState<string>(node =>
        {
            visitedCount++;
            if (node.Definition is DataControlDefinition dataControl)
            {
                return $"Found: {dataControl.Field}";
            }
            return null;
        });

        // Assert
        Assert.NotNull(result);
        // Should stop after finding first DataControl, not visit all nodes
        Assert.True(visitedCount < GetTotalNodeCount(formStateTree));
    }

    [Fact]
    public void VisitAllFormState_Should_Visit_All_Nodes()
    {
        // Arrange
        var formStateTree = CreateSimpleTree();
        var visitedNodes = new List<IFormStateNode>();

        // Act
        formStateTree.VisitAllFormState(node =>
        {
            visitedNodes.Add(node);
        });

        // Assert
        var expectedCount = GetTotalNodeCount(formStateTree);
        Assert.Equal(expectedCount, visitedNodes.Count);

        // Verify we visited the root
        Assert.Contains(visitedNodes, n => n == formStateTree);

        // Verify we visited all children
        foreach (var child in formStateTree.Children)
        {
            Assert.Contains(visitedNodes, n => n == child);
        }
    }

    [Fact]
    public void CollectFromFormState_Should_Gather_All_Results()
    {
        // Arrange
        var formStateTree = CreateSimpleTree();

        // Act - Collect all field names from DataControls
        var fieldNames = formStateTree.CollectFromFormState<string>(node =>
        {
            if (node.Definition is DataControlDefinition dataControl)
            {
                return dataControl.Field;
            }
            return null;
        }).ToList();

        // Assert
        Assert.Equal(2, fieldNames.Count);
        Assert.Contains("name", fieldNames);
        Assert.Contains("age", fieldNames);
    }

    [Fact]
    public void VisitFormStateWithParent_Should_Provide_Parent_Context()
    {
        // Arrange
        var formStateTree = CreateNestedTree();
        var childrenWithParents = new List<(IFormStateNode child, IFormStateNode? parent)>();

        // Act
        formStateTree.VisitFormStateWithParent(
            context: "test",
            visitFn: (node, parent, ctx) =>
            {
                childrenWithParents.Add((node, parent));
            }
        );

        // Assert
        // Root should have no parent
        var root = childrenWithParents.First(x => x.child == formStateTree);
        Assert.Null(root.parent);

        // Direct children should have formStateTree as parent
        foreach (var child in formStateTree.Children)
        {
            var entry = childrenWithParents.First(x => x.child == child);
            Assert.Equal(formStateTree, entry.parent);
        }
    }

    [Fact]
    public void VisitFormStateConditional_Should_Skip_Subtrees()
    {
        // Arrange
        var formStateTree = CreateNestedTree();
        var visitedNodes = new List<IFormStateNode>();

        // Act - Only visit non-group nodes
        formStateTree.VisitFormStateConditional(
            shouldVisit: node => node.Definition is not GroupedControlsDefinition,
            visitFn: node =>
            {
                visitedNodes.Add(node);
            }
        );

        // Assert
        // Should visit data controls but not groups
        Assert.All(visitedNodes, node =>
            Assert.IsNotType<GroupedControlsDefinition>(node.Definition));

        // Should have skipped the group and its children
        Assert.True(visitedNodes.Count < GetTotalNodeCount(formStateTree));
    }

    [Fact]
    public void VisitFormStatePostOrder_Should_Visit_Children_Before_Parent()
    {
        // Arrange
        var formStateTree = CreateNestedTree();
        var visitOrder = new List<IFormStateNode>();

        // Act
        formStateTree.VisitFormStatePostOrder(node =>
        {
            visitOrder.Add(node);
        });

        // Assert
        // Root should be visited last
        Assert.Equal(formStateTree, visitOrder.Last());

        // For each parent, all children should be visited before it
        foreach (var node in visitOrder)
        {
            foreach (var child in node.Children)
            {
                var childIndex = visitOrder.IndexOf(child);
                var nodeIndex = visitOrder.IndexOf(node);
                Assert.True(childIndex < nodeIndex, "Child should be visited before parent");
            }
        }
    }

    [Fact]
    public void GetTitle_Should_Return_Definition_Title_First()
    {
        // Arrange
        var formStateTree = CreateSimpleTree();
        var nameNode = formStateTree.Children.First();

        // Act
        var title = nameNode.GetTitle();

        // Assert
        Assert.Equal("Name", title); // From Definition.Title
    }

    [Fact]
    public void GetTitle_Should_Fallback_To_Field_DisplayName()
    {
        // Arrange
        var schemas = CreateSchemaLookup<SimplePerson>();
        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("name") // No title set
        };

        var testData = new SimplePerson("Test", 25);
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(SimplePerson))!;
        var dataNode = schemaNode.WithData(jsonData);
        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode, editor);

        var nameNode = formStateTree.Children.First();

        // Act
        var title = nameNode.GetTitle();

        // Assert
        Assert.Equal("Name", title); // From SchemaField.DisplayName
    }

    [Fact]
    public void VisitFormState_Should_Work_With_Deep_Hierarchy()
    {
        // Arrange - Create deeply nested structure
        var schemas = CreateSchemaLookup<PersonWithAddress>();
        var controls = new ControlDefinition[]
        {
            new GroupedControlsDefinition
            {
                Title = "Level 1",
                Children = new ControlDefinition[]
                {
                    new GroupedControlsDefinition
                    {
                        Title = "Level 2",
                        CompoundField = "address",
                        Children = new ControlDefinition[]
                        {
                            new DataControlDefinition("street") { Title = "Street" },
                            new DataControlDefinition("city") { Title = "City" }
                        }
                    }
                }
            }
        };

        var testData = new PersonWithAddress(new Address("Main St", "Springfield"));
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(PersonWithAddress))!;
        var dataNode = schemaNode.WithData(jsonData);
        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode, editor);

        // Act - Find the street field deep in the hierarchy
        var streetValue = formStateTree.VisitFormState<string>(node =>
        {
            if (node.Definition is DataControlDefinition dc && dc.Field == "street")
            {
                return node.DataNode?.Control.ValueObject?.ToString();
            }
            return null;
        });

        // Assert
        Assert.Equal("Main St", streetValue);
    }

    [Fact]
    public void CollectFromFormState_Should_Handle_Empty_Tree()
    {
        // Arrange - Create tree with no data controls
        var schemas = CreateSchemaLookup<SimplePerson>();
        var controls = new ControlDefinition[]
        {
            new GroupedControlsDefinition
            {
                Title = "Empty Group"
            }
        };

        var testData = new SimplePerson("Test", 25);
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(SimplePerson))!;
        var dataNode = schemaNode.WithData(jsonData);
        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode, editor);

        // Act
        var results = formStateTree.CollectFromFormState<string>(node =>
        {
            if (node.Definition is DataControlDefinition dc)
            {
                return dc.Field;
            }
            return null;
        }).ToList();

        // Assert
        Assert.Empty(results);
    }

    // Helper methods

    private IFormStateNode CreateSimpleTree()
    {
        var schemas = CreateSchemaLookup<SimplePerson>();
        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("name") { Title = "Name" },
            new DataControlDefinition("age") { Title = "Age" }
        };

        var testData = new SimplePerson("John", 30);
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(SimplePerson))!;
        var dataNode = schemaNode.WithData(jsonData);

        var editor = new ControlEditor();
        return FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode, editor);
    }

    private IFormStateNode CreateNestedTree()
    {
        var schemas = CreateSchemaLookup<SimplePerson>();
        var controls = new ControlDefinition[]
        {
            new GroupedControlsDefinition
            {
                Title = "Personal Info",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("name") { Title = "Name" },
                    new DataControlDefinition("age") { Title = "Age" }
                }
            }
        };

        var testData = new SimplePerson("Jane", 25);
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(SimplePerson))!;
        var dataNode = schemaNode.WithData(jsonData);

        var editor = new ControlEditor();
        return FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode, editor);
    }

    private int GetTotalNodeCount(IFormStateNode node)
    {
        var count = 1; // Count this node
        foreach (var child in node.Children)
        {
            count += GetTotalNodeCount(child);
        }
        return count;
    }

    private static ISchemaTreeLookup CreateSchemaLookup<T>()
    {
        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(T));

        return SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );
    }
}
