# Validation Implementation Plan for Astrolabe.Schemas

## Executive Summary

This document outlines the plan to implement a comprehensive validation system in Astrolabe.Schemas (.NET) that mirrors the validation architecture already implemented in the TypeScript `@react-typed-forms/core` library.

**Current State:**
- ✅ Validator type definitions exist in `SchemaValidator.cs` (JsonataValidator, DateValidator, LengthValidator)
- ✅ Validators can be attached to `DataControlDefinition` via the `Validators` property
- ✅ Validators are included in `SchemaField` via the `Validators` property
- ❌ No execution engine or evaluation context for validators
- ❌ No integration with the `IControl` system for error handling
- ❌ No reactive validation setup in FormStateNode

**Goal:**
Implement a fully functional validation system that:
1. Evaluates validators synchronously (using reactive subscriptions)
2. Sets errors on controls when validation fails
3. Integrates with visibility and reactive property system
4. Supports custom validator extensibility
5. Handles required field validation
6. Supports multiple validators with proper error priority

---

## 🎉 Key Research Findings

After comprehensive codebase analysis, **most infrastructure already exists**:

### ✅ What's Already Built:
1. **Error Management Complete** - `IControl.Errors`, `SetError()`, `ClearErrors()` fully implemented
2. **Reactive System Ready** - `ControlEditor`, `ChangeTracker`, computed fields all working
3. **Jsonata Integrated** - `Jsonata.Net.Native v2.4.2` already in use for expressions
4. **Change Notifications** - `ControlChange` enum includes `Validate`, `Error`, `Valid` flags
5. **Cleanup Pattern** - `IDisposable` pattern established in FormStateNode
6. **Validator Types** - All validator type definitions already exist
7. **Schema Interface** - `IsEmptyValue()` method already implemented

### 🚀 Implementation Simplified:
- **No Control System Changes** - Error tracking fully functional
- **No Async/Await Needed** - Use reactive subscriptions (like TypeScript)
- **No New Dependencies** - Jsonata library already included
- **No Lifecycle Changes** - Add single `InitializeValidation()` method to constructor
- **Follow Existing Patterns** - Mirror `ReactiveExpressionEvaluators` for validator registry

### 📊 Updated Estimates:
- **Original:** 8-11 weeks
- **Updated:** 5-7 weeks (37% faster)
- **Reason:** Infrastructure complete, patterns established, no breaking changes needed

---

## Architecture Overview

### 1. TypeScript Reference Architecture

The TypeScript implementation has these key components:

**A. Validator Evaluation Context (`ValidationEvalContext`)**
```typescript
interface ValidationEvalContext {
  addSync(validate: (value: unknown) => string | undefined | null): void;
  addCleanup(cleanup: () => void): void;
  validationEnabled: Control<boolean>;
  parentData: SchemaDataNode;
  data: SchemaDataNode;
  schemaInterface: SchemaInterface;
  variables?: VariablesFunc;
  runAsync(af: () => void): void;
}
```

**B. Validator Evaluators**
- Type: `ValidatorEval<T> = (validation: T, context: ValidationEvalContext) => void`
- Implementations: `jsonataValidator`, `lengthValidator`, `dateValidator`
- Registry: `defaultValidators` dictionary

**C. Validation Setup**
- `createValidators()` - Creates validator functions from definitions
- `setupValidation()` - Sets up reactive validation effects
- Integration with visibility (only validates when visible)
- Sync validators run in order, first error wins
- Async validators (jsonata) use reactive effects

**D. Error Management**
- Multiple error keys supported on Control
- "default" key for sync validators
- "jsonata" key for jsonata validators
- Control tracks all errors, validity based on absence of errors

---

## Implementation Plan

### Phase 1: Core Validation Infrastructure

#### 1.1 Create ValidationEvalContext Interface
**File:** `Astrolabe.Schemas/Validation/ValidationEvalContext.cs`

```csharp
namespace Astrolabe.Schemas.Validation;

public interface IValidationEvalContext
{
    void AddSync(Func<object?, string?> validate);
    void AddCleanup(Action cleanup);
    IControl<bool> ValidationEnabled { get; }
    SchemaDataNode ParentData { get; }
    SchemaDataNode Data { get; }
    ISchemaInterface SchemaInterface { get; }
    Func<Action<object?>, IDictionary<string, object?>>? Variables { get; }
    void RunAsync(Action asyncFunc);
}
```

**Implementation:**
```csharp
public class ValidationEvalContext : IValidationEvalContext
{
    private readonly List<Func<object?, string?>> _syncValidators = new();
    private readonly List<Action> _cleanups = new();

    public void AddSync(Func<object?, string?> validate) => _syncValidators.Add(validate);
    public void AddCleanup(Action cleanup) => _cleanups.Add(cleanup);
    public IControl<bool> ValidationEnabled { get; init; }
    public SchemaDataNode ParentData { get; init; }
    public SchemaDataNode Data { get; init; }
    public ISchemaInterface SchemaInterface { get; init; }
    public Func<Action<object?>, IDictionary<string, object?>>? Variables { get; init; }
    public void RunAsync(Action asyncFunc) { /* Implementation */ }

    public IEnumerable<Func<object?, string?>> GetSyncValidators() => _syncValidators;
    public void Cleanup() => _cleanups.ForEach(c => c());
}
```

#### 1.2 Create Validator Evaluator Delegate Type
**File:** `Astrolabe.Schemas/Validation/ValidatorEval.cs`

