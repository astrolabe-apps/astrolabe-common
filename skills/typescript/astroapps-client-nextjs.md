# @astroapps/client-nextjs - Next.js App Router Integration

## Overview

@astroapps/client-nextjs provides Next.js App Router integration for @astroapps/client. It bridges Next.js navigation hooks with the NavigationService interface, enabling seamless routing and query parameter management in Next.js 14+ applications.

**When to use**: Use this library when building a Next.js App Router application that needs integration with @astroapps/client for navigation, query parameter syncing, and form state management.

**Package**: `@astroapps/client-nextjs`
**Dependencies**: @astroapps/client, @react-typed-forms/core, Next.js 14+, React 18+
**Published to**: npm

## Key Concepts

### 1. useNextNavigationService Hook

The primary hook that creates a NavigationService implementation using Next.js App Router hooks (`useRouter`, `usePathname`, `useSearchParams`).

### 2. App Router Only

This library is designed for Next.js App Router (Next.js 13+). It does NOT work with the Pages Router.

### 3. Automatic Query Sync

Handles bidirectional synchronization between URL query parameters and form controls automatically, including debouncing and batching.

### 4. Next.js Link Integration

Provides the Next.js `Link` component as part of the NavigationService interface for client-side navigation.

## Common Patterns

### Basic Setup in App Layout

```typescript
"use client";

import { useNextNavigationService } from "@astroapps/client-nextjs";
import { AppContextProvider } from "@astroapps/client";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigation = useNextNavigationService();
  const security = useSomeSecurityService(); // Your security implementation

  return (
    <html lang="en">
      <AppContextProvider value={{ navigation, security }}>
        <body>{children}</body>
      </AppContextProvider>
    </html>
  );
}
```

### Using NavigationService in Components

```typescript
"use client";

import { useNavigationService } from "@astroapps/client";

export default function MyPage() {
  const nav = useNavigationService();

  return (
    <div>
      {/* Current route information */}
      <p>Current path: {nav.pathname}</p>
      <p>Query params: {JSON.stringify(nav.query)}</p>

      {/* Navigate programmatically */}
      <button onClick={() => nav.push("/dashboard")}>
        Go to Dashboard
      </button>

      {/* Use Next.js Link component */}
      <nav.Link href="/about">About</nav.Link>
    </div>
  );
}
```

### Query Parameter Synchronization

```typescript
"use client";

import { useNavigationService, useSyncParam, StringParam } from "@astroapps/client";
import { useControl } from "@react-typed-forms/core";

export default function SearchPage() {
  const nav = useNavigationService();

  // Sync search input with URL query parameter "q"
  const searchControl = useSyncParam(
    nav.queryControl,
    "q",
    StringParam
  );

  return (
    <div>
      <input
        value={searchControl.value || ""}
        onChange={(e) => {
          searchControl.value = e.target.value;
          // URL automatically updates to ?q=... (debounced)
        }}
        placeholder="Search..."
      />
      <p>Search: {searchControl.value}</p>
    </div>
  );
}
```

### Route-Based Configuration

```typescript
"use client";

import { useNextNavigationService } from "@astroapps/client-nextjs";
import { RouteData } from "@astroapps/client";

// Define route metadata
interface MyRouteData {
  title: string;
  requiresAuth: boolean;
}

const routes: Record<string, RouteData<MyRouteData>> = {
  dashboard: {
    data: { title: "Dashboard", requiresAuth: true },
  },
  settings: {
    data: { title: "Settings", requiresAuth: true },
  },
  about: {
    data: { title: "About", requiresAuth: false },
  },
};

const defaultRoute: RouteData<MyRouteData> = {
  data: { title: "Home", requiresAuth: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const navigation = useNextNavigationService<MyRouteData>(routes, defaultRoute);

  // Access route data
  const currentRoute = navigation.route;
  const pageTitle = currentRoute.data?.title || "Unknown";
  const requiresAuth = currentRoute.data?.requiresAuth || false;

  return (
    <html lang="en">
      <head>
        <title>{pageTitle}</title>
      </head>
      <AppContextProvider value={{ navigation }}>
        <body>
          {requiresAuth ? <AuthGuard>{children}</AuthGuard> : children}
        </body>
      </AppContextProvider>
    </html>
  );
}
```

### Programmatic Navigation

