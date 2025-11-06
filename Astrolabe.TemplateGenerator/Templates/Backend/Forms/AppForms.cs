using __AppName__.Controllers;
using __AppName__.Data;
using __AppName__.Services;
using Astrolabe.Schemas.CodeGen;

namespace __AppName__.Forms;

public class AppForms : FormBuilder<object?>
{
    public static readonly FormDefinition<object?>[] Forms =
    [
        // Tea Editor Form - for creating/editing tea orders
        Form<TeaEditorForm>("TeaEditorForm", "Tea Editor", null),

        // Tea Search Form - for searching and listing teas
        Form<TeaSearchForm>("TeaSearchForm", "Tea Search", null)
    ];
}
