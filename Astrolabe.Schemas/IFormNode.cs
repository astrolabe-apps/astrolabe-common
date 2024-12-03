namespace Astrolabe.Schemas;

public interface IFormNode
{
    ControlDefinition Definition { get; }

    IFormNode? Parent { get; }

    IEnumerable<IFormNode> GetChildNodes();
}

public record FormNode(ControlDefinition Definition, IFormNode? Parent) : IFormNode
{
    public IEnumerable<IFormNode> GetChildNodes()
    {
        return Definition.Children?.Select(x => new FormNode(x, this)) ?? [];
    }

    public static IFormNode Create(ControlDefinition definition, IFormNode? parent = null)
    {
        return new FormNode(definition, parent);
    }

    public static IFormNode Create(
        IEnumerable<ControlDefinition> definitions,
        IFormNode? parent = null
    )
    {
        return new FormNode(
            new GroupedControlsDefinition
            {
                Children = definitions,
                GroupOptions = new SimpleGroupRenderOptions(GroupRenderType.Standard.ToString())
                {
                    HideTitle = true
                }
            },
            parent
        );
    }
}

public record FormDataNode(IFormNode FormNode, SchemaDataNode Parent, SchemaDataNode? DataNode)
{
    public ControlDefinition Definition => FormNode.Definition;
}

public static class FormNodeExtensions
{
    public static FormDataNode WithData(this IFormNode formNode, SchemaDataNode parent)
    {
        var fieldRef = formNode.Definition.GetControlFieldRef();
        return new FormDataNode(
            formNode,
            parent,
            fieldRef != null ? parent.GetChildForFieldRef(fieldRef) : null
        );
    }

    public static string Title(this ISchemaNode schemaNode)
    {
        return schemaNode.Field.DisplayName ?? schemaNode.Field.Field;
    }

    public static string Title(this FormDataNode formNode)
    {
        return formNode.FormNode.Definition.Title
            ?? formNode.DataNode?.Schema.Title()
            ?? "<untitled>";
    }

    // public static void VisitFormWithData(
    //     this IFormNode formNode,
    //     SchemaDataNode parent,
    //     FormDataVisitor visitor
    // )
    // {
    //     void Recurse(IFormNode fn, SchemaDataNode p)
    //     {
    //         var dataNode = fn.GetDataNode(p);
    //         visitor(fn, p, dataNode);
    //         if (p.ElementIndex == null && (p.Schema.Field.Collection ?? false) && dataNode != null)
    //         {
    //             var elements = dataNode.ElementCount();
    //             for (var i = 0; i < elements; i++)
    //             {
    //                 var child = dataNode.GetChildElement(i);
    //                 if (child != null)
    //                     Recurse(fn, child);
    //             }
    //         }
    //         else
    //         {
    //             foreach (var childNode in fn.GetChildNodes())
    //             {
    //                 Recurse(childNode, dataNode ?? p);
    //             }
    //         }
    //     }
    //     Recurse(formNode, parent);
    // }
}
