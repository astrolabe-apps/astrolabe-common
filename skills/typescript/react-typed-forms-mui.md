# @react-typed-forms/mui - Material-UI Integration

## Overview

@react-typed-forms/mui provides Material-UI (MUI) integration for @react-typed-forms/core. It offers wrapped MUI components that work seamlessly with typed form state, plus renderers for @react-typed-forms/schemas.

**When to use**: Use this library when building React forms with Material-UI and need form components that integrate with @react-typed-forms/core state management.

**Package**: `@react-typed-forms/mui`
**Dependencies**: @react-typed-forms/core, @mui/material, React 18+
**Published to**: npm

## Key Concepts

### 1. FTextField

Wrapped Material-UI `TextField` component that binds directly to control state, handling value changes and validation display automatically.

### 2. MUI Schema Renderers

Pre-built renderer registrations for @react-typed-forms/schemas that render forms using Material-UI components.

### 3. Form Component Wrappers

MUI-specific wrappers for common form controls (text fields, selects, checkboxes, etc.) that work with Control state.

## Common Patterns

### Basic Form with FTextField

```typescript
import { useControl } from "@react-typed-forms/core";
import { FTextField } from "@react-typed-forms/mui";
import { Button, Stack } from "@mui/material";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginForm() {
  const formState = useControl<LoginForm>({
    email: "",
    password: "",
  });

  const { fields } = formState;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await formState.validate();

    if (formState.isValid) {
      console.log("Login:", formState.value);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <FTextField
          state={fields.email}
          label="Email"
          type="email"
          required
          fullWidth
        />

        <FTextField
          state={fields.password}
          label="Password"
          type="password"
          required
          fullWidth
        />

        <Button type="submit" variant="contained">
          Login
        </Button>
      </Stack>
    </form>
  );
}
```

### FTextField with Validation

```typescript
import { useControl, Validator } from "@react-typed-forms/core";
import { FTextField } from "@react-typed-forms/mui";
import { Stack } from "@mui/material";

const emailValidator: Validator<string> = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? null
    : "Please enter a valid email address";

const minLength = (min: number): Validator<string> => (value) =>
  value.length >= min ? null : `Minimum ${min} characters required`;

function RegistrationForm() {
  const formState = useControl(
    { username: "", email: "", password: "" },
    {
      fields: {
        email: { validator: emailValidator },
        password: { validator: minLength(8) },
      },
    },
  );

  const { fields } = formState;

  return (
    <Stack spacing={2}>
      <FTextField
        state={fields.username}
        label="Username"
        fullWidth
        helperText="Choose a unique username"
      />

      <FTextField
        state={fields.email}
        label="Email Address"
        type="email"
        required
        fullWidth
        // Error automatically shown from validator
      />

      <FTextField
        state={fields.password}
        label="Password"
        type="password"
        required
        fullWidth
        // Error automatically shown from validator
      />
    </Stack>
  );
}
```

### FTextField Variants and Styling

```typescript
import { FTextField } from "@react-typed-forms/mui";
import { Stack } from "@mui/material";

function StyledForm() {
  const formState = useControl({ field1: "", field2: "", field3: "" });
  const { fields } = formState;

  return (
    <Stack spacing={2}>
      {/* Standard variant (default) */}
      <FTextField
        state={fields.field1}
        label="Standard"
        variant="standard"
      />

      {/* Outlined variant */}
      <FTextField
        state={fields.field2}
        label="Outlined"
        variant="outlined"
      />

      {/* Filled variant */}
      <FTextField
        state={fields.field3}
        label="Filled"
        variant="filled"
      />

      {/* With different sizes */}
      <FTextField
        state={fields.field1}
        label="Small"
        size="small"
        fullWidth
      />

      {/* With custom color */}
      <FTextField
        state={fields.field2}
        label="Secondary Color"
        color="secondary"
        fullWidth
      />
    </Stack>
  );
}
```

### Using with @react-typed-forms/schemas

