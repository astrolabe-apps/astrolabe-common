using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace Astrolabe.Schemas.PDF;

public static class PdfGenerator
{
    public static IDocumentContainer AddPage(
        IDocumentContainer document,
        IFormNode pageControl,
        SchemaDataNode schemaDataNode
    )
    {
        return document.Page(p => p.Content());
    }
}
