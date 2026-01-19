# Packages With Source Changes Since Their Last Version Bump

## TypeScript/Node.js Packages

| Package | Current Version | Changes |
|---------|-----------------|---------|
| **@astrolabe/ui** | 0.2.0 | 57+ files changed - UI components, auth forms, SmsMfa integration, navigation Link |

## C# Projects

| Project | Current Version | Changes |
|---------|-----------------|---------|
| **Astrolabe.Common** | 1.1.0 | `RecordExtensions.cs` - dynamic properties, Control<T> with ControlBehavior |
| **Astrolabe.LocalUsers** | 3.0.0 | 9 files - split change password endpoints (authenticated/unauthenticated), [Authorize] annotations |
| **Astrolabe.Schemas** | 7.2.0 | 22 files - major refactoring: dynamic properties, reactive children, Control<T> behavior, evaluators |

---

## Recommended Version Bumps

### Minor/Major updates

- `@astrolabe/ui`: **0.2.0 → 0.3.0** (significant feature additions)
- `Astrolabe.Schemas`: **7.2.0 → 8.0.0** (major refactoring, potential breaking changes)
- `Astrolabe.LocalUsers`: **3.0.0 → 3.1.0** (API endpoint changes)
- `Astrolabe.Common`: **1.1.0 → 1.2.0** (new features)

---

## Detailed Changes

### @astrolabe/ui (0.2.0)

**Location:** `astrolabe-ui/`

**Last version bump:** 2025-01-12

**Changes since version bump:** Extensive changes across 57+ files including:
- UI components: Accordion, AutocompleteInput, Button, CircularProgress, Dialog, Pagination, Popover, Tabs, Textfield, Toast, Tooltip, and more
- Table components: DataTable, DataTableView, FilterPopover, SortableHeader
- User authentication forms: LoginForm, SignupForm, MfaForm, ChangePasswordForm, ForgotPasswordForm, ResetPasswordForm, VerifyForm
- New features: SmsMfa component, navigation service Link integration

**Key commits:**
- Tsup with babel for core packages
- New localusers package integration
- Use SmsMfa component for MfaForm, ResetPasswordForm, and VerifyForm
- Split change password endpoint into two for authenticated/unauthenticated
- Allow ResetPasswordForm to work without MFA

---

### Astrolabe.Common (1.1.0)

**Location:** `Astrolabe.Common/`

**Last version bump:** 2024-03-22

**Changed files:**
- `Astrolabe.Common/RecordExtensions.cs`

**Key commits:**
- Dynamic properties
- Tests back to where they were
- Control<T> with ControlBehavior

---

### Astrolabe.LocalUsers (3.0.0)

**Location:** `Astrolabe.LocalUsers/`

**Last version bump:** 2024-10-07

**Changed files:**
- `AbstractLocalUserController.cs`
- `AbstractLocalUserService.cs`
- `AuthenticateRequest.cs`
- `ChangePassword.cs`
- `ILocalUserService.cs`
- `MfaAuthenticateRequest.cs`
- `MfaCodeRequest.cs`
- `ResetPassword.cs`
- `ResetPasswordValidator.cs`

**Key commits:**
- Add [Authorize] annotation to internal change endpoints
- Split change password endpoint into two for authenticated/unauthenticated

---

### Astrolabe.Schemas (7.2.0)

**Location:** `Astrolabe.Schemas/`

**Last version bump:** 2025-07-31

**Changed files:** 22 files including:
- `ChildNodeSpec.cs`
- `ControlDataVisitor.cs`
- `ControlDefinition.cs`
- `ControlDefinitionExtensions.cs`
- `DefaultSchemaInterface.cs`
- `DynamicPropertyHelpers.cs`
- `EntityExpressionExtensions.cs`
- `FormStateImpl.cs`
- `FormStateNode.cs`
- `FormStateNodeBuilder.cs`
- `FormStateNodeExtensions.cs`
- `IFormStateNode.cs`
- `ISchemaInterface.cs`
- `ISchemaNode.cs`
- `ReactiveExpressionEvaluator.cs`
- `SchemaDataNode.cs`
- Multiple evaluators in `Evaluators/` directory

**Key commits:**
- Dynamic properties support
- Control<T> with ControlBehavior
- Reactive children and reactivity improvements
- Big rename refactoring
- Basic evaluators
- Accordion group renderer and other UI features
