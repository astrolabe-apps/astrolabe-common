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
                        .RenderContainer(cd.Item());
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

    public static void RenderContainer(this PdfFormContext pdfContext, IContainer document)
    {
        var formNode = pdfContext.FormNode;
        document.Row(cd =>
        {
            if (!formNode.Definition.IsTitleHidden())
                cd.AutoItem().Text(formNode.Title());
            pdfContext.RenderContent(cd.AutoItem());
        });
    }
}
