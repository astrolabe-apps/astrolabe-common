import { ControlChange, Control } from "./types";
import { InternalControl } from "./internal";

// Simple path calculation to avoid circular dependency
function getSimpleControlPath(control: Control<any>): string {
  try {
    const internalControl = control as InternalControl<any>;
    const path: (string | number)[] = [];
    let current = internalControl;

    while (current) {
      const parent = current.parents?.[0];
      if (!parent || typeof parent !== 'object' || !('current' in parent)) break;

      const parentControl = parent as unknown as InternalControl<any>;
      // Try to find the field/element name in the parent
      const parentCurrent = parentControl.current;
      if (parentCurrent.fields) {
        for (const [key, value] of Object.entries(parentCurrent.fields)) {
          if (value === current) {
            path.unshift(key);
            break;
          }
        }
      } else if (parentCurrent.elements) {
        const index = parentCurrent.elements.indexOf(current as any);
        if (index >= 0) {
          path.unshift(index);
        }
      }
      current = parentControl;
    }

    return path.join('.');
  } catch {
    return '';
  }
}

// Simple control metrics focused on what developers actually need
export interface ControlMetrics {
  totalControls: number;
  heavilySubscribedControls: number; // 5+ subscriptions

  // Value type breakdown
  valueTypes: {
    primitive: number;  // string, number, boolean
    object: number;     // objects (forms, etc.)
    array: number;      // arrays/lists
    null: number;       // null/undefined
  };

  // Subscription summary (as subset of control data)
  subscriptionSummary: {
    totalSubscriptions: number;
    averagePerControl: number;
    maxInOneControl: number;
    mostCommonChangeTypes: Array<{ type: string; count: number }>;
  };
}

export interface ControlInfo {
  control: Control<any>;
  value: any;
  valueType: string;
  subscriptionCount: number;
  changeTypes: string[];
  subscriptions: Array<{
    mask: number;
    changeTypes: string[];
    listenerCount: number;
    listeners: Array<{
      listener: Function;
      mask: number;
      changeTypes: string[];
    }>;
  }>;
  path?: string;
  creationStack?: string;
}

// Global registry - simple approach
class ControlRegistry {
  private static controls = new Set<Control<any>>();
  private static stackTraces = new WeakMap<Control<any>, string>();
  private static captureStackTraces = false;

  static enableStackTraceCapture() {
    ControlRegistry.captureStackTraces = true;
  }

  static disableStackTraceCapture() {
    ControlRegistry.captureStackTraces = false;
  }

  static isStackTraceCaptureEnabled(): boolean {
    return ControlRegistry.captureStackTraces;
  }

  static register(control: Control<any>) {
    ControlRegistry.controls.add(control);
  }

  static registerWithStack(control: Control<any>) {
    ControlRegistry.controls.add(control);
  }

  static captureCreationStack(control: Control<any>) {
    if (ControlRegistry.captureStackTraces) {
      try {
        // Capture stack trace, excluding this function and the calling function
        const stack = new Error().stack;
        if (stack) {
          const stackLines = stack.split('\n');
          // Remove "Error", "captureCreationStack", and the immediate caller (newControl)
          const relevantStack = stackLines.slice(3).join('\n');
          ControlRegistry.stackTraces.set(control, relevantStack);
        }
      } catch {
        // Stack trace capture failed, continue without it
      }
    }
  }

  static unregister(control: Control<any>) {
    ControlRegistry.controls.delete(control);
    ControlRegistry.stackTraces.delete(control);
  }

  static getAll(): Control<any>[] {
    return Array.from(ControlRegistry.controls);
  }

  static getStackTrace(control: Control<any>): string | undefined {
    return ControlRegistry.stackTraces.get(control);
  }

  static clear() {
    ControlRegistry.controls.clear();
    ControlRegistry.stackTraces = new WeakMap();
  }
}

// Helper to get readable change type names
function getChangeTypeNames(mask: ControlChange): string[] {
  const types: string[] = [];
  if (mask & ControlChange.Value) types.push('Value');
  if (mask & ControlChange.Valid) types.push('Valid');
  if (mask & ControlChange.Touched) types.push('Touched');
  if (mask & ControlChange.Dirty) types.push('Dirty');
  if (mask & ControlChange.Disabled) types.push('Disabled');
  if (mask & ControlChange.Error) types.push('Error');
  if (mask & ControlChange.InitialValue) types.push('InitialValue');
  if (mask & ControlChange.Structure) types.push('Structure');
  if (mask & ControlChange.Validate) types.push('Validate');
  return types;
}

