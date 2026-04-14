using Astrolabe.FormDesigner;

namespace Astrolabe.Forms.EF;

public record FormConfig(
    bool Public,
    bool Published,
    FormLayoutMode LayoutMode,
    PageNavigationStyle NavigationStyle
);
