namespace Astrolabe.Schemas;

public interface ISchemaTreeLookup
{
    ISchemaNode? GetSchema(string schemaId);
}

public class SchemaTreeLookup(IDictionary<string, Func<ISchemaTreeLookup, ISchemaNode>> schemaMap)
    : ISchemaTreeLookup
{
    public static ISchemaTreeLookup Create(IDictionary<string, IEnumerable<SchemaField>> schemaMap)
    {
        IDictionary<string, Func<ISchemaTreeLookup, ISchemaNode>> nodeMap = schemaMap.ToDictionary<
            KeyValuePair<string, IEnumerable<SchemaField>>,
            string,
            Func<ISchemaTreeLookup, ISchemaNode>
        >(
            x => x.Key,
            x => st => SchemaNode.FromField(new CompoundField("", x.Value, false, null), st, null)
        );
        return new SchemaTreeLookup(nodeMap);
    }

    public ISchemaNode? GetSchema(string schemaId)
    {
        return schemaMap.TryGetValue(schemaId, out var makeNode) ? makeNode(this) : null;
    }
}
