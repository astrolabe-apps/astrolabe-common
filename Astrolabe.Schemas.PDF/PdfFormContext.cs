namespace Astrolabe.Schemas.PDF;

public record PdfFormContext(IFormStateNode StateNode)
{
    public PdfFormContext WithStateNode(IFormStateNode node)
    {
        return new PdfFormContext(node);
    }
}
