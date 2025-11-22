# Astrolabe.SearchState - Generic Search & Filtering

## Overview

Astrolabe.SearchState provides generic classes and utilities for implementing robust search, filtering, sorting, and pagination functionality in .NET applications. Build flexible search capabilities with minimal code using dynamic property-based operations.

**When to use**: Use this library when you need to implement search APIs with dynamic filtering, sorting, and pagination. Perfect for building list/grid endpoints with flexible query capabilities.

**Package**: `Astrolabe.SearchState`
**Dependencies**: Astrolabe.Common, LINQ
**TypeScript Client**: `astrolabe-searchstate`
**Target Framework**: .NET 7-8

## Key Concepts

### 1. Search Options

`SearchOptions` encapsulates all search parameters:
- **Query**: Text search query
- **Sort**: Dynamic sorting by property name and direction
- **Filters**: Key-value filters applied to properties
- **Pagination**: Offset and length control

### 2. Search Results

`SearchResults<T>` contains:
- **Total**: Total count of matching items (for pagination UI)
- **Entries**: Current page of results

### 3. SearchHelper

Utility class providing:
- Dynamic property filtering
- Dynamic property sorting
- Generic search builders
- Customizable filter and sort logic

## Common Patterns

### Basic Search Implementation

```csharp
using Astrolabe.SearchState;
using Microsoft.EntityFrameworkCore;

public class ProductService
{
    private readonly AppDbContext _context;

    public ProductService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SearchResults<Product>> SearchProducts(
        SearchOptions options,
        bool includeTotal = true)
    {
        // Create searcher with default sorters and filterers
        var searcher = SearchHelper.CreateSearcher<Product, Product>(
            query => query.ToListAsync(),
            query => query.CountAsync()
        );

        return await searcher(_context.Products, options, includeTotal);
    }
}
```

### Search with Projection (DTO Mapping)

```csharp
using Astrolabe.SearchState;

public class ProductService
{
    public async Task<SearchResults<ProductDto>> SearchProducts(SearchOptions options)
    {
        var searcher = SearchHelper.CreateSearcher<Product, ProductDto>(
            // Select - project to DTO
            query => query.Select(p => new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                Price = p.Price,
                CategoryName = p.Category.Name
            }).ToListAsync(),

            // Count - count source entities
            query => query.CountAsync()
        );

        return await searcher(_context.Products, options, includeTotal: true);
    }
}

public class ProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string CategoryName { get; set; } = string.Empty;
}
```

### Custom Sorting Logic

```csharp
using Astrolabe.SearchState;
using System.Linq.Expressions;

// Create custom sorter
var sorter = SearchHelper.MakeSorter<Product>(field =>
{
    // Handle special "relevance" sort
    if (field == "relevance")
    {
        var param = Expression.Parameter(typeof(Product));
        return Expression.Lambda<Func<Product, object>>(
            Expression.Convert(
                Expression.Property(param, nameof(Product.ViewCount)),
                typeof(object)
            ),
            param
        );
    }

    // Handle "popularity" sort (combination of views and sales)
    if (field == "popularity")
    {
        var param = Expression.Parameter(typeof(Product));
        var viewCount = Expression.Property(param, nameof(Product.ViewCount));
        var salesCount = Expression.Property(param, nameof(Product.SalesCount));
        var combined = Expression.Add(viewCount, salesCount);

        return Expression.Lambda<Func<Product, object>>(
            Expression.Convert(combined, typeof(object)),
            param
        );
    }

    // Return null to use default property-based sorting
    return null;
});

// Use custom sorter
var searcher = SearchHelper.CreateSearcher<Product, ProductDto>(
    query => query.Select(/* ... */).ToListAsync(),
    query => query.CountAsync(),
    sorter // Custom sorter
);
```

### Custom Filtering Logic

