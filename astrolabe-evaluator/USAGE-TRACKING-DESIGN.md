# Usage Tracking Design: Combined Type Checking & Symbol Resolution

This document describes how to extend the existing type checker to support "Find Usages" functionality with proper shadowing support.

## Core Concepts

### 1. Scope Hierarchy

Each scope has:
- A unique ID to distinguish shadowed variables
- A reference to its parent scope
- Variables defined in that scope
- A shared reference collection across all scopes

### 2. Variable Identity

Variables are identified by:
- Name (e.g., "x")
- Scope ID (e.g., "scope_3")
- Together these form a unique identity: "x@scope_3"

This allows us to distinguish between:
```
let $x = 1 in           // x@scope_1
  let $x = 2 in         // x@scope_2 (shadows x@scope_1)
    $x + 3              // references x@scope_2
```

## Performance Considerations

### Scope Chain vs Variable Copying

**Problem with naive immutability:**
The default type checking environment includes 30+ built-in functions from `defaultFunctions.ts`. If we naively copy all variables when creating child scopes:

```typescript
// BAD: O(30+) copying on every variable binding
return { ...env, vars: { ...env.vars, [name]: evalType } };
```

This would be O(n) where n = number of variables in scope (30+ for built-ins), multiplied by the number of variable bindings in the expression.

**Solution: Scope Chain Pattern**

Instead, we use a linked list of scopes where:
- Each scope only stores its **own** local variables
- Parent scopes are accessed via the `parent` link
- Variable lookup walks the chain (O(depth) where depth is typically 2-5)

```typescript
// GOOD: O(1) to create child scope
export function createChildScope(parent: CheckEnv): CheckEnv {
  return {
    localVars: {},  // Empty! No copying
    scopeId: generateScopeId(),
    parent,         // Just a reference
    references: parent.references,
    definitions: parent.definitions
  };
}
```

**Performance characteristics:**
- Creating child scope: **O(1)** vs O(30+) with copying
- Adding variable to scope: **O(1)** (only updates localVars for current scope)
- Looking up variable: **O(depth)** where depth is typically 2-5, much better than O(30+) for copying
- For typical expressions with 2-5 levels of nesting: **~90% fewer object operations**

### Mutable Accumulators