```typescript
"use client";

import { useNavigationService } from "@astroapps/client";

export default function NavigationExample() {
  const nav = useNavigationService();

  const goToDashboard = () => {
    nav.push("/dashboard");
  };

  const goToProfile = (userId: string) => {
    nav.push(`/profile/${userId}`);
  };

  const updateQueryParams = () => {
    // Replace current URL with new query params
    nav.replace("?filter=active&sort=date");
  };

  const navigateWithScroll = () => {
    // Navigate and scroll to top
    nav.push("/long-page", { scroll: true });
  };

  const navigateWithoutScroll = () => {
    // Navigate without scrolling
    nav.push("/settings", { scroll: false });
  };

  return (
    <div>
      <button onClick={goToDashboard}>Dashboard</button>
      <button onClick={() => goToProfile("123")}>Profile</button>
      <button onClick={updateQueryParams}>Filter Active</button>
      <button onClick={navigateWithScroll}>Long Page (scroll)</button>
      <button onClick={navigateWithoutScroll}>Settings (no scroll)</button>
    </div>
  );
}
```

### Multiple Query Parameters

```typescript
"use client";

import { useNavigationService, useSyncParam, convertStringParam } from "@astroapps/client";

interface SearchState {
  query: string;
  page: number;
  category: string;
  showArchived: boolean;
}

export default function AdvancedSearch() {
  const nav = useNavigationService();

  const query = useSyncParam(nav.queryControl, "q", StringParam);

  const page = useSyncParam(
    nav.queryControl,
    "page",
    convertStringParam(
      (num) => num.toString(),
      (str) => parseInt(str) || 1,
      1
    )
  );

  const category = useSyncParam(nav.queryControl, "category", StringParam);

  const showArchived = useSyncParam(
    nav.queryControl,
    "archived",
    convertStringParam(
      (bool) => (bool ? "true" : "false"),
      (str) => str === "true",
      false
    )
  );

  return (
    <div>
      <input
        value={query.value || ""}
        onChange={(e) => {
          query.value = e.target.value;
          page.value = 1; // Reset to page 1 on new search
        }}
        placeholder="Search..."
      />

      <select
        value={category.value || ""}
        onChange={(e) => {
          category.value = e.target.value;
          page.value = 1;
        }}
      >
        <option value="">All Categories</option>
        <option value="books">Books</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>

      <label>
        <input
          type="checkbox"
          checked={showArchived.value}
          onChange={(e) => {
            showArchived.value = e.target.checked;
          }}
        />
        Show Archived
      </label>

      <div>
        <button
          disabled={page.value === 1}
          onClick={() => page.value--}
        >
          Previous
        </button>
        <span>Page {page.value}</span>
        <button onClick={() => page.value++}>
          Next
        </button>
      </div>

      {/* URL will be: ?q=search&page=2&category=books&archived=true */}
    </div>
  );
}
```

### Using with useSyncParams (Multiple Parameters)

```typescript
"use client";

import { useNavigationService, useSyncParams } from "@astroapps/client";
import { useControl } from "@react-typed-forms/core";

interface FilterState {
  search: string;
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
}

export default function ProductFilters() {
  const nav = useNavigationService();

  const filterControl = useControl<FilterState>({
    search: "",
    minPrice: 0,
    maxPrice: 1000,
    inStock: false,
  });

  // Sync entire object to query params
  useSyncParams(nav.queryControl, filterControl);

  const { fields } = filterControl;

  return (
    <div>
      <input
        value={fields.search.value}
        onChange={(e) => fields.search.value = e.target.value}
        placeholder="Search products..."
      />

      <label>
        Min Price: ${fields.minPrice.value}
        <input
          type="range"
          min="0"
          max="1000"
          value={fields.minPrice.value}
          onChange={(e) => fields.minPrice.value = parseInt(e.target.value)}
        />
      </label>

      <label>
        Max Price: ${fields.maxPrice.value}
        <input
          type="range"
          min="0"
          max="1000"
          value={fields.maxPrice.value}
          onChange={(e) => fields.maxPrice.value = parseInt(e.target.value)}
        />
      </label>

      <label>
        <input
          type="checkbox"
          checked={fields.inStock.value}
          onChange={(e) => fields.inStock.value = e.target.checked}
        />
        In Stock Only
      </label>

      {/* URL updates automatically: ?search=laptop&minPrice=200&maxPrice=800&inStock=true */}
    </div>
  );
}
```

### Accessing Query Parameters Directly

```typescript
"use client";

import { useNavigationService } from "@astroapps/client";
import { useEffect } from "react";

export default function ProductPage() {
  const nav = useNavigationService();

  // Get single query parameter value
  const productId = nav.get("id");
  const referrer = nav.get("ref");

  // Get all values for a query parameter
  const tags = nav.getAll("tag"); // For ?tag=new&tag=featured

  useEffect(() => {
    if (productId) {
      console.log("Loading product:", productId);
      if (referrer) {
        console.log("Referrer:", referrer);
      }
    }
  }, [productId, referrer]);

  return (
    <div>
      <p>Product ID: {productId || "Not specified"}</p>
      <p>Referrer: {referrer || "Direct"}</p>
      {tags.length > 0 && <p>Tags: {tags.join(", ")}</p>}
    </div>
  );
}
```

