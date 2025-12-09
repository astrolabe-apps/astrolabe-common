---
name: astroapps-client-localusers
description: React hooks for local user authentication UI including login, signup, password reset, MFA, and account management. Use when building authentication pages for email/password authentication instead of OAuth providers.
---

# @astroapps/client-localusers - Local User Authentication UI

## Overview

@astroapps/client-localusers provides pre-built React hooks and utilities for implementing local user authentication flows. It covers login, signup, password reset, email verification, MFA, and account management with form state management and validation.

**When to use**: Use this library when building authentication pages for applications using local user accounts (email/password authentication) instead of external providers like MSAL or OAuth.

**Package**: `@astroapps/client-localusers`
**Dependencies**: @astroapps/client, @react-typed-forms/core, React 18+
**Published to**: npm

## Key Concepts

### 1. Authentication Page Hooks

Pre-built hooks that handle form state, validation, and error handling for common authentication pages:
- Login, Signup, Logout
- Password reset (forgot/reset)
- Email verification
- MFA (Multi-factor authentication)
- Account management (change password/email/MFA number)

### 2. AuthPageSetup Configuration

Centralized configuration for customizing error messages, route paths, and query parameter names across all authentication pages.

### 3. Form Data Interfaces

TypeScript interfaces defining the structure of authentication forms, ensuring type safety.

### 4. Automatic Error Handling

Hooks automatically map HTTP status codes to user-friendly error messages and display them on relevant form fields.

## Common Patterns

### Setting Up AuthPageSetup

```typescript
import { AuthPageSetupContext, defaultUserAuthPageSetup } from "@astroapps/client-localusers";

// Customize authentication configuration
const customAuthSetup = {
  ...defaultUserAuthPageSetup,
  hrefs: {
    login: "/auth/login",
    signup: "/auth/signup",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    mfa: "/auth/mfa",
  },
  errors: {
    ...defaultUserAuthPageSetup.errors,
    emptyUsername: "Email address is required",
    emptyPassword: "Password is required",
    credentials: "Invalid email or password",
  },
};

function App({ children }: { children: React.ReactNode }) {
  return (
    <AuthPageSetupContext.Provider value={customAuthSetup}>
      {children}
    </AuthPageSetupContext.Provider>
  );
}
```

### Login Page

```typescript
import { useLoginPage, LoginFormData } from "@astroapps/client-localusers";
import { useSecurityService } from "@astroapps/client";
import { Finput } from "@react-typed-forms/core";

export default function LoginPage() {
  const security = useSecurityService();

  const { control, authenticate } = useLoginPage(
    async (loginData: LoginFormData) => {
      // Call your backend API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      if (!response.ok) {
        throw response; // Hook handles error mapping
      }

      const { accessToken, user } = await response.json();

      // Update security service with logged-in user
      security.currentUser.value = {
        loggedIn: true,
        accessToken,
        name: user.name,
        email: user.email,
        roles: user.roles || [],
      };
    }
  );

  const { fields } = control;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await authenticate();
    if (success) {
      // Redirect to dashboard or intended page
      window.location.href = "/dashboard";
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email</label>
        <Finput type="email" control={fields.username} />
        {fields.username.error && <span className="error">{fields.username.error}</span>}
      </div>

      <div>
        <label>Password</label>
        <Finput type="password" control={fields.password} />
        {fields.password.error && <span className="error">{fields.password.error}</span>}
      </div>

      <div>
        <label>
          <Finput type="checkbox" control={fields.rememberMe} />
          Remember me
        </label>
      </div>

      <button type="submit">Sign In</button>
      <a href="/auth/forgot-password">Forgot password?</a>
      <a href="/auth/signup">Create account</a>
    </form>
  );
}
```

### Signup Page

```typescript
import { useSignupPage, SignupFormData, emptySignupForm } from "@astroapps/client-localusers";
import { Finput } from "@react-typed-forms/core";

export default function SignupPage() {
  const { control, createAccount } = useSignupPage(
    emptySignupForm,
    async (signupData: SignupFormData) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      });

      if (!response.ok) {
        throw response;
      }

      return response.json();
    }
  );

  const { fields } = control;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createAccount();
    if (success) {
      // Show success message or redirect to email verification
      alert("Account created! Please check your email to verify.");
      window.location.href = "/auth/login";
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email</label>
        <Finput type="email" control={fields.email} />
        {fields.email.error && <span className="error">{fields.email.error}</span>}
      </div>

      <div>
        <label>Password</label>
        <Finput type="password" control={fields.password} />
        {fields.password.error && <span className="error">{fields.password.error}</span>}
      </div>

      <div>
        <label>Confirm Password</label>
        <Finput type="password" control={fields.confirm} />
        {fields.confirm.error && <span className="error">{fields.confirm.error}</span>}
      </div>

      <button type="submit">Create Account</button>
      <a href="/auth/login">Already have an account? Sign in</a>
    </form>
  );
}
```

