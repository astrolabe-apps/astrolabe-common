# Dependency Tracking in Astrolabe Evaluator

## Overview

The Astrolabe evaluator tracks which data paths are used in computing values. This enables reactive systems to know exactly what needs to be re-computed when data changes.

Every evaluated expression has two properties:
- **`path`**: The direct location of data (e.g., `user.name`, `items[2]`)
- **`deps`**: List of all **data path references** used in the computation (not literals)

---

## Core Concepts

### Path

The **direct location** of a value in the source data.

```javascript
// Data: { user: { name: "Alice" }, items: [10, 20, 30] }

user.name        // path = "user.name"
items[1]         // path = "items[1]"
user.name + 5    // path = null (computed, not direct data)
```

**Rules:**
- Only direct data access has a path
- Computed values have no path
- Preserved through constant array/object access

### Dependencies

A **list of all data paths** (references to source data) used in computing a value.

**Important:** Only **data references** are tracked, not literal/primitive values.

```javascript
// Data: { a: 5, b: 10, items: [1, 2, 3] }

a + b                // deps = ["a", "b"]
a + 5                // deps = ["a"] (5 is a literal, not tracked)
"hello"              // deps = [] (literal string)
$sum(items)         // deps = ["items[0]", "items[1]", "items[2]"]
a > 5 ? b : 0       // deps = ["a", "b"] if true, ["a"] if false (5 and 0 are literals)
```

**Rules:**
- Only tracks **references to data**, not literal values (numbers, strings, booleans)
- Only evaluated data paths are included (important for conditionals)
- Transitive: includes deps from nested expressions

---

## Key Principles

### 1. Constant vs Dynamic Access

```javascript
// Constant: preserves path, no deps
array[0]              // path = "array[0]", deps = []

// Dynamic: has path + adds deps
$elem(array, idx)     // path = "array[2]", deps = ["idx"]
```

### 2. Lazy Evaluation

Array transformations preserve deps **in elements**, not at array level:

```javascript
// Data: { nums: [1, 2, 3] }

$map(nums, $x => $x * 2)
// Array itself:   deps = []
// Element [0]:    deps = ["nums[0]"]
// Element [1]:    deps = ["nums[1]"]

$sum($map(nums, $x => $x * 2))
// Now aggregated: deps = ["nums[0]", "nums[1]", "nums[2]"]
```

### 3. Conditional Tracking

Only evaluated branches contribute dependencies (data references only):

```javascript
// Data: { cond: true, a: "yes", b: "no" }

cond ? a : b
// deps = ["cond", "a"]
// "b" is NOT tracked (untaken branch)

cond ? "yes" : "no"
// deps = ["cond"]
// Literals "yes" and "no" NOT tracked
```

---

## Function Reference

### Arithmetic & Comparison

**Functions:** `+`, `-`, `*`, `/`, `%`, `=`, `!=`, `<`, `<=`, `>`, `>=`

Tracks only **data references**, not literals:

```javascript
x + y        // deps = ["x", "y"]
x + 10       // deps = ["x"] (10 is a literal)
x < y        // deps = ["x", "y"]
x >= 18      // deps = ["x"] (18 is a literal)
5 + 3        // deps = [] (both are literals)
```

---

### Boolean Operators

**Functions:** `and`, `or`, `!`

Short-circuits - only tracks evaluated arguments:

```javascript
// Data: { a: false, b: true }
a and b      // deps = ["a"] (b not evaluated)

// Data: { a: true, b: true }
a and b      // deps = ["a", "b"] (both evaluated)
```

---

### Conditionals

**Functions:** `?`, `??`, `which`

Tracks condition + taken branch (data references only):

```javascript
age >= 18 ? "adult" : "minor"
// If true:  deps = ["age"] ("adult" is a literal)
// If false: deps = ["age"] ("minor" is a literal)

age >= 18 ? adultMsg : minorMsg
// If true:  deps = ["age", "adultMsg"]
// If false: deps = ["age", "minorMsg"]

value ?? fallback
// deps = ["value", "fallback"] if value is null
// deps = ["value"] if value exists
```

