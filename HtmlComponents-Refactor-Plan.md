# HtmlComponents Stub Implementation Refactor Plan

## Executive Summary

This document outlines a plan to simplify the `HtmlComponents` abstraction in the React Native schema renderer library (`@react-typed-forms/schemas-rn`) by creating a lightweight stub implementation. The `@react-typed-forms/schemas` package will remain unchanged to maintain platform compatibility, but the RN implementation will be simplified to remove unnecessary wrapper components and complexity.

## Current Architecture Analysis

### HtmlComponents Interface (from @react-typed-forms/schemas)

The `HtmlComponents` interface defines a set of standardized HTML-like components:

```typescript
export interface HtmlComponents {
  Div: ComponentType<HtmlDivProperties>;
  Span: ElementType<HTMLAttributes<HTMLSpanElement>>;
  Button: ComponentType<HtmlButtonProperties>;
  I: ComponentType<HtmlIconProperties>;
  Label: ComponentType<HtmlLabelProperties>;
  B: ElementType<HTMLAttributes<HTMLElement>>;
  H1: ElementType<HTMLAttributes<HTMLElement>>;
  Input: ComponentType<HtmlInputProperties>;
  CheckButtons: ComponentType<CheckButtonsProps>;
}
```

### Current Usage in schemas-rn

The schemas-rn library implements these components with React Native equivalents:

1. **ReactNativeHtmlComponents** (`createDefaultRNRenderers.tsx:562`):
   - Maps HTML components to RN components (View, Text, Pressable, etc.)
   - Handles platform-specific prop transformations
   - Provides styling abstraction through className/textClass props

2. **Usage Points**:
   - `renderer.html.Div` - Used extensively in layout components
   - `renderer.html.Input` - Used in form input implementations  
   - `renderer.html.CheckButtons` - Used in checkbox/radio renderers
   - `renderer.html.Label` - Used in label rendering
   - `renderer.html.I` - Used in icon adornments

3. **Key Implementation Files**:
   - `createDefaultRNRenderers.tsx` - Main HTML component implementations
   - `components/DefaultArrayRenderer.tsx` - Array layout using `html.Div`
   - `components/CheckRenderer.tsx` - Form controls using `html.Input`

## Problems with Current Approach

### 1. Unnecessary Abstraction Layer
- Adds complexity without significant benefit in RN context
- Forces HTML-like API design that doesn't align with React Native patterns
- Creates artificial layer between schema renderers and React Native components

### 2. Performance Overhead
- Extra function calls through abstraction layer
- Memory allocation for wrapper components

### 3. Type Safety Issues
- Generic HTML attributes don't map cleanly to RN props
- Requires extensive `as any` casting in implementations
- Prop conflicts between HTML and RN paradigms

### 4. Developer Experience
- Confusing mix of HTML and RN concepts
- Harder to debug due to abstraction layers
- Non-standard React Native patterns

### 5. Maintenance Burden
- Dual prop interfaces to maintain
- Complex HTML-to-RN component mapping logic
- Additional abstraction layer requiring maintenance

## Refactor Strategy

### Phase 1: Create Minimal Stub Implementation

Keep the HtmlComponents interface intact but simplify the React Native implementation to lightweight stubs:

#### 1.1 Create Error-Throwing Stubs

Create minimal stub implementations that throw errors when used:

```typescript
// Error-throwing stubs that prevent accidental usage
const RNDiv = (props: HtmlDivProperties) => {
  throw new Error("Direct usage of html.Div not supported in React Native. Use View directly.");
};

const RNLabel = (props: HtmlLabelProperties) => {
  throw new Error("Direct usage of html.Label not supported in React Native. Use View/Text directly.");
};

const RNInput = (props: HtmlInputProperties) => {
  throw new Error("Direct usage of html.Input not supported in React Native. Use specific RN input components directly.");
};

const RNButton = (props: HtmlButtonProperties) => {
  throw new Error("Direct usage of html.Button not supported in React Native. Use Pressable/TouchableOpacity directly.");
};

const RNIcon = (props: HtmlIconProperties) => {
  throw new Error("Direct usage of html.I not supported in React Native. Use Icon component directly.");
};
```

#### 1.2 Force Direct Component Usage

- All HtmlComponents throw errors when called
- Forces developers to use React Native components directly
- Eliminates abstraction layer performance overhead
- Removes prop transformation complexity

#### 1.3 Maintain Interface Compatibility

Keep HtmlComponents interface exactly the same to ensure:
- No changes needed in `@react-typed-forms/schemas`
- Existing renderer code continues to work
- Platform abstraction is preserved

### Phase 2: Styling System Optimization

