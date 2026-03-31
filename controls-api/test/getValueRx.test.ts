import { describe, it, expect } from "@jest/globals";
import { ControlChange } from "../src/lib/types";
import { noopReadContext, TrackingReadContext } from "../src/lib/readContextImpl";
import { makeCtx } from "./index";

const rc = noopReadContext;

describe("getValueRx", () => {
  it("returns primitive values directly", () => {
    const ctx = makeCtx();
    const c = ctx.newControl("hello");
    expect(rc.getValueRx(c)).toBe("hello");
  });

  it("returns null/undefined directly", () => {
    const ctx = makeCtx();
    const c = ctx.newControl<string | null>(null);
    expect(rc.getValueRx(c)).toBeNull();
  });

  it("proxies object field access through child controls", () => {
    const ctx = makeCtx();
    const c = ctx.newControl({ name: "Alice", age: 30 });
    const proxy = rc.getValueRx(c);

    expect(proxy.name).toBe("Alice");
    expect(proxy.age).toBe(30);
  });

  it("reflects mutations to child controls", () => {
    const ctx = makeCtx();
    const c = ctx.newControl({ name: "Alice", age: 30 });

    ctx.update((wc) => wc.setValue(c.fields.name, "Bob"));

    const proxy = rc.getValueRx(c);
    expect(proxy.name).toBe("Bob");
    expect(proxy.age).toBe(30);
  });

  it("recurses into nested objects", () => {
    const ctx = makeCtx();
    const c = ctx.newControl({
      address: { city: "NYC", zip: "10001" },
    });
    const proxy = rc.getValueRx(c);

    expect(proxy.address.city).toBe("NYC");
    expect(proxy.address.zip).toBe("10001");
  });

  it("proxies array index access through element controls", () => {
    const ctx = makeCtx();
    const c = ctx.newControl(["a", "b", "c"]);
    const proxy = rc.getValueRx(c);

    expect(proxy.length).toBe(3);
    expect(proxy[0]).toBe("a");
    expect(proxy[1]).toBe("b");
    expect(proxy[2]).toBe("c");
  });

  it("proxies array of objects", () => {
    const ctx = makeCtx();
    const c = ctx.newControl([
      { name: "Alice" },
      { name: "Bob" },
    ]);
    const proxy = rc.getValueRx(c);

    expect(proxy[0].name).toBe("Alice");
    expect(proxy[1].name).toBe("Bob");
  });

  // ── Tracking tests ──────────────────────────────────────────────────

  it("tracks Value for primitive controls", () => {
    const ctx = makeCtx();
    const c = ctx.newControl("hello");
    const trc = new TrackingReadContext();

    trc.getValueRx(c);

    expect(trc.tracked.size).toBe(1);
    expect(trc.tracked.get(c as any)).toBe(ControlChange.Value);
  });

  it("tracks Structure for null controls", () => {
    const ctx = makeCtx();
    const c = ctx.newControl<string | null>(null);
    const trc = new TrackingReadContext();

    trc.getValueRx(c);

    expect(trc.tracked.size).toBe(1);
    expect(trc.tracked.get(c as any)).toBe(ControlChange.Structure);
  });

  it("tracks only accessed child fields, not the parent value", () => {
    const ctx = makeCtx();
    const c = ctx.newControl({ name: "Alice", age: 30 });
    const trc = new TrackingReadContext();

    const proxy = trc.getValueRx(c);
    // Only access name, not age
    const _ = proxy.name;

    // Should track: parent (Structure) + name child (Value or Structure depending on depth)
    // Parent is tracked for Structure (null transition detection)
    // name child is tracked for Value (it's a primitive)
    const entries = [...trc.tracked.entries()];
    expect(entries.length).toBe(2);

    // Verify name's child control was tracked, not just the parent
    const nameControl = c.fields.name;
    expect(trc.tracked.has(nameControl as any)).toBe(true);
  });

  it("does not track unaccessed child fields", () => {
    const ctx = makeCtx();
    const c = ctx.newControl({ name: "Alice", age: 30 });
    const trc = new TrackingReadContext();

    const proxy = trc.getValueRx(c);
    const _ = proxy.name; // only access name

    const ageControl = c.fields.age;
    expect(trc.tracked.has(ageControl as any)).toBe(false);
  });
});
