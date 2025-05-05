# Astrolabe.SearchState

[![NuGet](https://img.shields.io/nuget/v/Astrolabe.SearchState.svg)](https://www.nuget.org/packages/Astrolabe.SearchState/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A C# library with generic searching data classes for implementing robust search functionality in .NET applications. Part of the Astrolabe Apps library stack.

## Overview

Astrolabe.SearchState provides a set of generic classes and utilities to simplify the implementation of search, filtering, and sorting functionality in your applications. It allows you to build flexible search capabilities with minimal code by providing:

- Generic search state management
- Dynamic property-based filtering
- Dynamic property-based sorting
- Pagination support
- Type-safe query building

## Installation

```bash
dotnet add package Astrolabe.SearchState
```

## Core Features

### Search Options

The `ISearchOptions` interface and `SearchOptions` implementation provide a standard way to define search parameters:

- **Query**: Optional text search query
- **Sort**: Configurable sorting expressions
- **Filters**: Dynamic filtering criteria
- **Pagination**: Offset and length control

### Search Results

The `SearchResults<T>` record encapsulates the results of a search operation:

- **Total**: Optional total count of all matching items (for pagination)
- **Entries**: The actual result items for the current page

### Search Helpers

The `SearchHelper` class provides utility methods for building flexible search queries:

- **Dynamic Property Filtering**: Filter query results based on property values
- **Dynamic Property Sorting**: Sort query results by any property
- **Generic Search Builders**: Create search functions with minimal boilerplate

## Usage Examples

### Basic Search Implementation

```csharp
using Astrolabe.SearchState;

// Define your model
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
    public ProductCategory Category { get; set; }
}

// Define an enum if needed
public enum ProductCategory
{
    Electronics,
    Clothing,
    Food
}

// Create a search function
public class ProductService
{
    private readonly DbContext _dbContext;
    
    public ProductService(DbContext dbContext)
    {
        _dbContext = dbContext;
    }
    
    public Task<SearchResults<Product>> SearchProducts(SearchOptions options, bool includeTotal = true)
    {
        // Create the searcher with default sorters and filterers
        var searcher = SearchHelper.CreateSearcher<Product, Product>(
            query => query.ToListAsync(),
            query => query.CountAsync()
        );
        
        // Execute the search
        return searcher(_dbContext.Products, options, includeTotal);
    }
}
```

### Customizing Sorting

```csharp
// Create a custom sorter
var sorter = SearchHelper.MakeSorter<Product>(field =>
{
    // Handle special case sorting
    if (field == "relevance")
    {
        var param = Expression.Parameter(typeof(Product));
        return Expression.Lambda<Func<Product, object>>(
            Expression.Convert(
                Expression.MakeMemberAccess(
                    param,
                    typeof(Product).GetProperty(nameof(Product.Id))
                ),
                typeof(object)
            ),
            param
        );
    }
    
    // Fall back to default property-based sorting
    return null;
});

// Use the custom sorter
var searcher = SearchHelper.CreateSearcher<Product, ProductDto>(
    query => query.Select(p => new ProductDto 
    { 
        Id = p.Id, 
        Name = p.Name 
    }).ToListAsync(),
    query => query.CountAsync(),
    sorter
);
```

### Customizing Filtering

```csharp
// Create a custom filterer
var filterer = SearchHelper.MakeFilterer<Product>(field =>
{
    // Handle price range filtering
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
            var search = values.FirstOrDefault();
            if (string.IsNullOrEmpty(search)) return query;
            
            return query.Where(p => p.Name.Contains(search));
        };
    }
    
    // Fall back to default property-based filtering
    return null;
});

// Use the custom filterer
var searcher = SearchHelper.CreateSearcher<Product, Product>(
    query => query.ToListAsync(),
    query => query.CountAsync(),
    null, // Use default sorter
    filterer
);
```

### Full Example with ASP.NET Core API

```csharp
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ProductService _productService;
    
    public ProductsController(ProductService productService)
    {
        _productService = productService;
    }
    
    [HttpGet]
    public async Task<ActionResult<SearchResults<ProductDto>>> Search([FromQuery] SearchOptions options)
    {
        var results = await _productService.SearchProducts(options);
        return Ok(results);
    }
}
```

## Advanced Usage

### Custom Member Lookups

The library provides functions to create custom property lookup mechanisms:

```csharp
// Create a custom property member lookup
var lookup = SearchHelper.CreatePropertyMemberLookup<Product>();

// Use it to get information about a property
var memberInfo = lookup("name"); // Returns FilterableMember for the Name property
```

### Custom Property Getters

You can create expression-based property getters:

```csharp
// Create a property getter lookup
var getterLookup = SearchHelper.CreatePropertyGetterLookup<Product>();

// Get an expression to access a property
var nameGetter = getterLookup("name"); // Returns Expression<Func<Product, object>> for the Name property
```

### Custom Search Delegate

Create a fully customized search function:

```csharp
// Create a custom searcher with transformation
var searcherWithMapping = SearchHelper.CreateSearcher<Product, ProductDto>(
    query => query.Select(p => new ProductDto 
    { 
        Id = p.Id, 
        Name = p.Name, 
        DisplayPrice = $"${p.Price:F2}" 
    }).ToListAsync(),
    query => query.CountAsync(),
    maxLength: 100 // Override default max page size
);
```

## Performance Considerations

- **Projection**: Use projection in your select delegate to minimize data transfer
- **MaxLength**: Set appropriate max length to prevent oversized queries
- **includeTotal**: Only set to true when pagination information is needed

## License

MIT

## Links

- [GitHub Repository](https://github.com/astrolabe-apps/astrolabe-common)
- [NuGet Package](https://www.nuget.org/packages/Astrolabe.SearchState)
- [Documentation](https://github.com/astrolabe-apps/astrolabe-common/tree/main/Astrolabe.SearchState)