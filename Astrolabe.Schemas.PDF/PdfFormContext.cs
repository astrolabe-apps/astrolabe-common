using Astrolabe.Schemas.PDF.utils;

namespace Astrolabe.Schemas.PDF;

public record PdfFormContext(FormDataNode FormNode)
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
                FormNode.FormNode.Definition switch
                {
                    DataControlDefinition
                        when FormNode.DataNode?.Schema.Field.Type == "Date"
                            && FormNode.DataNode is { Data: var data }
                        => data != null ? data.ToString().DateStringToLocalDateString() : "No Data",
                    DataControlDefinition when FormNode.DataNode is { Data: var data }
                        => data?.ToString() ?? "Missing data",
                    DisplayControlDefinition { DisplayData: TextDisplay } displayControlDefinition
                        => (displayControlDefinition.DisplayData as TextDisplay)?.Text ?? "",
                    _ => throw new ArgumentOutOfRangeException()
                }
        );

    public static PdfFormContext WithFormNode(FormDataNode formNode)
    {
        return new PdfFormContext(formNode);
    }
}
