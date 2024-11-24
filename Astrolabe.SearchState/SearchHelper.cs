using System.Collections;
using System.Linq.Expressions;
using System.Reflection;

namespace Astrolabe.SearchState;

public delegate IQueryable<T> QuerySorter<T>(IEnumerable<string>? sorts, IQueryable<T> query);
public delegate IQueryable<T> QueryFilterer<T>(
    IDictionary<string, IEnumerable<string>>? filters,
    IQueryable<T> query
);
public delegate Task<SearchResults<T2>> Searcher<in T, T2>(
    IQueryable<T> query,
    ISearchOptions searchOptions,
    bool includeTotal
);

public delegate IQueryable<T> FieldFilter<T>(IQueryable<T> query, List<string> filterValues);

public record FilterableMember(MemberInfo Member, Func<string, object>? Convert);

public static class SearchHelper
{
    public static Func<string, FieldFilter<T>?> CreatePropertyFilterer<T>(
        Func<string, FilterableMember?>? lookupMember = null
    )
    {
        lookupMember ??= CreatePropertyMemberLookup<T>();
        var param = Expression.Parameter(typeof(T));
        return field =>
        {
            var ff = lookupMember(field);
            if (ff == null)
                return null;
            return (query, vals) =>
            {
                var realVals = (ff.Convert != null ? vals.Select(ff.Convert) : vals).ToList();
                return query.Where(
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
            };
        };
    }

    public static Func<string, FilterableMember?> CreatePropertyMemberLookup<T>()
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
            return new FilterableMember(member, convert);
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
        return MakeSorter(CreatePropertyGetterLookup<T>(), false);
    }

    public static QueryFilterer<T> MakeFilterer<T>()
    {
        return MakeFilterer(CreatePropertyFilterer<T>(), false);
    }

    private static readonly MethodInfo ContainsMethod = typeof(IList).GetMethod("Contains")!;

    public static QueryFilterer<T> MakeFilterer<T>(
        Func<string, FieldFilter<T>?> getFilterProperty,
        bool includeDefault = true
    )
    {
        if (includeDefault)
        {
            var propFilterer = CreatePropertyFilterer<T>();
            var origFilter = getFilterProperty;
            getFilterProperty = f => origFilter(f) ?? propFilterer(f);
        }
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
                query = ff(query, vals);
            }
            return query;
        };
    }

    public static QuerySorter<T> MakeSorter<T>(
        Func<string, Expression<Func<T, object>>?> getSortField,
        bool includeDefault = true
    )
    {
        if (includeDefault)
        {
            var defaultGetSort = CreatePropertyGetterLookup<T>();
            var origGetSort = getSortField;
            getSortField = f => origGetSort(f) ?? defaultGetSort(f);
        }
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

    public static Searcher<T, T2> CreateSearcher<T, T2>(
        Func<IQueryable<T>, Task<List<T2>>> select,
        Func<IQueryable<T>, Task<int>> count,
        QuerySorter<T>? sorter = null,
        QueryFilterer<T>? filterer = null,
        int maxLength = 50
    )
    {
        sorter ??= MakeSorter<T>();
        filterer ??= MakeFilterer<T>();
        return async (query, options, includeTotal) =>
        {
            var take = Math.Min(maxLength, options.Length);
            var offset = options.Offset;
            var filteredQuery = filterer(options.Filters, query);
            int? total = null;
            if (includeTotal)
            {
                total = await count(filteredQuery);
            }
            var pageResults = await select(
                sorter(options.Sort, filteredQuery).Skip(offset).Take(take)
            );
            return new SearchResults<T2>(total, pageResults);
        };
    }
}
