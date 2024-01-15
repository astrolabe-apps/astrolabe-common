import { Control, useControlEffect } from "@react-typed-forms/core";
import { ParsedUrlQuery } from "querystring";
import { compareAsSet } from "../util/arrays";

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
 * @param {Control<A>} control The control to synchronize with the query parameter.
 * @param {string} paramName The name of the query parameter to synchronize with.
 * @param {ConvertParam<A, P>} convert The conversion functions to use for the synchronization.
 * @returns {Control<A>} The synchronized control.
 */
export function useSyncParam<A, P extends string | string[] | undefined>(
  queryControl: Control<ParsedUrlQuery>,
  control: Control<A>,
  paramName: string,
  convert: ConvertParam<A, P>,
): Control<A> {
  useControlEffect(
    () => queryControl.value,
    () => {},
    (urlQuery) => {
      control.value = convert.fromParam(convert.normalise(urlQuery[paramName]));
    },
  );

  useControlEffect(
    () => control.value,
    (c) => {
      const newValue = convert.toParam(c);
      if (
        !convert.compare(
          convert.normalise(queryControl.current.value[paramName]),
          newValue,
        )
      ) {
        const nq = { ...queryControl.current.value };
        if (newValue !== undefined) {
          nq[paramName] = newValue;
        } else {
          delete nq[paramName];
        }
        queryControl.value = nq;
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

export const OptStringParam: ConvertParam<
  string | undefined,
  string | undefined
> = {
  compare(existing: string | undefined, newOne: string | undefined): boolean {
    return existing === newOne;
  },
  fromParam(p: string | undefined): string | undefined {
    return p;
  },
  normalise(q: string | string[] | undefined): string | undefined {
    return Array.isArray(q) ? q[0] : q;
  },
  toParam(a: string | undefined): string | undefined {
    return a;
  },
};

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
