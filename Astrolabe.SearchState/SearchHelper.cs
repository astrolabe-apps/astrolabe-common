using System.Collections;
using System.Linq.Expressions;
using System.Reflection;

namespace Astrolabe.SearchState;

public delegate IQueryable<T> QuerySorter<T>(IEnumerable<string>? sorts, IQueryable<T> query);
public delegate IQueryable<T> QueryFilterer<T>(
    IDictionary<string, IEnumerable<string>>? filters,
    IQueryable<T> query
);

public record SearchMember(MemberInfo Member, Func<string, object>? Convert);

public static class SearchHelper
{
    public static Func<string, SearchMember?> CreatePropertyMemberLookup<T>()
    {
        var t = typeof(T);
        var props = t.GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .ToDictionary(x => x.Name.ToLower());
        return field =>
        {
            var member = props.GetValueOrDefault(field.ToLower());
            if (member == null)
                return null;
            Func<string, object>? convert = member.PropertyType.IsEnum
                ? s => Enum.Parse(member.PropertyType, s)
                : null;
            return new SearchMember(member, convert);
        };
    }

    public static Func<string, Expression<Func<T, object>>?> CreatePropertyGetterLookup<T>()
    {
        var lookup = CreatePropertyMemberLookup<T>();
        var t = typeof(T);
        var param = Expression.Parameter(t);
        return field =>
        {
            var member = lookup(field);
            if (member != null)
            {
                return Expression.Lambda<Func<T, object>>(
                    Expression.Convert(
                        Expression.MakeMemberAccess(param, member.Member),
                        typeof(object)
                    ),
                    param
                );
            }
            return null;
        };
    }

    public static QuerySorter<T> MakeSorter<T>()
    {
        return MakeSorter(CreatePropertyGetterLookup<T>());
    }

    public static QueryFilterer<T> MakeFilterer<T>()
    {
        return MakeFilterer<T>(CreatePropertyMemberLookup<T>());
    }

    private static readonly MethodInfo ContainsMethod = typeof(IList).GetMethod("Contains")!;

    public static QueryFilterer<T> MakeFilterer<T>(Func<string, SearchMember?> getFilterProperty)
    {
        var param = Expression.Parameter(typeof(T));
        return (filters, query) =>
        {
            if (filters == null)
                return query;
            foreach (var filterField in filters)
            {
                var vals = filterField.Value.ToList();
                if (vals.Count == 0)
                    continue;
                var ff = getFilterProperty(filterField.Key);
                if (ff == null)
                    continue;
                var realVals = (ff.Convert != null ? vals.Select(ff.Convert) : vals).ToList();
                query = query.Where(
                    Expression.Lambda<Func<T, bool>>(
                        Expression.Call(
                            Expression.Constant(realVals),
                            ContainsMethod,
                            Expression.Convert(
                                Expression.MakeMemberAccess(param, ff.Member),
                                typeof(object)
                            )
                        ),
                        param
                    )
                );
            }
            return query;
        };
    }

    public static QuerySorter<T> MakeSorter<T>(
        Func<string, Expression<Func<T, object>>?> getSortField
    )
    {
        return (sorts, query) =>
        {
            if (sorts == null)
                return query;
            IOrderedQueryable<T>? orderedQueryable = null;
            foreach (var (desc, getter) in sorts.Select(x => (x[0] == 'd', getSortField(x[1..]))))
            {
                if (getter == null)
                    continue;
                if (orderedQueryable != null)
                {
                    orderedQueryable = desc
                        ? orderedQueryable.ThenByDescending(getter)
                        : orderedQueryable.ThenBy(getter);
                }
                else
                {
                    orderedQueryable = desc
                        ? query.OrderByDescending(getter)
                        : query.OrderBy(getter);
                }
            }

            return orderedQueryable ?? query;
        };
    }
}
