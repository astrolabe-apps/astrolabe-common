using System.Text.Json;
using Astrolabe.Controls;
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

        // Generate tailwind styles showcase PDF
        GenerateTailwindStylesPdf(outputDir);

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

        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor
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
                        pdfContext.RenderContent(column.Item());
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

        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor
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
                        pdfContext.RenderContent(column.Item());
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

        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor
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
                        pdfContext.RenderContent(column.Item());
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

    private static void GenerateTailwindStylesPdf(string outputDir)
    {
        Console.WriteLine("\n4. Generating tailwind-styles-showcase.pdf...");

        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(TailwindShowcase));

        var schemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );

        var controls = new ControlDefinition[]
        {
            // Typography showcase section
            new GroupedControlsDefinition
            {
                Title = "Typography Styles",
                StyleClass = "gap-3 p-4 bg-[#f8f9fa]",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("largeHeading")
                    {
                        Title = "Large Heading",
                        LabelClass = "text-xs font-semibold text-[#6c757d]",
                        StyleClass = "text-4xl font-bold text-[#212529]",
                        LayoutClass = "pb-2"
                    },
                    new DataControlDefinition("mediumHeading")
                    {
                        Title = "Medium Heading",
                        LabelClass = "text-xs font-semibold text-[#6c757d]",
                        StyleClass = "text-2xl font-semibold text-[#495057]",
                        LayoutClass = "pb-2"
                    },
                    new DataControlDefinition("bodyText")
                    {
                        Title = "Body Text",
                        LabelClass = "text-xs font-medium text-[#6c757d]",
                        StyleClass = "text-base font-normal text-[#212529]",
                    },
                    new DataControlDefinition("italicText")
                    {
                        Title = "Italic Text",
                        LabelClass = "text-xs font-medium text-[#6c757d]",
                        StyleClass = "text-base italic text-[#495057]",
                    },
                    new DataControlDefinition("smallText")
                    {
                        Title = "Small Print",
                        LabelClass = "text-xs font-medium text-[#6c757d]",
                        StyleClass = "text-sm font-light text-[#868e96]",
                    }
                }
            },

            // Text decoration showcase section
            new GroupedControlsDefinition
            {
                Title = "Text Decorations",
                StyleClass = "gap-3 p-4 bg-[#e9ecef]",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("underlinedText")
                    {
                        Title = "Underlined",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-base underline decoration-solid text-[#212529]",
                    },
                    new DataControlDefinition("dashedUnderline")
                    {
                        Title = "Dashed Underline",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-base underline decoration-dashed text-[#212529]",
                    },
                    new DataControlDefinition("dottedUnderline")
                    {
                        Title = "Dotted Underline",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-base underline decoration-dotted text-[#212529]",
                    },
                    new DataControlDefinition("strikethrough")
                    {
                        Title = "Strikethrough",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-base line-through text-[#868e96]",
                    }
                }
            },

            // Color showcase section
            new GroupedControlsDefinition
            {
                Title = "Color Variations",
                StyleClass = "gap-3 p-4 bg-[#f8f9fa]",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("darkText")
                    {
                        Title = "Dark Text",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-lg font-semibold text-[#212529]",
                        LayoutClass = "p-2 bg-[#ffffff]"
                    },
                    new DataControlDefinition("blueText")
                    {
                        Title = "Blue Text",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-lg font-semibold text-[#0d6efd]",
                        LayoutClass = "p-2 bg-[#ffffff]"
                    },
                    new DataControlDefinition("greenText")
                    {
                        Title = "Green Text",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-lg font-semibold text-[#198754]",
                        LayoutClass = "p-2 bg-[#ffffff]"
                    },
                    new DataControlDefinition("redText")
                    {
                        Title = "Red Text",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-lg font-semibold text-[#dc3545]",
                        LayoutClass = "p-2 bg-[#ffffff]"
                    }
                }
            },

            // Layout showcase section
            new GroupedControlsDefinition
            {
                Title = "Layout & Spacing",
                StyleClass = "gap-4 p-4 bg-[#e9ecef]",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("paddedBox")
                    {
                        Title = "Padded Box",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-base text-[#212529]",
                        LayoutClass = "p-6 bg-[#ffffff]"
                    },
                    new DataControlDefinition("customWidth")
                    {
                        Title = "Fixed Width",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-base text-[#212529]",
                        LayoutClass = "w-[300px] p-4 bg-[#d4edda]"
                    },
                    new DataControlDefinition("differentPadding")
                    {
                        Title = "Custom Padding",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-base text-[#212529]",
                        LayoutClass = "pt-8 pb-2 pl-6 pr-2 bg-[#cfe2ff]"
                    }
                }
            },

            // Font weight showcase
            new GroupedControlsDefinition
            {
                Title = "Font Weights",
                StyleClass = "gap-2 p-4 bg-[#f8f9fa]",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("lightWeight")
                    {
                        Title = "Light",
                        LabelClass = "text-xs text-[#6c757d]",
                        StyleClass = "text-lg font-light text-[#212529]",
                    },
                    new DataControlDefinition("normalWeight")
                    {
                        Title = "Normal",
                        LabelClass = "text-xs text-[#6c757d]",
                        StyleClass = "text-lg font-normal text-[#212529]",
                    },
                    new DataControlDefinition("mediumWeight")
                    {
                        Title = "Medium",
                        LabelClass = "text-xs text-[#6c757d]",
                        StyleClass = "text-lg font-medium text-[#212529]",
                    },
                    new DataControlDefinition("semiboldWeight")
                    {
                        Title = "Semibold",
                        LabelClass = "text-xs text-[#6c757d]",
                        StyleClass = "text-lg font-semibold text-[#212529]",
                    },
                    new DataControlDefinition("boldWeight")
                    {
                        Title = "Bold",
                        LabelClass = "text-xs text-[#6c757d]",
                        StyleClass = "text-lg font-bold text-[#212529]",
                    }
                }
            },

            // Custom sizes showcase
            new GroupedControlsDefinition
            {
                Title = "Custom Sizes",
                StyleClass = "gap-3 p-4 bg-[#e9ecef]",
                Children = new ControlDefinition[]
                {
                    new DataControlDefinition("customSize14")
                    {
                        Title = "14px Custom",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-[14px] text-[#212529]",
                    },
                    new DataControlDefinition("customSize18")
                    {
                        Title = "18px Custom",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-[18px] font-medium text-[#212529]",
                    },
                    new DataControlDefinition("customSize24")
                    {
                        Title = "24px Custom",
                        LabelClass = "text-xs font-semibold text-[#495057]",
                        StyleClass = "text-[24px] font-bold text-[#212529]",
                    }
                }
            }
        };

        var showcaseData = new TailwindShowcase(
            LargeHeading: "This is a Large Heading (text-4xl)",
            MediumHeading: "This is a Medium Heading (text-2xl)",
            BodyText: "This is regular body text with normal font weight",
            ItalicText: "This text is italicized for emphasis",
            SmallText: "This is small text, often used for disclaimers or fine print",
            UnderlinedText: "Text with solid underline",
            DashedUnderline: "Text with dashed underline decoration",
            DottedUnderline: "Text with dotted underline decoration",
            Strikethrough: "This text has been struck through",
            DarkText: "Dark text on white background",
            BlueText: "Blue colored text",
            GreenText: "Green colored text",
            RedText: "Red colored text",
            PaddedBox: "This text is in a box with generous padding",
            CustomWidth: "This field has a fixed width of 300px",
            DifferentPadding: "Different padding on each side",
            LightWeight: "Light font weight (300)",
            NormalWeight: "Normal font weight (400)",
            MediumWeight: "Medium font weight (500)",
            SemiboldWeight: "Semibold font weight (600)",
            BoldWeight: "Bold font weight (700)",
            CustomSize14: "Custom 14 pixel font size",
            CustomSize18: "Custom 18 pixel font size",
            CustomSize24: "Custom 24 pixel font size"
        );

        var jsonData = JsonSerializer.SerializeToNode(showcaseData, JsonOptions);

        var rootFormNode = FormLookup.Create(_ => controls).GetForm("")!;
        var rootSchemaNode = schemaLookup.GetSchema(nameof(TailwindShowcase))!;
        var rootSchemaData = rootSchemaNode.WithData(jsonData);

        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor
        );

        var doc = Document.Create(dc =>
        {
            var pdfContext = new PdfFormContext(formStateTree);

            dc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header()
                    .Column(column =>
                    {
                        column.Item().Text("Tailwind CSS Styles Showcase")
                            .Bold().FontSize(26).FontColor(Colors.Blue.Darken2);

                        column.Item().PaddingTop(0.15f, Unit.Centimetre)
                            .Text("Demonstrating various Tailwind CSS class support in PDF generation")
                            .FontSize(11).FontColor(Colors.Grey.Darken1);

                        column.Item().PaddingTop(0.25f, Unit.Centimetre)
                            .LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
                    });

                page.Content()
                    .PaddingVertical(0.75f, Unit.Centimetre)
                    .Column(column =>
                    {
                        pdfContext.RenderContent(column.Item());
                    });

                page.Footer()
                    .AlignCenter()
                    .Text(x =>
                    {
                        x.Span("See TAILWIND-STYLES.md for complete documentation | Page ")
                            .FontSize(9)
                            .FontColor(Colors.Grey.Medium);
                        x.CurrentPageNumber().FontSize(9).FontColor(Colors.Grey.Medium);
                    });
            });
        });

        var filePath = Path.Combine(outputDir, "tailwind-styles-showcase.pdf");
        doc.GeneratePdf(filePath);
        Console.WriteLine($"   ✓ Generated: {filePath}");
    }
}

// Test models
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

public record TailwindShowcase(
    string LargeHeading,
    string MediumHeading,
    string BodyText,
    string ItalicText,
    string SmallText,
    string UnderlinedText,
    string DashedUnderline,
    string DottedUnderline,
    string Strikethrough,
    string DarkText,
    string BlueText,
    string GreenText,
    string RedText,
    string PaddedBox,
    string CustomWidth,
    string DifferentPadding,
    string LightWeight,
    string NormalWeight,
    string MediumWeight,
    string SemiboldWeight,
    string BoldWeight,
    string CustomSize14,
    string CustomSize18,
    string CustomSize24
);