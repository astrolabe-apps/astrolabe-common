using Astrolabe.Controls;

namespace Astrolabe.Schemas;

/// <summary>
/// Factory class for creating form state node trees
/// </summary>
public static class FormStateNodeBuilder
{
    /// <summary>
    /// Creates a complete form state node tree from a form node and data.
    /// The tree will reactively update when the underlying data structure changes.
    /// </summary>
    /// <param name="form">The form node containing the form definition</param>
    /// <param name="data">The root schema data node containing the data</param>
    /// <param name="editor">The control editor to use for reactive updates</param>
    /// <param name="schemaInterface">The schema interface for type-aware operations</param>
    /// <returns>The root form state node with all children built reactively</returns>
    public static IFormStateNode CreateFormStateNode(
        IFormNode form,
        SchemaDataNode data,
        ControlEditor editor,
        ISchemaInterface schemaInterface
    )
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
            childKey: "ROOT",
            editor: editor,
            schemaInterface: schemaInterface
        );

        return root;
    }
}
