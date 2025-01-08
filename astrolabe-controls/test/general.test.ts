import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  cleanupControl,
  collectChanges,
  ControlChange,
  deepEquals,
  newControl,
  SubscriptionTracker,
  updateComputedValue,
} from "../src";
import { arbitraryChangeAndTrigger, arbitraryParentChild } from "./gen";
import { expectChanges } from "./index";

describe("general", () => {
  it("dirty flag for value", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const changes: ControlChange[] = [];
        const f = newControl(text);
        f.subscribe((a, c) => changes.push(c), ControlChange.Value);
        f.value = text + "a";
        expect(changes).toStrictEqual([ControlChange.Value]);
        return f.dirty;
      }),
    );
  });

  it("only get changes after subscription", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const changes: ControlChange[] = [];
        const changes2: ControlChange[] = [];
        const f = newControl(text);
        f.subscribe(
          (a, c) => changes.push(c),
          ControlChange.Value | ControlChange.Dirty,
        );
        f.value = text + "a";
        f.subscribe((a, c) => changes2.push(c), ControlChange.Value);
        f.value = text + "b";
        expect(changes).toStrictEqual([
          ControlChange.Value | ControlChange.Dirty,
          ControlChange.Value,
        ]);
        expect(changes2).toStrictEqual([ControlChange.Value]);
        return f.dirty;
      }),
    );
  });

  it("dont get changes after unsubscribe", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const changes: ControlChange[] = [];
        const f = newControl(text);
        const sub1 = f.subscribe(
          (a, c) => changes.push(c),
          ControlChange.Value,
        );
        f.value = text + "a";
        f.unsubscribe(sub1);
        f.value = text + "b";
        expect(changes).toStrictEqual([ControlChange.Value]);
      }),
    );
  });

  it("can lookup arbitrary child", () => {
    fc.assert(
      fc.property(arbitraryParentChild, (json) => {
        const parent = newControl(json.json);
        const child = parent.lookupControl(json.child);
        return child != null;
      }),
    );
  });

  it("can set computation", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        fc.array(fc.integer()),
        (numbers1, numbers2) => {
          const changes: ControlChange[] = [];
          const numberControls = newControl(numbers1);
          const resultControl = newControl(-1);
          resultControl.subscribe(
            (a, c) => changes.push(c),
            ControlChange.Value,
          );
          let sumCalled = 0;
          const sum = () => {
            sumCalled++;
            return numberControls.elements.reduce((a, b) => a + b.value, 0);
          };
          const max = () =>
            numberControls.elements.reduce((a, b) => Math.max(a, b.value), 0);
          updateComputedValue(resultControl, sum);
          updateComputedValue(resultControl, sum);
          expect(sumCalled).toBe(1);
          expectChanges(changes, [ControlChange.Value]);
          expect(resultControl.value).toStrictEqual(
            numbers1.reduce((a, b) => a + b, 0),
          );
          numberControls.value = numbers2;
          expectChanges(
            changes,
            deepEquals(numbers1, numbers2) ? [] : [ControlChange.Value],
          );
          expect(resultControl.value).toStrictEqual(
            numbers2.reduce((a, b) => a + b, 0),
          );
          updateComputedValue(resultControl, max);
          expect(resultControl.value).toStrictEqual(
            numbers2.reduce((a, b) => Math.max(a, b), 0),
          );
        },
      ),
    );
  });

  it("cleaned up control stops computation", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        fc.array(fc.integer({ min: 1 }), { minLength: 1 }),
        (numbers1, numbers2) => {
          const changes: ControlChange[] = [];
          const numberControls = newControl(numbers1);
          const newNumbers = [...numbers1, ...numbers2];
          const resultControl = newControl(-1);
          resultControl.subscribe(
            (a, c) => changes.push(c),
            ControlChange.Value,
          );
          const sum = () =>
            numberControls.elements.reduce((a, b) => a + b.value, 0);
          const actualSum = numbers1.reduce((a, b) => a + b, 0);
          updateComputedValue(resultControl, sum);
          expect(resultControl.value).toStrictEqual(actualSum);
          cleanupControl(resultControl);
          numberControls.value = newNumbers;
          expect(resultControl.value).toStrictEqual(actualSum);
        },
      ),
    );
  });

  it("subscription tracker subscribes correctly", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            changes: fc.array(arbitraryChangeAndTrigger, { minLength: 1 }),
            value: fc.unicodeJsonValue(),
            track: fc.boolean(),
          }),
          { minLength: 1 },
        ),
        (changeRequests) => {
          const control = newControl(changeRequests.map((x) => x.value));
          const controls = control.current.elements;
          const expectedChanges: Record<string, ControlChange> = {};
          const tracker = new SubscriptionTracker((a, c) => {});
          collectChanges(tracker.collectUsage, () => {
            changeRequests.forEach((x, i) => {
              const child = controls[i];
              x.changes.forEach((c) => {
                c.trigger(x.track ? child : child.current);
              });
            });
          });
          changeRequests.forEach((x, i) => {
            const cId = controls[i].uniqueId;
            if (x.track) {
              x.changes.forEach((c) => {
                expectedChanges[cId] = (expectedChanges[cId] || 0) | c.change;
              });
            }
          });
          expect(
            Object.fromEntries(
              tracker.subscriptions.map((x) => [x[0].uniqueId, x[2]]),
            ),
          ).toStrictEqual(expectedChanges);
        },
      ),
    );
  });
});
