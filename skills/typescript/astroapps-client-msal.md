# @astroapps/client-msal - Microsoft Authentication Library Integration

## Overview

@astroapps/client-msal provides Microsoft Authentication Library (MSAL) integration for @astroapps/client. It implements the SecurityService interface using Azure AD/Entra ID authentication with support for popup and redirect flows.

**When to use**: Use this library when building React applications that need to authenticate users against Microsoft Azure AD (Entra ID) and use Microsoft identity platform.

**Package**: `@astroapps/client-msal`
**Dependencies**: @astroapps/client, @react-typed-forms/core, @azure/msal-browser, @azure/msal-react, React 18+
**Published to**: npm

## Key Concepts

### 1. useMsalSecurityService Hook

Creates a SecurityService implementation using MSAL for authentication. Handles token acquisition, user login/logout, and maintains authenticated state.

### 2. wrapWithMsalContext Helper

Wraps a React component with the MSAL MsalProvider context, enabling MSAL hooks throughout the component tree.

### 3. Authentication Flows

Supports three authentication flows:
- **Silent**: Acquire tokens silently without user interaction (for refresh)
- **Popup**: Show login popup window (better UX, less disruptive)
- **Redirect**: Full page redirect to Microsoft login (more compatible)

### 4. Token Management

Automatically handles:
- Access token acquisition via `acquireTokenSilent`
- Token refresh when expired
- Active account management
- Session persistence

## Common Patterns

### Basic Setup with MSAL Configuration

```typescript
import { PublicClientApplication } from "@azure/msal-browser";
import { wrapWithMsalContext, useMsalSecurityService } from "@astroapps/client-msal";
import { AppContextProvider } from "@astroapps/client";

// 1. Configure MSAL instance
const msalConfig = {
  auth: {
    clientId: "your-client-id", // Azure AD app registration client ID
    authority: "https://login.microsoftonline.com/your-tenant-id",
    redirectUri: window.location.origin, // Or specific redirect URL
  },
  cache: {
    cacheLocation: "sessionStorage", // or "localStorage"
    storeAuthStateInCookie: false,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

// 2. Create root layout component
function RootLayout({ children }: { children: React.ReactNode }) {
  const security = useMsalSecurityService();
  const navigation = useNavigationService(); // Your navigation service

  return (
    <AppContextProvider value={{ security, navigation }}>
      {children}
    </AppContextProvider>
  );
}

// 3. Wrap with MSAL context
export default wrapWithMsalContext(RootLayout, msalInstance);
```

### Using Custom User Data

```typescript
import { useMsalSecurityService } from "@astroapps/client-msal";

function App() {
  const security = useMsalSecurityService({
    // Fetch additional user data after authentication
    getUserData: async (fetch) => {
      // Use authenticated fetch to get user roles/profile
      const response = await fetch("/api/user/profile");
      const profile = await response.json();

      return {
        name: profile.displayName,
        email: profile.email,
        roles: profile.roles || [],
      };
    },
  });

  return (
    <AppContextProvider value={{ security }}>
      <YourApp />
    </AppContextProvider>
  );
}
```

### Popup Authentication Flow

```typescript
import { useMsalSecurityService } from "@astroapps/client-msal";

function App() {
  const security = useMsalSecurityService({
    // Use popup instead of redirect
    popupRequest: {
      scopes: ["User.Read", "openid", "profile"],
      prompt: "select_account",
    },
    getUserData: async (fetch) => {
      const roles: string[] = [];
      // Fetch roles from your API
      return { roles };
    },
  });

  return <AppContextProvider value={{ security }}>...</AppContextProvider>;
}
```

### Redirect Authentication Flow

```typescript
import { useMsalSecurityService } from "@astroapps/client-msal";

function App() {
  const security = useMsalSecurityService({
    // Use redirect flow (default if popupRequest not provided)
    redirectRequest: {
      scopes: ["User.Read", "openid", "profile"],
      prompt: "select_account",
    },
    // Redirect to specific page after login
    defaultAfterLogin: "/dashboard",
  });

  return <AppContextProvider value={{ security }}>...</AppContextProvider>;
}
```