```csharp
namespace Astrolabe.Schemas.Validation;

public delegate void ValidatorEval<in T>(T validation, IValidationEvalContext context)
    where T : SchemaValidator;
```

#### 1.3 Extend IControl Interface
**Location:** `Astrolabe.Controls/IControl.cs`

Add error management capabilities:
```csharp
public interface IControl
{
    // Existing properties...

    // New error management
    IDictionary<string, string?> Errors { get; }
    string? Error { get; } // Primary/first error
    bool Valid { get; }
    void SetError(string key, string? error);
    void ClearErrors();
    void Validate(); // Trigger validation
}
```

---

### Phase 2: Validator Implementations

#### 2.1 Length Validator
**File:** `Astrolabe.Schemas/Validation/Validators/LengthValidatorEval.cs`

```csharp
public static class LengthValidatorEval
{
    public static void Evaluate(LengthValidator lv, IValidationEvalContext context)
    {
        context.AddSync(value =>
        {
            var field = context.Data.Schema.Field;
            var control = context.Data.Control;
            var len = context.SchemaInterface.ControlLength(field, control);

            if (lv.Min != null && len < lv.Min)
            {
                if (field.Collection == true)
                {
                    // Auto-expand arrays to min length
                    // (Implementation detail)
                }
                else
                {
                    return context.SchemaInterface.ValidationMessageText(
                        field,
                        ValidationMessageType.MinLength,
                        len,
                        lv.Min.Value
                    );
                }
            }
            else if (lv.Max != null && len > lv.Max)
            {
                return context.SchemaInterface.ValidationMessageText(
                    field,
                    ValidationMessageType.MaxLength,
                    len,
                    lv.Max.Value
                );
            }

            return null;
        });
    }
}
```

#### 2.2 Date Validator
**File:** `Astrolabe.Schemas/Validation/Validators/DateValidatorEval.cs`

```csharp
public static class DateValidatorEval
{
    public static void Evaluate(DateValidator dv, IValidationEvalContext context)
    {
        var field = context.Data.Schema.Field;
        var comparisonDate = CalculateComparisonDate(dv, context.SchemaInterface, field);

        context.AddSync(value =>
        {
            if (value == null) return null;

            var valueDate = context.SchemaInterface.ParseToMillis(field, value);
            var notAfter = dv.Comparison == DateComparison.NotAfter;

            if (notAfter ? valueDate > comparisonDate : valueDate < comparisonDate)
            {
                return context.SchemaInterface.ValidationMessageText(
                    field,
                    notAfter ? ValidationMessageType.NotAfterDate
                             : ValidationMessageType.NotBeforeDate,
                    valueDate,
                    comparisonDate
                );
            }

            return null;
        });
    }

    private static long CalculateComparisonDate(DateValidator dv,
        ISchemaInterface si, SchemaField field)
    {
        if (dv.FixedDate != null)
            return si.ParseToMillis(field, dv.FixedDate);

        var now = DateTime.UtcNow.Date;
        var millis = new DateTimeOffset(now).ToUnixTimeMilliseconds();

        if (dv.DaysFromCurrent != null)
            millis += dv.DaysFromCurrent.Value * 86400000;

        return millis;
    }
}
```

#### 2.3 Jsonata Validator
**File:** `Astrolabe.Schemas/Validation/Validators/JsonataValidatorEval.cs`

```csharp
public static class JsonataValidatorEval
{
    public static void Evaluate(JsonataValidator jv, IValidationEvalContext context)
    {
        // Create reactive computation for jsonata evaluation
        var errorComputed = ControlEditor.MakeComputed<string?>(
            () => null,
            context.Data.Control
        );

        // Evaluate jsonata expression reactively
        EntityExpressionExtensions.EvaluateJsonata(
            jv.Expression,
            new ExpressionEvalContext
            {
                DataNode = context.ParentData,
                SchemaInterface = context.SchemaInterface,
                Variables = context.Variables,
                OnResult = result =>
                {
                    // Set jsonata-specific error
                    context.Data.Control.SetError("jsonata", result?.ToString());
                },
                RunAsync = context.RunAsync
            }
        );
    }
}
```

#### 2.4 Required Validator
**File:** `Astrolabe.Schemas/Validation/Validators/RequiredValidatorEval.cs`

```csharp
public static class RequiredValidatorEval
{
    public static void Evaluate(DataControlDefinition def, IValidationEvalContext context)
    {
        if (def.Required != true) return;

        context.AddSync(value =>
        {
            var field = context.Data.Schema.Field;
            var isEmpty = context.SchemaInterface.IsEmptyValue(field, value);

            if (isEmpty)
            {
                return !string.IsNullOrEmpty(def.RequiredErrorText)
                    ? def.RequiredErrorText
                    : context.SchemaInterface.ValidationMessageText(
                        field,
                        ValidationMessageType.NotEmpty,
                        false,
                        true
                    );
            }

            return null;
        });
    }
}
```

---

### Phase 3: Validator Registry and Factory

#### 3.1 Create Validator Registry
**File:** `Astrolabe.Schemas/Validation/ValidatorRegistry.cs`

