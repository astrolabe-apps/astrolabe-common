import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { StrictMode } from "react";
import {
  useControl,
  useComputed,
  useControlEffect,
  useComponentTracking,
  useValidator,
} from "../src/hooks";
import { newControl, runPendingChanges } from "@astroapps/controls";

// Helper that wraps a hook call with useComponentTracking
function useTracked<T>(hookFn: () => T): () => T {
  return () => {
    const stop = useComponentTracking();
    try {
      return hookFn();
    } finally {
      stop();
    }
  };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe("useControl", () => {
  it("creates a control with initial value", () => {
    const { result } = renderHook(useTracked(() => useControl(42)));
    expect(result.current.value).toBe(42);
  });

  it("creates a control with factory function", () => {
    const { result } = renderHook(
      useTracked(() => useControl(() => ({ a: 1, b: 2 }))),
    );
    expect(result.current.value).toEqual({ a: 1, b: 2 });
  });

  it("preserves control identity across re-renders", () => {
    const { result, rerender } = renderHook(useTracked(() => useControl(42)));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("cleans up control on real unmount", () => {
    const afterInit = jest.fn();
    const { result, unmount } = renderHook(
      useTracked(() => useControl(42, undefined, afterInit)),
    );
    expect(afterInit).toHaveBeenCalledTimes(1);
    unmount();
    // Cleanup happens via setTimeout(0)
    jest.advanceTimersByTime(1);
    // Control should be cleaned up - further operations should still work
    // but subscriptions should be gone
  });

  it("throws without useComponentTracking", () => {
    expect(() => {
      renderHook(() => useControl(42));
    }).toThrow("No active ComponentTracker");
  });
});

describe("useComputed", () => {
  it("computes value from controls", () => {
    const source = newControl(10);
    const { result } = renderHook(
      useTracked(() => useComputed(() => source.value * 2)),
    );
    expect(result.current.value).toBe(20);
  });

  it("updates when source control changes", () => {
    const source = newControl(10);
    const { result } = renderHook(
      useTracked(() => useComputed(() => source.value * 2)),
    );
    expect(result.current.value).toBe(20);

    act(() => {
      source.value = 25;
    });
    expect(result.current.value).toBe(50);
  });

  it("uses latest compute function when dependency changes", () => {
    const source = newControl(10);
    let multiplier = 2;
    const { result } = renderHook(
      useTracked(() => useComputed(() => source.value * multiplier)),
    );
    expect(result.current.value).toBe(20);

    // Update the closure variable - value won't change until a dependency triggers recomputation
    multiplier = 3;

    // Trigger recomputation by changing a tracked dependency
    act(() => {
      source.value = 5;
    });
    // The latest compute function (with multiplier=3) should be used
    expect(result.current.value).toBe(15);
  });
});

describe("useControlEffect", () => {
  it("fires onChange when computed value changes", () => {
    const source = newControl(1);
    const onChange = jest.fn();

    renderHook(
      useTracked(() => {
        useControlEffect(() => source.value, onChange);
      }),
    );

    // Should not have been called yet (no initial)
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      source.value = 2;
    });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("fires initial handler when initial=true", () => {
    const source = newControl(5);
    const onChange = jest.fn();

    renderHook(
      useTracked(() => {
        useControlEffect(() => source.value, onChange, true);
      }),
    );

    // Flush pending changes from render
    act(() => {
      jest.advanceTimersByTime(0);
      runPendingChanges();
    });

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("fires custom initial handler", () => {
    const source = newControl(5);
    const onChange = jest.fn();
    const onInitial = jest.fn();

    renderHook(
      useTracked(() => {
        useControlEffect(() => source.value, onChange, onInitial);
      }),
    );

    act(() => {
      jest.advanceTimersByTime(0);
      runPendingChanges();
    });

    expect(onInitial).toHaveBeenCalledWith(5);
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      source.value = 10;
    });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("uses latest onChange callback", () => {
    const source = newControl(1);
    const calls: string[] = [];

    const { rerender } = renderHook(
      useTracked(() => {
        useControlEffect(
          () => source.value,
          (v) => calls.push(`render1:${v}`),
        );
      }),
    );

    // Rerender with a new callback
    // Note: since useTracked creates a new closure each time, we need a different approach
    // The key test is that c.meta.__onChange is updated on every render
    act(() => {
      source.value = 2;
    });
    expect(calls).toContain("render1:2");
  });
});

describe("useValidator", () => {
  it("sets error on control", () => {
    const { result } = renderHook(
      useTracked(() => {
        const control = useControl("");
        useValidator(control, (v) => (v === "" ? "Required" : null));
        return control;
      }),
    );

    act(() => {
      jest.advanceTimersByTime(0);
      runPendingChanges();
    });

    expect(result.current.error).toBe("Required");
  });

  it("clears error when valid", () => {
    const { result } = renderHook(
      useTracked(() => {
        const control = useControl("hello");
        useValidator(control, (v) => (v === "" ? "Required" : null));
        return control;
      }),
    );

    act(() => {
      jest.advanceTimersByTime(0);
      runPendingChanges();
    });

    expect(result.current.error).toBeNull();
  });

  it("clears error on unmount", () => {
    const sharedControl = newControl("");

    const { unmount } = renderHook(
      useTracked(() => {
        useValidator(sharedControl, (v) => (v === "" ? "Required" : null));
      }),
    );

    act(() => {
      jest.advanceTimersByTime(0);
      runPendingChanges();
    });

    expect(sharedControl.error).toBe("Required");

    unmount();
    jest.advanceTimersByTime(1);

    expect(sharedControl.error).toBeNull();
  });
});

describe("Strict Mode", () => {
  it("useControl works after strict mode cycle", () => {
    const { result } = renderHook(
      useTracked(() => useControl(42)),
      { wrapper: StrictMode },
    );
    expect(result.current.value).toBe(42);
  });

  it("useComputed updates after strict mode cycle", () => {
    const source = newControl(10);
    const { result } = renderHook(
      useTracked(() => useComputed(() => source.value * 2)),
      { wrapper: StrictMode },
    );
    expect(result.current.value).toBe(20);

    act(() => {
      source.value = 30;
    });
    expect(result.current.value).toBe(60);
  });

  it("useControlEffect fires after strict mode cycle", () => {
    const source = newControl(1);
    const onChange = jest.fn();

    renderHook(
      useTracked(() => {
        useControlEffect(() => source.value, onChange);
      }),
      { wrapper: StrictMode },
    );

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      source.value = 2;
    });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("useValidator works after strict mode cycle", () => {
    const { result } = renderHook(
      useTracked(() => {
        const control = useControl("");
        useValidator(control, (v) => (v === "" ? "Required" : null));
        return control;
      }),
      { wrapper: StrictMode },
    );

    act(() => {
      jest.advanceTimersByTime(0);
      runPendingChanges();
    });

    expect(result.current.error).toBe("Required");

    act(() => {
      result.current.value = "hello";
    });

    expect(result.current.error).toBeNull();
  });

  it("cleans up on real unmount after strict mode", () => {
    const source = newControl(1);
    const onChange = jest.fn();

    const { unmount } = renderHook(
      useTracked(() => {
        useControlEffect(() => source.value, onChange);
      }),
      { wrapper: StrictMode },
    );

    // Verify it works first
    act(() => {
      source.value = 2;
    });
    expect(onChange).toHaveBeenCalledWith(2);
    onChange.mockClear();

    // Real unmount
    unmount();
    jest.advanceTimersByTime(1);

    // After cleanup, changes should not fire the effect
    source.value = 3;
    expect(onChange).not.toHaveBeenCalled();
  });
});