// Main metrics functions
export function getControlMetrics(): ControlMetrics {
  const allControls = ControlRegistry.getAll();

  let totalControls = allControls.length;
  let heavilySubscribedControls = 0;
  let primitiveValues = 0;
  let objectValues = 0;
  let arrayValues = 0;
  let nullValues = 0;

  let totalSubscriptions = 0;
  let maxSubscriptions = 0;
  const changeTypeCounts = new Map<string, number>();

  allControls.forEach(control => {
    const internalControl = control as InternalControl<any>;

    // Analyze value type
    try {
      const value = control.current.value;
      if (value === null || value === undefined) {
        nullValues++;
      } else if (Array.isArray(value)) {
        arrayValues++;
      } else if (typeof value === 'object') {
        objectValues++;
      } else {
        primitiveValues++;
      }
    } catch {
      nullValues++;
    }

    // Analyze subscriptions (all controls in registry have subscriptions)
    const subscriptions = internalControl._subscriptions;
    if (subscriptions) {

      const lists = (subscriptions as any).lists || [];
      let controlSubscriptionCount = 0;

      lists.forEach((list: any) => {
        const count = list.subscriptions?.length || 0;
        controlSubscriptionCount += count;

        // Track change types
        const changeTypes = getChangeTypeNames(list.mask);
        changeTypes.forEach(type => {
          changeTypeCounts.set(type, (changeTypeCounts.get(type) || 0) + count);
        });
      });

      totalSubscriptions += controlSubscriptionCount;
      maxSubscriptions = Math.max(maxSubscriptions, controlSubscriptionCount);

      if (controlSubscriptionCount >= 5) {
        heavilySubscribedControls++;
      }
    }
  });

  const averagePerControl = totalControls > 0 ? totalSubscriptions / totalControls : 0;

  // Get most common change types
  const mostCommonChangeTypes = Array.from(changeTypeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalControls,
    heavilySubscribedControls,
    valueTypes: {
      primitive: primitiveValues,
      object: objectValues,
      array: arrayValues,
      null: nullValues
    },
    subscriptionSummary: {
      totalSubscriptions,
      averagePerControl,
      maxInOneControl: maxSubscriptions,
      mostCommonChangeTypes
    }
  };
}

export function getHeavyControls(threshold: number = 5): ControlInfo[] {
  const allControls = ControlRegistry.getAll();
  const heavyControls: ControlInfo[] = [];

  allControls.forEach(control => {
    const internalControl = control as InternalControl<any>;
    const subscriptions = internalControl._subscriptions;
    if (!subscriptions) return;

    const lists = (subscriptions as any).lists || [];
    let subscriptionCount = 0;
    const allChangeTypes = new Set<string>();

    lists.forEach((list: any) => {
      const count = list.subscriptions?.length || 0;
      subscriptionCount += count;

      const changeTypes = getChangeTypeNames(list.mask);
      changeTypes.forEach(type => allChangeTypes.add(type));
    });

    if (subscriptionCount >= threshold) {
      // Build detailed subscription info
      const subscriptionDetails = lists.map((list: any) => {
        const listSubscriptions = list.subscriptions || [];
        return {
          mask: list.mask,
          changeTypes: getChangeTypeNames(list.mask),
          listenerCount: listSubscriptions.length,
          listeners: listSubscriptions.map((sub: any) => ({
            listener: sub.listener,
            mask: sub.mask,
            changeTypes: getChangeTypeNames(sub.mask)
          }))
        };
      });

      heavyControls.push({
        control,
        value: control.current.value,
        valueType: getValueTypeString(control.current.value),
        subscriptionCount,
        changeTypes: Array.from(allChangeTypes),
        subscriptions: subscriptionDetails,
        path: getSimpleControlPath(control) || undefined,
        creationStack: ControlRegistry.getStackTrace(control)
      });
    }
  });

  return heavyControls.sort((a, b) => b.subscriptionCount - a.subscriptionCount);
}

export function findControlsByValue(searchValue: any): ControlInfo[] {
  const allControls = ControlRegistry.getAll();
  const matchingControls: ControlInfo[] = [];

  allControls.forEach(control => {
    try {
      const value = control.current.value;

      // Simple matching logic
      const matches =
        value === searchValue ||
        (typeof value === 'string' && typeof searchValue === 'string' && value.includes(searchValue)) ||
        (typeof value === 'object' && value !== null && JSON.stringify(value).includes(JSON.stringify(searchValue)));

      if (matches) {
        const internalControl = control as InternalControl<any>;
        const subscriptions = internalControl._subscriptions;
        let subscriptionCount = 0;
        const changeTypes: string[] = [];

        const subscriptionDetails: Array<{
          mask: number;
          changeTypes: string[];
          listenerCount: number;
          listeners: Array<{
            listener: Function;
            mask: number;
            changeTypes: string[];
          }>;
        }> = [];

        if (subscriptions) {
          const lists = (subscriptions as any).lists || [];
          lists.forEach((list: any) => {
            const listSubscriptions = list.subscriptions || [];
            const listenerCount = listSubscriptions.length;
            subscriptionCount += listenerCount;
            const listChangeTypes = getChangeTypeNames(list.mask);

            subscriptionDetails.push({
              mask: list.mask,
              changeTypes: listChangeTypes,
              listenerCount,
              listeners: listSubscriptions.map((sub: any) => ({
                listener: sub.listener,
                mask: sub.mask,
                changeTypes: getChangeTypeNames(sub.mask)
              }))
            });

            listChangeTypes.forEach(type => {
              if (!changeTypes.includes(type)) changeTypes.push(type);
            });
          });
        }

        matchingControls.push({
          control,
          value,
          valueType: getValueTypeString(value),
          subscriptionCount,
          changeTypes,
          subscriptions: subscriptionDetails,
          path: getSimpleControlPath(control) || undefined,
          creationStack: ControlRegistry.getStackTrace(control)
        });
      }
    } catch {
      // Skip controls that can't be analyzed
    }
  });

  return matchingControls;
}

