using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace Astrolabe.Schemas.PDF;

public static class PdfGenerator
{
    public static void RenderGroupContent(
        this PdfFormContext pdfContext,
        GroupRenderOptions? options,
        IContainer container
    )
    {
        var stateNode = pdfContext.StateNode;
        container.Column(cd =>
        {
            // Children are already resolved in the FormStateNode tree
            foreach (var child in stateNode.Children)
            {
                pdfContext
                    .WithStateNode(child)
                    .RenderControlLayout(cd.Item());
            }
        });
    }

    public static void RenderContent(this PdfFormContext pdfContext, IContainer container)
    {
        var stateNode = pdfContext.StateNode;
        switch (stateNode.Definition)
        {
            case DataControlDefinition when stateNode.DataNode is { Control: var control }:
                container.Text(control?.Value?.ToString());
                break;
            case DataControlDefinition:
                container.Text("Missing data");
                break;
            case GroupedControlsDefinition group:
                pdfContext.RenderGroupContent(group.GroupOptions, container);
                break;
            case DisplayControlDefinition displayControlDefinition:
                throw new NotImplementedException();
            default:
                throw new ArgumentOutOfRangeException();
        }
    }

    public static void RenderLabel(
        this PdfFormContext pdfContext,
        LabelType labelType,
        string labelText,
        IContainer container
    )
    {
        container.Text(labelText);
    }

    public static void RenderControlLayout(this PdfFormContext pdfContext, IContainer document)
    {
        var stateNode = pdfContext.StateNode;
        document.Row(cd =>
        {
            if (!stateNode.Definition.IsTitleHidden())
                pdfContext.RenderLabel(
                    stateNode.Definition.GetLabelType(),
                    stateNode.GetTitle(),
                    cd.AutoItem()
                );
            pdfContext.RenderContent(cd.AutoItem());
        });
    }
}
