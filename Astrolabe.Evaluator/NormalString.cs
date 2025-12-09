using System.Globalization;
using System.Text;
using Astrolabe.Common;

namespace Astrolabe.Evaluator;

public static class NormalString
{
    public static string ToNormalString(this EvalExpr evalExpr)
    {
        return evalExpr switch
        {
            ArrayExpr arrayExpr => "["
                + string.Concat(arrayExpr.Values.SelectMany(x => new []{",", x.ToNormalString()}))
                + "]",
            CallExpr callExpr =>
                $"({Escape(callExpr.Function, CommaArg)}{string.Concat(callExpr.Args.SelectMany(x => new[] { ",", x.ToNormalString() }))})",
            ValueExpr valueExpr => valueExpr.ToNormalString(),
            PropertyExpr pExpr => $"'{Escape(pExpr.Property, Single)}'",
            VarExpr varExpr => $"${Escape(varExpr.Name, Dollar)}$",
            LambdaExpr lambdaExpr =>
                $"\\{Escape(lambdaExpr.Variable, Commas)},{lambdaExpr.Value.ToNormalString()}",
            LetExpr letExpr =>
                $"={string.Concat(letExpr.Vars.Select(x => 
                $",{Escape(x.Item1.Name, Commas)},{x.Item2.ToNormalString()}"))}={letExpr.In.ToNormalString()}",
            _ => throw new ArgumentOutOfRangeException(nameof(evalExpr)),
        };
    }

    private static string Escape(string s, EscapeChars escapeChars)
    {
        return EscapeUtils.EscapeString(s, '\\', escapeChars.Replacements);
    }

    private static string ToNormalString(this ValueExpr evalExpr)
    {
        return evalExpr.Value switch
        {
            null => "n",
            string s => $"\"{Escape(s, Quote)}\"",
            bool b => b ? "t" : "f",
            int i => i.ToString(),
            long l => l.ToString(),
            double d => "d"+d.ToString(CultureInfo.InvariantCulture),
            decimal d => "d"+((double)d).ToString(CultureInfo.InvariantCulture),
            short s => s.ToString(),
            ArrayValue av => "[" + string.Concat(av.Values.SelectMany(x => new[] { ",", x.ToNormalString() })) + "]",
            ObjectValue ov => "(object" + string.Concat(ov.Properties.SelectMany(kv =>
                new[] { ",", new ValueExpr(kv.Key).ToNormalString(), ",", kv.Value.ToNormalString() })) + ")",
            _ => throw new ArgumentOutOfRangeException(nameof(evalExpr)),
        };
    }

    private static EscapeChars Commas = MakeEscape(new() { { ',', 'c' } });
    private static EscapeChars CommaArg = MakeEscape(new() { { ',', 'c' }, {')', 'b'} });
    private static EscapeChars CommaLet = MakeEscape(new() { { ',', 'c' } });
    private static EscapeChars Quote = MakeEscape(new() { { '"', 'q' } });
    private static EscapeChars Single = MakeEscape(new() { { '\'', 's' } });
    private static EscapeChars Dollar = MakeEscape(new() { { '$', 'd' } });
    private static char[] NumberChars = "0123456789.-E+".ToCharArray();

    private static EscapeChars MakeEscape(Dictionary<char, char> escapes)
    {
        var stops = escapes.Keys.ToList();
        return new EscapeChars(escapes, escapes.ToDictionary(x => x.Value, x => x.Key), stops.ToArray());
    }

    delegate ParseResult<T> ParseFunc<T>(ReadOnlySpan<char> source);

    internal delegate T2 RunFunc<in T, out T2>(ReadOnlySpan<char> source, T value);

    public static ParseResult<EvalExpr> Parse(ReadOnlySpan<char> source)
    {
        if (source.Length == 0)
            throw new ArgumentException($"'{nameof(source)}' cannot be empty", nameof(source));
        var ch = source[0];
        var next = source[1..];
        return ch switch
        {
            '\"' => Unescape(next, Quote).Map(EvalExpr (x) => ValueExpr.From(x)),
            '='
                when ParseWhile(next, ParseAssignment)
                    is { Remaining: var rem, Result: var result } => Parse(rem)
                .Map(
                    EvalExpr (i) =>
                        new LetExpr(result.Select(x => (new VarExpr(x.Item1), x.Item2)), i)
                ),
            '[' => ParseWhile(next, Parse).Map(EvalExpr (i) => new ArrayExpr(i)),
            '\'' => Unescape(next, Single).Map(EvalExpr (x) => new PropertyExpr(x)),
            '\\' when Unescape(next, Commas) is {Result:{} v, 
                Remaining: var next2} => Parse(next2).Map(EvalExpr (x) => new LambdaExpr(v, x)),
            '('
                when Unescape(next, CommaArg, true)
                    is { Result: var funcName, Remaining: var next2 } => ParseWhile(next2, Parse)
                .Map(EvalExpr (r) => new CallExpr(funcName, r.ToList())),
            '-' or >= '0' and <= '9' => ParseNum(source, false),
            'd' => ParseNum(next, true),
            '$' => Unescape(next, Dollar).Map(EvalExpr (s) => new VarExpr(s)),
            't' => new ParseResult<EvalExpr>(next, ValueExpr.True),
            'f' => new ParseResult<EvalExpr>(next, ValueExpr.False),
            'n' => new ParseResult<EvalExpr>(next, ValueExpr.Null),
            _ => throw new ArgumentOutOfRangeException(nameof(ch)),
        };
    }

    private static ParseResult<EvalExpr> ParseNum(ReadOnlySpan<char> source, bool fp)
    {
        var numberEnd = source.IndexOfAnyExcept(NumberChars);
        if (numberEnd == -1)
            numberEnd = source.Length;
        var numSpan = source[..numberEnd];
        object result = !fp ? long.Parse(numSpan) : double.Parse(numSpan);
        return new ParseResult<EvalExpr>(source[numberEnd..], new ValueExpr(result));
    }

    private static ParseResult<(string, EvalExpr)> ParseAssignment(ReadOnlySpan<char> source)
    {
        var nameResult = Unescape(source, CommaLet);
        var varName = nameResult.Result;
        return Parse(nameResult.Remaining).Map(x => (varName, x));
    }

    private static ParseResult<IEnumerable<T>> ParseWhile<T>(
        ReadOnlySpan<char> source,
        ParseFunc<T> single
    )
    {
        var elems = new List<T>();
        while (source[0] == ',')
        {
            var next = single(source[1..]);
            elems.Add(next.Result);
            source = next.Remaining;
        }
        return new ParseResult<IEnumerable<T>>(source[1..], elems);
    }

    public static ParseResult<string> Unescape(
        ReadOnlySpan<char> source,
        EscapeChars escapes,
        bool dontConsume = false
    )
    {
        var endIndex = source.IndexOfAny(escapes.Stops);
        if (endIndex == -1)
            endIndex = source.Length;
        var replacements = escapes.Reverse;
        const char escapeChar = '\\';
        var stringBuilder = new StringBuilder(endIndex);
        var prvEscape = false;
        var offset = 0;
        while (offset < endIndex)
        {
            var ch = source[offset++];
            var isEscape = ch == escapeChar;
            if (prvEscape)
            {
                stringBuilder.Append(isEscape ? ch : replacements[ch]);
                prvEscape = false;
            }
            else if (isEscape)
                prvEscape = true;
            else
                stringBuilder.Append(ch);
        }
        return new ParseResult<string>(
            source[(dontConsume ? endIndex : endIndex + 1)..],
            stringBuilder.ToString()
        );
    }
}

public readonly ref struct ParseResult<T>(ReadOnlySpan<char> Remaining, T Result)
{
    public ReadOnlySpan<char> Remaining { get; } = Remaining;
    public T Result { get; } = Result;

    public ParseResult<T2> Map<T2>(Func<T, T2> func)
    {
        return new ParseResult<T2>(Remaining, func(Result));
    }
}

public readonly struct EscapeChars(IDictionary<char, char> Replacements, IDictionary<char, char> Reverse, char[] Stops)
{
    public IDictionary<char, char> Reverse { get; } = Reverse;
    public IDictionary<char, char> Replacements { get; } = Replacements;
    public char[] Stops { get; } = Stops;
}