---

### Array Aggregation

**Functions:** `sum`, `min`, `max`

Tracks all consumed elements:

```javascript
// Data: { values: [1, 2, 3] }
$sum(values)
// deps = ["values[0]", "values[1]", "values[2]"]
```

**Function:** `count`

Tracks only the array reference, not individual elements:

```javascript
// Data: { values: [1, 2, 3] }
$count(values)
// deps = ["values"]  (the array path only)
```

---

### Array Transformations

**Functions:** `map`, `filter` (`[...]`), `.` (flatmap)

Dependencies preserved **per element**:

#### Map

Lambda variable = **element value**

```javascript
// Data: { nums: [1, 2, 3] }
$map(nums, $x => $x * 2)
// Each element tracks its source: nums[0], nums[1], nums[2]
```

#### Filter

Lambda variable = **index**, use `$this()` for element

```javascript
// By value:
nums[$i => $this() > 2]     // Keeps [3] with deps = ["nums[2]"]

// By index:
nums[$i => $i >= 1]         // Keeps [2, 3] with deps = ["nums[1]", "nums[2]"]
```

**Object filter** (dynamic property access):

```javascript
// Data: { user: { name: "Alice" }, field: "name" }
user[field]
// path = "user.name", deps = ["field"]
```

---

### Element Access

**Functions:** `elem`, `array[index]`, `object[key]`

#### Constant Access

```javascript
items[1]         // path = "items[1]", deps = []
obj["x"]         // path = "obj.x", deps = []
```

#### Dynamic Access

```javascript
// Data: { items: [10, 20, 30], idx: 1 }
$elem(items, idx)
// path = "items[1]", deps = ["idx"]

// Computed index:
$elem(items, base + offset)
// path = "items[3]", deps = ["base", "offset"]
```

**Important:** Direct syntax `items[variable]` doesn't work for variables. Use:
```javascript
// ❌ items[idx]  (looks for 'idx' property on elements)
// ✅ let $i := idx in items[$i]
// ✅ $elem(items, idx)
```

---

### Search Functions

**Functions:** `first`, `firstIndex`, `any`, `all`, `contains`, `indexOf`

Early termination - only tracks evaluated elements:

```javascript
// Data: { items: [1, 5, 3, 8, 2] }
$first(items, $i => $this() > 4)
// Returns: 5 (at index 1)
// deps includes items[0], items[1]
// items[2], items[3], items[4] NOT tracked (not evaluated)
```

Lambda variable = **index**, use `$this()` for element.

---

### Property Access

Direct access preserves path, inherits parent deps:

```javascript
// Data: { user: { name: "Alice" } }
user.name        // path = "user.name", deps = []

// With inherited deps:
let $obj := $object("val", a + b) in $obj.val
// deps = ["a", "b"] (inherited from construction)
```

**`keys` and `values`:**

```javascript
// Data: { obj: { x: 10, y: 20 } }
$sum($values(obj))
// deps = ["obj.x", "obj.y"]
```

---

### String Operations

**Functions:** `string`, `lower`, `upper`, `fixed`

```javascript
$string(first, " ", last)    // deps = ["first", "last"] (" " is a literal)
$string("Hello ", name)      // deps = ["name"] ("Hello " is a literal)
$lower(name)                 // deps = ["name"]
```

---

### Construction

**`object`:** Creates object from key-value pairs

Each property value in a constructed object retains its own dependencies. When you
access a property, only that property's deps are returned (not deps from other properties).

```javascript
// Data: { x: 5, y: 10, a: 3, b: 7 }

// Creating an object - each property tracks its own deps
let $obj := $object("sum", x + y, "product", a * b)

// Accessing a property returns ONLY that property's deps
$obj.sum       // deps = ["x", "y"] (NOT ["x", "y", "a", "b"])
$obj.product   // deps = ["a", "b"] (NOT ["x", "y", "a", "b"])
```

