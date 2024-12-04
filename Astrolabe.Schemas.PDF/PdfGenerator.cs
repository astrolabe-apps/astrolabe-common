using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace Astrolabe.Schemas.PDF;

public static class PdfGenerator
{
    private enum ListType
    {
        BulletPoint,
        Numeric
    }

    public static Document CreateDocument(this PdfFormContext pdfContext)
    {
        return Document.Create(container =>
        {
            container.Page(p =>
            {
                var totalStart = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                Console.WriteLine($"Total start: {totalStart}");

                // p.Header();

                pdfContext.RenderContent(p.Content());

                p.Footer().AlignCenter().Text(t => t.CurrentPageNumber());
                var totalEnd = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                Console.WriteLine($"Total after: {totalEnd}");
                Console.WriteLine($"Total takes: {totalEnd - totalStart}ms\n\n\n");
            });
        });
    }

    private static void RenderContent(this PdfFormContext pdfContext, IContainer container)
    {
        switch (pdfContext.FormNode.FormNode.Definition)
        {
            case GroupedControlsDefinition group:
                pdfContext.RenderGroupContent(group.GroupOptions, container);
                break;
            case DataControlDefinition
            or DisplayControlDefinition:
                pdfContext.RenderControlLayout(container);
                break;
            default:
                throw new ArgumentOutOfRangeException();
        }
    }

    private static void RenderGroupContent(
        this PdfFormContext pdfContext,
        GroupRenderOptions? options,
        IContainer container
    )
    {
        var styleClassNames = pdfContext.StyleClassNames.Value;

        if (styleClassNames.Contains("paragraph"))
        {
            pdfContext.RenderParagraphGroup(container);
        }
        else if (styleClassNames.Contains("list-disc") || styleClassNames.Contains("list-decimal"))
        {
            var className = styleClassNames.LastOrDefault(
                x => x.Contains("list-disc") || x.Contains("list-decimal")
            );
            var type = className switch
            {
                "list-disc" => ListType.BulletPoint,
                "list-decimal" => ListType.Numeric,
                _ => ListType.BulletPoint
            };
            pdfContext.RenderListGroup(container, type);
        }
        else
        {
            pdfContext.RenderGeneralGroup(container);
        }
    }

    private static void RenderGeneralGroup(this PdfFormContext pdfContext, IContainer container)
    {
        var formDataNode = pdfContext.FormNode;
        var styleClassNames = pdfContext.StyleClassNames.Value;
        container
            .Element(x => x.TryParseWidth(styleClassNames))
            .Element(x => x.TryParsePadding(styleClassNames))
            .Column(c =>
            {
                c.TryConfigColumnGap(styleClassNames);

                formDataNode
                    .FormNode
                    .GetChildNodes()
                    .ToList()
                    .ForEach(fn =>
                    {
                        pdfContext
                            .WithFormNode(fn.WithData(formDataNode.DataNode ?? formDataNode.Parent))
                            .RenderContent(c.Item());
                    });
            });
    }

    private static void RenderParagraphGroup(this PdfFormContext pdfContext, IContainer container)
    {
        var formDataNode = pdfContext.FormNode;
        var styleClassNames = pdfContext.StyleClassNames.Value;

        container
            .Element(x => x.TryParseWidth(styleClassNames))
            .Element(x => x.TryParsePadding(styleClassNames))
            .Column(c =>
            {
                c.Item()
                    .Text(text =>
                    {
                        text.TryParseTextAlign(styleClassNames);

                        formDataNode
                            .FormNode
                            .GetChildNodes()
                            .ToList()
                            .ForEach(fn =>
                            {
                                pdfContext
                                    .WithFormNode(
                                        fn.WithData(formDataNode.DataNode ?? formDataNode.Parent)
                                    )
                                    .RenderParagraphSpan(text);
                            });
                    });
            });
    }

    private static void RenderParagraphSpan(this PdfFormContext pdfContext, TextDescriptor text)
    {
        text.Span(pdfContext.TextValue.Value).WithStyles(pdfContext.StyleClassNames.Value);
    }

    private static void RenderListGroup(
        this PdfFormContext pdfContext,
        IContainer container,
        ListType listType
    )
    {
        var formDataNode = pdfContext.FormNode;
        var styleClassNames = pdfContext.StyleClassNames.Value;
        container
            .Element(x => x.TryParseWidth(styleClassNames))
            .Element(x => x.TryParsePadding(styleClassNames))
            .Column(c =>
            {
                c.TryConfigColumnGap(styleClassNames);

                var index = 0;
                formDataNode
                    .FormNode
                    .GetChildNodes()
                    .ToList()
                    .ForEach(fn =>
                    {
                        pdfContext
                            .WithFormNode(fn.WithData(formDataNode.DataNode ?? formDataNode.Parent))
                            .RenderListItem(c.Item(), listType, index);
                        index++;
                    });
            });
    }

    private static void RenderListItem(
        this PdfFormContext pdfContext,
        IContainer container,
        ListType listType,
        int index
    )
    {
        var styleClassNames = pdfContext.StyleClassNames.Value;
        var textValue = pdfContext.TextValue.Value;

        container
            .Element(x => x.TryParseWidth(styleClassNames))
            .Element(x => x.TryParsePadding(styleClassNames))
            .Row(r =>
            {
                r.Spacing(5);

                var prefix = listType switch
                {
                    ListType.BulletPoint => "•",
                    ListType.Numeric => $"{index + 1}.",
                    _ => "•"
                };

                r.AutoItem().Text(prefix).WithStyles(styleClassNames);
                r.RelativeItem()
                    .Text(text =>
                    {
                        text.RenderText(textValue, styleClassNames);
                    });
            });
    }

    #region Render Control

    public static void RenderControlLayout(this PdfFormContext pdfContext, IContainer container)
    {
        var formNode = pdfContext.FormNode;
        var styleClassNames = pdfContext.LayoutClassNames.Value;
        container
            .Element(x => x.TryParseWidth(styleClassNames))
            .Element(x => x.TryParsePadding(styleClassNames))
            .Row(r =>
            {
                if (!formNode.Definition.IsTitleHidden())
                {
                    pdfContext.RenderLabel(
                        formNode.Definition.GetLabelType(),
                        formNode.Title(),
                        r.AutoItem()
                    );
                }

                pdfContext.RenderControlContent(r.RelativeItem());
            });
    }

    private static void RenderLabel(
        this PdfFormContext pdfContext,
        LabelType labelType,
        string labelText,
        IContainer container
    )
    {
        var labelClassNames = pdfContext.LabelClassNames.Value;
        container
            .Element(x => x.TryParseWidth(labelClassNames))
            .Element(x => x.TryParsePadding(labelClassNames))
            .Text(text =>
            {
                text.RenderText(labelText, labelClassNames);
            });
    }

    private static void RenderControlContent(this PdfFormContext pdfContext, IContainer container)
    {
        var textValue = pdfContext.TextValue.Value;
        var styleClassNames = pdfContext.StyleClassNames.Value;

        container
            .Element(x => x.TryParseWidth(styleClassNames))
            .Element(x => x.TryParsePadding(styleClassNames))
            .Text(text =>
            {
                text.RenderText(textValue, styleClassNames);
            });
    }

    #endregion

    private static void RenderText(this TextDescriptor text, string value, string[] classNames)
    {
        text.TryParseTextAlign(classNames);
        text.Span(value).WithStyles(classNames);
    }
}
