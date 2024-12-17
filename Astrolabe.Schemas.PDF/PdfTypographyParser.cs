using System.Text.RegularExpressions;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using static Astrolabe.Schemas.PDF.common.Typography;
using static Astrolabe.Schemas.PDF.utils.ColourUtils;

namespace Astrolabe.Schemas.PDF;

public static partial class PdfTypographyParser
{
    public static void RunTypographyParser<T>(this T descriptor, string className)
        where T : TextSpanDescriptor
    {
        descriptor
            .TryParseFontSize(className)
            .TryParseFontStyle(className)
            .TryParseTextStyle(className)
            .TryParseFontColor(className);
    }

    #region Alignment

    private static readonly HashSet<string> ValidAlignment =
    [
        "text-left",
        "text-center",
        "text-right",
        "text-justify",
        "text-start",
        "text-end"
    ];

    public static void TryParseTextAlign(this TextDescriptor descriptor, string[] classNames)
    {
        var className = classNames.LastOrDefault(x => ValidAlignment.Contains(x));

        switch (className)
        {
            case "text-left":
                descriptor.AlignLeft();
                break;
            case "text-center":
                descriptor.AlignCenter();
                break;
            case "text-right":
                descriptor.AlignRight();
                break;
            case "text-justify":
                descriptor.Justify();
                break;
            case "text-start":
                descriptor.AlignStart();
                break;
            case "text-end":
                descriptor.AlignEnd();
                break;
        }
    }

    #endregion

    #region Font Size

    private static readonly HashSet<string> ValidFontSizes =
    [
        "text-xs",
        "text-sm",
        "text-base",
        "text-lg",
        "text-xl",
        "text-2xl",
        "text-3xl",
        "text-4xl",
        "text-5xl",
        "text-6xl",
        "text-7xl",
        "text-8xl",
        "text-9xl"
    ];

    [GeneratedRegex(@"text-\[(\d+)px\]", RegexOptions.Compiled)]
    private static partial Regex FontArbitrarySizeRegex();

    private static readonly Regex _fontArbitrarySizeRegex = FontArbitrarySizeRegex();

    private static T ArbitraryFontSize<T>(this T descriptor, string fontSize)
        where T : TextSpanDescriptor
    {
        var match = _fontArbitrarySizeRegex.Match(fontSize);

        return match.Success && float.TryParse(match.Groups[1].Value, out var size)
            ? descriptor.FontSize(size)
            : descriptor;
    }

    private static T FontSizeDescriptor<T>(this T descriptor, string fontSize, bool arbitrary)
        where T : TextSpanDescriptor
    {
        return fontSize switch
        {
            "text-xs" => descriptor.Style(TextXs),
            "text-sm" => descriptor.Style(TextSm),
            "text-base" => descriptor.Style(TextBase),
            "text-lg" => descriptor.Style(TextLg),
            "text-xl" => descriptor.Style(TextXl),
            "text-2xl" => descriptor.Style(Text2Xl),
            "text-3xl" => descriptor.Style(Text3Xl),
            "text-4xl" => descriptor.Style(Text4Xl),
            "text-5xl" => descriptor.Style(Text5Xl),
            "text-6xl" => descriptor.Style(Text6Xl),
            "text-7xl" => descriptor.Style(Text7Xl),
            "text-8xl" => descriptor.Style(Text8Xl),
            "text-9xl" => descriptor.Style(Text9Xl),
            _ when arbitrary => descriptor.ArbitraryFontSize(fontSize).LineHeight(1.5f),
            _ => descriptor.Style(TextXs)
        };
    }

    private static T TryParseFontSize<T>(this T descriptor, string className)
        where T : TextSpanDescriptor
    {
        return className switch
        {
            _ when ValidFontSizes.Contains(className)
                => descriptor.FontSizeDescriptor(className, false),
            _ when _fontArbitrarySizeRegex.IsMatch(className)
                => descriptor.FontSizeDescriptor(className, true),
            _ => descriptor
        };
    }

