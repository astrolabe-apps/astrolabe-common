using Astrolabe.FormDesigner;

namespace Astrolabe.Forms;

public record FormConfig(
    bool Public,
    bool Published,
    FormLayoutMode LayoutMode,
    PageNavigationStyle NavigationStyle
);
