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
        var formDataNode = pdfContext.FormNode;
        container.Column(cd =>
        {
            formDataNode
                .FormNode.GetChildNodes()
                .ToList()
                .ForEach(fn =>
                {
                    pdfContext
                        .WithFormNode(fn.WithData(formDataNode.DataNode ?? formDataNode.Parent))
                        .RenderControlLayout(cd.Item());
                });
        });
    }

    public static void RenderContent(this PdfFormContext pdfContext, IContainer container)
    {
        var formDataNode = pdfContext.FormNode;
        switch (formDataNode.FormNode.Definition)
        {
            case DataControlDefinition when formDataNode.DataNode is { Data: var data }:
                container.Text(data?.ToString());
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
        var formNode = pdfContext.FormNode;
        document.Row(cd =>
        {
            if (!formNode.Definition.IsTitleHidden())
                pdfContext.RenderLabel(
                    formNode.Definition.GetLabelType(),
                    formNode.Title(),
                    cd.AutoItem()
                );
            pdfContext.RenderContent(cd.AutoItem());
        });
    }
}
