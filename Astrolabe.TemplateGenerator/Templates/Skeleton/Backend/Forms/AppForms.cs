using __ProjectName__.Controllers;
using __ProjectName__.Data;
using __ProjectName__.Services;
using Astrolabe.Schemas.CodeGen;

namespace __ProjectName__.Forms;

public class AppForms : FormBuilder<object?>
{
    public static readonly FormDefinition<object?>[] Forms =
    [
        // Tea Editor Form - for creating/editing tea orders
        Form<TeaEditorForm>("TeaEditorForm", "Tea Editor", null),
        Form<TeaViewForm>("TeaView", "Tea View", null),
        // Tea Search Form - for searching and listing teas
        Form<TeaSearchForm>("TeaSearchForm", "Tea Search", null),
    ];
}
