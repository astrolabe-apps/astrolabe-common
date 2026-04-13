# **Building Type-Safe Search APIs with SearchHelper**

## Introduction

Today I want to talk about a powerful utility in the Astrolabe framework called `SearchHelper`. This class provides a clean, composable way to build search, filter, and sort functionality for your APIs without writing repetitive LINQ queries.

Let's dive in with a real-world example from our `CarController`.

---

## The Problem

When building search endpoints, you typically need:
- **Filtering** by multiple fields with multiple values
- **Sorting** by different fields, both ascending and descending
- **Pagination** with offset and limit
- **Total count** for the UI to show "Page 1 of 10"

Writing this manually leads to repetitive, error-prone code. Let's see how `SearchHelper` solves this.

---

## Creating a Searcher - The Basic Setup

Here's how we create a searcher in `CarController` (lines 99-106):

```csharp
private static readonly Searcher<CarItem, CarInfo> Searcher = SearchHelper.CreateSearcher<
    CarItem,
    CarInfo
>(
    q => q.Select(x => new CarInfo(x.Make, x.Model, x.Year, x.Status)).ToListAsync(),
    q => q.CountAsync(),
    sorter: SearchHelper.MakeSorter(ApplyCarSort)
);
```

**What's happening here?**
- `CarItem` - The entity we're querying from the database
- `CarInfo` - The DTO we're returning to clients
- First parameter: How to select and map results
- Second parameter: How to count total results
- `sorter` parameter: Custom sorting logic (we'll cover this next)

---

## Custom Sorting Logic

By default, `SearchHelper.MakeSorter<T>()` uses reflection to sort by any public property. But you can customize it (lines 92-96):

```csharp
private static readonly FieldGetter<CarItem> ApplyCarSort = (field, sort) => field switch
{
    "make" => sort.Apply(x => x.Make),
    _ => null
};
```

**Why customize sorting?**
- Control which fields are sortable
- Map client field names to different properties
- Handle complex sorting (e.g., nested properties, computed values)

The pattern is simple: return `sort.Apply(x => x.PropertyName)` for supported fields, `null` otherwise.

---

## Using the Searcher in Your Endpoint

Now let's use our searcher in the actual API endpoint (lines 109-117):

```csharp
[HttpPost("search")]
public async Task<SearchResults<CarInfo>> SearchCars(SearchOptions search)
{
    return await Searcher(
        dbContext.Cars.Where(x => x.Make.Contains(search.Query)),
        search,
        search.Offset == 0
    );
}
```

**Breaking it down:**
1. Start with your base query - `dbContext.Cars`
2. Apply custom filtering - `.Where(x => x.Make.Contains(search.Query))`
3. Pass to the searcher along with `SearchOptions`
4. Third parameter (`search.Offset == 0`) - only count total on first page for performance

---

## What's in SearchOptions?

The client sends something like:

```json
{
  "query": "Toyota",
  "offset": 0,
  "length": 20,
  "sort": ["dmake", "ayear"],
  "filters": {
    "status": ["Published", "Draft"]
  }
}
```

**Sort format:**
- `"dmake"` - Sort by `make` **descending** (d prefix)
- `"ayear"` - Sort by `year` **ascending** (a prefix)

**Filters:**
- Multi-value filters - `status` can be `Published` OR `Draft`
- Works automatically via `MakeFilterer<T>()`

---

## The Magic: Auto-Generated Filtering

If you don't provide custom filtering, `SearchHelper` generates it via reflection (lines 55-84):

```csharp
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
```

**What's it doing?**
- Uses `Expression Trees` to build LINQ queries dynamically
- Generates: `query.Where(x => filterValues.Contains(x.PropertyValue))`
- **Bonus:** Automatically handles enums via `Enum.Parse`

---

## Advanced: Custom Filtering

Just like sorting, you can customize filtering:

```csharp
Func<string, FieldFilter<CarItem>?> customFilter = field => field switch
{
    "yearRange" => (query, vals) => {
        var year = int.Parse(vals.First());
        return query.Where(x => x.Year >= year && x.Year <= year + 10);
    },
    _ => null
};

var filterer = SearchHelper.MakeFilterer(customFilter, includeDefault: true);
```

Setting `includeDefault: true` falls back to reflection-based filtering for fields you don't handle.

---

## Performance Optimization: Conditional Counting

Notice this pattern in the `SearchCars` endpoint:

```csharp
return await Searcher(
    dbContext.Cars.Where(x => x.Make.Contains(search.Query)),
    search,
    search.Offset == 0  // Only count on first page!
);
```

**Why?**
- `COUNT(*)` queries can be expensive on large tables
- We only need the total on the first page load
- Subsequent pagination requests skip the count

The `SearchResults<T>` type has a nullable `Total` property:

```csharp
public record SearchResults<T>(int? Total, List<T> Results);
```

---

## The Complete Flow

1. **Client sends**: `{ offset: 0, length: 20, sort: ["dmake"], filters: { status: ["Published"] } }`

2. **SearchHelper applies**:
   - Filtering: `WHERE status IN ('Published')`
   - Sorting: `ORDER BY make DESC`
   - Pagination: `SKIP 0 TAKE 20`
   - (Optional) Counting: `COUNT(*)`

3. **Your custom logic**:
   - Mapping: `SELECT new CarInfo(...)`
   - Additional filters: `.Where(x => x.Make.Contains(query))`

4. **Result**: Type-safe, composable, testable search functionality

---

## Key Takeaways

**Composable Design:**
- Start with defaults (`MakeSorter<T>()`, `MakeFilterer<T>()`)
- Customize only what you need
- Combine with your own LINQ queries

**Type Safety:**
- Expression trees ensure compile-time safety
- No string-based SQL injection risks
- IntelliSense support for field names

**Performance:**
- Conditional counting saves resources
- Translates to efficient SQL via EF Core
- Configurable max page size (`maxLength: 50`)

**Developer Experience:**
- Minimal boilerplate code
- Consistent API across all search endpoints
- Easy to test and maintain

---

## When to Use SearchHelper

**Great for:**
- List/grid views with sorting and filtering
- Admin panels with complex search
- Public APIs with standardized search parameters

**Probably overkill for:**
- Simple single-entity lookups by ID
- Endpoints with fixed sorting/filtering
- Very specialized query logic

---

## Questions?

The full implementation is at:
- `Astrolabe.SearchState/SearchHelper.cs`
- Example usage: `CarController.cs:92-117`

Thank you!