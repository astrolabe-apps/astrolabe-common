using System.Text.RegularExpressions;
using QuestPDF.Fluent;

namespace Astrolabe.Schemas.PDF;

public static partial class PdfGapParser
{
    // [GeneratedRegex(@"^gap-(x-|)(\d+(\.\d+)?)$", RegexOptions.Compiled)]
    // private static partial Regex RowGapRegex();
    //
    // private static readonly Regex _rowGapRegex = RowGapRegex();
    //
    // [GeneratedRegex(@"^gap-(x-|)\[(\d+(\.\d+)?)px\]$", RegexOptions.Compiled)]
    // private static partial Regex ArbitraryRowGapRegex();
    //
    // private static readonly Regex _arbitraryRowGapRegex = ArbitraryRowGapRegex();

    [GeneratedRegex(@"^gap-(y-|)(\d+(\.\d+)?)$", RegexOptions.Compiled)]
    private static partial Regex ColumnGapRegex();

    private static readonly Regex _columnGapRegex = ColumnGapRegex();

    [GeneratedRegex(@"^gap-(y-|)\[(\d+(\.\d+)?)px\]$", RegexOptions.Compiled)]
    private static partial Regex ArbitraryColumnGapRegex();

    private static readonly Regex _arbitraryColumnGapRegex = ArbitraryColumnGapRegex();

    // public static void TryConfigRowGap(this RowDescriptor row, string[] gapClassNames)
    // {
    //     if (gapClassNames.Length == 0)
    //         return;
    //
    //     var classNames = gapClassNames
    //         .Where(c => _rowGapRegex.IsMatch(c) || _arbitraryRowGapRegex.IsMatch(c))
    //         .ToList();
    //
    //     if (classNames.Count == 0)
    //         return;
    //
    //     var gap = GetRowGap(classNames);
    //     row.Spacing(gap);
    // }
    //
    // private static float GetRowGap(List<string> classNames)
    // {
    //     var gap = 0f;
    //
    //     foreach (var className in classNames)
    //     {
    //         var regex = _rowGapRegex.IsMatch(className)
    //             ? _rowGapRegex
    //             : _arbitraryRowGapRegex.IsMatch(className)
    //                 ? _arbitraryRowGapRegex
    //                 : null;
    //
    //         if (regex == null)
    //             continue;
    //
    //         var match = regex.Match(className);
    //         if (!match.Success)
    //             continue;
    //
    //         var gapValue = float.TryParse(match.Groups[2].Value, out var g)
    //             ? g * (regex == _arbitraryRowGapRegex ? 1 : 4)
    //             : 0f;
    //
    //         gap = Math.Max(gapValue, gap);
    //     }
    //
    //     return gap;
    // }

    public static void TryConfigColumnGap(this ColumnDescriptor column, string[] gapClassNames)
    {
        if (gapClassNames.Length == 0)
            return;

        var classNames = gapClassNames
            .Where(c => _columnGapRegex.IsMatch(c) || _arbitraryColumnGapRegex.IsMatch(c))
            .ToList();

        if (classNames.Count == 0)
            return;

        var gap = GetColumnGap(classNames);
        column.Spacing(gap);
    }

    private static float GetColumnGap(List<string> classNames)
    {
        var gap = 0f;

        foreach (var className in classNames)
        {
            var regex = _columnGapRegex.IsMatch(className)
                ? _columnGapRegex
                : _arbitraryColumnGapRegex.IsMatch(className)
                    ? _arbitraryColumnGapRegex
                    : null;

            if (regex == null)
                continue;

            var match = regex.Match(className);
            if (!match.Success)
                continue;

            var gapValue = float.TryParse(match.Groups[2].Value, out var g)
                ? g * (regex == _arbitraryColumnGapRegex ? 1 : 4)
                : 0f;

            gap = Math.Max(gapValue, gap);
        }

        return gap;
    }
}
