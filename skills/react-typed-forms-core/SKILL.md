---
name: react-typed-forms-core
description: Core TypeScript/React library for type-safe form state management with useControl hook, Finput component, and built-in validation. Use when building React forms needing type-safe state, validation, and change tracking.
---

# @react-typed-forms/core - Type-Safe Form State Management

## Overview

@react-typed-forms/core is the foundational TypeScript/React library for type-safe form state management. It provides a hook-based API for managing form state with built-in validation, change tracking, and type safety without runtime overhead.

**When to use**: Use this library when building React forms that need type-safe state management, validation, and change tracking. It's the core library that all other Astrolabe form libraries build upon.

**Package**: `@react-typed-forms/core`
**Dependencies**: React 18+
**Extensions**: @react-typed-forms/schemas, @react-typed-forms/mui
**Published to**: npm

## Key Concepts

### 1. Control State

Form state is managed by `Control` objects that wrap values and provide methods for reading/writing state, validation, and change tracking.

### 2. useControl Hook

The primary hook for creating reactive form state in React components. Automatically triggers re-renders when state changes.

### 3. Finput Component

Built-in input component that binds directly to control state, handling value changes and validation display.

### 4. Validators

Functions that validate control values and return error messages. Can be synchronous or asynchronous.

### 5. Fields Access

Controls for object types provide a `fields` property for accessing nested control state with full type safety.

## Common Patterns

### Basic Form with useControl

```typescript
import { Finput, useControl, notEmpty } from "@react-typed-forms/core";
import React, { useState } from "react";

interface SimpleForm {
  firstName: string;
  lastName: string;
  email: string;
}

export default function SimpleExample() {
  const formState = useControl<SimpleForm>(
    {
      firstName: "",
      lastName: "",
      email: ""
    },
    {
      fields: {
        lastName: { validator: notEmpty("Required field") },
        email: { validator: notEmpty("Required field") }
      }
    }
  );

  const fields = formState.fields;
  const [formData, setFormData] = useState<SimpleForm>();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (formState.isValid) {
          setFormData(formState.value);
        }
      }}
    >
      <label>First Name</label>
      <Finput type="text" control={fields.firstName} />

      <label>Last Name *</label>
      <Finput type="text" control={fields.lastName} />

      <label>Email *</label>
      <Finput type="email" control={fields.email} />

      <button type="submit">Submit</button>

      {formData && (
        <pre>{JSON.stringify(formData, null, 2)}</pre>
      )}
    </form>
  );
}
```

### Custom Validators

```typescript
import { useControl, Validator, RenderControl } from "@react-typed-forms/core";

// Simple validator
const minLength = (min: number, message?: string): Validator<string> => (value) =>
  value.length < min ? message ?? `Minimum ${min} characters required` : null;

// Email validator
const emailValidator: Validator<string> = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "Invalid email address";

// Numeric range validator
const numberRange = (min: number, max: number): Validator<number> => (value) =>
  value < min || value > max ? `Must be between ${min} and ${max}` : null;

// Usage
function MyForm() {
  const formState = useControl(
    { email: "", password: "", age: 0 },
    {
      fields: {
        email: { validator: emailValidator },
        password: { validator: minLength(8, "Password must be at least 8 characters") },
        age: { validator: numberRange(18, 120) }
      }
    }
  );

  return (
    <form>
      <Finput type="email" control={formState.fields.email} />
      {formState.fields.email.error && <span className="error">{formState.fields.email.error}</span>}

      <Finput type="password" control={formState.fields.password} />
      {formState.fields.password.error && <span className="error">{formState.fields.password.error}</span>}

      <Finput type="number" control={formState.fields.age} />
      {formState.fields.age.error && <span className="error">{formState.fields.age.error}</span>}
    </form>
  );
}
```

### Async Validators

```typescript
import { useControl, Validator } from "@react-typed-forms/core";

// Check if username is available
const usernameAvailable: Validator<string> = async (value) => {
  if (!value) return "Username is required";

  const response = await fetch(`/api/check-username?username=${value}`);
  const data = await response.json();

  return data.available ? null : "Username is already taken";
};

function RegistrationForm() {
  const formState = useControl(
    { username: "", email: "", password: "" },
    {
      fields: {
        username: {
          validator: usernameAvailable,
          validateOnChange: true // Validate as user types (debounced)
        }
      }
    }
  );

  const { fields } = formState;

  return (
    <form>
      <label>Username</label>
      <Finput type="text" control={fields.username} />
      {fields.username.error && <span>{fields.username.error}</span>}
      {fields.username.isValidating && <span>Checking...</span>}
    </form>
  );
}
```

### Nested Objects and Arrays

```typescript
import { useControl, Finput } from "@react-typed-forms/core";

interface Address {
  street: string;
  city: string;
  zipCode: string;
}

interface Person {
  name: string;
  address: Address;
  phoneNumbers: string[];
}

function PersonForm() {
  const formState = useControl<Person>({
    name: "",
    address: { street: "", city: "", zipCode: "" },
    phoneNumbers: [""]
  });

  const { fields } = formState;

  return (
    <form>
      {/* Simple field */}
      <label>Name</label>
      <Finput type="text" control={fields.name} />

      {/* Nested object */}
      <fieldset>
        <legend>Address</legend>
        <label>Street</label>
        <Finput type="text" control={fields.address.fields.street} />

        <label>City</label>
        <Finput type="text" control={fields.address.fields.city} />

        <label>Zip Code</label>
        <Finput type="text" control={fields.address.fields.zipCode} />
      </fieldset>

      {/* Array of values */}
      <fieldset>
        <legend>Phone Numbers</legend>
        {fields.phoneNumbers.elements.map((phoneControl, index) => (
          <div key={index}>
            <Finput type="tel" control={phoneControl} />
            <button
              type="button"
              onClick={() => fields.phoneNumbers.removeAt(index)}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fields.phoneNumbers.appendValue("")}
        >
          Add Phone Number
        </button>
      </fieldset>

      <pre>{JSON.stringify(formState.value, null, 2)}</pre>
    </form>
  );
}
```