```typescript
import { useControl } from "@react-typed-forms/core";
import {
  buildSchema,
  stringField,
  intField,
  renderControl,
  useControlDefinitionForSchema,
  createFormRenderer,
  defaultFormEditHooks,
} from "@react-typed-forms/schemas";
import { muiTextFieldRenderer } from "@react-typed-forms/mui";

interface UserForm {
  firstName: string;
  lastName: string;
  age: number;
  email: string;
}

const userSchema = buildSchema<UserForm>({
  firstName: stringField("First Name", { required: true }),
  lastName: stringField("Last Name", { required: true }),
  age: intField("Age", { min: 18 }),
  email: stringField("Email", { required: true }),
});

// Create renderer with MUI components
const muiRenderer = createFormRenderer([
  muiTextFieldRenderer("outlined"), // Use outlined variant
]);

export default function MuiSchemaForm() {
  const data = useControl<UserForm>({
    firstName: "",
    lastName: "",
    age: 18,
    email: "",
  });

  const controlDefinition = useControlDefinitionForSchema(userSchema);

  return (
    <div className="p-4">
      {renderControl(controlDefinition, data, {
        fields: userSchema,
        renderer: muiRenderer,
        hooks: defaultFormEditHooks,
      })}
    </div>
  );
}
```

### Select/Dropdown with FTextField

```typescript
import { useControl } from "@react-typed-forms/core";
import { FTextField } from "@react-typed-forms/mui";
import { MenuItem } from "@mui/material";

interface SettingsForm {
  theme: string;
  language: string;
  timezone: string;
}

function SettingsForm() {
  const formState = useControl<SettingsForm>({
    theme: "light",
    language: "en",
    timezone: "UTC",
  });

  const { fields } = formState;

  return (
    <>
      <FTextField
        state={fields.theme}
        label="Theme"
        select
        fullWidth
      >
        <MenuItem value="light">Light</MenuItem>
        <MenuItem value="dark">Dark</MenuItem>
        <MenuItem value="auto">Auto</MenuItem>
      </FTextField>

      <FTextField
        state={fields.language}
        label="Language"
        select
        fullWidth
      >
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="es">Spanish</MenuItem>
        <MenuItem value="fr">French</MenuItem>
      </FTextField>

      <FTextField
        state={fields.timezone}
        label="Timezone"
        select
        fullWidth
      >
        <MenuItem value="UTC">UTC</MenuItem>
        <MenuItem value="America/New_York">Eastern Time</MenuItem>
        <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
      </FTextField>
    </>
  );
}
```

### Multiline Text Fields

```typescript
import { useControl } from "@react-typed-forms/core";
import { FTextField } from "@react-typed-forms/mui";

interface FeedbackForm {
  subject: string;
  message: string;
  additionalInfo: string;
}

function FeedbackForm() {
  const formState = useControl<FeedbackForm>({
    subject: "",
    message: "",
    additionalInfo: "",
  });

  const { fields } = formState;

  return (
    <>
      <FTextField
        state={fields.subject}
        label="Subject"
        fullWidth
      />

      <FTextField
        state={fields.message}
        label="Message"
        multiline
        rows={4}
        fullWidth
        required
      />

      <FTextField
        state={fields.additionalInfo}
        label="Additional Information"
        multiline
        minRows={2}
        maxRows={6}
        fullWidth
      />
    </>
  );
}
```

### Helper Text and Icons

```typescript
import { useControl } from "@react-typed-forms/core";
import { FTextField } from "@react-typed-forms/mui";
import { InputAdornment } from "@mui/material";
import { Email, Lock, Search } from "@mui/icons-material";

function FormWithIcons() {
  const formState = useControl({
    email: "",
    password: "",
    search: "",
  });

  const { fields } = formState;

  return (
    <>
      <FTextField
        state={fields.email}
        label="Email"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email />
            </InputAdornment>
          ),
        }}
        helperText="We'll never share your email"
      />

      <FTextField
        state={fields.password}
        label="Password"
        type="password"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock />
            </InputAdornment>
          ),
        }}
        helperText="At least 8 characters"
      />

      <FTextField
        state={fields.search}
        label="Search"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />
    </>
  );
}
```

### Complete Form Example

