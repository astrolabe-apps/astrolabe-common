import { Control, useControl, useControlEffect } from "@react-typed-forms/core";
import { compareAsSet } from "../util/arrays";
import { QueryControl, useNavigationService } from "../service/navigation";
import { useRef } from "react";

interface ConvertParam<A, P extends string | string[] | undefined> {
  normalise: (q: string | string[] | undefined) => P;
  fromParam: (p: P) => A;
  toParam: (a: A) => P;
  compare: (existing: P, newOne: P) => boolean;
}

/**
 * Synchronizes a control's value with a query parameter in the URL.
 *
 * @template A The type of the control's value.
 * @template P The type of the query parameter.
 * @param {Control<ParsedUrlQuery>} queryControl The control that represents the URL query.
 * @param {string} paramName The name of the query parameter to synchronize with.
 * @param {ConvertParam<A, P>} convert The conversion functions to use for the synchronization.
 * @param use An optional control to use for the synchronized control.
 * @returns {Control<A>} The synchronized control.
 */
export function useSyncParam<A, P extends string | string[] | undefined>(
  queryControl: QueryControl,
  paramName: string,
  convert: ConvertParam<A, P>,
  use?: Control<A>,
): Control<A> {
  const currentQuery = useNavigationService().query;
  const { query, pathname } = queryControl.fields;
  const control = useControl(
    () => convert.fromParam(convert.normalise(currentQuery[paramName])),
    { use },
  );
  const originalPathname = useRef(pathname.current.value);

  useControlEffect(
    () => convert.normalise(query.value[paramName]),
    (param) => {
      // Only update if the paths match
      if (originalPathname.current === pathname.current.value) {
        control.value = convert.fromParam(param);
      }
    },
    !!use,
  );

  useControlEffect(
    () => control.value,
    (c) => {
      const newValue = convert.toParam(c);
      if (
        !convert.compare(
          convert.normalise(query.current.value[paramName]),
          newValue,
        )
      ) {
        // Only update queryControl if pathname still matches
        if (originalPathname.current === pathname.current.value) {
          const nq = { ...query.current.value };
          if (newValue !== undefined) {
            nq[paramName] = newValue;
          } else {
            delete nq[paramName];
          }
          query.value = nq;
        }
      }
    },
  );
  return control;
}

export const StringParam: ConvertParam<string, string> = {
  compare(existing: string, newOne: string): boolean {
    return existing === newOne;
  },
  fromParam(p: string): string {
    return p;
  },
  normalise(q: string | string[] | undefined): string {
    return OptStringParam.normalise(q) ?? "";
  },
  toParam(a: string): string {
    return a;
  },
};

export const OptStringParam = makeOptStringParam<string | undefined>();

export function makeOptStringParam<
  A extends string | undefined | null,
>(): ConvertParam<A, string | undefined> {
  return {
    compare(existing: string | undefined, newOne: string | undefined): boolean {
      return existing === newOne;
    },
    fromParam(p: string | undefined): A {
      return p as A;
    },
    normalise(q: string | string[] | undefined): string | undefined {
      return Array.isArray(q) ? q[0] : q;
    },
    toParam(a: A): string | undefined {
      return a == null ? undefined : a;
    },
  };
}

export const StringsParam: ConvertParam<string[], string[]> = {
  compare(existing: string[], newOne: string[]): boolean {
    return compareAsSet(existing, newOne);
  },
  fromParam(p: string[]): string[] {
    return p;
  },
  normalise(q: string | string[] | undefined): string[] {
    return Array.isArray(q) ? q : q === undefined ? [] : [q];
  },
  toParam(a: string[]): string[] {
    return a;
  },
};

/**
 * Converts an array of string parameters to an array of typed values and vice versa.
 *
 * @template A The type of the values to convert.
 * @param {function(A): string} to A function that converts a value of type A to a string.
 * @param {function(string): A} from A function that converts a string to a value of type A.
 * @returns {ConvertParam<A[], string[]>} A `ConvertParam` object that can be used to convert the parameters.
 */
export function convertStringsParam<A>(
  to: (a: A) => string,
  from: (s: string) => A,
): ConvertParam<A[], string[]> {
  return {
    compare(existing: string[], newOne: string[]): boolean {
      return compareAsSet(existing, newOne);
    },
    fromParam(p: string[]): A[] {
      return p.map(from);
    },
    normalise(q: string | string[] | undefined): string[] {
      return StringsParam.normalise(q);
    },
    toParam(a: A[]): string[] {
      return a.map(to);
    },
  };
}

/**
 * Converts a single string parameter to a typed value and vice versa.
 *
 * @template A The type of the value to convert.
 * @param {function(A): string} to A function that converts a value of type A to a string.
 * @param {function(string): A} from A function that converts a string to a value of type A.
 * @param {A} defaultValue The default value to use if the parameter is not present in the query string.
 * @returns {ConvertParam<A, string[]>} A `ConvertParam` object that can be used to convert the parameter.
 */
export function convertStringParam<A>(
  to: (a: A) => string,
  from: (s: string) => A,
  defaultValue: A,
): ConvertParam<A, string[]> {
  return {
    compare(existing: string[], newOne: string[]): boolean {
      return compareAsSet(existing, newOne);
    },
    fromParam(p: string[]): A {
      return p.length > 0 ? from(p[0]) : defaultValue;
    },
    normalise(q: string | string[] | undefined): string[] {
      return StringsParam.normalise(q);
    },
    toParam(a: A): string[] {
      return [to(a)];
    },
  };
}
