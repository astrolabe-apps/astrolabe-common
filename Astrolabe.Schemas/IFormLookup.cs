namespace Astrolabe.Schemas;

public interface IFormLookup
{
    IFormNode? GetForm(string formName);
}

public class FormLookup(IDictionary<string, Func<IFormLookup, IFormNode>> formMap) : IFormLookup
{
    public static IFormLookup Create(IDictionary<string, IEnumerable<ControlDefinition>> formMap)
    {
        return new FormLookup(
            new Dictionary<string, Func<IFormLookup, IFormNode>>(
                formMap.Select(x =>
                {
                    return new KeyValuePair<string, Func<IFormLookup, IFormNode>>(
                        x.Key,
                        l => new FormNode(
                            new GroupedControlsDefinition
                            {
                                Children = x.Value,
                                GroupOptions = new SimpleGroupRenderOptions(
                                    GroupRenderType.Standard.ToString()
                                )
                                {
                                    HideTitle = true
                                }
                            },
                            null,
                            l
                        )
                    );
                })
            )
        );
    }

    public IFormNode? GetForm(string formName)
    {
        return formMap.TryGetValue(formName, out var func) ? func(this) : null;
    }
}
