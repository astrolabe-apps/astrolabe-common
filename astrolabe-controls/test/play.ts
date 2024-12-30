import fc from "fast-check";
import { arbitraryParentChild } from "./gen";

fc.assert(
  fc.property(arbitraryParentChild, (v) => {
    v.child.error = "Broken";
    return !v.parent.valid;
  }),
);
