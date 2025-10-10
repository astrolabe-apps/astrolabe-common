using System.Text.Json;
using Astrolabe.Schemas;
using Astrolabe.Schemas.CodeGen;
using Astrolabe.Schemas.PDF;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Astrolabe.Schemas.PDF.Tests;

/// <summary>
/// Console program to generate sample PDFs for manual inspection
/// </summary>
public class PdfGeneratorProgram
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static void Main(string[] args)
    {
        // Configure QuestPDF license
        QuestPDF.Settings.License = LicenseType.Community;

        var outputDir = args.Length > 0 ? args[0] : "./pdf-output";
        Directory.CreateDirectory(outputDir);

        Console.WriteLine($"Generating PDF samples to: {outputDir}");

        // Generate simple fields PDF
        GenerateSimpleFieldsPdf(outputDir);

        // Generate grouped controls PDF
        GenerateGroupedControlsPdf(outputDir);

        // Generate complex example PDF
        GenerateComplexExamplePdf(outputDir);

        Console.WriteLine("\nPDF generation complete!");
        Console.WriteLine($"Check the '{outputDir}' directory for the generated PDFs.");
    }

    private static void GenerateSimpleFieldsPdf(string outputDir)
    {
        Console.WriteLine("\n1. Generating simple-fields.pdf...");

        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(TestPerson));

        var schemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );

        var controls = new ControlDefinition[]
        {
            new DataControlDefinition("name")
            {
                Title = "Full Name"
            },
            new DataControlDefinition("age")
            {
                Title = "Age"
            },
            new DataControlDefinition("email")
            {
                Title = "Email Address"
            }
        };

        var testData = new TestPerson("John Doe", 35, "john.doe@example.com");
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var rootFormNode = FormLookup.Create(_ => controls).GetForm("")!;
        var rootSchemaNode = schemaLookup.GetSchema(nameof(TestPerson))!;
        var rootSchemaData = rootSchemaNode.WithData(jsonData);

        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData
        );

        var doc = Document.Create(dc =>
        {
            var pdfContext = new PdfFormContext(formStateTree);

            dc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(12));

                page.Header()
                    .Text("Simple Fields Example")
                    .SemiBold().FontSize(20).FontColor(Colors.Blue.Medium);

                page.Content()
                    .PaddingVertical(1, Unit.Centimetre)
                    .Column(column =>
                    {
                        pdfContext.RenderControlLayout(column.Item());
                    });

                page.Footer()
                    .AlignCenter()
                    .Text(x =>
                    {
                        x.Span("Page ");
                        x.CurrentPageNumber();
                    });
            });
        });

        var filePath = Path.Combine(outputDir, "simple-fields.pdf");
        doc.GeneratePdf(filePath);
        Console.WriteLine($"   ✓ Generated: {filePath}");
    }

    private static void GenerateGroupedControlsPdf(string outputDir)
    {
        Console.WriteLine("\n2. Generating grouped-controls.pdf...");

        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(TestPerson));

        var schemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );

        var controls = new ControlDefinition[]
        {
            new GroupedControlsDefinition
            {
                Title = "Personal Information",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("name")
                    {
                        Title = "Name"
                    },
                    new DataControlDefinition("age")
                    {
                        Title = "Age"
                    }
                }
            },
            new GroupedControlsDefinition
            {
                Title = "Contact Information",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("email")
                    {
                        Title = "Email"
                    }
                }
            }
        };

        var testData = new TestPerson("Jane Smith", 28, "jane.smith@example.com");
        var jsonData = JsonSerializer.SerializeToNode(testData, JsonOptions);

        var rootFormNode = FormLookup.Create(_ => controls).GetForm("")!;
        var rootSchemaNode = schemaLookup.GetSchema(nameof(TestPerson))!;
        var rootSchemaData = rootSchemaNode.WithData(jsonData);

        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData
        );

        var doc = Document.Create(dc =>
        {
            var pdfContext = new PdfFormContext(formStateTree);

            dc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(12));

                page.Header()
                    .Text("Grouped Controls Example")
                    .SemiBold().FontSize(20).FontColor(Colors.Blue.Medium);

                page.Content()
                    .PaddingVertical(1, Unit.Centimetre)
                    .Column(column =>
                    {
                        pdfContext.RenderControlLayout(column.Item());
                    });

                page.Footer()
                    .AlignCenter()
                    .Text(x =>
                    {
                        x.Span("Page ");
                        x.CurrentPageNumber();
                    });
            });
        });

        var filePath = Path.Combine(outputDir, "grouped-controls.pdf");
        doc.GeneratePdf(filePath);
        Console.WriteLine($"   ✓ Generated: {filePath}");
    }

    private static void GenerateComplexExamplePdf(string outputDir)
    {
        Console.WriteLine("\n3. Generating complex-example.pdf...");

        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(Employee));

        var schemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );

        var controls = new ControlDefinition[]
        {
            new GroupedControlsDefinition
            {
                Title = "Employee Details",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("firstName")
                    {
                        Title = "First Name"
                    },
                    new DataControlDefinition("lastName")
                    {
                        Title = "Last Name"
                    },
                    new DataControlDefinition("employeeId")
                    {
                        Title = "Employee ID"
                    }
                }
            },
            new GroupedControlsDefinition
            {
                Title = "Contact Details",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("email")
                    {
                        Title = "Email Address"
                    },
                    new DataControlDefinition("phone")
                    {
                        Title = "Phone Number"
                    }
                }
            },
            new GroupedControlsDefinition
            {
                Title = "Employment Information",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("department")
                    {
                        Title = "Department"
                    },
                    new DataControlDefinition("position")
                    {
                        Title = "Position"
                    },
                    new DataControlDefinition("salary")
                    {
                        Title = "Annual Salary"
                    }
                }
            }
        };

        var employee = new Employee(
            "Alice",
            "Johnson",
            "EMP-12345",
            "alice.johnson@company.com",
            "+1-555-0123",
            "Engineering",
            "Senior Software Engineer",
            95000
        );

        var jsonData = JsonSerializer.SerializeToNode(employee, JsonOptions);

        var rootFormNode = FormLookup.Create(_ => controls).GetForm("")!;
        var rootSchemaNode = schemaLookup.GetSchema(nameof(Employee))!;
        var rootSchemaData = rootSchemaNode.WithData(jsonData);

        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData
        );

        var doc = Document.Create(dc =>
        {
            var pdfContext = new PdfFormContext(formStateTree);

            dc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(12));

                page.Header()
                    .Column(column =>
                    {
                        column.Item().Text("Employee Information Report")
                            .SemiBold().FontSize(24).FontColor(Colors.Blue.Darken2);

                        column.Item().PaddingTop(0.25f, Unit.Centimetre)
                            .LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
                    });

                page.Content()
                    .PaddingVertical(1, Unit.Centimetre)
                    .Column(column =>
                    {
                        pdfContext.RenderControlLayout(column.Item());
                    });

                page.Footer()
                    .AlignCenter()
                    .Text(x =>
                    {
                        x.Span("Generated on ");
                        x.Span(DateTime.Now.ToString("yyyy-MM-dd HH:mm"));
                        x.Span(" | Page ");
                        x.CurrentPageNumber();
                    });
            });
        });

        var filePath = Path.Combine(outputDir, "complex-example.pdf");
        doc.GeneratePdf(filePath);
        Console.WriteLine($"   ✓ Generated: {filePath}");
    }
}

// Additional test model for complex example
public record Employee(
    string FirstName,
    string LastName,
    string EmployeeId,
    string Email,
    string Phone,
    string Department,
    string Position,
    decimal Salary
);