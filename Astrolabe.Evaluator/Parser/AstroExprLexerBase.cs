using Antlr4.Runtime;

namespace Astrolabe.Evaluator.Parser;

public abstract class AstroExprLexerBase : Lexer
{
    private int _currentDepth = 0;
    private Stack<int> templateDepthStack = new Stack<int>();

    public AstroExprLexerBase(ICharStream input) : base(input)
    {
    }

    public AstroExprLexerBase(ICharStream input, TextWriter output, TextWriter errorOutput) : base(input, output, errorOutput)
    {
    }

    public bool IsInTemplateString()
    {
        return templateDepthStack.Count > 0 && templateDepthStack.Peek() == _currentDepth;
    }

    protected void ProcessTemplateOpenBrace() {
        _currentDepth++;
        templateDepthStack.Push(_currentDepth);
    }

    protected void ProcessTemplateCloseBrace() {
        templateDepthStack.Pop();
        _currentDepth--;
    }

    public override void Reset()
    {
        _currentDepth = 0;
        templateDepthStack.Clear();
        base.Reset();
    }
}