using System.Text.RegularExpressions;
using Astrolabe.Schemas.PDF.utils;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace Astrolabe.Schemas.PDF;

public static partial class PdfLayoutParser
{
    public static IContainer RunLayoutParser(this IContainer container, string[] classNames)
    {
        return container
            .TryParseWidth(classNames)
            .TryParseBackground(classNames)
            .TryParsePadding(classNames);
    }

    #region Width

    private record WidthGroup(float? Width, float? MinWidth, float? MaxWidth);

    [GeneratedRegex(@"^(min-|max-|)w-(\d+(\.\d+)?)$", RegexOptions.Compiled)]
    private static partial Regex WidthRegex();

    private static readonly Regex _widthRegex = WidthRegex();

    [GeneratedRegex(@"^(min-|max-|)w-\[(\d+(\.\d+)?)px\]$", RegexOptions.Compiled)]
    private static partial Regex ArbitraryWidthRegex();

    private static readonly Regex _arbitraryWidthRegex = ArbitraryWidthRegex();

    private static IContainer TryParseWidth(this IContainer container, string[] classNames)
    {
        if (classNames.Contains("w-fit"))
        {
            return container.ShrinkHorizontal();
        }

        var classNameList = classNames
            .Where(c => _widthRegex.IsMatch(c) || _arbitraryWidthRegex.IsMatch(c))
            .ToList();

        return classNameList.Count == 0 ? container : container.AddWidthRange(classNameList);
    }

    private static WidthGroup GetWidthGroup(List<string> classNames)
    {
        float? minWidth = null;
        float? maxWidth = null;
        float? width = null;

        foreach (var className in classNames)
        {
            var regex = _widthRegex.IsMatch(className)
                ? _widthRegex
                : _arbitraryWidthRegex.IsMatch(className)
                    ? _arbitraryWidthRegex
                    : null;

            if (regex == null)
                continue;

            var match = regex.Match(className);
            if (!match.Success)
                continue;

            var type = match.Groups[1].Value;
            var w = float.TryParse(match.Groups[2].Value, out var widthValue)
                ? widthValue * (regex == _arbitraryWidthRegex ? 1 : 4)
                : 0f;

            switch (type)
            {
                case "":
                    width = Math.Max(width ?? 0, w);
                    break;
                case "min-":
                    minWidth = Math.Max(minWidth ?? 0, w);
                    break;
                case "max-":
                    maxWidth = Math.Max(maxWidth ?? 0, w);
                    break;
            }
        }

        return new WidthGroup(width, minWidth, maxWidth);
    }

    private static IContainer AddWidthRange(this IContainer container, List<string> classNames)
    {
        var (width, minWidth, maxWidth) = GetWidthGroup(classNames);

        if (width != null && minWidth != null && maxWidth != null)
        {
            var finalWidth = (float)width;

            if (minWidth > maxWidth || width < minWidth)
            {
                finalWidth = (float)minWidth;
            }
            else if (width > maxWidth)
            {
                finalWidth = (float)maxWidth;
            }

            container = container.Width(finalWidth);
        }
        else if (minWidth != null && width != null)
        {
            container = container.Width(Math.Max((float)width, (float)minWidth));
        }
        else if (width != null && maxWidth != null)
        {
            container = container.Width(Math.Min((float)maxWidth, (float)width));
        }
        else if (minWidth != null && maxWidth != null)
        {
            container =
                minWidth < maxWidth
                    ? container.MinWidth((float)minWidth).MaxWidth((float)maxWidth)
                    : container.Width((float)minWidth);
        }
        else if (maxWidth != null)
        {
            container = container.MaxWidth((float)maxWidth);
        }
        else if (minWidth != null)
        {
            container = container.MinWidth((float)minWidth);
        }
        else if (width != null)
        {
            container = container.Width((float)width);
        }

        return container;
    }

    #endregion


    #region Padding

    private record Padding(float Left, float Top, float Right, float Bottom);

    [GeneratedRegex(@"^p(x|y|t|b|r|l)?-(\d+(\.\d+)?)$", RegexOptions.Compiled)]
    private static partial Regex PaddingRegex();

    private static readonly Regex _paddingRegex = PaddingRegex();

    [GeneratedRegex(@"^p(x|y|t|b|r|l)?-\[(\d+(\.\d+)?)px\]$", RegexOptions.Compiled)]
    private static partial Regex ArbitraryPaddingRegex();

    private static readonly Regex _arbitraryPaddingRegex = ArbitraryPaddingRegex();

    private static IContainer TryParsePadding(this IContainer container, string[] classNames)
    {
        var basePadding = container.Padding(0);
        var paddingClassNames = classNames
            .Where(c => _paddingRegex.IsMatch(c) || _arbitraryPaddingRegex.IsMatch(c))
            .ToList();

        if (paddingClassNames.Count == 0)
            return basePadding;

        var (left, top, right, bottom) = SumPadding(paddingClassNames);
        return basePadding
            .PaddingTop(top)
            .PaddingRight(right)
            .PaddingBottom(bottom)
            .PaddingLeft(left);
    }

    private static Padding SumPadding(List<string> classNames)
    {
        var padding = new Padding(0, 0, 0, 0);

        foreach (var className in classNames)
        {
            var regex = _paddingRegex.IsMatch(className)
                ? _paddingRegex
                : _arbitraryPaddingRegex.IsMatch(className)
                    ? _arbitraryPaddingRegex
                    : null;

            if (regex == null)
                continue;

            var match = regex.Match(className);
            if (!match.Success)
                continue;

            var side = match.Groups[1].Value;
            var p = float.TryParse(match.Groups[2].Value, out var paddingValue)
                ? paddingValue * (regex == _arbitraryPaddingRegex ? 1 : 4)
                : 0f;

            padding = side switch
            {
                ""
                    => new Padding(
                        Top: Math.Max(padding.Top, p),
                        Right: Math.Max(padding.Right, p),
                        Bottom: Math.Max(padding.Bottom, p),
                        Left: Math.Max(padding.Left, p)
                    ),
                "x"
                    => padding with
                    {
                        Right = Math.Max(padding.Right, p),
                        Left = Math.Max(padding.Left, p)
                    },
                "y"
                    => padding with
                    {
                        Top = Math.Max(padding.Top, p),
                        Bottom = Math.Max(padding.Bottom, p)
                    },
                "t" => padding with { Top = Math.Max(padding.Top, p) },
                "b" => padding with { Bottom = Math.Max(padding.Bottom, p) },
                "l" => padding with { Left = Math.Max(padding.Left, p) },
                "r" => padding with { Right = Math.Max(padding.Right, p) },
                _ => padding
            };
        }

        return padding;
    }

    #endregion

    #region Background

    [GeneratedRegex(
        @"bg-\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\]",
        RegexOptions.Compiled
    )]
    private static partial Regex BackgroundArbitraryColourRegex();

    private static readonly Regex _backgroundArbitraryColourRegex =
        BackgroundArbitraryColourRegex();

    private static IContainer TryParseBackground(this IContainer container, string[] classNames)
    {
        var className = classNames.LastOrDefault(c => _backgroundArbitraryColourRegex.IsMatch(c));

        if (string.IsNullOrWhiteSpace(className))
            return container;

        var match = _backgroundArbitraryColourRegex.Match(className);

        var hex = match.Success ? ColourUtils.ConvertHtmlHexToPdfHex(match.Groups[1].Value) : null;
        return hex != null ? container.Background(Color.FromHex(hex)) : container;
    }

    #endregion
}