    #endregion

    #region Font Style

    private static readonly HashSet<string> ValidFontStyles =
    [
        "font-thin",
        "font-extralight",
        "font-light",
        "font-normal",
        "font-medium",
        "font-semibold",
        "font-bold",
        "font-extrabold",
        "font-black",
        "font-extrablack",
        "italic",
        "not-italic"
    ];

    private static T FontDescriptor<T>(this T descriptor, string fontStyle)
        where T : TextSpanDescriptor
    {
        return fontStyle switch
        {
            "font-thin" => descriptor.Style(FontThin),
            "font-extralight" => descriptor.Style(FontExtraLight),
            "font-light" => descriptor.Style(FontLight),
            "font-normal" => descriptor.Style(FontNormal),
            "font-medium" => descriptor.Style(FontMedium),
            "font-semibold" => descriptor.Style(FontSemiBold),
            "font-bold" => descriptor.Style(FontBold),
            "font-extrabold" => descriptor.Style(FontExtraBold),
            "font-black" => descriptor.Style(FontBlack),
            "font-extrablack" => descriptor.Style(FontExtraBlack),
            "italic" => descriptor.Style(Italic),
            "not-italic" => descriptor.Style(NotItalic),
            _ => descriptor
        };
    }

    private static T TryParseFontStyle<T>(this T descriptor, string className)
        where T : TextSpanDescriptor
    {
        return ValidFontStyles.Contains(className)
            ? FontDescriptor(descriptor, className)
            : descriptor;
    }

    #endregion

    #region Text Style

    private static readonly HashSet<string> ValidTextStyles =
    [
        "underline",
        "overline",
        "line-through",
        "no-underline",
        "decoration-solid",
        "decoration-double",
        "decoration-dotted",
        "decoration-dashed",
        "decoration-wavy"
    ];

    private static T TextDescriptor<T>(this T descriptor, string fontStyle)
        where T : TextSpanDescriptor
    {
        return fontStyle switch
        {
            "underline" => descriptor.Style(Underline),
            "overline" => descriptor.Style(Overline),
            "line-through" => descriptor.Style(LineThrough),
            "no-underline" => descriptor.Style(NoUnderline),
            "decoration-solid" => descriptor.Style(DecorationSolid),
            "decoration-double" => descriptor.Style(DecorationDouble),
            "decoration-dotted" => descriptor.Style(DecorationDotted),
            "decoration-dashed" => descriptor.Style(DecorationDashed),
            "decoration-wavy" => descriptor.Style(DecorationWavy),
            _ => descriptor
        };
    }

    private static T TryParseTextStyle<T>(this T descriptor, string className)
        where T : TextSpanDescriptor
    {
        return ValidTextStyles.Contains(className)
            ? TextDescriptor(descriptor, className)
            : descriptor;
    }

    #endregion

    #region Font Colour

    [GeneratedRegex(
        @"text-\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\]",
        RegexOptions.Compiled
    )]
    private static partial Regex FontArbitraryColourRegex();

    private static readonly Regex _fontArbitraryColourRegex = FontArbitraryColourRegex();

    private static T FontColorDescriptor<T>(this T descriptor, string fontColor)
        where T : TextSpanDescriptor
    {
        var match = _fontArbitraryColourRegex.Match(fontColor);

        var hex = match.Success ? ConvertHtmlHexToPdfHex(match.Groups[1].Value) : null;
        return hex != null ? descriptor.FontColor(Color.FromHex(hex)) : descriptor;
    }

    private static T TryParseFontColor<T>(this T descriptor, string className)
        where T : TextSpanDescriptor
    {
        return className switch
        {
            _ when _fontArbitraryColourRegex.IsMatch(className)
                => descriptor.FontColorDescriptor(className),
            _ => descriptor
        };
    }

    #endregion
}