### Change Tracking (Dirty State)

```typescript
import { useControl } from "@react-typed-forms/core";

function FormWithChangeTracking() {
  const formState = useControl(
    { name: "John Doe", email: "john@example.com" },
    { trackChanges: true }
  );

  const { fields } = formState;

  return (
    <div>
      <Finput type="text" control={fields.name} />
      <Finput type="email" control={fields.email} />

      {/* Show if form has unsaved changes */}
      {formState.dirty && (
        <div className="warning">You have unsaved changes</div>
      )}

      <button onClick={() => {
        // Save changes...
        formState.setOriginalValue(formState.value); // Mark as saved
      }}>
        Save
      </button>

      <button onClick={() => {
        formState.resetValue(); // Reset to original value
      }}>
        Reset
      </button>
    </div>
  );
}
```

### Manual Control Manipulation

```typescript
import { useControl } from "@react-typed-forms/core";

function ManualControlExample() {
  const formState = useControl({ count: 0, name: "" });

  return (
    <div>
      {/* Read current value */}
      <p>Count: {formState.fields.count.value}</p>

      {/* Set value programmatically */}
      <button onClick={() => formState.fields.count.setValue(formState.fields.count.value + 1)}>
        Increment
      </button>

      {/* Set multiple values */}
      <button onClick={() => {
        formState.setValue({
          count: 0,
          name: "Reset"
        });
      }}>
        Reset All
      </button>

      {/* Trigger validation */}
      <button onClick={async () => {
        await formState.validate();
        if (formState.isValid) {
          console.log("Form is valid!", formState.value);
        }
      }}>
        Validate
      </button>

      {/* Check validation state */}
      <p>Valid: {formState.isValid ? "Yes" : "No"}</p>
      <p>Dirty: {formState.dirty ? "Yes" : "No"}</p>
    </div>
  );
}
```

## Best Practices

### 1. Use Type-Safe Field Access

```typescript
// ✅ DO - Use fields property for type safety
const { fields } = formState;
<Finput control={fields.firstName} />
<Finput control={fields.email} />

// ❌ DON'T - Access fields by string (loses type safety)
<Finput control={formState.control["firstName"]} />
```

### 2. Extract Field Controls for Cleaner Code

```typescript
// ✅ DO - Destructure fields at component top
function MyForm() {
  const formState = useControl({ name: "", email: "" });
  const { name, email } = formState.fields;

  return (
    <>
      <Finput control={name} />
      <Finput control={email} />
    </>
  );
}

// ❌ DON'T - Repeat formState.fields everywhere
<Finput control={formState.fields.name} />
<Finput control={formState.fields.email} />
```

### 3. Validate on Submit, Not on Change

```typescript
// ✅ DO - Validate on submit for better UX
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await formState.validate();
  if (formState.isValid) {
    // Submit form
  }
};

// ⚠️ CAUTION - validateOnChange can be annoying for users
const formState = useControl(defaultValue, {
  fields: {
    email: {
      validator: emailValidator,
      validateOnChange: true // Shows errors while typing
    }
  }
});
```

### 4. Use Built-in Validators

```typescript
// ✅ DO - Use provided validators
import { notEmpty, minLength } from "@react-typed-forms/core";

{ validator: notEmpty("This field is required") }
{ validator: minLength(8) }

// ❌ DON'T - Reimplement common validators
{ validator: (v) => v ? null : "Required" } // Reinventing the wheel
```

## Troubleshooting

### Common Issues

**Issue: Form not re-rendering on state change**
- **Cause**: Not using `useControl` hook or accessing `.value` directly
- **Solution**: Always use `useControl` and access state through control properties

**Issue: Validation errors not showing**
- **Cause**: Not calling `validate()` or validator not configured correctly
- **Solution**: Call `await formState.validate()` before checking `isValid`

**Issue: TypeScript errors with nested fields**
- **Cause**: TypeScript can't infer deeply nested types
- **Solution**: Explicitly type the form state: `useControl<MyFormType>(...)`

**Issue: Array elements not updating correctly**
- **Cause**: Not using proper array methods
- **Solution**: Use `appendValue`, `removeAt`, `insertAt` methods instead of direct array manipulation

**Issue: Async validators not running**
- **Cause**: Forgot to await validation
- **Solution**: Always `await formState.validate()` for async validators to complete

**Issue: Form resets on component re-render**
- **Cause**: Creating new default value object on each render
- **Solution**: Use `useState` or `useMemo` for default value:
  ```typescript
  const defaultValue = useMemo(() => ({ name: "", email: "" }), []);
  const formState = useControl(defaultValue);
  ```

## Package Information

- **Package**: `@react-typed-forms/core`
- **Path**: `core/`
- **Published to**: npm
- **GitHub**: https://github.com/doolse/react-typed-forms
