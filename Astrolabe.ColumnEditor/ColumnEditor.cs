using System.Linq.Expressions;

namespace Astrolabe.ColumnEditor;

public interface ColumnEditor<TEdit, TDb> : ColumnDbExtractor<TDb>
{
    public Dictionary<string, object> Attributes { get; }
    public Func<TEdit, ColumnContext<TDb>, Task<ColumnContext<TDb>>> Edit { get; }

    Expression? EditGetterExpression { get; }
}
