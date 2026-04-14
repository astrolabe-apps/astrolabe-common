using System.Text.Json;
using Astrolabe.FormDesigner;

namespace Astrolabe.FormItems;

public record ItemFormView(
    JsonElement ItemData,
    IList<string> ItemActions,
    IEnumerable<object> Controls,
    string SchemaName,
    IDictionary<string, IEnumerable<object>> Schemas,
    FormLayoutMode LayoutMode,
    PageNavigationStyle NavigationStyle
);