### Custom Signup Form with Additional Fields

```typescript
import { useSignupPage, SignupFormData } from "@astroapps/client-localusers";
import { Finput } from "@react-typed-forms/core";

// Extend SignupFormData with additional fields
interface ExtendedSignupForm extends SignupFormData {
  firstName: string;
  lastName: string;
  companyName: string;
}

const emptyExtendedSignupForm: ExtendedSignupForm = {
  email: "",
  password: "",
  confirm: "",
  firstName: "",
  lastName: "",
  companyName: "",
};

export default function ExtendedSignupPage() {
  const { control, createAccount } = useSignupPage(
    emptyExtendedSignupForm,
    async (signupData: ExtendedSignupForm) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      });

      if (!response.ok) {
        throw response;
      }

      return response.json();
    }
  );

  const { fields } = control;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createAccount();
    if (success) {
      window.location.href = "/auth/verify";
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>First Name</label>
        <Finput type="text" control={fields.firstName} />
      </div>

      <div>
        <label>Last Name</label>
        <Finput type="text" control={fields.lastName} />
      </div>

      <div>
        <label>Company Name</label>
        <Finput type="text" control={fields.companyName} />
      </div>

      <div>
        <label>Email</label>
        <Finput type="email" control={fields.email} />
        {fields.email.error && <span className="error">{fields.email.error}</span>}
      </div>

      <div>
        <label>Password</label>
        <Finput type="password" control={fields.password} />
        {fields.password.error && <span className="error">{fields.password.error}</span>}
      </div>

      <div>
        <label>Confirm Password</label>
        <Finput type="password" control={fields.confirm} />
        {fields.confirm.error && <span className="error">{fields.confirm.error}</span>}
      </div>

      <button type="submit">Create Account</button>
    </form>
  );
}
```

### Forgot Password Page

```typescript
import { useForgotPasswordPage } from "@astroapps/client-localusers";
import { Finput } from "@react-typed-forms/core";

export default function ForgotPasswordPage() {
  const { control, requestResetPassword } = useForgotPasswordPage(
    async (email: string) => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw response;
      }

      return response.json();
    }
  );

  const { fields } = control;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await requestResetPassword();
    if (success) {
      alert("Password reset email sent! Please check your inbox.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Forgot Password</h1>
      <p>Enter your email address and we'll send you a link to reset your password.</p>

      <div>
        <label>Email</label>
        <Finput type="email" control={fields.email} />
        {fields.email.error && <span className="error">{fields.email.error}</span>}
      </div>

      <button type="submit">Send Reset Link</button>
      <a href="/auth/login">Back to login</a>
    </form>
  );
}
```

### Reset Password Page

```typescript
import { useResetPasswordPage } from "@astroapps/client-localusers";
import { Finput } from "@react-typed-forms/core";

export default function ResetPasswordPage() {
  const { control, resetPassword } = useResetPasswordPage(
    async (resetCode: string, passwordData) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetCode,
          password: passwordData.password,
        }),
      });

      if (!response.ok) {
        throw response;
      }

      return response.json();
    }
  );

  const { fields } = control;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await resetPassword();
    if (success) {
      alert("Password reset successful!");
      window.location.href = "/auth/login";
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Reset Password</h1>

      <div>
        <label>New Password</label>
        <Finput type="password" control={fields.password} />
        {fields.password.error && <span className="error">{fields.password.error}</span>}
      </div>

      <div>
        <label>Confirm Password</label>
        <Finput type="password" control={fields.confirm} />
        {fields.confirm.error && <span className="error">{fields.confirm.error}</span>}
      </div>

      <button type="submit">Reset Password</button>
    </form>
  );
}
```

### MFA (Multi-Factor Authentication) Page

```typescript
import { useMfaPage, MfaFormData } from "@astroapps/client-localusers";
import { Finput } from "@react-typed-forms/core";
import { useSecurityService } from "@astroapps/client";

export default function MfaPage() {
  const security = useSecurityService();

  const { control, authenticate, send } = useMfaPage(
    async (mfaData: MfaFormData) => {
      const response = await fetch("/api/auth/mfa-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mfaData),
      });

      if (!response.ok) {
        throw response;
      }

      const { accessToken, user } = await response.json();

      security.currentUser.value = {
        loggedIn: true,
        accessToken,
        name: user.name,
        email: user.email,
        roles: user.roles || [],
      };
    },
    async (mfaData: MfaFormData) => {
      // Send new MFA code
      const response = await fetch("/api/auth/mfa-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: mfaData.token }),
      });

      if (!response.ok) {
        throw response;
      }

      return response.json();
    }
  );

  const { fields } = control;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await authenticate();
    if (success) {
      window.location.href = "/dashboard";
    }
  };

  const handleResendCode = async () => {
    const success = await send();
    if (success) {
      alert("New code sent!");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Two-Factor Authentication</h1>
      <p>Please enter the code sent to your phone.</p>

      <div>
        <label>Verification Code</label>
        <Finput type="text" control={fields.code} />
        {fields.code.error && <span className="error">{fields.code.error}</span>}
      </div>

      <button type="submit">Verify</button>
      <button type="button" onClick={handleResendCode}>
        Resend Code
      </button>
    </form>
  );
}
```

