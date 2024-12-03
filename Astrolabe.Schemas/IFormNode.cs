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

    public SchemaDataNode? GetDataNode(SchemaDataNode parent)
    {
        throw new NotImplementedException();
    }

    public static IFormNode Create(ControlDefinition definition, IFormNode? parent)
    {
        return new FormNode(definition, parent);
    }
}

public delegate void FormDataVisitor(
    IFormNode formNode,
    SchemaDataNode parent,
    SchemaDataNode? dataNode
);

public static class FormNodeExtensions
{
    public static SchemaDataNode? GetDataNode(this IFormNode formNode, SchemaDataNode parent)
    {
        var fieldRef = formNode.Definition.GetControlFieldRef();
        return fieldRef != null ? parent.GetChildForFieldRef(fieldRef) : null;
    }

    public static void VisitFormWithData(
        this IFormNode formNode,
        SchemaDataNode parent,
        FormDataVisitor visitor
    )
    {
        void Recurse(IFormNode fn, SchemaDataNode p)
        {
            var dataNode = fn.GetDataNode(p);
            visitor(fn, p, dataNode);
            if (p.ElementIndex == null && (p.Schema.Field.Collection ?? false) && dataNode != null)
            {
                var elements = dataNode.ElementCount();
                for (var i = 0; i < elements; i++)
                {
                    var child = dataNode.GetChildElement(i);
                    if (child != null)
                        Recurse(fn, child);
                }
            }
        }
        Recurse(formNode, parent);
    }
}
