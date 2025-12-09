---
name: astroapps-client
description: Core React client library for authentication (SecurityService), navigation with URL query syncing, API clients, form validation, toast notifications, and breadcrumbs. Foundation for all @astroapps client packages.
---

# @astroapps/client - Core Client Library

## Overview

@astroapps/client is the foundation library for building React applications with the Astrolabe framework. It provides navigation, security, UI services, form validation, and utilities for managing application state with @react-typed-forms/core integration.

**When to use**: Use this library as the foundation for any React application that needs authentication, URL routing with query parameters, API client management, form validation, and UI services like toasts and breadcrumbs.

**Package**: `@astroapps/client`
**Dependencies**: @react-typed-forms/core, React 18+
**Extensions**: @astroapps/client-nextjs (Next.js), @astroapps/client-msal (Azure AD), @astroapps/client-localusers (Local auth)

## Key Concepts

### 1. AppContext - Dependency Injection

Central context for application-wide services (security, navigation, toast, breadcrumbs). Accessed via hooks throughout the application.

### 2. SecurityService

Handles authentication state, token management, and authorized HTTP requests. Abstract interface allows different implementations (MSAL, local users, custom).

### 3. NavigationService

Manages URL routing, query parameters, and provides reactive state synchronized with the browser URL.

### 4. Query Parameter Synchronization

Two-way binding between form controls and URL query parameters with automatic debouncing and batching.

### 5. Form Validation & Error Handling

Utilities for validating forms, handling API errors, and mapping FluentValidation errors from ASP.NET Core backends.

## Common Patterns

### Setting Up AppContext

```typescript
import {
  AppContextProvider,
  makeProvider,
  SecurityService,
  NavigationService,
} from "@astroapps/client";

// At your app root
function App() {
  const security = yourSecurityService; // Your implementation
  const navigation = yourNavigationService; // Your implementation

  return (
    <AppContextProvider
      value={{
        security,
        navigation,
        // Add other services as needed
      }}
      providers={[
        makeProvider(SomeProvider, { someProp: "value" }),
        // Additional providers
      ]}
    >
      <YourApp />
    </AppContextProvider>
  );
}
```

### Using Security Service

```typescript
import { useSecurityService } from "@astroapps/client";

function UserProfile() {
  const security = useSecurityService();
  const user = security.currentUser.value;

  if (!user.loggedIn) {
    return <LoginPrompt />;
  }

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Roles: {user.roles?.join(", ")}</p>
      <button onClick={() => security.logout()}>Logout</button>
    </div>
  );
}
```

### Authenticated API Requests

```typescript
import { useSecurityService } from "@astroapps/client";

function DataFetcher() {
  const security = useSecurityService();

  const fetchData = async () => {
    // Automatically includes Bearer token
    const response = await security.fetch("/api/protected-data");
    const data = await response.json();
    return data;
  };

  return <button onClick={fetchData}>Fetch Data</button>;
}
```

### Using API Clients

```typescript
import { useApiClient } from "@astroapps/client";
import { UsersClient } from "./generated/api"; // Generated from OpenAPI

function UsersList() {
  const usersClient = useApiClient(UsersClient);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    usersClient.getUsers().then(setUsers);
  }, []);

  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

### Navigation and Routing

```typescript
import { useNavigationService } from "@astroapps/client";

function Navigation() {
  const nav = useNavigationService();

  return (
    <nav>
      {/* Type-safe Link component */}
      <nav.Link href="/dashboard">Dashboard</nav.Link>
      <nav.Link href="/settings">Settings</nav.Link>

      {/* Programmatic navigation */}
      <button onClick={() => nav.push("/profile")}>
        Go to Profile
      </button>

      {/* Current location info */}
      <p>Current path: {nav.pathname}</p>
      <p>Query: {JSON.stringify(nav.query)}</p>
    </nav>
  );
}
```

### Query Parameter Syncing

```typescript
import { useSyncParam, StringParam, useQueryControl } from "@astroapps/client";