Since NativeWind handles className to style translation efficiently, the focus is on simplifying the component layer:

#### 2.1 Retain className Support

Keep existing className-based styling since NativeWind provides efficient translation:

```typescript
// Current approach works well with NativeWind:
// className="text-lg font-bold" → NativeWind handles conversion
```

#### 2.2 Create RN-Specific Theme System

Implement theme system that works with NativeWind:

```typescript
interface RNTheme {
  spacing: Record<string, string>; // Tailwind class names
  colors: Record<string, string>;  // Tailwind class names  
  typography: Record<string, string>; // Tailwind class names
}
```

#### 2.3 Style Resolution Utils

Create utilities for combining className and style props:

```typescript
function resolveControlStyle(
  className?: string,
  themeVariant?: string,
  customStyle?: StyleProp<ViewStyle>
): { className?: string; style?: StyleProp<ViewStyle> } {
  // Implementation details...
}
```

### Phase 3: FormRenderer Interface Updates

#### 3.1 Remove html Property

Update `FormRenderer` interface to remove the `html` property:

```typescript
// Remove: html: HtmlComponents;
// Update all renderer implementations to not depend on html property
```

#### 3.2 Create RN-Specific Renderer Factory

```typescript
export function createRNFormRenderer(
  renderers: RNRendererRegistrations,
  theme: RNTheme
): RNFormRenderer
```

#### 3.3 Update Renderer Registration Types

Create RN-specific types that don't reference HtmlComponents:

```typescript
interface RNDataRendererRegistration {
  type: "data";
  render: (props: DataRendererProps, theme: RNTheme) => ReactNode;
}
```

### Phase 4: Component Migration

#### 4.1 Array Renderer Migration

**File**: `components/DefaultArrayRenderer.tsx`

- Replace `html.Div` with `<View>`
- Remove HtmlComponents dependency
- Use direct styling props

#### 4.2 Check Renderer Migration  

**File**: `components/CheckRenderer.tsx`

- Replace `renderer.html.Input` with direct RN checkbox/radio components
- Remove HtmlComponents props interface
- Simplify prop handling

#### 4.3 Layout Renderer Migration

**Files**: Layout-related renderers

- Replace `html.Label`, `html.Div` with direct RN components
- Simplify styling approach
- Remove prop transformation logic

## Implementation Steps

### Step 1: Create Error-Throwing Stubs
1. Replace existing HtmlComponents implementations with error-throwing stubs
2. Update ReactNativeHtmlComponents object to use stubs
3. Test that all stubs throw appropriate error messages

### Step 2: Component Migration
1. Update all renderer components to use direct RN components instead of html.*
2. Replace `html.Div` with `<View>` throughout codebase
3. Replace `html.Input` with specific RN input components
4. Replace `html.Label` with `<View><Text>` combinations
5. Replace `html.Button` with `<Pressable>` or `<TouchableOpacity>`
6. Replace `html.I` with direct `<Icon>` component usage
7. **Important**: Cast style props when needed - `style={style as StyleProp<ViewStyle>}` due to type conflicts between CSS and RN styles

### Step 3: Testing & Validation
1. Verify all renderer components work with direct RN components
2. Test that error stubs are never called during normal operation
3. Performance benchmarking to confirm overhead elimination
4. Visual regression testing to ensure no UI changes

## Migration Timeline

- **Week 1**: Create error-throwing stubs (Step 1)
- **Week 2-3**: Component migration (Step 2)  
- **Week 4**: Testing and validation (Step 3)

## Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation**: Maintain backward compatibility layer during transition

### Risk 2: Performance Regression
**Mitigation**: Benchmark before/after, optimize hot paths

### Risk 3: Styling Inconsistencies  
**Mitigation**: Comprehensive style system design, extensive testing

### Risk 4: Developer Adoption
**Mitigation**: Clear migration guide, automated migration tools

## Benefits After Refactor

1. **Performance**: Elimination of abstraction overhead
2. **Type Safety**: Direct React Native prop types
3. **Developer Experience**: Standard RN patterns
4. **Maintainability**: Simpler codebase, fewer layers
5. **Bundle Size**: Removed abstraction code
6. **Platform Alignment**: True React Native implementation

## Success Criteria

1. All HtmlComponents usage replaced with direct RN components
2. Error-throwing stubs prevent accidental html.* usage
3. No performance regression (should see improvement)
4. All existing functionality preserved
5. Improved TypeScript type safety with direct RN component usage
6. Reduced bundle size from eliminated wrapper components
7. Developer documentation updated
8. Migration guide provided
9. Comprehensive test coverage maintained

---

*This refactor plan should be reviewed and approved by the development team before implementation begins.*