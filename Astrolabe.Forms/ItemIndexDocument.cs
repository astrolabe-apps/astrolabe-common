using Azure.Search.Documents.Indexes;

namespace Astrolabe.Forms;

public class ItemIndexDocument
{
    [SearchableField]
    [SimpleField(IsFilterable = true)]
    public IList<string>? Tags { get; set; }
}