```csharp
public static class ValidatorRegistry
{
    private static readonly Dictionary<string, ValidatorEval<SchemaValidator>>
        _evaluators = new();

    static ValidatorRegistry()
    {
        Register(ValidatorType.Length.ToString(),
            (v, ctx) => LengthValidatorEval.Evaluate((LengthValidator)v, ctx));
        Register(ValidatorType.Date.ToString(),
            (v, ctx) => DateValidatorEval.Evaluate((DateValidator)v, ctx));
        Register(ValidatorType.Jsonata.ToString(),
            (v, ctx) => JsonataValidatorEval.Evaluate((JsonataValidator)v, ctx));
    }

    public static void Register<T>(string type, ValidatorEval<T> eval)
        where T : SchemaValidator
    {
        _evaluators[type] = (v, ctx) => eval((T)v, ctx);
    }

    public static ValidatorEval<SchemaValidator>? Get(string type)
    {
        return _evaluators.TryGetValue(type, out var eval) ? eval : null;
    }
}
```

#### 3.2 Create Validator Factory
**File:** `Astrolabe.Schemas/Validation/ValidationFactory.cs`

```csharp
public static class ValidationFactory
{
    public static void CreateValidators(
        ControlDefinition def,
        IValidationEvalContext context)
    {
        if (def is not DataControlDefinition dcd) return;

        // Add required validator
        RequiredValidatorEval.Evaluate(dcd, context);

        // Add configured validators
        if (dcd.Validators == null) return;

        foreach (var validator in dcd.Validators)
        {
            var evaluator = ValidatorRegistry.Get(validator.Type);
            evaluator?.Invoke(validator, context);
        }
    }
}
```

---

### Phase 4: Integration with FormStateNode

#### 4.1 Add Validation Setup to FormStateNode
**File:** `Astrolabe.Schemas/FormStateNodeBuilder.cs` (or equivalent)

```csharp
public static class ValidationSetup
{
    public static void SetupValidation(
        IControl scope,
        Func<Action<object?>, IDictionary<string, object?>>? variables,
        ControlDefinition definition,
        IControl<SchemaDataNode?> dataNode,
        ISchemaInterface schemaInterface,
        SchemaDataNode parent,
        IControl<bool?> visible,
        Action<Action> runAsync)
    {
        var validationEnabled = ControlEditor.MakeComputed(
            () => visible.Value == true,
            scope
        );

        var validatorsScope = new DisposableScope();

        ControlEditor.OnChange(dataNode, dn =>
        {
            validatorsScope.Dispose();

            if (dn == null) return;

            var context = new ValidationEvalContext
            {
                Data = dn,
                ParentData = parent,
                ValidationEnabled = validationEnabled,
                SchemaInterface = schemaInterface,
                Variables = variables,
                RunAsync = runAsync
            };

            // Create validators
            ValidationFactory.CreateValidators(definition, context);

            // Setup sync validation effect
            ControlEditor.OnChange(dn.Control, value =>
            {
                if (!validationEnabled.Value)
                {
                    dn.Control.SetError("default", null);
                    return;
                }

                string? error = null;
                foreach (var validator in context.GetSyncValidators())
                {
                    error = validator(value);
                    if (error != null) break;
                }

                dn.Control.SetError("default", error);
            }, validatorsScope);
        }, scope);
    }
}
```

#### 4.2 Integrate into FormStateNode Initialization
**Location:** Where FormStateNode is created/initialized

Add call to `ValidationSetup.SetupValidation()` during form state node initialization, similar to how it's done in TypeScript's `initFormState()` function (line 664 of formStateNode.ts).

---

### Phase 5: ISchemaInterface Extensions

#### 5.1 Add Validation Methods to ISchemaInterface
**File:** `Astrolabe.Schemas/ISchemaInterface.cs`

```csharp
public interface ISchemaInterface
{
    // Existing methods...

    // Validation support
    int ControlLength(SchemaField? field, IControl control);
    bool IsEmptyValue(SchemaField? field, object? value);
    string ValidationMessageText(
        SchemaField? field,
        ValidationMessageType messageType,
        object? actualValue,
        object? expectedValue);
    long ParseToMillis(SchemaField? field, object? value);
}
```

#### 5.2 Implement Default Schema Interface Methods
**File:** `Astrolabe.Schemas/DefaultSchemaInterface.cs`

```csharp
public class DefaultSchemaInterface : ISchemaInterface
{
    public int ControlLength(SchemaField? field, IControl control)
    {
        if (control.IsArray) return control.Count;
        if (control.Value is string str) return str.Length;
        return 0;
    }

    public bool IsEmptyValue(SchemaField? field, object? value)
    {
        if (value == null) return true;
        if (value is string str) return string.IsNullOrWhiteSpace(str);
        if (field?.Collection == true && value is IEnumerable enumerable)
            return !enumerable.Cast<object>().Any();
        return false;
    }

    public string ValidationMessageText(
        SchemaField? field,
        ValidationMessageType messageType,
        object? actualValue,
        object? expectedValue)
    {
        return messageType switch
        {
            ValidationMessageType.NotEmpty => "This field is required",
            ValidationMessageType.MinLength =>
                $"Length must be at least {expectedValue}",
            ValidationMessageType.MaxLength =>
                $"Length must be less than {expectedValue}",
            ValidationMessageType.NotAfterDate =>
                $"Date must not be after {FormatDate(expectedValue)}",
            ValidationMessageType.NotBeforeDate =>
                $"Date must not be before {FormatDate(expectedValue)}",
            _ => "Validation error"
        };
    }

    public long ParseToMillis(SchemaField? field, object? value)
    {
        return value switch
        {
            DateTime dt => new DateTimeOffset(dt).ToUnixTimeMilliseconds(),
            DateTimeOffset dto => dto.ToUnixTimeMilliseconds(),
            DateOnly d => new DateTimeOffset(d.ToDateTime(TimeOnly.MinValue))
                .ToUnixTimeMilliseconds(),
            string s when DateTime.TryParse(s, out var dt) =>
                new DateTimeOffset(dt).ToUnixTimeMilliseconds(),
            _ => 0
        };
    }

    private static string FormatDate(object? value)
    {
        // Format milliseconds back to readable date
        if (value is long millis)
        {
            var dto = DateTimeOffset.FromUnixTimeMilliseconds(millis);
            return dto.ToString("yyyy-MM-dd");
        }
        return value?.ToString() ?? "";
    }
}
```

