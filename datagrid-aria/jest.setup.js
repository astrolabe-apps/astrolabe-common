/**
 * jsdom gaps that React Aria's overlays hit.
 *
 * The Fluent package needs none of this: Griffel and Fluent's Popover don't
 * measure the viewport the way `useOverlayPosition` does, and Fluent's press
 * handling doesn't consult `PointerEvent`.
 */

// `useResizeObserver` is used by the popover positioning and by Select. jsdom has
// no implementation at all, so the constructor itself throws.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// `usePress` prefers pointer events when `PointerEvent` exists, and jsdom (as of
// 20.x) defines neither the constructor nor the pointer methods on Element. Left
// undefined, React Aria falls back to its mouse-event path, which is what
// `fireEvent.click` produces — so the tests exercise the same code a mouse does.
if (typeof globalThis.PointerEvent === "undefined") {
  for (const method of ["setPointerCapture", "releasePointerCapture", "hasPointerCapture"]) {
    if (!Element.prototype[method]) Element.prototype[method] = () => {};
  }
}

// Overlay positioning reads these off the trigger; jsdom returns 0 for
// everything, which is fine — it just needs them to exist.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