```csharp
using Astrolabe.SearchState;

// Create custom filterer
var filterer = SearchHelper.MakeFilterer<Product>(field =>
{
    // Handle price range filter
    if (field == "priceRange")
    {
        return (query, values) =>
        {
            if (values.Count != 2) return query;
            if (!decimal.TryParse(values[0], out var min)) return query;
            if (!decimal.TryParse(values[1], out var max)) return query;

            return query.Where(p => p.Price >= min && p.Price <= max);
        };
    }

    // Handle text search
    if (field == "search")
    {
        return (query, values) =>
        {
            var searchTerm = values.FirstOrDefault();
            if (string.IsNullOrEmpty(searchTerm)) return query;

            return query.Where(p =>
                p.Name.Contains(searchTerm) ||
                p.Description.Contains(searchTerm) ||
                p.Category.Name.Contains(searchTerm)
            );
        };
    }

    // Handle date range filter
    if (field == "createdDateRange")
    {
        return (query, values) =>
        {
            if (values.Count != 2) return query;
            if (!DateTime.TryParse(values[0], out var start)) return query;
            if (!DateTime.TryParse(values[1], out var end)) return query;

            return query.Where(p => p.CreatedAt >= start && p.CreatedAt <= end);
        };
    }

    // Handle multi-select filter (e.g., categories)
    if (field == "categories")
    {
        return (query, values) =>
        {
            if (values.Count == 0) return query;
            var categoryIds = values.Select(int.Parse).ToList();
            return query.Where(p => categoryIds.Contains(p.CategoryId));
        };
    }

    // Return null to use default property-based filtering
    return null;
});

// Use custom filterer
var searcher = SearchHelper.CreateSearcher<Product, Product>(
    query => query.ToListAsync(),
    query => query.CountAsync(),
    null, // Default sorter
    filterer // Custom filterer
);
```

### ASP.NET Core API Controller

```csharp
using Astrolabe.SearchState;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly ProductService _productService;

    public ProductsController(ProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<ActionResult<SearchResults<ProductDto>>> Search(
        [FromQuery] SearchOptions options)
    {
        var results = await _productService.SearchProducts(options);
        return Ok(results);
    }
}

// Example requests:
// GET /api/products?offset=0&length=10
// GET /api/products?query=laptop&sort=price&sortDesc=false
// GET /api/products?filters[category]=electronics&filters[priceRange]=100,500
```

### Complete Search Service with Custom Logic

```csharp
using Astrolabe.SearchState;
using Microsoft.EntityFrameworkCore;

public class AdvancedProductService
{
    private readonly AppDbContext _context;
    private readonly SearchDelegate<Product, ProductDto> _searcher;

    public AdvancedProductService(AppDbContext context)
    {
        _context = context;

        // Create custom sorter
        var sorter = SearchHelper.MakeSorter<Product>(field =>
        {
            return field switch
            {
                "relevance" => MakePropertyExpression<Product>("ViewCount"),
                "popularity" => MakeCombinedExpression(),
                _ => null // Use default
            };
        });

        // Create custom filterer
        var filterer = SearchHelper.MakeFilterer<Product>(field =>
        {
            return field switch
            {
                "search" => HandleTextSearch,
                "priceRange" => HandlePriceRange,
                "categories" => HandleCategories,
                "inStock" => HandleInStock,
                _ => null // Use default
            };
        });

        // Build searcher
        _searcher = SearchHelper.CreateSearcher<Product, ProductDto>(
            query => query.Select(p => new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                Price = p.Price,
                CategoryName = p.Category.Name,
                InStock = p.Stock > 0
            }).ToListAsync(),
            query => query.CountAsync(),
            sorter,
            filterer,
            maxLength: 100 // Max 100 items per page
        );
    }

    public Task<SearchResults<ProductDto>> SearchProducts(
        SearchOptions options,
        bool includeTotal = true)
    {
        return _searcher(_context.Products, options, includeTotal);
    }

    // Custom filter implementations
    private IQueryable<Product> HandleTextSearch(
        IQueryable<Product> query,
        IReadOnlyList<string> values)
    {
        var searchTerm = values.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(searchTerm)) return query;

        return query.Where(p =>
            EF.Functions.Like(p.Name, $"%{searchTerm}%") ||
            EF.Functions.Like(p.Description, $"%{searchTerm}%")
        );
    }

    private IQueryable<Product> HandlePriceRange(
        IQueryable<Product> query,
        IReadOnlyList<string> values)
    {
        if (values.Count != 2) return query;
        if (!decimal.TryParse(values[0], out var min)) return query;
        if (!decimal.TryParse(values[1], out var max)) return query;

        return query.Where(p => p.Price >= min && p.Price <= max);
    }

    private IQueryable<Product> HandleCategories(
        IQueryable<Product> query,
        IReadOnlyList<string> values)
    {
        if (values.Count == 0) return query;
        var categoryIds = values.Select(int.Parse).ToList();
        return query.Where(p => categoryIds.Contains(p.CategoryId));
    }

    private IQueryable<Product> HandleInStock(
        IQueryable<Product> query,
        IReadOnlyList<string> values)
    {
        var inStockOnly = values.FirstOrDefault()?.ToLower() == "true";
        if (!inStockOnly) return query;

        return query.Where(p => p.Stock > 0);
    }

    private Expression<Func<Product, object>> MakeCombinedExpression()
    {
        var param = Expression.Parameter(typeof(Product));
        var viewCount = Expression.Property(param, nameof(Product.ViewCount));
        var salesCount = Expression.Property(param, nameof(Product.SalesCount));
        var combined = Expression.Add(viewCount, salesCount);

        return Expression.Lambda<Func<Product, object>>(
            Expression.Convert(combined, typeof(object)),
            param
        );
    }

    private Expression<Func<T, object>>? MakePropertyExpression<T>(string propertyName)
    {
        var param = Expression.Parameter(typeof(T));
        var property = Expression.Property(param, propertyName);
        return Expression.Lambda<Func<T, object>>(
            Expression.Convert(property, typeof(object)),
            param
        );
    }
}
```