#### 5.3 Add ValidationMessageType Enum
**File:** `Astrolabe.Schemas/ValidationMessageType.cs`

```csharp
namespace Astrolabe.Schemas;

public enum ValidationMessageType
{
    NotEmpty,
    MinLength,
    MaxLength,
    NotAfterDate,
    NotBeforeDate
}
```

---

### Phase 6: Control System Updates

#### 6.1 Update Control Implementation
**File:** `Astrolabe.Controls/Control.cs` (or equivalent)

Add error tracking:
```csharp
public class Control<T> : IControl<T>
{
    private readonly Dictionary<string, string?> _errors = new();

    public IDictionary<string, string?> Errors => _errors;

    public string? Error => _errors.Values.FirstOrDefault(e => e != null);

    public bool Valid => !_errors.Any(kvp => kvp.Value != null);

    public void SetError(string key, string? error)
    {
        if (error == null)
            _errors.Remove(key);
        else
            _errors[key] = error;

        NotifyChange(ControlChange.Validate);
    }

    public void ClearErrors()
    {
        _errors.Clear();
        NotifyChange(ControlChange.Validate);
    }

    public void Validate()
    {
        NotifyChange(ControlChange.Validate);
    }
}
```

#### 6.2 Add ControlChange.Validate
**File:** `Astrolabe.Controls/ControlChange.cs`

```csharp
public enum ControlChange
{
    Value,
    Structure,
    Validate, // NEW
    Disabled,
    Touched
}
```

---

### Phase 7: Testing Infrastructure

#### 7.1 Unit Tests for Validators
**File:** `Astrolabe.Schemas.Tests/Validation/ValidatorTests.cs`

```csharp
public class ValidatorTests
{
    [Fact]
    public void RequiredValidator_EmptyValue_ReturnsError()
    {
        // Test required validation
    }

    [Theory]
    [InlineData(5, 10, 7, true)]  // Within range
    [InlineData(5, 10, 3, false)] // Below min
    [InlineData(5, 10, 12, false)] // Above max
    public void LengthValidator_VariousLengths_ValidatesCorrectly(
        int min, int max, int length, bool expectedValid)
    {
        // Test length validation
    }

    [Fact]
    public void DateValidator_NotBefore_ValidatesCorrectly()
    {
        // Test date validation
    }

    [Fact]
    public async Task JsonataValidator_Expression_EvaluatesAsync()
    {
        // Test jsonata validation
    }

    [Fact]
    public void MultipleValidators_FirstErrorWins()
    {
        // Test error priority
    }
}
```

#### 7.2 Integration Tests
**File:** `Astrolabe.Schemas.Tests/Validation/ValidationIntegrationTests.cs`

```csharp
public class ValidationIntegrationTests
{
    [Fact]
    public void FormStateNode_WithValidators_ValidatesOnChange()
    {
        // Test full integration with form state
    }

    [Fact]
    public void Visibility_HiddenControl_DisablesValidation()
    {
        // Test visibility integration
    }

    [Fact]
    public void FormStateNode_Validate_ReturnsValidity()
    {
        // Test validate() method
    }
}
```

---

## Research Findings - Outstanding Questions RESOLVED

### 1. ✅ Control System Architecture
**Answer:** YES - The `Astrolabe.Controls` system has ALL required features already implemented:

**Multiple Error Keys:**
- ✅ `IControl.Errors` returns `IReadOnlyDictionary<string, string>` (IControl.cs:15)
- ✅ `Control<T>` has private `_errors` dictionary (Control.cs:15)
- ✅ `SetError(string key, string? message)` method exists (ControlEditor.cs:165-168)
- ✅ `ClearErrors()` method exists (ControlEditor.cs:170-173)

**Change Notification Types:**
- ✅ `ControlChange` enum exists with: Value, Valid, Touched, Disabled, Error, Dirty, InitialValue, Structure, Validate (ControlChange.cs:4-17)
- ✅ Subscriptions support change masks via `Subscribe(ChangeListenerFunc, ControlChange mask)` (IControl.cs:41)

**Reactive Computations:**
- ✅ `ControlEditor.SetComputed<T>()` exists (ControlEditor.cs:220-238)
- ✅ `ControlEditor.SetComputedWithPrevious<T>()` exists (ControlEditor.cs:260-279)
- ✅ `Control.CreateComputed()` factory method exists (Control.cs:1031-1053)
- ✅ `ChangeTracker` class for dependency tracking (used in evaluators)

**Implementation Status:** READY - No changes needed to Control system for validation

---

### 2. ✅ Reactive System Integration
**Answer:** The .NET reactive system mirrors TypeScript `@astroapps/controls` and is fully functional:

