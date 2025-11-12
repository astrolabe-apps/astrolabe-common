using __ProjectName__.Models;

namespace __ProjectName__.Forms;

// Used for GET operations in lists - lightweight summary information
public record TeaInfo(Guid Id, TeaType Type, int NumberOfSugars, MilkAmount MilkAmount);

// Used for POST and PUT operations - contains editable fields
public class TeaEdit
{
    public TeaType Type { get; set; }
    public int NumberOfSugars { get; set; }
    public MilkAmount MilkAmount { get; set; }
    public bool IncludeSpoon { get; set; }
    public string? BrewNotes { get; set; }
}

// Used for GET operations for full entity details - extends TeaEdit
public class TeaView : TeaEdit
{
    public Guid Id { get; set; }
}

// Preferred approach: Create a specific "Form" class with a property containing the "Edit" class
public class TeaEditorForm
{
    public TeaEdit Tea { get; set; } = new();
    public Guid? TeaId { get; set; }
}

public class TeaViewForm
{
    public TeaView Tea { get; set; } = new();
    public Guid? TeaId { get; set; }
}

// AppForm for search/list page
public class TeaSearchForm
{
    public string SearchTerm { get; set; } = "";
    public TeaType? FilterByType { get; set; }
    public List<TeaInfo> Results { get; set; } = new();
}