```typescript
import { useControl, notEmpty, Validator } from "@react-typed-forms/core";
import { FTextField } from "@react-typed-forms/mui";
import {
  Button,
  Stack,
  Card,
  CardContent,
  CardActions,
  Typography,
  MenuItem,
} from "@mui/material";

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  category: string;
}

const emailValidator: Validator<string> = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? null
    : "Invalid email address";

const phoneValidator: Validator<string> = (value) =>
  /^\d{3}-\d{3}-\d{4}$/.test(value)
    ? null
    : "Phone must be in format: 555-555-5555";

export default function ContactFormExample() {
  const formState = useControl<ContactForm>(
    {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
      category: "general",
    },
    {
      fields: {
        name: { validator: notEmpty("Name is required") },
        email: { validator: emailValidator },
        phone: { validator: phoneValidator },
        message: { validator: notEmpty("Message is required") },
      },
    },
  );

  const { fields } = formState;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await formState.validate();

    if (formState.isValid) {
      console.log("Submit:", formState.value);
      // Reset form after submission
      formState.setValue({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        category: "general",
      });
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Contact Us
          </Typography>

          <Stack spacing={2}>
            <FTextField
              state={fields.name}
              label="Name"
              required
              fullWidth
            />

            <FTextField
              state={fields.email}
              label="Email"
              type="email"
              required
              fullWidth
            />

            <FTextField
              state={fields.phone}
              label="Phone"
              placeholder="555-555-5555"
              fullWidth
            />

            <FTextField
              state={fields.category}
              label="Category"
              select
              fullWidth
            >
              <MenuItem value="general">General Inquiry</MenuItem>
              <MenuItem value="support">Technical Support</MenuItem>
              <MenuItem value="sales">Sales</MenuItem>
              <MenuItem value="feedback">Feedback</MenuItem>
            </FTextField>

            <FTextField
              state={fields.subject}
              label="Subject"
              fullWidth
            />

            <FTextField
              state={fields.message}
              label="Message"
              required
              multiline
              rows={4}
              fullWidth
            />
          </Stack>
        </CardContent>

        <CardActions>
          <Button
            type="button"
            onClick={() => formState.resetValue()}
            disabled={!formState.dirty}
          >
            Reset
          </Button>
          <Button type="submit" variant="contained">
            Submit
          </Button>
        </CardActions>
      </form>
    </Card>
  );
}
```

## Best Practices

### 1. Use fullWidth for Consistent Sizing

```typescript
// ✅ DO - Use fullWidth for consistent form layout
<FTextField state={fields.email} label="Email" fullWidth />

// ❌ DON'T - Mix sized and non-sized fields
<FTextField state={fields.email} label="Email" />
<FTextField state={fields.name} label="Name" fullWidth />
```

### 2. Leverage MUI Variants

```typescript
// ✅ DO - Choose appropriate variant for your design
<FTextField state={fields.field} variant="outlined" /> // Most common
<FTextField state={fields.field} variant="filled" />   // For filled designs
<FTextField state={fields.field} variant="standard" /> // For minimal designs

// ⚠️ CAUTION - Be consistent within a form
```

### 3. Provide Helper Text

```typescript
// ✅ DO - Help users understand requirements
<FTextField
  state={fields.password}
  label="Password"
  type="password"
  helperText="At least 8 characters with uppercase and number"
/>

// ❌ DON'T - Leave users guessing
<FTextField state={fields.password} label="Password" type="password" />
```

### 4. Use Required Prop for Visual Indicator

```typescript
// ✅ DO - Mark required fields
<FTextField state={fields.email} label="Email" required />

// Note: This just adds visual indicator (*), validation still needs validator
```

## Troubleshooting

### Common Issues

**Issue: Validation errors not displaying**
- **Cause**: FTextField shows errors automatically, but only after validation runs
- **Solution**: Call `await formState.validate()` before checking errors

**Issue: Select dropdown not working**
- **Cause**: Missing `select` prop or children not MenuItem components
- **Solution**: Add `select` prop and use MUI `MenuItem` for options

**Issue: Type errors with FTextField**
- **Cause**: State type doesn't match TextField value type
- **Solution**: Ensure control state type matches the input type (string for text, number for number inputs)

**Issue: Helper text showing even with error**
- **Cause**: FTextField prioritizes error over helperText
- **Solution**: This is expected behavior - errors replace helper text when present

**Issue: Icons not showing in InputAdornment**
- **Cause**: Missing @mui/icons-material package
- **Solution**: Install `@mui/icons-material` separately

**Issue: Multiline field not expanding**
- **Cause**: Both rows and maxRows set to same value
- **Solution**: Use `minRows` and `maxRows` for auto-expanding, or just `rows` for fixed size

## Package Information

- **Package**: `@react-typed-forms/mui`
- **Path**: `mui/`
- **Published to**: npm
- **GitHub**: https://github.com/doolse/react-typed-forms

## Related Documentation

- [react-typed-forms-core](./react-typed-forms-core.md) - Core form state management
- [react-typed-forms-schemas](./react-typed-forms-schemas.md) - Schema-driven forms
- [Material-UI](https://mui.com/) - MUI component library