**Architecture:**
- ✅ Based on `ChangeTracker` for dependency tracking (similar to TypeScript)
- ✅ `ControlEditor` manages transactions and batches updates (ControlEditor.cs:3-280)
- ✅ `ControlEditor.RunInTransaction()` batches changes (ControlEditor.cs:9-24)
- ✅ Subscriptions with cleanup via `IDisposable` pattern

**Cleanup/Scope Management:**
- ✅ `IDisposable` return values for reactive computations
- ✅ `FormStateNode` tracks `_disposables` list for cleanup (FormStateNode.cs:15, 501-508)
- ✅ Reactive expressions return `IDisposable` via `ReactiveExpressionExtensions.SetupReactiveExpression()` (ReactiveExpressionEvaluator.cs:107-128)

**Effect Tracking:**
- ✅ `ChangeTracker.Evaluate()` sets up reactive computations
- ✅ `ChangeTracker.SetCallback()` for update callbacks
- ✅ `ChangeTracker.UpdateSubscriptions()` establishes dependencies
- ✅ Control subscriptions managed via `Subscriptions` class

**Implementation Status:** READY - Pattern already established in FormStateNode

---

### 3. ✅ Async Validation Execution
**Answer:** Synchronous reactive system - NO async/await needed:

**Pattern:**
- ✅ Validation is **synchronous** using reactive subscriptions
- ✅ "Async" validators (jsonata) use **reactive effects**, not Task-based async
- ✅ Reactive updates happen synchronously within `ControlEditor` transactions
- ✅ No `async/await` in the TypeScript implementation either

**Jsonata Evaluation:**
- ✅ Jsonata expressions evaluate synchronously via `Jsonata.Net.Native` library
- ✅ Reactive subscriptions track dependencies and re-evaluate on changes
- ✅ Results propagate through control system synchronously

**Implementation Status:** CLARIFIED - Use reactive subscriptions, not async/await

---

### 4. ✅ Jsonata Expression Evaluation
**Answer:** **Jsonata.Net.Native v2.4.2** is ALREADY IN USE in the codebase:

**Current Implementation:**
- ✅ Package reference in `Astrolabe.Schemas.csproj`: `Jsonata.Net.Native.SystemTextJson v2.4.2` (line 24)
- ✅ Already used in `EntityExpressionExtensions.cs` (lines 5-6, 41-56)
- ✅ `JsonataExpression` type exists (EntityExpression.cs:43-44)
- ✅ Evaluation pattern: `new JsonataQuery(expr).Eval(jsonDocument)` (EntityExpressionExtensions.cs:49-50)

**Integration Example:**
```csharp
// From EntityExpressionExtensions.cs:45-56
bool RunJsonata(string expr)
{
    var jsonNode = data.ValueObject as JsonNode ??
        JsonSerializer.SerializeToNode(data.ValueObject);
    var result = new JsonataQuery(expr).Eval(
        JsonataExtensions.FromSystemTextJson(
            JsonDocument.Parse(jsonNode?.ToJsonString() ?? "{}")));
    if (result.Type == JTokenType.Boolean)
        return (bool)result;
    return false;
}
```

**Implementation Status:** READY - Library already integrated and working

---

### 5. ✅ FormStateNode Initialization Order
**Answer:** Validation setup should occur DURING constructor after dataNode initialization:

**Current Initialization Pattern (FormStateNode.cs:20-92):**
1. Create `_stateControl` (line 44-56)
2. **InitializeDataNode()** - Sets up reactive dataNode (line 61, 165-174)
3. Initialize dynamic properties (lines 63-76)
4. Initialize computed state flags (lines 82-84)
5. Initialize children (lines 87-91)

**Validation Integration Point:**
- ✅ Add validation setup AFTER `InitializeDataNode()` (after line 61)
- ✅ Add method call: `InitializeValidation(definition)`
- ✅ Pattern matches other `Initialize*()` methods (lines 63-80)
- ✅ Validation needs `dataNode` to be reactive first (dependency on line 61)

**Implementation Pattern:**
```csharp
// Add after line 61 in FormStateNode constructor:
InitializeValidation(definition);

private void InitializeValidation(ControlDefinition originalDefinition)
{
    if (originalDefinition is not DataControlDefinition dcd) return;

    // Create validation enabled control based on visibility
    var validationEnabledField = _stateControl.Field(x => x.ValidationEnabled);
    _editor.SetComputed(validationEnabledField, tracker => {
        var visible = tracker.TrackValue(_stateControl, x => x.Visible);
        return visible == true;
    });

    // Setup validators... (similar to TypeScript setupValidation)
}
```

**Implementation Status:** CLARIFIED - Integration point identified

---

### 6. ✅ Error Propagation to UI
**Answer:** Errors propagate through IControl interface, accessible via FormStateNode.DataNode:

**Error Flow:**
1. Validator sets error: `control.SetError("default", "error message")` → `ControlEditor.SetError()`
2. Control stores error in `_errors` dictionary and fires `ControlChange.Error` event
3. Control's `IsValid` property becomes `false` (based on `Errors.Count` and child validity)
4. Parent controls notified via `NotifyParentsOfValidityChange()` (Control.cs:373-386)
5. UI binds to: `FormStateNode.DataNode.Control.Errors` or `FormStateNode.DataNode.Control.IsValid`

**Access Points for UI:**
- ✅ `IControl.Errors` - Dictionary of all errors by key (IControl.cs:15)
- ✅ `IControl.IsValid` - Computed from errors + child validity (IControl.cs:14)
- ✅ `IControl.HasErrors` - Quick check for any errors (IControl.cs:22)
- ✅ `FormStateNode.DataNode?.Control` - Access control from form state node

