using Astrolabe.Schemas.PDF.utils;

namespace Astrolabe.Schemas.PDF;

public record PdfFormContext(IFormStateNode FormNode)
{
    public readonly Lazy<string[]> StyleClassNames =
        new(() => FormNode.Definition.StyleClass?.Split(" ") ?? [ ]);

    public readonly Lazy<string[]> LabelClassNames =
        new(() => FormNode.Definition.LabelClass?.Split(" ") ?? [ ]);

    public readonly Lazy<string[]> LayoutClassNames =
        new(() => FormNode.Definition.LayoutClass?.Split(" ") ?? [ ]);

    public readonly Lazy<string> TextValue =
        new(
            () =>
                FormNode.Definition switch
                {
                    DataControlDefinition
                        when FormNode.DataNode?.Schema.Field.Type == "Date"
                            && FormNode.DataNode is { Control: var data }
                        => data.ValueObject?.ToString()?.DateStringToLocalDateString() ?? "No Data",
                    DataControlDefinition when FormNode.DataNode is { Control: var data }
                        => data.ValueObject?.ToString() ?? "Missing data",
                    DisplayControlDefinition { DisplayData: TextDisplay } displayControlDefinition
                        => (displayControlDefinition.DisplayData as TextDisplay)?.Text ?? "",
                    _ => throw new ArgumentOutOfRangeException()
                }
        );

    public static PdfFormContext WithFormNode(IFormStateNode formNode)
    {
        return new PdfFormContext(formNode);
    }
}

/// <summary>
/// Extension methods for PDF form state nodes
/// </summary>
public static class PdfFormStateExtensions
{
    /// <summary>
    /// Gets only the visible children of a form state node.
    /// Filters out children where Visible is false (null and true are considered visible).
    /// </summary>
    public static IEnumerable<IFormStateNode> VisibleChildren(this IFormStateNode node)
    {
        return node.Children.Where(child => child.Visible != false);
    }
}