### Custom Token Scopes

```typescript
import { useMsalSecurityService } from "@astroapps/client-msal";

function App() {
  const security = useMsalSecurityService({
    // Custom scopes for silent token acquisition
    silentRequest: {
      scopes: [
        "api://your-api-id/user.read",
        "api://your-api-id/data.write",
      ],
    },
    // Custom scopes for popup login
    popupRequest: {
      scopes: [
        "User.Read",
        "api://your-api-id/user.read",
        "api://your-api-id/data.write",
      ],
    },
  });

  return <AppContextProvider value={{ security }}>...</AppContextProvider>;
}
```

### Multi-Tenant Configuration

```typescript
import { PublicClientApplication } from "@azure/msal-browser";
import { wrapWithMsalContext, useMsalSecurityService } from "@astroapps/client-msal";

// Multi-tenant Azure AD configuration
const msalConfig = {
  auth: {
    clientId: "your-client-id",
    authority: "https://login.microsoftonline.com/common", // Multi-tenant
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage", // Persist across sessions
    storeAuthStateInCookie: true, // For IE11/Edge compatibility
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

function RootLayout({ children }: { children: React.ReactNode }) {
  const security = useMsalSecurityService({
    getUserData: async (fetch) => {
      // Fetch tenant-specific roles
      const response = await fetch("/api/user/tenant-roles");
      const data = await response.json();
      return { roles: data.roles };
    },
  });

  return (
    <AppContextProvider value={{ security }}>
      {children}
    </AppContextProvider>
  );
}

export default wrapWithMsalContext(RootLayout, msalInstance);
```

### Login Component

```typescript
import { useSecurityService } from "@astroapps/client";

function LoginPage() {
  const security = useSecurityService();
  const user = security.currentUser.value;

  if (user.busy) {
    return <div>Checking authentication...</div>;
  }

  if (user.loggedIn) {
    return (
      <div>
        <h1>Welcome, {user.name}</h1>
        <p>Email: {user.email}</p>
        <p>Roles: {user.roles?.join(", ")}</p>
        <button onClick={() => security.logout()}>Logout</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Please Sign In</h1>
      <button onClick={() => security.login()}>
        Sign in with Microsoft
      </button>
    </div>
  );
}
```

### Protected Route

```typescript
import { useSecurityService } from "@astroapps/client";
import { useEffect } from "react";
import { useNavigationService } from "@astroapps/client";

function ProtectedPage() {
  const security = useSecurityService();
  const navigation = useNavigationService();
  const user = security.currentUser.value;

  useEffect(() => {
    if (!user.busy && !user.loggedIn) {
      // Save current URL for redirect after login
      security.currentUser.fields.afterLoginHref.value = navigation.pathname;
      security.login();
    }
  }, [user.busy, user.loggedIn]);

  if (user.busy) {
    return <div>Loading...</div>;
  }

  if (!user.loggedIn) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div>
      <h1>Protected Content</h1>
      <p>Only authenticated users can see this.</p>
    </div>
  );
}
```

### Role-Based Access Control

```typescript
import { useSecurityService } from "@astroapps/client";

function AdminPanel() {
  const security = useSecurityService();
  const user = security.currentUser.value;

  const hasRole = (role: string) => user.roles?.includes(role) ?? false;

  if (!user.loggedIn) {
    return <div>Please log in</div>;
  }

  if (!hasRole("Admin")) {
    return <div>Access denied. Admin role required.</div>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      {hasRole("SuperAdmin") && (
        <button>Super Admin Actions</button>
      )}
      {hasRole("Moderator") && (
        <button>Moderator Actions</button>
      )}
    </div>
  );
}
```

### Authenticated API Calls

```typescript
import { useSecurityService } from "@astroapps/client";
import { useState } from "react";

function UserProfile() {
  const security = useSecurityService();
  const [profile, setProfile] = useState<any>(null);

  const loadProfile = async () => {
    // security.fetch automatically includes Bearer token
    const response = await security.fetch("/api/user/profile");
    const data = await response.json();
    setProfile(data);
  };

  return (
    <div>
      <button onClick={loadProfile}>Load Profile</button>
      {profile && (
        <pre>{JSON.stringify(profile, null, 2)}</pre>
      )}
    </div>
  );
}
```