**Change Notifications:**
- ✅ `ControlChange.Error` fired on error changes (ControlChange.cs:13)
- ✅ `ControlChange.Valid` fired on validity changes (ControlChange.cs:7)
- ✅ UI subscribes to these changes via `control.Subscribe(listener, ControlChange.Error | ControlChange.Valid)`

**Implementation Status:** READY - Standard pattern already in place

---

### 7. ✅ Custom Validator Registration
**Answer:** YES - Registry supports runtime registration with existing pattern:

**Current Pattern (ReactiveExpressionEvaluators.cs:42-64):**
```csharp
public static class ReactiveExpressionEvaluators
{
    private static readonly Dictionary<string, ExpressionEvaluator<EntityExpression>>
        _evaluators = new();

    public static void Register<T>(string expressionType, ExpressionEvaluator<T> evaluator)
        where T : EntityExpression
    {
        _evaluators[expressionType] = (expr, ctx, returnResult) =>
            evaluator((T)expr, ctx, returnResult);
    }
}
```

**Validator Registry Pattern:**
- ✅ Use same pattern: `ValidatorRegistry.Register<T>(string type, ValidatorEval<T> eval)`
- ✅ Static dictionary for global registration (like ReactiveExpressionEvaluators)
- ✅ Type-safe generic registration method
- ✅ Runtime registration supported (call Register before validation setup)

**Extension Point:**
```csharp
// Applications can register custom validators:
ValidatorRegistry.Register<CustomValidator>(
    "Custom",
    (validator, context) => { /* custom logic */ }
);
```

**Dependency Injection:** NOT NEEDED - Static registry is simpler and matches existing patterns

**Implementation Status:** PATTERN ESTABLISHED - Follow ReactiveExpressionEvaluators model

---

### 8. ⚠️ Localization
**Answer:** NO built-in localization system found - needs decision:

**Current State:**
- ❌ No localization infrastructure in Astrolabe.Schemas or Astrolabe.Controls
- ✅ Validation messages hardcoded in English (will be in DefaultSchemaInterface)
- ✅ `SchemaField.RequiredText` allows override per field
- ✅ `DataControlDefinition.RequiredErrorText` allows override per control

**Options:**

**Option A: ISchemaInterface Override (RECOMMENDED)**
- Applications provide custom `ISchemaInterface` implementation
- Override `ValidationMessageText()` method with localized messages
- Simple, no new dependencies
- Follows existing extensibility pattern

**Option B: Resource Files**
- Add `Resources.resx` file to Astrolabe.Schemas
- Use `ResourceManager` for messages
- Standard .NET pattern but adds coupling

**Option C: Message Templating Service**
- Add `IValidationMessageProvider` interface
- Inject via DI or static accessor
- Most flexible but more complex

**Recommendation:** Option A (ISchemaInterface override) for Phase 1, defer others to Phase 5

**Implementation Status:** DECISION NEEDED (Low priority - can use defaults initially)

---

### 9. ✅ Array Auto-Expansion
**Answer:** YES - TypeScript does auto-expand, should mirror in .NET for consistency:

**TypeScript Behavior (validators.ts:74-77):**
```typescript
if (field?.collection) {
    control.setValue((v) =>
        Array.isArray(v)
            ? v.concat(Array.from({ length: lv.min! - v.length }))
            : Array.from({ length: lv.min! }));
}
```

**C# Implementation:**
```csharp
if (field.Collection == true)
{
    var currentArray = control.ValueObject as ICollection;
    var currentLength = currentArray?.Count ?? 0;
    if (currentLength < lv.Min)
    {
        // Use ControlEditor to add elements
        var editor = new ControlEditor();
        for (int i = currentLength; i < lv.Min; i++)
        {
            editor.AddElement(control, null); // Add null elements
        }
    }
}
```

**Rationale:**
- ✅ Provides better UX (automatically fixes validation issue)
- ✅ Maintains feature parity with TypeScript
- ✅ Consistent behavior across platforms

**Implementation Status:** DECIDED - Include auto-expansion in LengthValidator

---

### 10. ✅ Performance Considerations
**Answer:** Built-in batching via ControlEditor transactions - additional optimization NOT needed initially:

**Current Performance Features:**
- ✅ `ControlEditor.RunInTransaction()` batches all changes (ControlEditor.cs:9-24)
- ✅ Listeners run AFTER transaction completes, not during (ControlEditor.cs:79-118)
- ✅ `_runListenerList` prevents duplicate listener runs (ControlEditor.cs:6, 34-40)
- ✅ Change tracking prevents unnecessary updates (ChangeTracker pattern)
- ✅ Reactive subscriptions only fire when dependencies actually change

**Validation Performance:**
- ✅ Sync validators run in order, short-circuit on first error (first error wins)
- ✅ Validation only runs when `ValidationEnabled` is true (visibility check)
- ✅ Validators only run on `ControlChange.Value` and `ControlChange.Validate` events
- ✅ Child validation caching via `_cachedChildInvalidity` (Control.cs:16, 339-346)

**Debouncing:** NOT NEEDED
- Validation is synchronous and fast
- ControlEditor transactions already batch updates
- UI typically debounces input events (e.g., 300ms on text input)

