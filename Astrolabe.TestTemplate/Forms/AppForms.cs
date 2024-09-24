using Astrolabe.Schemas.CodeGen;

namespace Astrolabe.TestTemplate.Forms;

public class AppForms : FormBuilder<object?>
{
    public static readonly FormDefinition<object?>[] Forms =
    [
        Form<CarSearchPage>("CarSearch", "Car Search Page", null)
    ];
}
