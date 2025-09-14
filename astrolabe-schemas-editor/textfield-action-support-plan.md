# Textfield Renderer Action Support Plan

## Overview
Enhance the Textfield Renderer component to support calling an action when the Enter key is pressed. This will leverage the existing "actionOnClick" handler in "@react-typed-forms/schemas" for action execution.

## Requirements
- Support for `actionId` parameter to identify which action to call
- Support for `actionData` parameter to pass additional data with the action
- Trigger action on Enter key press using existing actionOnClick infrastructure
- Maintain existing textfield functionality
- Keep C# and TypeScript versions synchronized

## Implementation Steps

### 1. C# Schema Definition Updates
- **Location**: `Astrolabe.Schemas/ControlDefinition.cs` - TextfieldRenderOptions record
- **Changes**:
  - Add `string? ActionId = null` constructor parameter
  - Add `object? ActionData = null` constructor parameter
  - Maintain record structure and existing parameters

### 2. TypeScript Schema Definition Updates
- **Location**: TextfieldRenderOptions in `controlDefinition.ts`
- **Changes**:
  - Add optional `actionId?: string | null` property to TextfieldRenderOptions
  - Add optional `actionData?: any | null` property to TextfieldRenderOptions
  - Follow existing pattern of `| null` union types for optional properties

### 3. Component Implementation Updates
- **Location**: Textfield renderer component implementation
- **Changes**:
  - Add `onKeyDown` event handler to input element
  - Check for Enter key press (`event.key === 'Enter'`)
  - Call existing actionOnClick handler when Enter is pressed and actionId is provided
  - Handle null checks for actionId and actionData
  - Pass actionId and actionData through existing action infrastructure

### 4. Action Integration
- **Location**: Leverage existing "@react-typed-forms/schemas" actionOnClick
- **Changes**:
  - Use existing action dispatch mechanism
  - Route actions based on actionId through current system
  - Utilize existing action response handling
  - Leverage existing loading states during action execution

## Technical Implementation

### C# Record Constructor Parameters
```csharp
public record TextfieldRenderOptions(
    // ... existing constructor parameters ...
    string? ActionId = null,
    object? ActionData = null
);
```

### TypeScript Interface
```typescript
interface TextfieldRenderOptions {
  // ... existing properties ...

  actionId?: string | null;
  actionData?: any | null;
}
```

### Event Handling with Null Checks
```typescript
const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter' && actionId && actionOnClick) {
    event.preventDefault(); // Prevent form submission if needed
    actionOnClick(actionId, actionData);
  }
};
```

## Technical Considerations

### Type Safety with Nulls
- Use `string | null` and `any | null` union types in TypeScript
- Match C# nullable reference types with TypeScript null unions
- Ensure proper null checking in component implementation
- Follow existing RenderOptions pattern for optional properties

### Record Constructor Pattern
- Use default null values for new constructor parameters
- Maintain positional parameter order if needed
- Preserve existing constructor parameter structure
- Enable named parameter usage: `new TextfieldRenderOptions(ActionId: "submit")`

### Backward Compatibility
- Default null values ensure existing constructor calls continue to work
- Optional properties with null unions maintain existing patterns
- No changes to existing parameter structure
- Existing textfields continue to work unchanged

## Testing Strategy

### Functionality Tests
- Test Enter key triggers actionOnClick when actionId provided
- Test null actionId doesn't trigger action
- Test actionData is passed correctly to actionOnClick (including null values)
- Test record construction with new parameters
- Test both C# and TypeScript sides work together

### Integration Tests
- Test with existing form context
- Test validation integration through current system
- Test loading states via existing mechanisms
- Test error handling through current patterns

## Migration Considerations
- Complete backward compatibility on both platforms
- No breaking changes to existing record construction
- Follows existing nullable property patterns

## Documentation Updates
- Update C# record constructor documentation
- Update TypeScript interface documentation with null union types
- Add examples showing cross-platform usage
- Document named parameter usage patterns
- Include null handling examples

## Success Criteria
- [x] C# TextfieldRenderOptions record includes ActionId and ActionData constructor parameters
- [x] TypeScript TextfieldRenderOptions includes actionId and actionData properties with `| null` unions
- [x] Users can trigger actions by pressing Enter in textfields
- [x] Actions route through existing actionOnClick handler
- [x] Proper null handling in component implementation
- [x] No breaking changes to existing record construction
- [x] Type safety maintained across C#/TypeScript boundary