**Memory Management:**
- ✅ Validators cleaned up via `IDisposable` pattern
- ✅ FormStateNode.Dispose() cleans up validation subscriptions (FormStateNode.cs:501-515)
- ✅ No memory leaks with proper disposal

**Implementation Status:** READY - Existing system is performant, defer optimization to Phase 5 if needed

---

## Implementation Approach Updates

Based on research findings, the implementation approach is **SIMPLIFIED**:

### Changes to Original Plan:

1. **NO IControl Changes Needed** - Error management already exists
2. **NO Async/Await** - Use reactive subscriptions instead
3. **NO Localization Infrastructure** - Defer to application ISchemaInterface override
4. **Validation Integration** - Add single `InitializeValidation()` method to FormStateNode constructor
5. **Follow Existing Patterns** - Validator registry mirrors ReactiveExpressionEvaluators

### New Estimated Timeline:

| Phase | Original | Updated | Reason |
|-------|----------|---------|--------|
| Sprint 1: Foundation | 2-3 weeks | **1-2 weeks** | No Control changes needed |
| Sprint 2: Validators | 2 weeks | **1-2 weeks** | Jsonata already integrated |
| Sprint 3: Integration | 2-3 weeks | **1 week** | Simple constructor addition |
| Sprint 4: Polish | 1-2 weeks | **1 week** | ISchemaInterface extension only |
| Sprint 5: Documentation | 1 week | **1 week** | Unchanged |
| **Total** | **8-11 weeks** | **5-7 weeks** | 37% faster |

### Risk Mitigation Updates:

| Original Risk | Status | Updated Mitigation |
|--------------|--------|-------------------|
| Jsonata library not available | ✅ RESOLVED | Already using Jsonata.Net.Native v2.4.2 |
| Reactive system incompatibility | ✅ RESOLVED | System is fully compatible, pattern established |
| Performance issues | ✅ LOW RISK | Built-in batching sufficient |
| Breaking changes to IControl | ✅ RESOLVED | No changes needed |
| Complex async patterns | ✅ RESOLVED | No async needed, use reactive subscriptions |

---

## Implementation Timeline (UPDATED)

### Sprint 1: Foundation (1-2 weeks) ✅ SIMPLIFIED
- [ ] Create validation interfaces and context (`ValidationEvalContext`, `ValidatorEval`)
- [ ] ~~Extend IControl with error management~~ ✅ Already exists
- [ ] Implement validator registry (mirror `ReactiveExpressionEvaluators` pattern)
- [ ] Add `ValidationMessageType` enum
- [ ] Set up testing infrastructure

**Key Simplifications:**
- No Control system changes needed (error management complete)
- Follow established reactive patterns
- All infrastructure already in place

### Sprint 2: Core Validators (1-2 weeks) ✅ SIMPLIFIED
- [ ] Implement `RequiredValidatorEval` (sync validator)
- [ ] Implement `LengthValidatorEval` with array auto-expansion (sync validator)
- [ ] Implement `DateValidatorEval` (sync validator)
- [ ] Implement `JsonataValidatorEval` using existing Jsonata.Net.Native integration
- [ ] Unit tests for all validators
- [ ] Validator factory (`ValidationFactory.CreateValidators()`)

**Key Simplifications:**
- Jsonata library already integrated and working
- No async/await needed - use reactive subscriptions
- Pattern already established by expression evaluators

### Sprint 3: FormStateNode Integration (1 week) ✅ SIMPLIFIED
- [ ] Add `InitializeValidation()` method to FormStateNode constructor
- [ ] Set up `ValidationEnabled` computed field (tracks visibility)
- [ ] Set up sync validator subscription on control value changes
- [ ] Add validators to `_disposables` for cleanup
- [ ] Integration tests with visibility toggling
- [ ] Integration tests with multiple validators

**Key Simplifications:**
- Single constructor addition (follows existing `Initialize*()` pattern)
- No new lifecycle management needed
- Reactive pattern already established in FormStateNode

### Sprint 4: ISchemaInterface Extensions (1 week)
- [ ] Extend `ISchemaInterface` with validation methods:
  - `int ControlLength(SchemaField?, IControl)`
  - `string ValidationMessageText(SchemaField?, ValidationMessageType, object?, object?)`
  - `long ParseToMillis(SchemaField?, object?)`
  - ~~`bool IsEmptyValue()`~~ ✅ Already exists
- [ ] Implement methods in `DefaultSchemaInterface`
- [ ] Handle edge cases (null values, type conversions)
- [ ] Document localization extension point

**Key Simplifications:**
- Only 3 new methods needed (IsEmptyValue exists)
- No localization infrastructure (defer to app ISchemaInterface override)

### Sprint 5: Documentation & Examples (1 week)
- [ ] API documentation for validators
- [ ] Usage examples (required, length, date, jsonata validators)
- [ ] Custom validator registration example
- [ ] Localization example (ISchemaInterface override)
- [ ] Testing guide
- [ ] Performance notes (already optimized)

**Total Estimated Time:** 5-7 weeks (37% reduction from original 8-11 weeks)

---

## Success Criteria

