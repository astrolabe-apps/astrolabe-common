# Packages With Source Changes Since Their Last Version Bump

## TypeScript/Node.js Packages

| Package | Current Version | Changes |
|---------|-----------------|---------|
| **@astrolabe/ui** | 0.2.0 | 57+ files changed - UI components, auth forms, SmsMfa integration, navigation Link |
| **@astroapps/forms-core** | 2.0.1 | `defaultSchemaInterface.ts` - datetime parsing fixes, NaN handling |
| **@react-typed-forms/mui** | 4.0.2 | 7 files - FAutocomplete, FCheckList, FDateField, FMultiSelect, FNumberField, FRadioButton, FSelectAutocomplete |
| **@react-typed-forms/schemas-html** | 5.0.0 | HtmlCheckButtons, SelectDataRenderer - dropdown/radio disabled fixes |
| **@react-typed-forms/schemas-rn** | 2.0.0 | DefaultDialogRenderer, RNCheckButtons, RNDateTimePickerRenderer, RNSelectRenderer - scrolling, timezone, styling |

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

### Patch updates

- `@astroapps/forms-core`: **2.0.1 → 2.0.2**
- `@react-typed-forms/mui`: **4.0.2 → 4.0.3**
- `@react-typed-forms/schemas-html`: **5.0.0 → 5.0.1**
- `@react-typed-forms/schemas-rn`: **2.0.0 → 2.0.1**

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

### @astroapps/forms-core (2.0.1)

**Location:** `forms/core/`

**Last version bump:** 2025-11-05

**Changed files:**
- `forms/core/src/defaultSchemaInterface.ts`

**Key commits:**
- Needs to be NaN for exceptions in parsing
- It needs to parse a datetime, not just date
- Use internationalised/date to avoid power pages problems

---

### @react-typed-forms/mui (4.0.2)

**Location:** `mui/`

**Last version bump:** 2025-02-16

**Changed files:**
- `mui/src/FAutocomplete.tsx`
- `mui/src/FCheckList.tsx`
- `mui/src/FDateField.tsx`
- `mui/src/FMultiSelect.tsx`
- `mui/src/FNumberField.tsx`
- `mui/src/FRadioButton.tsx`
- `mui/src/FSelectAutocomplete.tsx`

**Key commits:**
- Tsup with babel for core packages
- Allow disabling to be selected
- Fix build

---

### @react-typed-forms/schemas-html (5.0.0)

**Location:** `schemas-html/`

**Last version bump:** 2025-11-05

**Changed files:**
- `schemas-html/src/components/HtmlCheckButtons.tsx`
- `schemas-html/src/components/SelectDataRenderer.tsx`

**Key commits:**
- Dropdown menu will not show empty option after selecting an option if its required
- Fix radio button group disabled state

---

### @react-typed-forms/schemas-rn (2.0.0)

**Location:** `schemas-rn/`

**Last version bump:** 2025-11-05

**Changed files:**
- `schemas-rn/src/components/DefaultDialogRenderer.tsx`
- `schemas-rn/src/components/RNCheckButtons.tsx`
- `schemas-rn/src/components/RNDateTimePickerRenderer.tsx`
- `schemas-rn/src/components/RNSelectRenderer.tsx`

**Key commits:**
- Improve select renderer
- Fix date rendering
- Make the content scrollable
- Fix radio button group disabled state

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
