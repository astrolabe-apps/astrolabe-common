using Azure.Search.Documents.Indexes;

namespace Astrolabe.Forms.EF;

public class ItemIndexDocument
{
    [SearchableField]
    [SimpleField(IsFilterable = true)]
    public IList<string>? Tags { get; set; }
}