### Change Password Page

```typescript
import { useChangePasswordPage } from "@astroapps/client-localusers";
import { Finput } from "@react-typed-forms/core";

export default function ChangePasswordPage() {
  const { control, changePassword } = useChangePasswordPage(
    async (passwordData) => {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordData),
      });

      if (!response.ok) {
        throw response;
      }

      return response.json();
    }
  );

  const { fields } = control;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await changePassword();
    if (success) {
      alert("Password changed successfully!");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Change Password</h1>

      <div>
        <label>Current Password</label>
        <Finput type="password" control={fields.oldPassword} />
        {fields.oldPassword.error && <span className="error">{fields.oldPassword.error}</span>}
      </div>

      <div>
        <label>New Password</label>
        <Finput type="password" control={fields.password} />
        {fields.password.error && <span className="error">{fields.password.error}</span>}
      </div>

      <div>
        <label>Confirm New Password</label>
        <Finput type="password" control={fields.confirm} />
        {fields.confirm.error && <span className="error">{fields.confirm.error}</span>}
      </div>

      <button type="submit">Change Password</button>
    </form>
  );
}
```

### Custom Error Messages

```typescript
import { useLoginPage } from "@astroapps/client-localusers";

export default function LoginPageWithCustomErrors() {
  const { control, authenticate } = useLoginPage(
    async (loginData) => {
      // Your authentication logic
    },
    {
      // Custom status code mappings
      401: "Invalid email or password. Please try again.",
      403: "Your account has been locked. Please contact support.",
      429: "Too many login attempts. Please try again later.",
      500: "Server error. Please try again later.",
    }
  );

  // Rest of component...
}
```

## Best Practices

### 1. Wrap App with AuthPageSetupContext

```typescript
// ✅ DO - Provide auth configuration at app root
function App({ children }) {
  return (
    <AuthPageSetupContext.Provider value={customAuthSetup}>
      {children}
    </AuthPageSetupContext.Provider>
  );
}

// ❌ DON'T - Use default configuration without customization
// Default messages may not fit your app's tone
```

### 2. Handle Success Cases Explicitly

```typescript
// ✅ DO - Check return value and handle success
const success = await authenticate();
if (success) {
  window.location.href = "/dashboard";
}

// ❌ DON'T - Ignore return value
await authenticate(); // No success handling
```

### 3. Display Field-Specific Errors

```typescript
// ✅ DO - Show errors next to relevant fields
{fields.password.error && <span className="error">{fields.password.error}</span>}

// ❌ DON'T - Show generic error only
{control.error && <div>{control.error}</div>}
```

### 4. Use Type-Safe Form Extensions

```typescript
// ✅ DO - Extend existing interfaces
interface CustomSignupForm extends SignupFormData {
  firstName: string;
  lastName: string;
}

// ❌ DON'T - Create incompatible interfaces
interface CustomSignup { // Missing required fields
  email: string;
  // Missing password and confirm
}
```

## Troubleshooting

### Common Issues

**Issue: Errors not displaying on form fields**
- **Cause**: Hook expects response to be thrown, not returned
- **Solution**: Use `throw response` instead of `return response` when API call fails

**Issue: "verificationCode" query parameter not found**
- **Cause**: URL query parameter name doesn't match configuration
- **Solution**: Customize `queryParams.verifyCode` in AuthPageSetup to match your URL structure

**Issue: Custom error messages not showing**
- **Cause**: Not passing custom errors object to hook
- **Solution**: Pass errors as second parameter: `useLoginPage(authenticate, customErrors)`

**Issue: Form validation not running**
- **Cause**: Not calling the provided action function (e.g., `authenticate()`)
- **Solution**: Always call the hook's action function, don't directly call your API function

**Issue: Reset password code not extracted from URL**
- **Cause**: Query parameter name mismatch
- **Solution**: Ensure URL uses `resetCode` parameter or customize `queryParams.resetCode`

**Issue: MFA token missing**
- **Cause**: Token not passed in URL query parameter
- **Solution**: Ensure redirect to MFA page includes `token` query parameter

**Issue: Password confirmation not validated**
- **Cause**: Server-side validation only
- **Solution**: Add client-side validator to confirm field to check it matches password field

**Issue: Authentication succeeds but user not redirected**
- **Cause**: Not checking return value of authenticate function
- **Solution**: Check if `await authenticate()` returns `true` before redirecting

## Package Information

- **Package**: `@astroapps/client-localusers`
- **Path**: `astrolabe-client-localusers/`
- **Published to**: npm
- **Version**: 1.0.0+
