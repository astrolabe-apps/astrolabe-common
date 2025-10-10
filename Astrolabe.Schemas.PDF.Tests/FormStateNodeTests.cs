using System.Text.Json;
using System.Text.Json.Nodes;
using Astrolabe.Schemas;
using Astrolabe.Schemas.CodeGen;
using Xunit;

namespace Astrolabe.Schemas.PDF.Tests;

public class FormStateNodeTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [Fact]
    public void Should_Create_FormStateNode_With_Simple_Flat_Children()
    {
        // Arrange
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

        // Act
        var formStateNode = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode);

        // Assert
        Assert.NotNull(formStateNode);
        Assert.Equal(2, formStateNode.Children.Count);
        Assert.Null(formStateNode.ParentNode);
        Assert.Equal(0, formStateNode.ChildIndex);
    }

    [Fact]
    public void Should_Resolve_DataNode_For_DataControl()
    {
        // Arrange
        var schemas = CreateSchemaLookup<SimplePerson>();
        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("name") { Title = "Name" }
        };

        var testData = new SimplePerson("Alice", 25);
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(SimplePerson))!;
        var dataNode = schemaNode.WithData(jsonData);

        // Act
        var formStateNode = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode);
        var firstChild = formStateNode.Children.First();

        // Assert
        Assert.NotNull(firstChild.DataNode);
        Assert.Equal("Alice", firstChild.DataNode.Control.Value);
        Assert.Equal(dataNode, firstChild.Parent);
    }

    [Fact]
    public void Should_Build_Nested_Group_Structure()
    {
        // Arrange
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

        var testData = new SimplePerson("Bob", 35);
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(SimplePerson))!;
        var dataNode = schemaNode.WithData(jsonData);

        // Act
        var formStateNode = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode);

        // Assert
        Assert.Single(formStateNode.Children); // One group
        var groupNode = formStateNode.Children.First();
        Assert.Equal(2, groupNode.Children.Count); // Two data controls inside group
        Assert.Equal(formStateNode, groupNode.ParentNode);
    }

    [Fact]
    public void Should_Handle_Array_Collection_Fields()
    {
        // Arrange
        var schemas = CreateSchemaLookup<PersonWithTags>();
        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("name") { Title = "Name" },
            new DataControlDefinition("tags") { Title = "Tags" }
        };

        var testData = new PersonWithTags("Charlie", new[] { "tag1", "tag2", "tag3" });
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(PersonWithTags))!;
        var dataNode = schemaNode.WithData(jsonData);

        // Act
        var formStateNode = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode);

        // Assert
        Assert.Equal(2, formStateNode.Children.Count);
        var tagsControl = formStateNode.Children.Last();

        // Should have 3 child nodes for the array elements
        Assert.Equal(3, tagsControl.Children.Count);

        // Each array element should have its own data node
        foreach (var (child, index) in tagsControl.Children.Select((c, i) => (c, i)))
        {
            Assert.NotNull(child.DataNode);
            Assert.Equal(index, child.DataNode.ElementIndex);
            Assert.Equal($"tag{index + 1}", child.DataNode.Control.Value);
        }
    }

    [Fact]
    public void Should_Handle_Array_With_Complex_Element_Definition()
    {
        // Arrange
        var schemas = CreateSchemaLookup<PersonWithAddresses>();
        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("addresses")
            {
                Title = "Addresses",
                Children = new ControlDefinition[]
                {
                    // Child definition for each array element
                    new GroupedControlsDefinition
                    {
                        CompoundField = ".",
                        Children = new ControlDefinition[]
                        {
                            new DataControlDefinition("street") { Title = "Street" },
                            new DataControlDefinition("city") { Title = "City" }
                        }
                    }
                }
            }
        };

        var testData = new PersonWithAddresses(
            new[]
            {
                new Address("123 Main St", "Springfield"),
                new Address("456 Elm St", "Shelbyville")
            }
        );
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(PersonWithAddresses))!;
        var dataNode = schemaNode.WithData(jsonData);

        // Act
        var formStateNode = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode);

        // Assert
        var addressesControl = formStateNode.Children.First();
        Assert.Equal(2, addressesControl.Children.Count); // Two addresses

        // Each address node IS the group (with CompoundField=".") and should have street and city as direct children
        foreach (var addressNode in addressesControl.Children)
        {
            // The addressNode itself is the group definition
            Assert.IsType<GroupedControlsDefinition>(addressNode.Definition);

            // It should have 2 children: street and city
            Assert.Equal(2, addressNode.Children.Count);

            var streetChild = addressNode.Children.First();
            var cityChild = addressNode.Children.Last();

            Assert.Equal("street", ((DataControlDefinition)streetChild.Definition).Field);
            Assert.Equal("city", ((DataControlDefinition)cityChild.Definition).Field);
        }
    }

    [Fact]
    public void Should_Maintain_Correct_Parent_Child_Relationships()
    {
        // Arrange
        var schemas = CreateSchemaLookup<SimplePerson>();
        var controls = new ControlDefinition[]
        {
            new GroupedControlsDefinition
            {
                Title = "Group",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("name") { Title = "Name" }
                }
            }
        };

        var testData = new SimplePerson("Test", 20);
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(SimplePerson))!;
        var dataNode = schemaNode.WithData(jsonData);

        // Act
        var root = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode);

        // Assert
        var groupChild = root.Children.First();
        var nameChild = groupChild.Children.First();

        // Root has no parent
        Assert.Null(root.ParentNode);

        // Group's parent is root
        Assert.Equal(root, groupChild.ParentNode);
        Assert.Equal(0, groupChild.ChildIndex);

        // Name's parent is group
        Assert.Equal(groupChild, nameChild.ParentNode);
        Assert.Equal(0, nameChild.ChildIndex);
    }

    [Fact]
    public void Should_Handle_CheckList_Rendering_With_Field_Options()
    {
        // Arrange
        var schemas = CreateSchemaLookup<PersonWithStatus>();
        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("status")
            {
                Title = "Status",
                RenderOptions = new SimpleRenderOptions(DataRenderType.CheckList.ToString()),
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("name") { Title = "Status Name" }
                }
            }
        };

        var testData = new PersonWithStatus(PersonStatus.Active);
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(PersonWithStatus))!;
        var dataNode = schemaNode.WithData(jsonData);

        // Act
        var formStateNode = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode);

        // Assert
        var statusControl = formStateNode.Children.First();

        // Should create children for each option (Active, Inactive, Pending)
        Assert.Equal(3, statusControl.Children.Count);

        // Each option child should be a Contents group
        foreach (var optionChild in statusControl.Children)
        {
            Assert.IsType<GroupedControlsDefinition>(optionChild.Definition);
            var groupDef = (GroupedControlsDefinition)optionChild.Definition;
            Assert.Equal(GroupRenderType.Contents.ToString(), groupDef.GroupOptions?.Type);
        }
    }

    [Fact]
    public void Should_Handle_Radio_Rendering_With_Field_Options()
    {
        // Arrange
        var schemas = CreateSchemaLookup<PersonWithStatus>();
        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("status")
            {
                Title = "Status",
                RenderOptions = new SimpleRenderOptions(DataRenderType.Radio.ToString()),
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("name") { Title = "Status Name" }
                }
            }
        };

        var testData = new PersonWithStatus(PersonStatus.Inactive);
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(PersonWithStatus))!;
        var dataNode = schemaNode.WithData(jsonData);

        // Act
        var formStateNode = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode);

        // Assert
        var statusControl = formStateNode.Children.First();

        // Should create children for each radio option
        Assert.Equal(3, statusControl.Children.Count);
    }

    [Fact]
    public void Should_Resolve_Nested_Field_Paths()
    {
        // Arrange
        var schemas = CreateSchemaLookup<PersonWithAddress>();
        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("address/street") { Title = "Street" },
            new DataControlDefinition("address/city") { Title = "City" }
        };

        var testData = new PersonWithAddress(
            new Address("789 Oak Ave", "Capital City")
        );
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(PersonWithAddress))!;
        var dataNode = schemaNode.WithData(jsonData);

        // Act
        var formStateNode = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode);

        // Assert
        Assert.Equal(2, formStateNode.Children.Count);

        var streetChild = formStateNode.Children.First();
        var cityChild = formStateNode.Children.Last();

        Assert.NotNull(streetChild.DataNode);
        Assert.NotNull(cityChild.DataNode);

        Assert.Equal("789 Oak Ave", streetChild.DataNode.Control.Value);
        Assert.Equal("Capital City", cityChild.DataNode.Control.Value);
    }

    [Fact]
    public void Should_Handle_CompoundField_On_Group()
    {
        // Arrange
        var schemas = CreateSchemaLookup<PersonWithAddress>();
        var controls = new ControlDefinition[]
        {
            new GroupedControlsDefinition
            {
                CompoundField = "address",
                Title = "Address",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("street") { Title = "Street" },
                    new DataControlDefinition("city") { Title = "City" }
                }
            }
        };

        var testData = new PersonWithAddress(
            new Address("999 Pine Rd", "Metropolis")
        );
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(PersonWithAddress))!;
        var dataNode = schemaNode.WithData(jsonData);

        // Act
        var formStateNode = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode);

        // Assert
        var groupNode = formStateNode.Children.First();

        // Group should have resolved its data node to the address field
        Assert.NotNull(groupNode.DataNode);

        // The children should resolve relative to the address data node
        var streetChild = groupNode.Children.First();
        var cityChild = groupNode.Children.Last();

        Assert.Equal("999 Pine Rd", streetChild.DataNode?.Control.Value);
        Assert.Equal("Metropolis", cityChild.DataNode?.Control.Value);
    }

    [Fact]
    public void Should_Set_ChildIndex_Correctly()
    {
        // Arrange
        var schemas = CreateSchemaLookup<SimplePerson>();
        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("name") { Title = "Name" },
            new DataControlDefinition("age") { Title = "Age" }
        };

        var testData = new SimplePerson("Test", 10);
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var formNode = FormLookup.Create(_ => controls).GetForm("")!;
        var schemaNode = schemas.GetSchema(nameof(SimplePerson))!;
        var dataNode = schemaNode.WithData(jsonData);

        // Act
        var formStateNode = FormStateNodeBuilder.CreateFormStateNode(formNode, dataNode);

        // Assert
        var children = formStateNode.Children.ToList();
        Assert.Equal(0, children[0].ChildIndex);
        Assert.Equal(1, children[1].ChildIndex);
    }

    // Helper method to create schema lookup
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

// Test models
public record SimplePerson(string Name, int Age);

public record PersonWithTags(string Name, string[] Tags);

public record PersonWithAddresses(Address[] Addresses);

public record PersonWithAddress(Address Address);

public record Address(string Street, string City);

public record PersonWithStatus(PersonStatus Status);

public enum PersonStatus
{
    Active,
    Inactive,
    Pending
}
