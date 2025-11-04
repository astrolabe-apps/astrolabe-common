using Astrolabe.Schemas.CodeGen;
using __AppName__.Controllers;

namespace __AppName__.Forms;

public class AppForms : FormBuilder<object?>
{
    public static readonly FormDefinition<object?>[] Forms =
    [
        Form<TeaEdit>("TeaEdit", "Tea Order Form", null)
    ];
}
