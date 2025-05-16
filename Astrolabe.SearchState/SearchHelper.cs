using System.Collections;
using System.Linq.Expressions;
using System.Reflection;

namespace Astrolabe.SearchState;

public interface ApplyGetter<T>
{
    ApplyGetter<T> Apply<TKey>(Expression<Func<T, TKey>> sortKey);
}

public delegate IQueryable<T> QuerySorter<T>(IEnumerable<string>? sorts, IQueryable<T> query);

public delegate ApplyGetter<T>? FieldGetter<T>(string field, ApplyGetter<T> apply);
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

public class SortApplication<T>(IQueryable<T> query) : ApplyGetter<T>
{
    public IOrderedQueryable<T>? OrderedQueryable { get; private set; }
    public bool Desc { get; set; }

    public ApplyGetter<T> Apply<TKey>(Expression<Func<T, TKey>> sortKey)
    {
        if (OrderedQueryable != null)
        {
            OrderedQueryable = Desc
                ? OrderedQueryable.ThenByDescending(sortKey)
                : OrderedQueryable.ThenBy(sortKey);
        }
        else
        {
            OrderedQueryable = Desc
                ? query.OrderByDescending(sortKey)
                : query.OrderBy(sortKey);
        }
        return this;
    }
}

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

    public static FieldGetter<T> CreatePropertyGetterLookup<T>()
    {
        var lookup = CreatePropertyMemberLookup<T>();
        var t = typeof(T);
        var applyMethod = typeof(ApplyGetter<>).MakeGenericType(t).GetMethod(nameof(ApplyGetter<object>.Apply));
        var param = Expression.Parameter(t);
        return (field, apply) =>
        {
            var member = lookup(field);
            if (member != null)
            {
                var property = (PropertyInfo)member.Member;
                var withType = applyMethod!.MakeGenericMethod(property.PropertyType);
                withType.Invoke(apply, [Expression.Lambda(Expression.MakeMemberAccess(param, member.Member), param)]);
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
        FieldGetter<T> getSortField,
        bool includeDefault = true
    )
    {
        if (includeDefault)
        {
            var defaultGetSort = CreatePropertyGetterLookup<T>();
            var origGetSort = getSortField;
            getSortField = (f,a) => origGetSort(f, a) ?? defaultGetSort(f, a);
        }
        return (sorts, query) =>
        {
            if (sorts == null)
                return query;
            var sortApplier = new SortApplication<T>(query);
            foreach (var (desc, field) in sorts.Select(x =>
                         (x[0] == 'd', x[1..])))
            {
                sortApplier.Desc = desc;
                getSortField(field, sortApplier);
            }

            return sortApplier.OrderedQueryable ?? query;
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