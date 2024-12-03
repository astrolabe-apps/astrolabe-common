using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace Astrolabe.Schemas.PDF;

public static class PdfGenerator
{
    public static void RenderGroupContent(
        this FormDataNode formDataNode,
        GroupRenderOptions? options,
        IContainer container
    )
    {
        container.Column(cd =>
        {
            formDataNode
                .FormNode.GetChildNodes()
                .ToList()
                .ForEach(fn =>
                {
                    fn.WithData(formDataNode.DataNode ?? formDataNode.Parent)
                        .RenderContainer(cd.Item());
                });
        });
    }

    public static void RenderContent(this FormDataNode formDataNode, IContainer container)
    {
        switch (formDataNode.FormNode.Definition)
        {
            case DataControlDefinition when formDataNode.DataNode is { Data: var data }:
                container.Text(data?.ToString());
                break;
            case GroupedControlsDefinition group:
                formDataNode.RenderGroupContent(group.GroupOptions, container);
                break;
            case DisplayControlDefinition displayControlDefinition:
                throw new NotImplementedException();
            default:
                throw new ArgumentOutOfRangeException();
        }
    }

    public static void RenderContainer(this FormDataNode formNode, IContainer document)
    {
        document.Row(cd =>
        {
            if (!formNode.Definition.IsTitleHidden())
                cd.AutoItem().Text(formNode.Title());
            formNode.RenderContent(cd.AutoItem());
        });
    }
}
