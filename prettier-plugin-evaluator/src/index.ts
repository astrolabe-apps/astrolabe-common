import type { Plugin } from "prettier";
import { parse, type AlNode, type AlRoot } from "./parse.ts";
import { printRoot } from "./print.ts";

const plugin: Plugin<AlNode> = {
  languages: [
    {
      name: "Astrolang",
      parsers: ["evaluator"],
      extensions: [".al"],
    },
  ],
  parsers: {
    evaluator: {
      parse,
      astFormat: "evaluator",
      locStart: (node) => node.from,
      locEnd: (node) => node.to,
    },
  },
  printers: {
    evaluator: {
      print: (path) => printRoot(path.node as AlRoot),
    },
  },
};

export default plugin;
