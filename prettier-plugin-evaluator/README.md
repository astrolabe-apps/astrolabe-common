# @astroapps/prettier-plugin-evaluator

Prettier plugin for evaluator expressions (`.al` files), built on the Lezer grammar from `@astroapps/evaluator`.

## Install

```sh
npm install --save-dev prettier @astroapps/prettier-plugin-evaluator
```

Prettier is a peer dependency: 3.8 or a later 3.x.

## Usage

Add the plugin to your Prettier config. The override keeps it to `.al` files:

```json
{
  "overrides": [
    {
      "files": "*.al",
      "options": {
        "plugins": ["@astroapps/prettier-plugin-evaluator"]
      }
    }
  ]
}
```

Prettier then picks the `evaluator` parser for `.al` files by extension. Formatting other file types, or a string through the API, needs `parser: "evaluator"`:

```ts
import { format } from "prettier";
import plugin from "@astroapps/prettier-plugin-evaluator";

await format("$sum( $a , [1,2] )", { parser: "evaluator", plugins: [plugin] });
// "$sum($a, [1, 2])\n"
```

The standard layout options (`printWidth`, `useTabs`, `tabWidth`) apply. Comments are kept.

## Development

- `rushx test` runs the formatting tests against `src/`, so they need no build.
- `rushx build` typechecks, then compiles `src/` to `lib/` with `tsc`.
- `rushx test:dist` checks that the built package loads by name on plain Node and formats. Run it after `build`.
- `sample.al` is a file to try the formatter on.

The source only uses erasable syntax (`erasableSyntaxOnly`) and imports local files with their `.ts` extension, which the build rewrites to `.js`. The config is TypeScript 7 ready (no `moduleResolution: node`). Check with `npx -p typescript@7 tsc`.
