using System.Text.Json;
using System.Text.Json.Nodes;
using Astrolabe.Controls;
using Astrolabe.Schemas;
using Astrolabe.Schemas.CodeGen;
using Astrolabe.Schemas.Tests;
using Astrolabe.Schemas.PDF;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using Xunit;

namespace Astrolabe.Schemas.PDF.Tests;

public class PdfGeneratorTests
{
    private static readonly JsonSerializerOptions JsonOptions =
        new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    static PdfGeneratorTests()
    {
        // Configure QuestPDF license for testing
        QuestPDF.Settings.License = LicenseType.Community;
    }

    [Fact]
    public void Should_Generate_Pdf_With_Simple_Fields()
    {
        // Arrange - Create SchemaFields using SchemaFieldsInstanceGenerator
        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(TestPerson));

        var schemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );

        // Create ControlDefinitions in code (use lowercase first letter to match JSON serialization)
        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("name") { Title = "Full Name" },
            new DataControlDefinition("age") { Title = "Age" },
            new DataControlDefinition("email") { Title = "Email Address" }
        };

        // Create test data
        var testData = new TestPerson("John Doe", 30, "john@example.com");
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        // Prepare PDF context (similar to CarController.cs)
        var rootFormNode = FormLookup.Create(_ => controls).GetForm("")!;
        var rootSchemaNode = schemaLookup.GetSchema(nameof(TestPerson))!;
        var rootSchemaData = rootSchemaNode.WithData(jsonData);

        // Build the FormStateNode tree once
        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor,
            TestHelpers.CreateTestSchemaInterface()
        );

        // Act - Generate PDF
        var doc = Document.Create(dc =>
        {
            var pdfContext = new PdfFormContext(formStateTree);
            dc.Page(p => p.Content().Column(c => pdfContext.RenderContent(c.Item())));
        });

        var pdfBytes = doc.GeneratePdf();

        // Assert
        Assert.NotNull(pdfBytes);
        Assert.NotEmpty(pdfBytes);
        Assert.True(pdfBytes.Length > 100); // PDF should have some content
    }

    [Fact]
    public void Should_Generate_Pdf_With_Grouped_Controls()
    {
        // Arrange
        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(TestPerson));

        var schemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );

        // Create grouped controls
        var controls = new ControlDefinition[]
        {
            new GroupedControlsDefinition
            {
                Title = "Personal Information",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("name") { Title = "Name" },
                    new DataControlDefinition("age") { Title = "Age" }
                }
            },
            new GroupedControlsDefinition
            {
                Title = "Contact Information",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("email") { Title = "Email" }
                }
            }
        };

        var testData = new TestPerson("Jane Smith", 25, "jane@example.com");
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var rootFormNode = FormLookup.Create(_ => controls).GetForm("")!;
        var rootSchemaNode = schemaLookup.GetSchema(nameof(TestPerson))!;
        var rootSchemaData = rootSchemaNode.WithData(jsonData);

        // Build the FormStateNode tree once
        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor,
            TestHelpers.CreateTestSchemaInterface()
        );

        // Act
        var doc = Document.Create(dc =>
        {
            var pdfContext = new PdfFormContext(formStateTree);
            dc.Page(p => p.Content().Column(c => pdfContext.RenderContent(c.Item())));
        });

        var pdfBytes = doc.GeneratePdf();

        // Assert
        Assert.NotNull(pdfBytes);
        Assert.NotEmpty(pdfBytes);
        Assert.True(pdfBytes.Length > 100);
    }
}

// Test model
public record TestPerson(string Name, int Age, string Email);
