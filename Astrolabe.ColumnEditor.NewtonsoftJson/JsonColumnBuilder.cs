using System.Linq.Expressions;

namespace Astrolabe.ColumnEditor.NewtonsoftJson;

public record JsonColumnBuilder<TEdit, TDb, T, T2>(
    string Property,
    Func<ColumnContext<TDb>, T2> GetDbValue,
    Expression<Func<TDb, object?>> GetDbValueExpression,
    Type DbValueType,
    Action<ColumnContext<TDb>, T> SetDbValue,
    Func<TEdit, ColumnContext<TDb>, Task<ColumnContext<TDb>>> Edit
) : ColumnEditorBuilder<TEdit, TDb, T, T2>
{
    public Func<ColumnContext<TDb>, object?> GetDbValueObject => (ctx) => GetDbValue(ctx);

    public Dictionary<string, object> Attributes { get; } = new();
    public Expression? EditGetterExpression => null;

    public IOrderedQueryable<TDb> AddSort(IQueryable<TDb> query, bool desc) =>
        desc ? query.OrderByDescending(GetDbValueExpression) : query.OrderBy(GetDbValueExpression);

    public IOrderedQueryable<TDb> AddExtraSort(IOrderedQueryable<TDb> query, bool desc) =>
        desc ? query.ThenByDescending(GetDbValueExpression) : query.ThenBy(GetDbValueExpression);
}
