namespace Astrolabe.Schemas;

/// <summary>
/// Factory class for creating form state node trees
/// </summary>
public static class FormStateNodeBuilder
{
    /// <summary>
    /// Creates a complete form state node tree from a form node and data.
    /// </summary>
    /// <param name="form">The form node containing the form definition</param>
    /// <param name="data">The root schema data node containing the data</param>
    /// <returns>The root form state node with all children built recursively</returns>
    public static IFormStateNode CreateFormStateNode(IFormNode form, SchemaDataNode data)
    {
        var definition = form.Definition;
        var dataNode = FormStateNodeHelpers.LookupDataNode(definition, data);

        var root = new FormStateNode(
            definition: definition,
            form: form,
            parent: data,
            parentNode: null,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "ROOT"
        );

        root.BuildChildren();

        return root;
    }
}