**`array`:** Flattens and combines

```javascript
$array(a, [b, c])    // deps = ["a", "b", "c"]
```

---

## Practical Examples

### Example 1: Selective Filtering

```javascript
// Data: { scores: [50, 75, 90, 65, 85] }

$sum(scores[$i => $this() >= 70])
// Result: 250 (75 + 90 + 85)
// deps = ["scores[1]", "scores[2]", "scores[4]"]
// Only filtered elements tracked!
```

### Example 2: Dynamic Property Pipeline

```javascript
// Data: {
//   products: [
//     { name: "A", price: 10, stock: 5 },
//     { name: "B", price: 20, stock: 0 },
//     { name: "C", price: 15, stock: 3 }
//   ]
// }

$sum($map(products[$i => $this()["stock"] > 0], $p => $p["price"]))
// Result: 25 (A + C)
// deps includes:
//   - products[0].stock, products[0].price
//   - products[2].stock, products[2].price
// Product B not included (filtered out)
```

### Example 3: Conditional Dependencies

```javascript
// Data: {
//   status: "premium",
//   basePrice: 100,
//   discount: 20,
//   tax: 10
// }

let $final := status = "premium" ? basePrice - discount : basePrice
in $final + tax

// If premium:
//   deps = ["status", "basePrice", "discount", "tax"]
// If not premium:
//   deps = ["status", "basePrice", "tax"]
//   ("discount" not tracked)
```

### Example 4: Dynamic Object Access

```javascript
// Data: {
//   config: { theme_light: "white", theme_dark: "black" },
//   mode: "dark"
// }

config[$string("theme_", mode)]
// Result: "black"
// path = "config.theme_dark"
// deps = ["mode"]
```

---

## Quick Reference

**Note:** `deps` only includes **data path references**, not literal values.

| Category | Path | Deps | Notes |
|----------|------|------|-------|
| **Arithmetic** | No | Data refs only | `a + 5` → deps = `["a"]` |
| **Conditionals** | No | Cond + taken branch | `a ? b : c` |
| **Aggregations** | No | All elements | `$sum`, `$min`, `$max` |
| **Count** | No | Array only | `$count(array)` → deps = `["array"]` |
| **Transformations** | Per element | Per element | `$map`, `filter` |
| **Constant access** | Yes | None | `array[0]`, `obj.x` |
| **Dynamic access** | Yes | Index/key | `$elem(array, idx)` |
| **Search** | Element | Evaluated only | `$first`, `$any` |
| **Property** | Yes | Parent + child | `user.name` |
| **Construction** | No | Per-property | `$object(...)` - access returns only that property's deps |

---

## Common Patterns

### Pattern: Reactive Form Field

```javascript
// Only re-validate when dependencies change
let $age := user.age
in $age >= 18 and $age < 100
// deps = ["user.age"]
// Re-runs only when user.age changes
```

### Pattern: Conditional Computation

```javascript
// Avoid computing expensive values when not needed
enabled ? $sum($map(data, $x => expensiveCalc($x))) : 0
// If enabled=false, deps = ["enabled"]
// expensiveCalc never runs!
```

### Pattern: Dynamic Data Access

```javascript
// Access different data based on mode
let $key := mode = "edit" ? "draftData" : "publishedData"
in root[$key]
// deps includes "mode" and the accessed data path
```

---

## Limitations

1. **Array/object access with variables:** Use `let` or `$elem`
   ```javascript
   // ❌ array[variable]
   // ✅ let $i := variable in array[$i]
   ```

2. **Filter parameter binding:** Lambda is index, not element
   ```javascript
   // ❌ array[$x => $x > 5]
   // ✅ array[$i => $this() > 5]
   ```

3. **Map parameter binding:** Lambda is element, not index
   ```javascript
   // ✅ $map(array, $x => $x * 2)
   // ❌ $map(array, $i => array[$i] * 2)
   ```
