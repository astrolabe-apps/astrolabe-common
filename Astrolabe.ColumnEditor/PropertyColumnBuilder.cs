using System.Linq.Expressions;

namespace Astrolabe.ColumnEditor;

public record PropertyColumnBuilder<TEdit, TDb, T, T2>(
    string Property,
    Expression<Func<TEdit, T>> EditValueExpression,
    Expression<Func<TDb, T2>> GetDbExpression,
    Func<TEdit, ColumnContext<TDb>, Task<ColumnContext<TDb>>> Edit
) : ColumnEditorBuilder<TEdit, TDb, T, T2>
{
    private Expression<Func<TDb, object?>>? _getDbValueExpression;
    private Func<TDb, T2>? _getDbValue;

    public Expression EditGetterExpression => EditValueExpression;
    public Func<ColumnContext<TDb>, object?> GetDbValueObject => ctx => GetDbValue(ctx);

    public Expression<Func<TDb, object?>> GetDbValueExpression =>
        _getDbValueExpression ??= Expression.Lambda<Func<TDb, object?>>(
            Expression.Convert(GetDbExpression.Body, typeof(object)),
            GetDbExpression.Parameters
        );

    public IOrderedQueryable<TDb> AddSort(IQueryable<TDb> query, bool desc) =>
        desc ? query.OrderByDescending(GetDbExpression) : query.OrderBy(GetDbExpression);

    public IOrderedQueryable<TDb> AddExtraSort(IOrderedQueryable<TDb> query, bool desc) =>
        desc ? query.ThenByDescending(GetDbExpression) : query.ThenBy(GetDbExpression);

    public Type DbValueType => typeof(T2);

    public Dictionary<string, object> Attributes { get; } = new();

    public Func<ColumnContext<TDb>, T2> GetDbValue =>
        ctx => (_getDbValue ??= GetDbExpression.Compile())(ctx.Entity);
}
