using System.Text.Json;
using System.Text.Json.Nodes;
using Astrolabe.Controls;
using Astrolabe.Schemas;
using Astrolabe.Schemas.CodeGen;
using Astrolabe.Schemas.PDF;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using Xunit;

namespace Astrolabe.Schemas.PDF.Tests;

public class TailwindStyleTests
{
    private static readonly JsonSerializerOptions JsonOptions =
        new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    static TailwindStyleTests()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    [Fact]
    public void Should_Apply_Typography_Styles()
    {
        // Arrange - Test font sizes, weights, and text decorations
        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(StyledTextModel));

        var schemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );

        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("heading")
            {
                Title = "Heading",
                StyleClass = "text-3xl font-bold text-[#1a1a1a]"
            },
            new DataControlDefinition("subheading")
            {
                Title = "Subheading",
                StyleClass = "text-xl font-semibold italic"
            },
            new DataControlDefinition("bodyText")
            {
                Title = "Body Text",
                StyleClass = "text-base font-normal"
            },
            new DataControlDefinition("smallText")
            {
                Title = "Small Text",
                StyleClass = "text-sm font-light text-[#666666]"
            },
            new DataControlDefinition("decoratedText")
            {
                Title = "Decorated",
                StyleClass = "underline decoration-dashed"
            },
            new DataControlDefinition("customSize")
            {
                Title = "Custom Size",
                StyleClass = "text-[18px] font-medium"
            }
        };

        var testData = new StyledTextModel(
            Heading: "Main Title",
            Subheading: "Subtitle Here",
            BodyText: "This is regular body text",
            SmallText: "Fine print",
            DecoratedText: "Underlined text",
            CustomSize: "Custom sized text"
        );
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var rootFormNode = FormLookup.Create(_ => controls).GetForm("")!;
        var rootSchemaNode = schemaLookup.GetSchema(nameof(StyledTextModel))!;
        var rootSchemaData = rootSchemaNode.WithData(jsonData);

        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor
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

    [Fact]
    public void Should_Apply_Layout_Styles()
    {
        // Arrange - Test width, padding, and background colors
        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(LayoutModel));

        var schemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );

        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("fullWidth")
            {
                Title = "Full Width",
                LayoutClass = "p-4 bg-[#f5f5f5]"
            },
            new DataControlDefinition("fixedWidth")
            {
                Title = "Fixed Width",
                LayoutClass = "w-80 p-6 bg-[#e0e0e0]"
            },
            new DataControlDefinition("minMaxWidth")
            {
                Title = "Min/Max Width",
                LayoutClass = "min-w-40 max-w-96 px-4 py-2"
            },
            new DataControlDefinition("customPadding")
            {
                Title = "Custom Padding",
                LayoutClass = "pt-8 pb-4 pl-6 pr-2 bg-[#ffffff]"
            },
            new DataControlDefinition("arbitraryValues")
            {
                Title = "Arbitrary Values",
                LayoutClass = "w-[250px] p-[15px] bg-[#d4edda]"
            }
        };

        var testData = new LayoutModel(
            FullWidth: "This field has padding and background",
            FixedWidth: "This field has fixed width",
            MinMaxWidth: "Constrained width field",
            CustomPadding: "Different padding on each side",
            ArbitraryValues: "Custom pixel values"
        );
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var rootFormNode = FormLookup.Create(_ => controls).GetForm("")!;
        var rootSchemaNode = schemaLookup.GetSchema(nameof(LayoutModel))!;
        var rootSchemaData = rootSchemaNode.WithData(jsonData);

        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor
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

    [Fact]
    public void Should_Apply_Label_Styles()
    {
        // Arrange - Test label styling separate from content
        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(LabelStyledModel));

        var schemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );

        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("field1")
            {
                Title = "Bold Label",
                LabelClass = "font-bold text-[#2c3e50]",
                StyleClass = "text-base font-normal"
            },
            new DataControlDefinition("field2")
            {
                Title = "Small Uppercase Label",
                LabelClass = "text-xs font-semibold text-[#7f8c8d]",
                StyleClass = "text-lg"
            },
            new DataControlDefinition("field3")
            {
                Title = "Styled Label and Content",
                LabelClass = "text-sm font-medium text-[#34495e] p-2 bg-[#ecf0f1]",
                StyleClass = "text-base italic text-[#2ecc71]",
                LayoutClass = "p-4"
            }
        };

        var testData = new LabelStyledModel(
            Field1: "Content with bold label",
            Field2: "Content with small label",
            Field3: "Both label and content styled"
        );
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var rootFormNode = FormLookup.Create(_ => controls).GetForm("")!;
        var rootSchemaNode = schemaLookup.GetSchema(nameof(LabelStyledModel))!;
        var rootSchemaData = rootSchemaNode.WithData(jsonData);

        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor
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

    [Fact]
    public void Should_Apply_Gap_And_Spacing_Styles()
    {
        // Arrange - Test gap styles in grouped controls
        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(GapModel));

        var schemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );

        var controls = new ControlDefinition[]
        {
            new GroupedControlsDefinition
            {
                Title = "Small Gap Group",
                StyleClass = "gap-2 p-4 bg-[#f8f9fa]",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("item1") { Title = "Item 1" },
                    new DataControlDefinition("item2") { Title = "Item 2" },
                    new DataControlDefinition("item3") { Title = "Item 3" }
                }
            },
            new GroupedControlsDefinition
            {
                Title = "Large Gap Group",
                StyleClass = "gap-y-6 p-6 bg-[#e9ecef]",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("item4") { Title = "Item 4" },
                    new DataControlDefinition("item5") { Title = "Item 5" }
                }
            },
            new GroupedControlsDefinition
            {
                Title = "Custom Gap Group",
                StyleClass = "gap-[20px] p-[25px]",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("item6") { Title = "Item 6" },
                    new DataControlDefinition("item7") { Title = "Item 7" }
                }
            }
        };

        var testData = new GapModel(
            Item1: "First",
            Item2: "Second",
            Item3: "Third",
            Item4: "Fourth",
            Item5: "Fifth",
            Item6: "Sixth",
            Item7: "Seventh"
        );
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var rootFormNode = FormLookup.Create(_ => controls).GetForm("")!;
        var rootSchemaNode = schemaLookup.GetSchema(nameof(GapModel))!;
        var rootSchemaData = rootSchemaNode.WithData(jsonData);

        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor
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

    [Fact]
    public void Should_Apply_Text_Alignment_Styles()
    {
        // Arrange - Test text alignment options
        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(AlignmentModel));

        var schemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );

        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("leftAligned")
            {
                Title = "Left Aligned",
                StyleClass = "text-left text-base"
            },
            new DataControlDefinition("centerAligned")
            {
                Title = "Center Aligned",
                StyleClass = "text-center font-bold"
            },
            new DataControlDefinition("rightAligned")
            {
                Title = "Right Aligned",
                StyleClass = "text-right italic"
            },
            new DataControlDefinition("justified")
            {
                Title = "Justified",
                StyleClass = "text-justify"
            }
        };

        var testData = new AlignmentModel(
            LeftAligned: "This text is aligned to the left",
            CenterAligned: "This text is centered",
            RightAligned: "This text is aligned to the right",
            Justified: "This text is justified across the width"
        );
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var rootFormNode = FormLookup.Create(_ => controls).GetForm("")!;
        var rootSchemaNode = schemaLookup.GetSchema(nameof(AlignmentModel))!;
        var rootSchemaData = rootSchemaNode.WithData(jsonData);

        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor
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

    [Fact]
    public void Should_Apply_Combined_Styles()
    {
        // Arrange - Test combination of multiple style types
        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(CombinedStyleModel));

        var schemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );

        var controls = new ControlDefinition[]
        {
            new GroupedControlsDefinition
            {
                Title = "Fully Styled Section",
                StyleClass = "gap-4 p-6 bg-[#ffffff]",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("title")
                    {
                        Title = "Document Title",
                        LabelClass = "text-sm font-semibold text-[#6c757d] p-2",
                        StyleClass = "text-2xl font-bold text-[#212529] underline",
                        LayoutClass = "p-4 bg-[#f8f9fa]"
                    },
                    new DataControlDefinition("description")
                    {
                        Title = "Description",
                        LabelClass = "text-xs font-medium text-[#495057]",
                        StyleClass = "text-base font-normal text-[#6c757d] italic",
                        LayoutClass = "w-[400px] p-[10px]"
                    },
                    new DataControlDefinition("metadata")
                    {
                        Title = "Metadata",
                        LabelClass = "text-[10px] font-light",
                        StyleClass = "text-xs text-[#adb5bd] line-through decoration-dotted",
                        LayoutClass = "min-w-60 max-w-80 px-3 py-1"
                    }
                }
            }
        };

        var testData = new CombinedStyleModel(
            Title: "Complex PDF Document",
            Description: "This demonstrates multiple tailwind styles applied simultaneously",
            Metadata: "Draft version 1.0"
        );
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var rootFormNode = FormLookup.Create(_ => controls).GetForm("")!;
        var rootSchemaNode = schemaLookup.GetSchema(nameof(CombinedStyleModel))!;
        var rootSchemaData = rootSchemaNode.WithData(jsonData);

        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor
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

// Test models
public record StyledTextModel(
    string Heading,
    string Subheading,
    string BodyText,
    string SmallText,
    string DecoratedText,
    string CustomSize
);

public record LayoutModel(
    string FullWidth,
    string FixedWidth,
    string MinMaxWidth,
    string CustomPadding,
    string ArbitraryValues
);

public record LabelStyledModel(string Field1, string Field2, string Field3);

public record GapModel(
    string Item1,
    string Item2,
    string Item3,
    string Item4,
    string Item5,
    string Item6,
    string Item7
);

public record AlignmentModel(
    string LeftAligned,
    string CenterAligned,
    string RightAligned,
    string Justified
);

public record CombinedStyleModel(string Title, string Description, string Metadata);