### Building Full Path with Query

```typescript
"use client";

import { useNavigationService } from "@astroapps/client";

export default function ShareButton() {
  const nav = useNavigationService();

  const shareCurrentPage = () => {
    // Get full path including query parameters
    const fullPath = nav.pathAndQuery();
    const fullUrl = window.location.origin + fullPath;

    navigator.clipboard.writeText(fullUrl);
    alert("URL copied to clipboard!");
  };

  return (
    <button onClick={shareCurrentPage}>
      Share Page
    </button>
  );
}
```

### Server-Side Rendering Considerations

```typescript
"use client";

import { useNextNavigationService } from "@astroapps/client-nextjs";
import { useEffect, useState } from "react";

export default function ClientOnlyNavigation() {
  const navigation = useNextNavigationService();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // During SSR, navigation hooks return safe defaults
  // navigation.queryControl.value.isReady will be false during SSR
  if (!isClient || !navigation.queryControl.value.isReady) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <p>Current path: {navigation.pathname}</p>
      <p>Query: {JSON.stringify(navigation.query)}</p>
    </div>
  );
}
```

## Best Practices

### 1. Use "use client" Directive

```typescript
// ✅ DO - Mark components using navigation as client components
"use client";

import { useNavigationService } from "@astroapps/client";

export default function MyComponent() {
  const nav = useNavigationService();
  // ...
}

// ❌ DON'T - Try to use in server components
// Server components cannot use hooks
```

### 2. Initialize NavigationService in Root Layout

```typescript
// ✅ DO - Create navigation service once in root layout
"use client";

export default function RootLayout({ children }) {
  const navigation = useNextNavigationService();
  return (
    <AppContextProvider value={{ navigation }}>
      {children}
    </AppContextProvider>
  );
}

// ❌ DON'T - Create multiple instances in different components
// This can cause sync issues
```

### 3. Use nav.Link for Internal Navigation

```typescript
// ✅ DO - Use nav.Link for client-side navigation
const nav = useNavigationService();
<nav.Link href="/dashboard">Dashboard</nav.Link>

// ⚠️ CAUTION - Regular <a> tags cause full page reload
<a href="/dashboard">Dashboard</a> // Full page reload
```

### 4. Prefer replace() for Query-Only Updates

```typescript
// ✅ DO - Use replace for query param changes
nav.replace("?filter=active"); // Doesn't add to history

// ⚠️ CAUTION - push() for query changes clutters history
nav.push("?filter=active"); // Adds to browser history
```

## Troubleshooting

### Common Issues

**Issue: "useRouter only works in Client Components"**
- **Cause**: Component is not marked with "use client" directive
- **Solution**: Add `"use client";` at the top of the file

**Issue: Query parameters not syncing to URL**
- **Cause**: NavigationService not properly set up in AppContextProvider
- **Solution**: Ensure useNextNavigationService() is called in root layout and passed to AppContextProvider

**Issue: URL changes but component doesn't re-render**
- **Cause**: Not using nav.queryControl for reactive state
- **Solution**: Use useSyncParam or useSyncParams with nav.queryControl

**Issue: Infinite re-render loop with query params**
- **Cause**: Creating new converter objects on each render
- **Solution**: Use built-in converters (StringParam) or memoize custom converters with useMemo

**Issue: searchParams is null**
- **Cause**: useSearchParams() requires "use client" and Suspense boundary
- **Solution**: Ensure component is client-side and wrapped in Suspense if needed

**Issue: Navigation not working during SSR**
- **Cause**: Navigation hooks only work on client side
- **Solution**: Check `navigation.queryControl.value.isReady` before using navigation state during SSR

**Issue: Query parameters reset on page reload**
- **Cause**: Initial values not derived from URL
- **Solution**: useSyncParam automatically reads from URL on mount - ensure it's called before setting values

**Issue: Link component type errors**
- **Cause**: TypeScript strict mode with Next.js Link
- **Solution**: Use `nav.Link` which is properly typed for the NavigationService interface

## Package Information

- **Package**: `@astroapps/client-nextjs`
- **Path**: `astrolabe-client-nextjs/`
- **Published to**: npm
- **Version**: 2.1.0+

## Related Documentation

- [astroapps-client](./astroapps-client.md) - Core client library with NavigationService interface
- [react-typed-forms-core](./react-typed-forms-core.md) - Form state management
- [Next.js App Router](https://nextjs.org/docs/app) - Next.js documentation
