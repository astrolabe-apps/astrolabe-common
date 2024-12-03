namespace Astrolabe.Schemas.PDF;

public record PdfFormContext(FormDataNode FormNode)
{
    public PdfFormContext WithFormNode(FormDataNode formNode)
    {
        return new PdfFormContext(formNode);
    }
}