1. ✅ All validator types (Required, Length, Date, Jsonata) implemented and tested
2. ✅ Validation errors properly set on controls and propagated to UI
3. ✅ Validation respects visibility (hidden controls don't validate)
4. ✅ Multiple validators can be combined with proper error priority
5. ✅ Reactive validation updates when dependencies change
6. ✅ Test coverage >80% for validation code
7. ✅ Performance: Validation adds <10ms overhead per field change
8. ✅ Documentation complete with examples
9. ✅ Feature parity with TypeScript implementation

---

## Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Jsonata library not available in .NET | High | Research alternatives: port minimal jsonata, use different expression language (C# expressions, Flee), or JavaScript bridge |
| Reactive system incompatibility | High | Early prototype to verify reactive patterns work |
| Performance issues with large forms | Medium | Implement debouncing and batching strategies |
| Breaking changes to IControl interface | Medium | Use adapter pattern or parallel interface initially |
| Complex async validation patterns | Medium | Start with simple async, iterate based on needs |

---

## Dependencies (UPDATED)

### External Libraries ✅ ALL PRESENT
- ✅ **Astrolabe.Controls** - Reactive control system (already referenced)
- ✅ **Jsonata.Net.Native.SystemTextJson v2.4.2** - Jsonata expression evaluator (already integrated)
- ✅ **xunit, FsCheck** - Testing frameworks (already in use)

### Internal Dependencies ✅ ALL MET
- ✅ Astrolabe.Schemas references Astrolabe.Controls (already configured)
- ✅ ~~May need to extend Astrolabe.Controls~~ - NOT NEEDED, error management complete
- ✅ ISchemaInterface needs extension (3 new methods)

---

## Notes

- ✅ ~~This plan assumes the reactive control system mirrors TypeScript~~ - **CONFIRMED** via code analysis
- The plan follows the architecture of the TypeScript implementation as closely as possible for consistency
- Deviations from the TypeScript implementation should be documented with rationale
- ✅ ~~Priority should be given to resolving Outstanding Questions~~ - **ALL QUESTIONS RESOLVED**

---

## 🚀 Next Steps - Implementation Priorities

### Phase 0: Pre-Implementation (CURRENT)
- ✅ Research complete - All questions answered
- ✅ Architecture validated - Infrastructure exists
- ✅ Dependencies confirmed - All libraries present
- [ ] Review this document with team
- [ ] Approve simplified approach
- [ ] Set up development branch

### Phase 1: Start Here (Week 1-2)
**Priority: Create minimal validation infrastructure**

1. **Create validation namespace and types:**
   - `Astrolabe.Schemas/Validation/ValidationEvalContext.cs`
   - `Astrolabe.Schemas/Validation/ValidatorEval.cs`
   - `Astrolabe.Schemas/ValidationMessageType.cs`

2. **Create validator registry:**
   - `Astrolabe.Schemas/Validation/ValidatorRegistry.cs` (mirror ReactiveExpressionEvaluators)
   - `Astrolabe.Schemas/Validation/ValidationFactory.cs`

3. **Extend ISchemaInterface:**
   - Add 3 methods: `ControlLength`, `ValidationMessageText`, `ParseToMillis`
   - Implement in `DefaultSchemaInterface.cs`

4. **Set up test infrastructure:**
   - Create `Astrolabe.Schemas.Tests/Validation/` directory
   - Add test helpers for validation

### Phase 2: Core Validators (Week 3-4)
**Priority: Implement validators in order of simplicity**

1. **RequiredValidator** (simplest - only uses IsEmptyValue)
2. **LengthValidator** (medium - uses ControlLength, includes array auto-expansion)
3. **DateValidator** (medium - uses ParseToMillis)
4. **JsonataValidator** (complex - uses reactive expressions)

Each with comprehensive unit tests.

### Phase 3: Integration (Week 5)
**Priority: Single FormStateNode change**

1. Add `InitializeValidation()` method to FormStateNode constructor (after line 61)
2. Create validation integration tests
3. Test visibility integration
4. Test multiple validators

### Phase 4: Polish & Document (Week 6-7)
**Priority: Production readiness**

1. Handle edge cases
2. Add XML documentation comments
3. Write usage examples
4. Document localization pattern
5. Create migration guide

### Quick Win First Milestone:
**Target: End of Week 2**
- [ ] Validator registry complete
- [ ] ISchemaInterface extended
- [ ] RequiredValidator working
- [ ] Basic unit tests passing

This proves the pattern works before investing in complex validators.

---

## 📋 Implementation Checklist

Copy this to track progress:

```markdown
## Sprint 1: Foundation
- [ ] ValidationEvalContext interface and implementation
- [ ] ValidatorEval delegate type
- [ ] ValidatorRegistry class
- [ ] ValidationFactory class
- [ ] ValidationMessageType enum
- [ ] ISchemaInterface extensions (3 methods)
- [ ] DefaultSchemaInterface implementation
- [ ] Test infrastructure setup

## Sprint 2: Validators
- [ ] RequiredValidatorEval + tests
- [ ] LengthValidatorEval + tests (with auto-expansion)
- [ ] DateValidatorEval + tests
- [ ] JsonataValidatorEval + tests
- [ ] Multi-validator integration tests

## Sprint 3: FormStateNode Integration
- [ ] InitializeValidation() method
- [ ] ValidationEnabled computed field
- [ ] Sync validator subscription
- [ ] Cleanup/disposal integration
- [ ] Visibility integration tests
- [ ] Full end-to-end tests

## Sprint 4: Polish
- [ ] Edge case handling
- [ ] XML documentation
- [ ] Error message quality
- [ ] Localization example

## Sprint 5: Documentation
- [ ] API documentation
- [ ] Usage examples (4 validator types)
- [ ] Custom validator example
- [ ] Localization guide
- [ ] Migration guide
```
