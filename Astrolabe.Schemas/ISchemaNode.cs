using System.Text.Json.Nodes;

namespace Astrolabe.Schemas;

public interface ISchemaNode : ISchemaTreeLookup
{
    public SchemaField Field { get; }

    public ISchemaNode? GetChildNode(string field);

    public IEnumerable<ISchemaNode> GetChildNodes(ISchemaNode? parent = null);

    public ISchemaNode? Parent { get; }
}

public record SchemaNode(SchemaField Field, ISchemaTreeLookup Lookup, ISchemaNode? Parent)
    : ISchemaNode
{
    public static ISchemaNode FromField(
        SchemaField field,
        ISchemaTreeLookup lookup,
        ISchemaNode? parent
    )
    {
        return new SchemaNode(field, lookup, parent);
    }

    public ISchemaNode? GetSchema(string schemaId)
    {
        return Lookup.GetSchema(schemaId);
    }

    public ISchemaNode? GetChildNode(string field)
    {
        return GetChildNodes().FirstOrDefault(x => x.Field.Field == field);
    }

    public IEnumerable<ISchemaNode> GetChildNodes(ISchemaNode? parent = null)
    {
        return Field switch
        {
            CompoundField cf => cf.Children.Select(x => FromField(x, Lookup, parent ?? this)),
            _ => []
        };
    }
}

public static class SchemaNodeExtensions
{
    public static T TraverseSchemaPath<T>(
        this ISchemaNode schema,
        IEnumerable<string> fieldPath,
        T acc,
        Func<T, ISchemaNode, T> next
    )
    {
        foreach (var field in fieldPath)
        {
            var childNode = schema.GetChildNode(field);
            if (childNode == null)
            {
                throw new Exception("Missing field: " + field);
            }
            acc = next(acc, childNode);
            schema = childNode;
        }

        return acc;
    }
}
