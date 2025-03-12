using System.Globalization;
using System.Text.Json.Nodes;
using CsvHelper;
using Jsonata.Net.Native;
using Jsonata.Net.Native.Json;
using Jsonata.Net.Native.SystemTextJson;

namespace Astrolabe.Schemas.ExportCsv;

public static class CsvWriterExtensions
{
    public static async Task CreateExportHeader(
        this CsvWriter writer,
        IEnumerable<ExportColumn> columns
    )
    {
        foreach (var (_, columnName, _) in columns)
        {
            writer.WriteField(columnName);
        }

        await writer.NextRecordAsync();
    }

    public static async Task ExportRecord(
        this CsvWriter writer,
        IEnumerable<ExportColumn> columns,
        IEnumerable<SchemaField> schemaFields,
        JsonNode? dataRow
    )
    {
        writer.WriteRecord(Traverse());
        await writer.NextRecordAsync();
        return;

        Dictionary<string, object> Traverse()
        {
            var objDict = new Dictionary<string, object>();

            foreach (var (s, cn, jsonataExpr) in columns)
            {
                var currentNode = dataRow;
                object? currentSchemaField = schemaFields;
                var fields = s.Split("/", StringSplitOptions.RemoveEmptyEntries);

                foreach (var field in fields)
                {
                    currentSchemaField = currentSchemaField switch
                    {
                        IEnumerable<SchemaField> enumerable
                            => enumerable.FirstOrDefault(x => x.Field == field),
                        CompoundField compoundField
                            => compoundField.Children.FirstOrDefault(x => x.Field == field),
                        _ => currentSchemaField
                    };

                    currentNode =
                        currentNode is JsonObject currentObject && currentObject.ContainsKey(field)
                            ? currentObject[field]
                            : null; // When formData doesn't have export column value
                }

                var mappedValue = MapValue(currentSchemaField, currentNode, jsonataExpr);

                objDict.Add(s + cn, mappedValue);
            }

            return objDict;
        }
    }

    private static string MapValue(
        object? matchedSchemaField,
        JsonNode? currentNode,
        string? jsonataExpr
    )
    {
        if (matchedSchemaField is not SimpleSchemaField schemaField)
            return "";

        return !string.IsNullOrWhiteSpace(jsonataExpr)
            ? RunJsonata(jsonataExpr, currentNode, schemaField)
            : DefaultMappedValue(currentNode, schemaField);
    }

    private static string RunJsonata(
        string expr,
        JsonNode? currentNode,
        SimpleSchemaField schemaField
    )
    {
        try
        {
            var rootNode = currentNode?.Root;
            var env = new EvaluationEnvironment();

            env.BindValue("options", JToken.FromObject(schemaField.Options?.ToList() ?? []));
            env.BindValue("value", currentNode ?? "");

            env.BindFunction(
                "capFirst",
                () => CultureInfo.CurrentCulture.TextInfo.ToTitleCase(currentNode?.ToString() ?? "")
            );

            var data = JToken.Parse((rootNode ?? "{}").ToString());

            var result = new JsonataQuery(expr).Eval(data, env);

            if (result.Type is JTokenType.Null or JTokenType.Undefined)
            {
                return "";
            }

            return result switch
            {
                JValue jv => jv.ToObject<string>(),
                JArray ja => string.Join(", ", ja.ChildrenTokens.Select(x => x.ToObject<string>())),
                _ => ""
            };
        }
        catch (Exception _)
        {
            return "";
        }
    }

    private static string DefaultMappedValue(JsonNode? currentNode, SimpleSchemaField schemaField)
    {
        if (currentNode is null)
            return "";
        try
        {
            return schemaField.Type switch
            {
                "Bool" => (bool)currentNode ? "Yes" : "No",
                "String"
                    => schemaField.Options is not null
                        ? GetArrayString(schemaField.Options, currentNode)
                        : currentNode.ToString(),
                // "Date"=> // TODO: Deal with date value
                _ => currentNode.ToString()
            };
        }
        catch (Exception _)
        {
            return "";
        }

        string GetArrayString(IEnumerable<FieldOption> options, JsonNode node)
        {
            // Multi selections
            if (node is JsonArray array)
            {
                return string.Join(
                    ", ",
                    array
                        .Select(aNode =>
                            options
                                .Where(x => x.Value.ToString() == aNode?.ToString())
                                .Select(x => x.Name)
                                .FirstOrDefault()
                        )
                        .Select(x => x ?? "")
                );
            }

            // Single selection
            return options
                    .Where(x => x.Value.ToString() == node.ToString())
                    .Select(x => x.Name)
                    .FirstOrDefault() ?? "";
        }
    }
}
