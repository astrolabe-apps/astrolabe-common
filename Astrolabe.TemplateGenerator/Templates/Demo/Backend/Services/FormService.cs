using System.Text.Json;
using Astrolabe.JSON.Extensions;
using Astrolabe.Schemas;

namespace __ProjectName__.Services;

public class FormService
{
    private readonly IWebHostEnvironment _webHostEnvironment;
    private readonly ILogger<FormService> _logger;
    public const string FormDefDir = "ClientApp/client-common/formDefs";
    private const string ChangeFilter = FormDefDir + "/*.json";
    private HashSet<string>? _snippetIds;
    private readonly JsonSerializerOptions _jsonOptions;

    public FormService(IWebHostEnvironment webHostEnvironment, ILogger<FormService> logger)
    {
        _webHostEnvironment = webHostEnvironment;
        _logger = logger;
        var changes = webHostEnvironment.ContentRootFileProvider.Watch(ChangeFilter);
        changes.RegisterChangeCallback(_ => _snippetIds = null, null);
        _jsonOptions = new JsonSerializerOptions().AddStandardOptions();
    }

    public HashSet<string> GetSnippetIds()
    {
        return _snippetIds ??= LoadSnippets();
    }

    private HashSet<string> LoadSnippets()
    {
        var snippets = new HashSet<string>();
        var dir = _webHostEnvironment.ContentRootFileProvider.GetDirectoryContents(FormDefDir);
        if (!dir.Exists)
            return snippets;
        foreach (var file in dir)
        {
            using var stream = file.CreateReadStream();
            try
            {
                var controlDef = JsonSerializer.Deserialize<FullFormDefinition>(
                    stream,
                    _jsonOptions
                );
                foreach (var controlDefControl in controlDef!.Controls)
                {
                    CollectSnippetIds(controlDefControl);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error parsing JSON for form definition file {FileName}",
                    file.Name
                );
            }
        }
        return snippets;

        void CollectSnippetIds(ControlDefinition controlDefinition)
        {
            foreach (var child in controlDefinition.Children ?? [])
            {
                CollectSnippetIds(child);
            }

            if (controlDefinition.Extensions is not { } ext)
                return;
            AddSnippetId("snippetId");
            AddSnippetId("helpId");
            AddSnippetId("helpContentId");
            return;

            void AddSnippetId(string id)
            {
                if (!ext.TryGetValue(id, out var snippetId))
                    return;
                if (
                    snippetId is JsonElement e
                    && e.GetString() is { } s
                    && !string.IsNullOrWhiteSpace(s)
                )
                {
                    snippets.Add(s);
                }
            }
        }
    }
}

public record FullFormDefinition(
    ControlDefinition[] Controls,
    SchemaField[] Fields,
    IDictionary<string, object> Config
);
