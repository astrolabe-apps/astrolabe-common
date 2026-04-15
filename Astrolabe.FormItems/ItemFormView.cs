using System.Text.Json;

namespace Astrolabe.FormItems;

public record ItemFormView(
    JsonElement ItemData,
    IList<string> ItemActions
);