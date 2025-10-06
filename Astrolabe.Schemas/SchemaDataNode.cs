using System.Text.Json.Nodes;
using Astrolabe.JSON;
using Astrolabe.Controls;

namespace Astrolabe.Schemas;

public record SchemaDataNode(
    ISchemaNode Schema,
    IControl Control,
    SchemaDataNode? Parent,
    int? ElementIndex = null
);

public static class SchemaDataNodeExtensions
{
    public static SchemaDataNode WithData(this ISchemaNode schema, JsonNode? data)
    {
        var control = JsonNodeConverter.JsonNodeToControl(data);
        return new SchemaDataNode(schema, control, null);
    }

    public static int ElementCount(this SchemaDataNode dataNode)
    {
        return dataNode.Control.IsArray ? dataNode.Control.Count : 0;
    }

    public static SchemaDataNode? GetChildElement(this SchemaDataNode dataNode, int element)
    {
        if (!dataNode.Control.IsArray || element >= dataNode.Control.Count)
            return null;

        var childControl = dataNode.Control[element];
        return childControl != null
            ? new SchemaDataNode(dataNode.Schema, childControl, dataNode, element)
            : null;
    }

    public static SchemaDataNode? GetChild(this SchemaDataNode dataNode, ISchemaNode schemaNode)
    {
        if (!dataNode.Control.IsObject)
            return null;

        var childControl = dataNode.Control[schemaNode.Field.Field];
        return childControl != null
            ? new SchemaDataNode(schemaNode, childControl, dataNode)
            : null;
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
