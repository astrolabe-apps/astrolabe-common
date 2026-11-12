# Astrolabe.Evaluator

This is a simple expression language similar to JSONata.

Part of the astrolabe apps library stack.

## Let bindings

`let` bindings are lazy and recursive: every binding sees every other binding in the same `let`,
and itself, so the order they are written in doesn't matter.

```
let $a := $b + 1, $b := 2 in $a    // 3
```

Because a binding sees itself, `let $x := 5 in let $x := $x + 3 in $x` does **not** mean "outer
`$x` plus 3": the inner `$x` refers to itself. A binding that depends on itself, directly or through
other bindings, evaluates to `null` with the error `Circular reference to $x`, in both full and
partial evaluation.

`PartialEvaluation.FreeVariables` (C#) and `freeVariables` (TypeScript) return the variables an
expression references that it doesn't bind itself, following the same scoping rules.