function SearchPage() {
  const queryControl = useQueryControl();

  // Sync form control with URL query parameter "q"
  const searchControl = useSyncParam(
    queryControl,
    "q",
    StringParam
  );

  return (
    <div>
      <input
        value={searchControl.value}
        onChange={(e) => {
          searchControl.value = e.target.value;
          // URL automatically updates to ?q=...
        }}
        placeholder="Search..."
      />
      <p>Search query: {searchControl.value}</p>
    </div>
  );
}
```

### Custom Query Parameter Converters

```typescript
import { useSyncParam, convertStringParam, useQueryControl } from "@astroapps/client";

function FilteredList() {
  const queryControl = useQueryControl();

  // Number parameter
  const pageControl = useSyncParam(
    queryControl,
    "page",
    convertStringParam(
      (num) => num.toString(),
      (str) => parseInt(str) || 1,
      1 // default value
    )
  );

  // Boolean parameter
  const showArchivedControl = useSyncParam(
    queryControl,
    "archived",
    convertStringParam(
      (bool) => bool.toString(),
      (str) => str === "true",
      false
    )
  );

  return (
    <div>
      <p>Page: {pageControl.value}</p>
      <button onClick={() => pageControl.value++}>Next Page</button>

      <label>
        <input
          type="checkbox"
          checked={showArchivedControl.value}
          onChange={(e) => {
            showArchivedControl.value = e.target.checked;
          }}
        />
        Show Archived
      </label>
    </div>
  );
}
```

### Form Validation with API Errors

```typescript
import { validateAndRunMessages, useToast } from "@astroapps/client";

function CreateUserForm() {
  const control = useControl({ name: "", email: "" });
  const toast = useToast();

  const handleSubmit = async () => {
    const success = await validateAndRunMessages(
      control,
      () => fetch("/api/users", {
        method: "POST",
        body: JSON.stringify(control.value),
      }),
      {
        400: "Invalid user data",
        409: "User already exists",
        429: "Too many requests, please try again later",
      },
      "An unexpected error occurred"
    );

    if (success) {
      toast.addToast("User created successfully!", { type: "success" });
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <input {...control.fields.name.bind()} placeholder="Name" />
      <input {...control.fields.email.bind()} placeholder="Email" />
      <button type="submit">Create User</button>
    </form>
  );
}
```

### Handling FluentValidation Errors

```typescript
import { badRequestToErrors } from "@astroapps/client";

function UpdateProfileForm() {
  const control = useControl({ firstName: "", lastName: "", age: 0 });

  const handleSubmit = async () => {
    try {
      await fetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify(control.value),
      });
    } catch (error) {
      // Automatically maps FluentValidation errors to form controls
      badRequestToErrors(
        error,
        control,
        // Optional: custom error message mapping
        (err) => {
          if (err.ErrorCode === "TooYoung") return "Must be 18 or older";
          return err.ErrorMessage;
        }
      );
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <input {...control.fields.firstName.bind()} />
      {control.fields.firstName.error && (
        <span className="error">{control.fields.firstName.error}</span>
      )}

      <input {...control.fields.lastName.bind()} />
      {control.fields.lastName.error && (
        <span className="error">{control.fields.lastName.error}</span>
      )}

      <input type="number" {...control.fields.age.bind()} />
      {control.fields.age.error && (
        <span className="error">{control.fields.age.error}</span>
      )}

      <button type="submit">Update</button>
    </form>
  );
}
```

### Toast Notifications

```typescript
import { useToast } from "@astroapps/client";

function NotificationExample() {
  const toast = useToast();

  const showSuccess = () => {
    toast.addToast("Operation completed!", { type: "success" });
  };

  const showError = () => {
    toast.addToast("Something went wrong", { type: "error" });
  };

  const showWithAction = () => {
    toast.addToast("File deleted", {
      type: "info",
      action: {
        label: "Undo",
        response: () => {
          // Undo logic here
        },
      },
    });
  };

  return (
    <div>
      <button onClick={showSuccess}>Success</button>
      <button onClick={showError}>Error</button>
      <button onClick={showWithAction}>With Action</button>
    </div>
  );
}
```

### Breadcrumbs

```typescript
import { useBreadcrumbService, getBreadcrumbs } from "@astroapps/client";