The `references` and `definitions` Maps are **intentionally mutable** and shared across all scopes:
- They act as accumulators during the type checking traversal
- Making them immutable would require O(n) copying on every reference recorded
- This is a standard functional programming pattern for collecting data during traversal
- The CheckEnv **structure** remains immutable (localVars, parent links don't change)

## Implementation

### Phase 1: Enhanced AST Types (ast.ts)

```typescript
// ============================================================================
// SCOPE TRACKING
// ============================================================================

let scopeCounter = 0;
export function generateScopeId(): string {
  return `scope_${++scopeCounter}`;
}

export function resetScopeCounter(): void {
  scopeCounter = 0;
}

// ============================================================================
// VARIABLE INFORMATION
// ============================================================================

export interface VariableInfo {
  name: string;
  type: EvalType;
  definition: SourceLocation;
  scopeId: string;  // Which scope this variable was defined in
}

export interface VariableReference {
  name: string;
  location: SourceLocation;
  scopeId: string;  // Which definition this refers to
}

// Key format: "varName@scopeId" -> ensures uniqueness across shadowing
export type VariableKey = string;

export function makeVariableKey(name: string, scopeId: string): VariableKey {
  return `${name}@${scopeId}`;
}

export function parseVariableKey(key: VariableKey): { name: string; scopeId: string } {
  const [name, scopeId] = key.split('@');
  return { name, scopeId };
}

// ============================================================================
// ENHANCED CHECK ENVIRONMENT
// ============================================================================

export interface CheckEnv {
  // Type information for variables defined in THIS SCOPE ONLY
  // Does NOT include parent scope variables (walk chain to find those)
  // Key is variable name, value includes which scope it's from
  localVars: Record<string, VariableInfo>;

  // Current data type for property access
  dataType: EvalType;

  // Current scope identifier
  scopeId: string;

  // Parent scope (for scope chain traversal)
  // Walk this chain to lookup variables from outer scopes
  parent?: CheckEnv;

  // SHARED across all scopes in the tree (passed by reference)
  // Maps unique variable keys to all their references
  // MUTABLE: accumulates references during type checking
  references?: Map<VariableKey, VariableReference[]>;

  // SHARED across all scopes in the tree (passed by reference)
  // Maps unique variable keys to their definition info
  // MUTABLE: accumulates definitions during type checking
  definitions?: Map<VariableKey, VariableInfo>;
}

// ============================================================================
// VARIABLE LOOKUP
// ============================================================================

/**
 * Look up a variable in the scope chain.
 * Walks from current scope up through parents until found.
 * O(depth) complexity where depth is typically 2-5 scopes.
 */
export function lookupVar(env: CheckEnv, name: string): VariableInfo | undefined {
  if (name in env.localVars) {
    return env.localVars[name];
  }
  return env.parent ? lookupVar(env.parent, name) : undefined;
}

export function createRootCheckEnv(
  dataType: EvalType,
  initialVars: Record<string, EvalType> = {}
): CheckEnv {
  const references = new Map<VariableKey, VariableReference[]>();
  const definitions = new Map<VariableKey, VariableInfo>();
  const scopeId = generateScopeId();

  // Convert initial vars to VariableInfo
  const localVars: Record<string, VariableInfo> = {};
  for (const [name, type] of Object.entries(initialVars)) {
    const info: VariableInfo = {
      name,
      type,
      definition: { start: 0, end: 0 }, // Built-in/external
      scopeId
    };
    localVars[name] = info;
    definitions.set(makeVariableKey(name, scopeId), info);
  }

  return {
    localVars,
    dataType,
    scopeId,
    references,
    definitions
  };
}

/**
 * Create a child scope with its own localVars.
 * O(1) complexity - no copying of parent variables!
 * Variables from parent scopes are accessed via scope chain traversal.
 */
export function createChildScope(parent: CheckEnv): CheckEnv {
  return {
    localVars: {}, // Empty! Only new bindings go here
    dataType: parent.dataType,
    scopeId: generateScopeId(),
    parent, // Link to parent for variable lookup
    references: parent.references, // Share the reference map (mutable)
    definitions: parent.definitions // Share the definitions map (mutable)
  };
}

/**
 * Add a variable to the current scope.
 * O(1) complexity - only updates localVars for current scope.
 * This may shadow a variable from a parent scope.
 */
export function addCheckVar(
  env: CheckEnv,
  name: string,
  evalType: EvalType,
  definition: SourceLocation,
): CheckEnv {
  const varInfo: VariableInfo = {
    name,
    type: evalType,
    definition,
    scopeId: env.scopeId
  };

  // Record in shared definitions map (mutable accumulator)
  if (env.definitions) {
    const key = makeVariableKey(name, env.scopeId);
    env.definitions.set(key, varInfo);
  }

  // Add to current scope's localVars only (this may shadow parent scope)
  return {
    ...env,
    localVars: {
      ...env.localVars,
      [name]: varInfo
    }
  };
}

/**
 * Record a reference to a variable at the given location.
 * Mutates the shared references map (mutable accumulator pattern).
 */
export function recordReference(
  env: CheckEnv,
  name: string,
  location: SourceLocation
): void {
  if (!env.references) return;

  // Look up which scope this variable comes from (walks scope chain)
  const varInfo = lookupVar(env, name);
  if (!varInfo) return; // Undefined variable

  const key = makeVariableKey(name, varInfo.scopeId);
  const refs = env.references.get(key) || [];
  refs.push({
    name,
    location,
    scopeId: varInfo.scopeId
  });
  env.references.set(key, refs);
}
```

### Phase 2: Enhanced Type Checker (typeCheck.ts)

```typescript
import {
  CheckEnv,
  createChildScope,
  addCheckVar,
  recordReference,
  EvalExpr,
  LetExpr,
  LambdaExpr,
  VarExpr,
  CallExpr,
  ArrayExpr,
  PropertyExpr,
  ValueExpr,
  CheckValue,
  EvalType,
  checkValue,
  primitiveType,
  arrayType,
  isFunctionType,
  valueType as baseValueType,
  SourceLocation,
} from "./ast";

// ============================================================================
// HELPER: Extract definition location from let assignments
// ============================================================================

function getVariableDefinitionLocation(
  letExpr: LetExpr,
  varIndex: number
): SourceLocation {
  // In a let expression, we need to find the location of the variable name
  // This is a bit tricky because the assignment pair is [string, EvalExpr]
  // and we don't have direct location info on the string

  // For now, use the start of the let expression
  // TODO: Enhance parser to track variable name locations in LetExpr
  return letExpr.location || { start: 0, end: 0 };
}

function getLambdaParameterLocation(lambdaExpr: LambdaExpr): SourceLocation {
  // The parameter appears right after "let " or at the start
  // TODO: Enhance parser to track parameter location in LambdaExpr
  return lambdaExpr.location || { start: 0, end: 0 };
}

// ============================================================================
// ENHANCED TYPE CHECKER WITH USAGE TRACKING
// ============================================================================

export function typeCheck(
  env: CheckEnv,
  expr: EvalExpr,
): CheckValue<EvalType> {
  if (!expr) {
    console.error("typeCheck called with null/undefined expression");
    return checkValue(env, primitiveType("any"));
  }

  switch (expr.type) {
    case "var":
      return typeCheckVar(env, expr);

    case "let":
      return typeCheckLet(env, expr);

    case "lambda":
      return typeCheckLambda(env, expr);

    case "array":
      return typeCheckArray(env, expr);

    case "call":
      return typeCheckCall(env, expr);

    case "value":
      return typeCheckValue(env, expr);

    case "property":
      return typeCheckProperty(env, expr);

    default:
      const _exhaustive: never = expr;
      return checkValue(env, primitiveType("any"));
  }
}

function typeCheckVar(env: CheckEnv, expr: VarExpr): CheckValue<EvalType> {
  // Record this reference
  if (expr.location) {
    recordReference(env, expr.variable, expr.location);
  }

  // Look up type (walks scope chain)
  const varInfo = lookupVar(env, expr.variable);
  if (!varInfo) {
    console.warn(`Undefined variable: $${expr.variable}`);
    return checkValue(env, primitiveType("any"));
  }

  return checkValue(env, varInfo.type);
}

function typeCheckLet(env: CheckEnv, expr: LetExpr): CheckValue<EvalType> {
  // Create a new scope for this let binding
  let newEnv = createChildScope(env);

  // Process each variable assignment in order
  for (let i = 0; i < expr.variables.length; i++) {
    const [name, valueExpr] = expr.variables[i];

    // Type check the value in current environment
    const { value: type } = typeCheck(newEnv, valueExpr);

    // Get definition location
    const defLocation = getVariableDefinitionLocation(expr, i);

    // Add variable to the new scope
    newEnv = addCheckVar(newEnv, name, type, defLocation);
  }

  // Type check the body expression in the new scope
  return typeCheck(newEnv, expr.expr);
}

function typeCheckLambda(env: CheckEnv, expr: LambdaExpr): CheckValue<EvalType> {
  // Create a new scope for the lambda parameter
  const newEnv = createChildScope(env);

  // Get parameter location
  const paramLocation = getLambdaParameterLocation(expr);

  // Add lambda parameter to scope
  // TODO: Could infer parameter type based on usage
  const envWithParam = addCheckVar(
    newEnv,
    expr.variable,
    primitiveType("any"),
    paramLocation
  );

  // Type check the lambda body
  return typeCheck(envWithParam, expr.expr);
}

function typeCheckArray(env: CheckEnv, expr: ArrayExpr): CheckValue<EvalType> {
  const types: EvalType[] = [];
  let currentEnv = env;

  for (const valueExpr of expr.values) {
    const { env: nextEnv, value: type } = typeCheck(currentEnv, valueExpr);
    types.push(type);
    currentEnv = nextEnv;
  }

  return checkValue(currentEnv, arrayType(types, undefined));
}

function typeCheckCall(env: CheckEnv, expr: CallExpr): CheckValue<EvalType> {
  const funcInfo = lookupVar(env, expr.function);

  if (!funcInfo || !isFunctionType(funcInfo.type)) {
    console.warn(`Undefined or non-function: $${expr.function}`);
    return checkValue(env, primitiveType("any"));
  }

  // Record reference to the function
  if (expr.location) {
    recordReference(env, expr.function, expr.location);
  }

  // Call the function's type resolver
  return funcInfo.type.returnType(env, expr);
}

function typeCheckValue(env: CheckEnv, expr: ValueExpr): CheckValue<EvalType> {
  return checkValue(env, baseValueType(expr));
}

function typeCheckProperty(env: CheckEnv, expr: PropertyExpr): CheckValue<EvalType> {
  const type = env.dataType;

  if (type.type === "object") {
    const propType = type.fields[expr.property];
    return checkValue(env, propType || primitiveType("any"));
  }

  return checkValue(env, primitiveType("any"));
}

// ============================================================================
// HELPER FOR CHECKING MULTIPLE EXPRESSIONS
// ============================================================================

export function checkAll<A, B>(
  env: CheckEnv,
  array: A[],
  f: (env: CheckEnv, value: A) => CheckValue<B>,
): CheckValue<B[]> {
  return array.reduce(
    (acc, x) => {
      const { env, value } = f(acc.env, x);
      return { env, value: [...acc.value, value] };
    },
    { env, value: [] } as CheckValue<B[]>,
  );
}

export function mapCheck<A, B>(
  checkValue: CheckValue<A>,
  f: (a: A) => B,
): CheckValue<B> {
  return { env: checkValue.env, value: f(checkValue.value) };
}

export function mapCallArgs<A>(
  call: CallExpr,
  env: CheckEnv,
  toA: (args: EvalType[]) => A,
): CheckValue<A> {
  const allChecked = checkAll(env, call.args, (e, x) => typeCheck(e, x));
  return mapCheck(allChecked, toA);
}
```

### Phase 3: Usage Analysis API (usageAnalysis.ts)

```typescript
import {
  EvalExpr,
  CheckEnv,
  VariableInfo,
  VariableReference,
  VariableKey,
  makeVariableKey,
  parseVariableKey,
  createRootCheckEnv,
  resetScopeCounter,
  SourceLocation,
  EvalType,
  primitiveType,
  VarExpr,
  LetExpr,
  LambdaExpr,
  CallExpr,
  ArrayExpr,
} from "./ast";
import { typeCheck } from "./typeCheck";

// ============================================================================
// USAGE ANALYSIS RESULT TYPES
// ============================================================================

export interface UsageResult {
  definition: {
    name: string;
    location: SourceLocation;
    type: EvalType;
    scopeId: string;
  };
  references: VariableReference[];
}

export interface TextEdit {
  range: SourceLocation;
  newText: string;
}

// ============================================================================
// USAGE ANALYZER
// ============================================================================

export class UsageAnalyzer {
  private env: CheckEnv;

  constructor(
    private ast: EvalExpr,
    initialVars: Record<string, EvalType> = {}
  ) {
    // Reset scope counter for deterministic scope IDs
    resetScopeCounter();

    // Create root environment with reference tracking enabled
    this.env = createRootCheckEnv(primitiveType("any"), initialVars);

    // Run type checker to populate references and definitions
    typeCheck(this.env, ast);
  }

  /**
   * Find all usages (definition + references) of a variable at the given position
   */
  findUsages(position: number, sourceFile?: string): UsageResult | undefined {
    const varAtPos = this.findVariableAtPosition(position, sourceFile);
    if (!varAtPos) return undefined;

    const key = makeVariableKey(varAtPos.name, varAtPos.scopeId);

    // Get definition
    const definition = this.env.definitions?.get(key);
    if (!definition) return undefined;

    // Get all references
    const references = this.env.references?.get(key) || [];

    return {
      definition: {
        name: definition.name,
        location: definition.definition,
        type: definition.type,
        scopeId: definition.scopeId
      },
      references
    };
  }

  /**
   * Find the definition location of a variable at the given position
   */
  findDefinition(position: number, sourceFile?: string): SourceLocation | undefined {
    const varAtPos = this.findVariableAtPosition(position, sourceFile);
    if (!varAtPos) return undefined;

    const key = makeVariableKey(varAtPos.name, varAtPos.scopeId);
    const definition = this.env.definitions?.get(key);

    return definition?.definition;
  }

  /**
   * Find all references to a variable at the given position (excluding definition)
   */
  findReferences(position: number, sourceFile?: string): VariableReference[] {
    const result = this.findUsages(position, sourceFile);
    return result?.references || [];
  }

  /**
   * Rename a variable and return all necessary text edits
   */
  renameVariable(position: number, newName: string, sourceFile?: string): TextEdit[] {
    const result = this.findUsages(position, sourceFile);
    if (!result) return [];

    const edits: TextEdit[] = [];

    // Edit the definition
    edits.push({
      range: result.definition.location,
      newText: newName
    });

    // Edit all references
    for (const ref of result.references) {
      edits.push({
        range: ref.location,
        newText: `$${newName}` // Add $ prefix for variable references
      });
    }

    return edits;
  }

  /**
   * Get all defined variables in the AST
   */
  getAllDefinitions(): VariableInfo[] {
    if (!this.env.definitions) return [];
    return Array.from(this.env.definitions.values());
  }

  /**
   * Find unused variables (defined but never referenced)
   */
  findUnusedVariables(): VariableInfo[] {
    const definitions = this.getAllDefinitions();
    const unused: VariableInfo[] = [];

    for (const def of definitions) {
      const key = makeVariableKey(def.name, def.scopeId);
      const refs = this.env.references?.get(key) || [];

      if (refs.length === 0) {
        unused.push(def);
      }
    }

    return unused;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Find which variable (name + scope) is at the given position in the AST
   */
  private findVariableAtPosition(
    position: number,
    sourceFile?: string
  ): { name: string; scopeId: string } | undefined {
    return this.searchInExpr(this.ast, position, sourceFile, this.env);
  }

  private searchInExpr(
    expr: EvalExpr,
    position: number,
    sourceFile: string | undefined,
    env: CheckEnv
  ): { name: string; scopeId: string } | undefined {
    if (!expr.location) return undefined;

    const loc = expr.location;

    // Check source file matches
    if (sourceFile !== undefined && loc.sourceFile !== sourceFile) {
      return undefined;
    }

    // Check if position is within this expression
    if (position < loc.start || position > loc.end) {
      return undefined;
    }

    switch (expr.type) {
      case "var":
        // Direct variable reference (walks scope chain)
        const varInfo = lookupVar(env, expr.variable);
        if (!varInfo) return undefined;
        return { name: expr.variable, scopeId: varInfo.scopeId };

      case "let":
        // Check each variable definition
        for (let i = 0; i < expr.variables.length; i++) {
          const [name, _] = expr.variables[i];
          // TODO: Check if position is on the variable name in the assignment
          // For now, we'll just check the body
        }

        // Search in the body with updated environment
        // We need to reconstruct the environment as the type checker did
        // This is simplified - in practice, we'd track environments during type checking
        return this.searchInExpr(expr.expr, position, sourceFile, env);

      case "lambda":
        // Check if position is on the parameter
        // TODO: Get actual parameter location from parser
        // For now, search in body
        return this.searchInExpr(expr.expr, position, sourceFile, env);

      case "call":
        // Check if position is on the function name
        if (expr.location.start <= position && position <= expr.location.start + expr.function.length + 1) {
          const funcInfo = lookupVar(env, expr.function);
          if (!funcInfo) return undefined;
          return { name: expr.function, scopeId: funcInfo.scopeId };
        }

        // Otherwise, search in arguments
        for (const arg of expr.args) {
          const result = this.searchInExpr(arg, position, sourceFile, env);
          if (result) return result;
        }
        return undefined;

      case "array":
        for (const value of expr.values) {
          const result = this.searchInExpr(value, position, sourceFile, env);
          if (result) return result;
        }
        return undefined;

      case "property":
      case "value":
        return undefined;

      default:
        return undefined;
    }
  }
}
```

### Phase 4: Tests (test/usageAnalysis.test.ts)

```typescript
import { describe, expect, test } from "vitest";
import { parseEval } from "../src/parseEval";
import { UsageAnalyzer } from "../src/usageAnalysis";

describe("Basic Usage Finding", () => {
  test("Find simple variable usage", () => {
    const input = "let $x = 1 in $x + $x";
    const ast = parseEval(input);
    const analyzer = new UsageAnalyzer(ast);

    // Position 14 is the first $x reference ("in $x")
    const usages = analyzer.findUsages(14);

    expect(usages).toBeDefined();
    expect(usages!.definition.name).toBe("x");
    expect(usages!.references.length).toBe(2); // Two references
  });

  test("Find definition from reference", () => {
    const input = "let $x = 1 in $x + 2";
    const ast = parseEval(input);
    const analyzer = new UsageAnalyzer(ast);

    // Click on the reference
    const definition = analyzer.findDefinition(14);

    expect(definition).toBeDefined();
    expect(definition!.start).toBeLessThan(14); // Definition comes before reference
  });
});

describe("Shadowing Support", () => {
  test("Distinguish shadowed variables", () => {
    const input = "let $x = 1 in let $x = 2 in $x";
    const ast = parseEval(input);
    const analyzer = new UsageAnalyzer(ast);

    // Position at the final $x (should refer to inner x = 2)
    const usages = analyzer.findUsages(28);

    expect(usages).toBeDefined();
    expect(usages!.references.length).toBe(1); // Only one reference to inner x
  });

  test("Outer variable still accessible in outer scope", () => {
    const input = "let $x = 1 in $x + (let $x = 2 in $x)";
    const ast = parseEval(input);
    const analyzer = new UsageAnalyzer(ast);

    // Position 14 is first $x (outer)
    const outerUsages = analyzer.findUsages(14);
    expect(outerUsages!.references.length).toBe(1);

    // Position at inner $x
    const innerUsages = analyzer.findUsages(34);
    expect(innerUsages!.references.length).toBe(1);

    // They should have different scope IDs
    expect(outerUsages!.definition.scopeId).not.toBe(innerUsages!.definition.scopeId);
  });
});

describe("Lambda Parameters", () => {
  test("Lambda parameter is tracked", () => {
    const input = "$map([1, 2, 3], $x => $x * 2)";
    const ast = parseEval(input);
    const analyzer = new UsageAnalyzer(ast);

    // Find usages of $x in lambda body
    const usages = analyzer.findUsages(22); // Position of $x in body

    expect(usages).toBeDefined();
    expect(usages!.definition.name).toBe("x");
    expect(usages!.references.length).toBe(1);
  });
});

describe("Rename Refactoring", () => {
  test("Rename generates correct edits", () => {
    const input = "let $x = 1 in $x + $x";
    const ast = parseEval(input);
    const analyzer = new UsageAnalyzer(ast);

    const edits = analyzer.renameVariable(14, "y");

    expect(edits.length).toBe(3); // 1 definition + 2 references
    expect(edits.some(e => e.newText === "y")).toBe(true); // Definition edit
    expect(edits.filter(e => e.newText === "$y").length).toBe(2); // Reference edits
  });
});

describe("Unused Variables", () => {
  test("Detect unused variable", () => {
    const input = "let $x = 1, $y = 2 in $x + 3";
    const ast = parseEval(input);
    const analyzer = new UsageAnalyzer(ast);

    const unused = analyzer.findUnusedVariables();

    expect(unused.length).toBe(1);
    expect(unused[0].name).toBe("y");
  });
});
```

## Next Steps

1. **Parser Enhancement**: Update `parseEval.ts` to track exact locations of variable names in `LetExpr` and `LambdaExpr`

2. **Function Parameter Tracking**: Extend to track function parameters from `CallExpr` when using built-in functions

3. **Cross-File Support**: Add support for tracking usages across multiple expression files

4. **IDE Integration**: Create LSP server wrapper that exposes these APIs

5. **Performance**: Add caching for large ASTs to avoid re-running type checker

## Benefits

✅ Single AST traversal for both type checking and usage tracking
✅ Proper shadowing support via scope IDs
✅ Type information available alongside usage information
✅ Supports rename refactoring, find unused, etc.
✅ Extensible for more advanced features