## Best Practices

### 1. Always Set Maximum Page Size

```csharp
// ✅ DO - Limit page size to prevent excessive queries
SearchHelper.CreateSearcher<Product, Product>(
    /* ... */,
    maxLength: 100 // Max 100 items
);

// ❌ DON'T - Allow unlimited page size
SearchHelper.CreateSearcher<Product, Product>(/* ... */); // No limit!
```

### 2. Use Projection for Performance

```csharp
// ✅ DO - Project to DTOs to select only needed columns
var searcher = SearchHelper.CreateSearcher<Product, ProductDto>(
    query => query.Select(p => new ProductDto
    {
        Id = p.Id,
        Name = p.Name
    }).ToListAsync(),
    /* ... */
);

// ❌ DON'T - Return full entities with all navigations
var searcher = SearchHelper.CreateSearcher<Product, Product>(
    query => query.Include(p => p.Category)
                  .Include(p => p.Reviews)
                  .ToListAsync(), // Loads too much data!
    /* ... */
);
```

### 3. Only Include Total When Needed

```csharp
// ✅ DO - Skip total count when not needed for performance
var results = await searcher(query, options, includeTotal: false);

// ⚠️ CAUTION - Total count requires a separate COUNT query
var results = await searcher(query, options, includeTotal: true);
```

### 4. Validate Filter Values

```csharp
// ✅ DO - Validate and sanitize filter values
if (field == "priceRange")
{
    return (query, values) =>
    {
        if (values.Count != 2) return query;
        if (!decimal.TryParse(values[0], out var min) || min < 0) return query;
        if (!decimal.TryParse(values[1], out var max) || max < min) return query;

        return query.Where(p => p.Price >= min && p.Price <= max);
    };
}

// ❌ DON'T - Blindly parse and use values
return (query, values) => query.Where(p =>
    p.Price >= decimal.Parse(values[0]) && // Throws on invalid input!
    p.Price <= decimal.Parse(values[1])
);
```

## Troubleshooting

### Common Issues

**Issue: Sorting by property doesn't work**
- **Cause**: Property name case mismatch or property doesn't exist
- **Solution**: Property names are case-sensitive. Verify exact property name. Consider making custom sorter case-insensitive.

**Issue: Filters not being applied**
- **Cause**: Custom filterer returning null instead of filtered query
- **Solution**: Always return the query from filter functions, even if unchanged:
  ```csharp
  if (string.IsNullOrEmpty(searchTerm)) return query; // ✅
  if (string.IsNullOrEmpty(searchTerm)) return null; // ❌
  ```

**Issue: Count query is slow**
- **Cause**: Complex joins or lack of indexes
- **Solution**: Add database indexes on filtered/sorted columns, simplify count query if possible

**Issue: Search returns wrong total count**
- **Cause**: Filters not applied before counting
- **Solution**: Ensure filters are applied in the correct order

**Issue: Expression errors when building custom sorts/filters**
- **Cause**: Incorrect expression tree construction
- **Solution**: Use simpler LINQ lambda expressions when possible, or test expression construction separately

**Issue: Client sends invalid filter values**
- **Cause**: No validation on client side
- **Solution**: Always validate filter values in custom filterers. Return unmodified query for invalid input.

## Project Structure Location

- **Path**: `Astrolabe.SearchState/`
- **Project File**: `Astrolabe.SearchState.csproj`
- **Namespace**: `Astrolabe.SearchState`
- **NuGet**: https://www.nuget.org/packages/Astrolabe.SearchState/

## Related Documentation

- [Astrolabe.Common](./astrolabe-common.md) - Base utilities
- [astrolabe-searchstate](../typescript/astrolabe-searchstate.md) - TypeScript client
- [Entity Framework Core](https://docs.microsoft.com/en-us/ef/core/) - Database queries
