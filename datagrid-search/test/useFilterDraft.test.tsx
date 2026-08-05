import { afterEach, describe, expect, it } from "@jest/globals";
import { act, cleanup, render } from "@testing-library/react";
import * as React from "react";
import { newControl, useComponentTracking } from "@react-typed-forms/core";
import {
  defaultSearchOptions,
  type SearchOptions,
} from "@astroapps/searchstate";
import {
  makeGridFilter,
  useFilterDraft,
  type ColumnFilter,
  type FilterDraft,
} from "../src";

function stateWith(over: Partial<SearchOptions> = {}) {
  return newControl<SearchOptions>({ ...defaultSearchOptions, ...over });
}

// See data.test.tsx: ts-jest doesn't apply the control-tracking transform, so
// `useComponentTracking` is invoked by hand to stay on the real code path.
function tracked(run: () => void) {
  const stop = useComponentTracking();
  try {
    run();
  } finally {
    stop();
  }
}

/**
 * Renders the hook against a real `GridFilter` over `state`, and exposes its
 * latest result — `makeGridFilter` is rebuilt per render exactly as `useGridSearch`
 * does, so the draft sees committed values change.
 *
 * `deferApply` is grid-level, so it goes to `makeGridFilter` rather than into the
 * column's config.
 */
function renderDraft(
  state: ReturnType<typeof stateWith>,
  options: { filter?: ColumnFilter<unknown>; deferApply?: boolean } = {},
  field = "kind",
) {
  const { filter = {}, deferApply } = options;
  const seen: { current: FilterDraft } = { current: undefined as any };
  function Probe() {
    tracked(() => {
      seen.current = useFilterDraft({
        filter,
        field,
        gridFilter: makeGridFilter(state, { deferApply }),
      });
    });
    return null;
  }
  const rendered = render(<Probe />);
  return { seen, unmount: rendered.unmount };
}

afterEach(cleanup);

describe("useFilterDraft, applying immediately", () => {
  it("writes a toggle straight to the search", async () => {
    const state = stateWith();
    const { seen } = renderDraft(state);
    await act(async () => seen.current.toggle("doc", true));
    expect(state.fields.filters.value).toEqual({ kind: ["doc"] });
    expect(seen.current.values).toEqual(["doc"]);
    expect(seen.current.deferred).toBe(false);
  });

  it("adds to a multi-select and removes from it", async () => {
    const state = stateWith({ filters: { kind: ["doc"] } });
    const { seen } = renderDraft(state);
    await act(async () => seen.current.toggle("img", true));
    expect(state.fields.filters.value).toEqual({ kind: ["doc", "img"] });
    await act(async () => seen.current.toggle("doc", false));
    expect(state.fields.filters.value).toEqual({ kind: ["img"] });
  });

  it("replaces the value of a single-select", async () => {
    const state = stateWith({ filters: { kind: ["doc"] } });
    const { seen } = renderDraft(state, { filter: { multiple: false } });
    await act(async () => seen.current.toggle("img", true));
    expect(state.fields.filters.value).toEqual({ kind: ["img"] });
  });

  it("clears the field, leaving no key behind", async () => {
    const state = stateWith({ filters: { kind: ["doc"], size: ["1"] } });
    const { seen } = renderDraft(state);
    await act(async () => seen.current.clear());
    expect(state.fields.filters.value).toEqual({ size: ["1"] });
  });

  it("applies nothing on apply, since there is nothing pending", async () => {
    const state = stateWith({ filters: { kind: ["doc"] } });
    const { seen } = renderDraft(state);
    await act(async () => seen.current.apply());
    expect(state.fields.filters.value).toEqual({ kind: ["doc"] });
  });
});

describe("useFilterDraft, deferring to apply", () => {
  const deferred = { deferApply: true };

  it("holds a toggle out of the search until apply", async () => {
    const state = stateWith();
    const { seen } = renderDraft(state, deferred);
    await act(async () => seen.current.toggle("doc", true));
    // Visibly selected in the popup, invisible to the search.
    expect(seen.current.values).toEqual(["doc"]);
    expect(seen.current.deferred).toBe(true);
    expect(state.fields.filters.value).toEqual({});

    await act(async () => seen.current.apply());
    expect(state.fields.filters.value).toEqual({ kind: ["doc"] });
  });

  it("accumulates several toggles into one search", async () => {
    const state = stateWith();
    const { seen } = renderDraft(state, deferred);
    await act(async () => seen.current.toggle("doc", true));
    await act(async () => seen.current.toggle("img", true));
    await act(async () => seen.current.toggle("doc", false));
    expect(state.fields.filters.value).toEqual({});
    await act(async () => seen.current.apply());
    expect(state.fields.filters.value).toEqual({ kind: ["img"] });
  });

  it("starts from what is already applied", async () => {
    const state = stateWith({ filters: { kind: ["doc"] } });
    const { seen } = renderDraft(state, deferred);
    expect(seen.current.values).toEqual(["doc"]);
  });

  it("discards a draft that is never applied", async () => {
    const state = stateWith({ filters: { kind: ["doc"] } });
    const { seen, unmount } = renderDraft(state, deferred);
    await act(async () => seen.current.toggle("img", true));
    // Closing the popup unmounts the body, which is the whole cancel path.
    unmount();
    expect(state.fields.filters.value).toEqual({ kind: ["doc"] });
  });

  it("clears the draft rather than the search", async () => {
    const state = stateWith({ filters: { kind: ["doc"] } });
    const { seen } = renderDraft(state, deferred);
    await act(async () => seen.current.clear());
    expect(seen.current.values).toEqual([]);
    expect(state.fields.filters.value).toEqual({ kind: ["doc"] });

    // Clear then Apply is how a deferred filter gets removed.
    await act(async () => seen.current.apply());
    expect(state.fields.filters.value).toEqual({});
  });

  it("applies an emptied selection as a removed key, not an empty array", async () => {
    const state = stateWith({ filters: { kind: ["doc"] } });
    const { seen } = renderDraft(state, deferred);
    await act(async () => seen.current.toggle("doc", false));
    await act(async () => seen.current.apply());
    expect(state.fields.filters.value).toEqual({});
  });

  it("resets paging when it applies, and not before", async () => {
    const state = stateWith({ offset: 20 });
    const { seen } = renderDraft(state, deferred);
    await act(async () => seen.current.toggle("doc", true));
    expect(state.fields.offset.value).toBe(20);
    await act(async () => seen.current.apply());
    expect(state.fields.offset.value).toBe(0);
  });

  it("defers every column, whatever its own config says", async () => {
    // The point of the option being grid-level: one funnel can't commit on click
    // while the one beside it waits for Apply.
    const state = stateWith();
    const single = renderDraft(
      state,
      { filter: { multiple: false }, deferApply: true },
      "size",
    );
    await act(async () => single.seen.current.toggle("1", true));
    expect(single.seen.current.deferred).toBe(true);
    expect(state.fields.filters.value).toEqual({});
    await act(async () => single.seen.current.apply());
    expect(state.fields.filters.value).toEqual({ size: ["1"] });
  });
});