### Custom Token Extraction

```typescript
import { useMsalSecurityService } from "@astroapps/client-msal";

function App() {
  const security = useMsalSecurityService({
    // Extract ID token instead of access token
    getTokenFromResult: (result) => result.idToken,

    // Or extract custom token from claims
    getTokenFromResult: (result) => {
      const customToken = result.account?.idTokenClaims?.["custom_token"];
      return customToken || result.accessToken;
    },
  });

  return <AppContextProvider value={{ security }}>...</AppContextProvider>;
}
```

### Custom Request Adjustment

```typescript
import { useMsalSecurityService } from "@astroapps/client-msal";

function App() {
  const security = useMsalSecurityService({
    // Add custom headers to all authenticated requests
    adjustRequest: (req) => {
      const newReq = new Request(req, {
        headers: {
          ...Object.fromEntries(req.headers.entries()),
          "X-Custom-Header": "value",
          "X-Tenant-Id": "your-tenant-id",
        },
      });
      return newReq;
    },
  });

  return <AppContextProvider value={{ security }}>...</AppContextProvider>;
}
```

### Custom URL Storage (for After-Login Redirect)

```typescript
import { useMsalSecurityService } from "@astroapps/client-msal";

function App() {
  const security = useMsalSecurityService({
    // Use localStorage instead of sessionStorage
    urlStorage: () => localStorage,

    // Or use a custom storage implementation
    urlStorage: () => ({
      setItem: (key, value) => {
        // Custom storage logic
        window.customStorage.set(key, value);
      },
      getItem: (key) => {
        return window.customStorage.get(key);
      },
      removeItem: (key) => {
        window.customStorage.remove(key);
      },
    }),
  });

  return <AppContextProvider value={{ security }}>...</AppContextProvider>;
}
```

### Handling Authentication Errors

```typescript
import { useSecurityService } from "@astroapps/client";
import { useEffect, useState } from "react";

function App() {
  const security = useSecurityService();
  const [authError, setAuthError] = useState<string | null>(null);
  const user = security.currentUser.value;

  const handleLogin = async () => {
    try {
      setAuthError(null);
      await security.login();
    } catch (error) {
      console.error("Authentication failed:", error);
      setAuthError("Failed to authenticate. Please try again.");
    }
  };

  return (
    <div>
      {authError && <div className="error">{authError}</div>}
      {!user.loggedIn && (
        <button onClick={handleLogin}>Sign In</button>
      )}
    </div>
  );
}
```

### B2C Configuration

```typescript
import { PublicClientApplication } from "@azure/msal-browser";
import { wrapWithMsalContext, useMsalSecurityService } from "@astroapps/client-msal";

// Azure AD B2C configuration
const msalConfig = {
  auth: {
    clientId: "your-b2c-client-id",
    authority: "https://your-tenant.b2clogin.com/your-tenant.onmicrosoft.com/B2C_1_signupsignin",
    knownAuthorities: ["your-tenant.b2clogin.com"],
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

function RootLayout({ children }: { children: React.ReactNode }) {
  const security = useMsalSecurityService({
    silentRequest: {
      scopes: ["openid", "profile"],
    },
    popupRequest: {
      scopes: ["openid", "profile"],
    },
  });

  return (
    <AppContextProvider value={{ security }}>
      {children}
    </AppContextProvider>
  );
}

export default wrapWithMsalContext(RootLayout, msalInstance);
```

## Best Practices

### 1. Initialize MSAL Instance Once

```typescript
// ✅ DO - Create msalInstance at module level, not in component
const msalInstance = new PublicClientApplication(msalConfig);

export default wrapWithMsalContext(RootLayout, msalInstance);

// ❌ DON'T - Create new instance on each render
function App() {
  const msalInstance = new PublicClientApplication(msalConfig); // Re-creates on each render!
  // ...
}
```

