using Antlr4.Runtime;

namespace Astrolabe.Evaluator;

public record SyntaxError(
    IToken OffendingSymbol,
    int Line,
    int CharPositionInLine,
    string Message,
    RecognitionException? Exception
);
