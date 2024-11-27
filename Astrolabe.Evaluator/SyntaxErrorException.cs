namespace Astrolabe.Evaluator;

public class SyntaxErrorException(string message, IList<SyntaxError> errors) : Exception(message)
{
    public IList<SyntaxError> Errors { get; } = errors;
}