using System.Text.Json.Nodes;

namespace Astrolabe.Patch;

public record PatchColumn<TDb, TContext>(string PathName, Action<TDb, JsonNode, TContext> Action);