function getValueTypeString(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

// Console functions for browser debugging
export function printControlMetrics(): void {
  const metrics = getControlMetrics();

  console.group('🎮 Control Metrics');

  console.group('📊 Overview');
  console.log(`Total Controls: ${metrics.totalControls}`);
  console.log(`Heavily Subscribed (5+): ${metrics.heavilySubscribedControls}`);
  console.groupEnd();

  console.group('📋 Value Types');
  console.log(`Primitive (string/number/boolean): ${metrics.valueTypes.primitive}`);
  console.log(`Objects (forms/etc): ${metrics.valueTypes.object}`);
  console.log(`Arrays: ${metrics.valueTypes.array}`);
  console.log(`Null/Undefined: ${metrics.valueTypes.null}`);
  console.groupEnd();

  console.group('🔗 Subscription Summary');
  console.log(`Total Subscriptions: ${metrics.subscriptionSummary.totalSubscriptions}`);
  console.log(`Average per Control: ${metrics.subscriptionSummary.averagePerControl.toFixed(2)}`);
  console.log(`Max in One Control: ${metrics.subscriptionSummary.maxInOneControl}`);
  console.log('Most Common Change Types:');
  metrics.subscriptionSummary.mostCommonChangeTypes.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.type}: ${item.count} subscriptions`);
  });
  console.groupEnd();

  console.groupEnd();
}

export function printHeavyControls(threshold: number = 5): void {
  const heavyControls = getHeavyControls(threshold);

  console.group(`🔥 Heavily Subscribed Controls (${threshold}+ subscriptions)`);

  if (heavyControls.length === 0) {
    console.log(`No controls found with ${threshold}+ subscriptions`);
  } else {
    heavyControls.forEach((controlInfo, index) => {
      console.group(`#${index + 1} - ${controlInfo.subscriptionCount} subscriptions`);
      console.log('📝 Value:', controlInfo.value);
      console.log(`📋 Type: ${controlInfo.valueType}`);
      console.log(`🔗 Change Types: ${controlInfo.changeTypes.join(', ')}`);
      if (controlInfo.path) console.log(`🗺️ Path: ${controlInfo.path}`);
      if (controlInfo.creationStack) {
        console.group('📍 Creation Stack Trace');
        console.log(controlInfo.creationStack);
        console.groupEnd();
      }
      console.log('🎮 Control:', controlInfo.control);

      console.group('📊 Subscription Details');
      controlInfo.subscriptions.forEach((sub, i) => {
        console.log(`  ${i + 1}. Mask: ${sub.mask}, Listeners: ${sub.listenerCount}, Types: [${sub.changeTypes.join(', ')}]`);
      });
      console.groupEnd();

      console.groupEnd();
    });
  }

  console.groupEnd();
}

// Export registry functions
export const ControlMetricsRegistry = {
  register: ControlRegistry.register,
  registerWithStack: ControlRegistry.registerWithStack,
  captureCreationStack: ControlRegistry.captureCreationStack,
  unregister: ControlRegistry.unregister,
  getAll: ControlRegistry.getAll,
  getStackTrace: ControlRegistry.getStackTrace,
  clear: ControlRegistry.clear,
  enableStackTraceCapture: ControlRegistry.enableStackTraceCapture,
  disableStackTraceCapture: ControlRegistry.disableStackTraceCapture,
  isStackTraceCaptureEnabled: ControlRegistry.isStackTraceCaptureEnabled
};

// Make functions available on window for browser debugging
declare global {
  interface Window {
    printControlMetrics?: () => void;
    printHeavyControls?: (threshold?: number) => void;
    getControlMetrics?: () => ControlMetrics;
    getHeavyControls?: (threshold?: number) => ControlInfo[];
    findControlsByValue?: (value: any) => ControlInfo[];
    enableControlStackTraces?: () => void;
    disableControlStackTraces?: () => void;
    isControlStackTracesEnabled?: () => boolean;
  }
}

// Auto-register debugging functions in browser environment
if (typeof window !== 'undefined') {
  window.printControlMetrics = printControlMetrics;
  window.printHeavyControls = printHeavyControls;
  window.getControlMetrics = getControlMetrics;
  window.getHeavyControls = getHeavyControls;
  window.findControlsByValue = findControlsByValue;
  window.enableControlStackTraces = ControlMetricsRegistry.enableStackTraceCapture;
  window.disableControlStackTraces = ControlMetricsRegistry.disableStackTraceCapture;
  window.isControlStackTracesEnabled = ControlMetricsRegistry.isStackTraceCaptureEnabled;
}