### 2. Use Popup for Better UX

```typescript
// ✅ DO - Use popup for smoother authentication flow
popupRequest: {
  scopes: ["User.Read"],
}

// ⚠️ CAUTION - Redirect interrupts user flow
// Only use redirect if popups are blocked or for compatibility
redirectRequest: {
  scopes: ["User.Read"],
}
```

### 3. Handle Authentication State Properly

```typescript
// ✅ DO - Check both busy and loggedIn states
if (user.busy) {
  return <LoadingSpinner />;
}

if (!user.loggedIn) {
  return <LoginPrompt />;
}

return <AuthenticatedContent />;

// ❌ DON'T - Only check loggedIn
if (!user.loggedIn) {
  // Might show login prompt even during authentication check
}
```

### 4. Use Minimal Scopes

```typescript
// ✅ DO - Request only needed scopes
silentRequest: {
  scopes: ["User.Read", "api://your-api/.default"],
}

// ❌ DON'T - Request unnecessary scopes
silentRequest: {
  scopes: [
    "User.Read",
    "Mail.Read",
    "Calendars.Read",
    "Files.ReadWrite.All", // Too many permissions
  ],
}
```

### 5. Store Tokens Securely

```typescript
// ✅ DO - Use sessionStorage for sensitive apps
cache: {
  cacheLocation: "sessionStorage", // Cleared when browser closes
}

// ⚠️ CAUTION - localStorage persists across sessions
cache: {
  cacheLocation: "localStorage", // Persistent, less secure
}
```

## Troubleshooting

### Common Issues

**Issue: "InteractionRequiredAuthError" during silent token acquisition**
- **Cause**: User needs to re-authenticate (consent required, password changed, etc.)
- **Solution**: Catch the error and call `security.login()` to prompt for authentication

**Issue: "BrowserAuthError: interaction_in_progress"**
- **Cause**: Multiple simultaneous authentication requests
- **Solution**: Check `user.busy` state before calling `login()` or use MSAL's `inProgress` check

**Issue: Login popup blocked by browser**
- **Cause**: Browser popup blocker preventing login window
- **Solution**: Use redirect flow instead of popup, or ensure login is triggered by user action

**Issue: Tokens not included in API requests**
- **Cause**: Not using `security.fetch()` for authenticated requests
- **Solution**: Always use `security.fetch()` instead of native `fetch()` for authenticated API calls

**Issue: "User is not logged in" after successful authentication**
- **Cause**: Active account not set after redirect
- **Solution**: Ensure MSAL redirect handling is properly configured and `handleRedirectPromise` is called

**Issue: Infinite redirect loop**
- **Cause**: Protected page redirecting to itself after authentication
- **Solution**: Set `afterLoginHref` before calling `login()` to redirect to correct page

**Issue: Roles not populated in user state**
- **Cause**: `getUserData` not implemented or not fetching roles
- **Solution**: Implement `getUserData` callback to fetch user roles from your API

**Issue: "AADSTS50058: silent sign-in request sent but no user is signed in"**
- **Cause**: No active account when acquiring token silently
- **Solution**: Ensure user is logged in before calling `acquireTokenSilent`, or handle the error and prompt for login

**Issue: Token expires and requests fail**
- **Cause**: Access token expired and silent refresh failed
- **Solution**: Implement error handling in your API calls to detect 401 errors and re-authenticate

**Issue: Different tenant users cannot log in**
- **Cause**: Single-tenant authority configuration
- **Solution**: Use `https://login.microsoftonline.com/common` for multi-tenant, or configure allowed tenants

## Package Information

- **Package**: `@astroapps/client-msal`
- **Path**: `astrolabe-client-msal/`
- **Published to**: npm
- **Version**: 3.0.0+

## Related Documentation

- [astroapps-client](./astroapps-client.md) - Core client library with SecurityService interface
- [Microsoft MSAL Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/msal-overview) - Official MSAL docs
- [Azure AD App Registration](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app) - Setting up Azure AD apps
