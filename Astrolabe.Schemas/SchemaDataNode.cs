using System.Text.Json.Nodes;
using Astrolabe.JSON;

namespace Astrolabe.Schemas;

public record SchemaDataNode(
    ISchemaNode Schema,
    JsonNode? Data,
    SchemaDataNode? Parent,
    int? ElementIndex = null
);

public static class SchemaDataNodeExtensions
{
    public static SchemaDataNode WithData(this ISchemaNode schema, JsonNode? data)
    {
        return new SchemaDataNode(schema, data, null);
    }

    public static int ElementCount(this SchemaDataNode dataNode)
    {
        return dataNode.Data switch
        {
            JsonArray ja => ja.Count,
            _ => 0
        };
    }

    public static SchemaDataNode? GetChildElement(this SchemaDataNode dataNode, int element)
    {
        return dataNode.Data switch
        {
            JsonArray jsonArray when element < jsonArray.Count
                => new SchemaDataNode(dataNode.Schema, jsonArray[element], dataNode, element),
            _ => null
        };
    }

    public static SchemaDataNode? GetChild(this SchemaDataNode dataNode, ISchemaNode schemaNode)
    {
        return dataNode.Data switch
        {
            JsonObject jsonObject
                => jsonObject.TryGetPropertyValue(schemaNode.Field.Field, out var childField)
                    ? new SchemaDataNode(schemaNode, childField, dataNode)
                    : null,
            _ => null
        };
    }

    public static SchemaDataNode? GetChildForFieldRef(this SchemaDataNode dataNode, string fieldRef)
    {
        return GetChildForFieldPath(dataNode, fieldRef.Split("/"));
    }

    public static SchemaDataNode? GetChildForFieldPath(
        this SchemaDataNode dataNode,
        IEnumerable<string> fieldPath
    )
    {
        return dataNode.Schema.TraverseSchemaPath<SchemaDataNode?>(
            fieldPath,
            dataNode,
            (a, n) => a?.GetChild(n)
        );
    }
}

// export interface SchemaTreeLookup<A = string> {
//     getSchema(schemaId: A): SchemaNode | undefined;
// }
//
// export interface SchemaNode extends SchemaTreeLookup {
// field: SchemaField;
// getChildNode(field: string): SchemaNode | undefined;
// getChildNodes(withParent?: SchemaNode): SchemaNode[];
// parent?: SchemaNode;
// }
//
// export interface SchemaDataNode {
//     schema: SchemaNode;
//     elementIndex?: number;
//     control?: Control<unknown>;
//     parent?: SchemaDataNode;
//     getChild(node: SchemaNode): SchemaDataNode;
//     getChildElement(index: number): SchemaDataNode;
// }