const routes = {
  admin: {
    label: "Admin",
    children: {
      users: { label: "Users" },
      settings: { label: "Settings" },
    },
  },
};

function Breadcrumbs() {
  const nav = useNavigationService();
  const breadcrumbService = useBreadcrumbService();

  // Get breadcrumb links from current path
  const breadcrumbs = getBreadcrumbs(
    routes,
    nav.pathSegments,
    "",
    breadcrumbService.overrideLabels || {}
  );

  return (
    <nav>
      {breadcrumbs.map((crumb, i) => (
        <span key={i}>
          {i > 0 && " / "}
          <a href={crumb.href}>{crumb.label}</a>
        </span>
      ))}
    </nav>
  );
}

// Set custom breadcrumb label dynamically
function UserDetailPage({ userId }: { userId: string }) {
  const breadcrumbs = useBreadcrumbService();

  useEffect(() => {
    fetchUser(userId).then(user => {
      breadcrumbs.setBreadcrumbLabel(
        `/admin/users/${userId}`,
        user.name
      );
    });
  }, [userId]);

  return <div>User details...</div>;
}
```

## Best Practices

### 1. Use Context for Services

```typescript
// ✅ DO - Access services via hooks
const security = useSecurityService();
const nav = useNavigationService();

// ❌ DON'T - Create services inline
const security = new MySecurityService(); // Won't work with AppContext
```

### 2. Sync Important State to URL

```typescript
// ✅ DO - Sync search, filters, pagination to URL for shareability
const searchControl = useSyncParam(queryControl, "q", StringParam);
const pageControl = useSyncParam(queryControl, "page", NumberParam);

// ❌ DON'T - Keep important state only in component
const [search, setSearch] = useState(""); // Lost on page refresh
```

### 3. Handle All Error Scenarios

```typescript
// ✅ DO - Handle specific error codes
await validateAndRunMessages(
  control,
  action,
  {
    400: "Invalid data",
    401: "Please log in",
    403: "Access denied",
    404: "Not found",
    409: "Already exists",
  },
  "An unexpected error occurred"
);

// ❌ DON'T - Use generic error handling
try {
  await action();
} catch (e) {
  alert("Error"); // Not user-friendly
}
```

### 4. Use Automatic Token Injection

```typescript
// ✅ DO - Use security.fetch for authenticated requests
await security.fetch("/api/data");

// ❌ DON'T - Manually add auth headers
await fetch("/api/data", {
  headers: { Authorization: `Bearer ${token}` }
});
```

## Troubleshooting

### Common Issues

**Issue: Services undefined in components**
- **Cause**: Component not wrapped in AppContextProvider
- **Solution**: Ensure AppContextProvider wraps your app root with services in value prop

**Issue: Query parameters not syncing**
- **Cause**: Not calling useDefaultSyncRoute or missing QueryControl
- **Solution**: Use useDefaultSyncRoute with queryControl and navigation service

**Issue: Form errors not displaying after API call**
- **Cause**: Error format doesn't match FluentValidation structure
- **Solution**: Verify backend returns errors in FluentValidation format or use custom error mapping

**Issue: Infinite re-renders with useSyncParam**
- **Cause**: Creating new converter object on each render
- **Solution**: Use provided converters (StringParam, etc.) or memoize custom converters with useMemo

**Issue: Security.fetch not adding Bearer token**
- **Cause**: accessToken not set in UserState
- **Solution**: Ensure login flow sets accessToken in security.currentUser.value

**Issue: Navigation not updating URL**
- **Cause**: Using wrong navigation service or not integrated with router
- **Solution**: Use appropriate navigation service for your framework (e.g., useNextNavigationService for Next.js)

## Package Information

- **Package**: `@astroapps/client`
- **Path**: `astrolabe-client/`
- **Published to**: npm
- **Version**: 2.6.0+
