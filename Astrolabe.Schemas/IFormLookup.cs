namespace Astrolabe.Schemas;

public interface IFormLookup
{
    IFormNode? GetForm(string formName);
}

public class FormLookup(Func<string, IFormLookup, IFormNode?> formMap) : IFormLookup
{
    public static IFormLookup Create(Func<string, IEnumerable<ControlDefinition>?> formMap)
    {
        return new FormLookup(
            (name, lookup) =>
            {
                var controls = formMap(name);
                return controls != null
                    ? new FormNode(
                        new GroupedControlsDefinition
                        {
                            Children = controls,
                            GroupOptions = new SimpleGroupRenderOptions(
                                GroupRenderType.Standard.ToString()
                            )
                            {
                                HideTitle = true
                            }
                        },
                        null,
                        lookup
                    )
                    : null;
            }
        );
    }

    public IFormNode? GetForm(string formName)
    {
        return formMap(formName, this);
    }
}
