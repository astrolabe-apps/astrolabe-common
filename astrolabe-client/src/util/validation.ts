import { Control } from "@react-typed-forms/core";
import { scrollToElement } from "./scrollToElement";

export type FluentError = {
  path: string;
  error: Record<string, any>;
};
export type FluentErrors = { errors: FluentError[] };

export function isFluentError(errors: any): errors is FluentErrors {
  return Boolean(errors.errors);
}

/**
 * Converts a string path to an array of path segments.
 * @param path The string path to convert.
 * @returns An array of path segments.
 */
export function convertPath(path: string): (string | number)[] {
  const paths = path.split(".");
  let out: (string | number)[] = [];
  paths.forEach((part) => {
    if (part.length > 0) {
      const arrInd = part.indexOf("[");
      const cameled =
        part[0].toLowerCase() +
        part.substring(1, arrInd != -1 ? arrInd : undefined);
      out.push(cameled);
      if (arrInd > 0) {
        out.push(parseInt(part.substring(arrInd + 1, part.indexOf("]"))));
      }
    }
  });
  return out;
}

/**
 * Returns an error message for a given error object.
 * @param err The error object to generate a message for.
 * @returns An error message.
 */
export function errorMessage(err: Record<string, any>): string {
  if (err.NotEmptyValidator) {
    return "Please enter a value";
  }
  if (err.message) {
    return err.message;
  }
  return JSON.stringify(err);
}

/**
 * Applies errors to a control based on a list of paths and optionally scrolls to the first error.
 * @param control The control to apply errors to.
 * @param paths The list of paths and errors to apply to the control.
 * @param applyError A function to set the error(s) on the control
 * @param scrollToError If true, the function will scroll to the first error.
 */
export function pathBasedErrors(
  control: Control<any>,
  paths: { path: (string | number)[]; error: Record<string, any> }[],
  applyError: (c: Control<any>, err: Record<string, any>) => void,
  scrollToError: boolean,
) {
  let firstError: HTMLElement | undefined;
  const controlsArray: Control<any>[] = [];
  paths.forEach((err) => {
    const ctrl = control.lookupControl(err.path);
    if (ctrl && !ctrl.error) {
      if (!firstError && ctrl.element) firstError = ctrl.element;
      applyError(ctrl, err.error);
      ctrl.touched = true;
      controlsArray.push(ctrl);
    } else if (!ctrl) {
      console.error("No control for path", err.path);
    }
  });
  if (firstError && scrollToError) scrollToElement(firstError);
  return controlsArray;
}

/**
 * Applies errors to a control and optionally scrolls to the first error.
 * @param control The control to apply errors to.
 * @param errors The errors to apply to the control.
 * @param errorMap A function to map errors to error messages.
 * @param dontScrollToError If true, the function will not scroll to the first error.
 */
export function applyErrors(
  control: Control<any>,
  errors: object,
  errorMap?: (err: Record<string, any>) => string,
  dontScrollToError?: boolean,
) {
  control.clearErrors();
  if (isFluentError(errors)) {
    const errorsMap = errors.errors.map(({ path, error }) => ({
      path: convertPath(path),
      error,
    }));
    return pathBasedErrors(
      control,
      errorsMap,
      (c, e) => (c.error = (errorMap ?? errorMessage)(e)),
      !Boolean(dontScrollToError),
    );
  } else {
    Object.entries(errors).forEach(([key, val]) => {
      const camelCaseKey = key.substring(0, 1).toLowerCase() + key.substring(1);
      const child = control.current.fields?.[camelCaseKey];
      if (child) {
        child.error = val[0];
      }
    });
    return;
  }
}

export function badRequestToErrors(
  exception: unknown,
  control: Control<any>,
  errorMap?: (err: Record<string, any>) => string,
  dontScrollToError?: boolean,
) {
  if (isApiResponse(exception) && exception.status === 400) {
    return applyErrors(
      control,
      JSON.parse(exception.response),
      errorMap,
      dontScrollToError,
    );
  }
  throw exception;
}

export interface ApiRequestResponse extends Error {
  status: number;
  response: string;
}

export function isApiResponse(
  exception: unknown,
): exception is ApiRequestResponse {
  return !!exception && typeof exception === "object" && "status" in exception;
}

export async function validateAndRun<A = void>(
  control: Control<any>,
  action: () => Promise<A>,
  handleError?: (e: any) => boolean,
  dontDisable?: boolean,
): Promise<[boolean, A | undefined]> {
  control.validate();
  control.touched = true;
  if (control.valid) {
    if (!dontDisable) control.disabled = true;
    try {
      const result = await action();
      if (!dontDisable) control.disabled = false;
      return [true, result];
    } catch (e) {
      if (!dontDisable) control.disabled = false;
      if (!handleError || !handleError(e)) {
        badRequestToErrors(e, control);
      }
    }
  }
  return [false, undefined];
}

export function validateAndRunResult<A = void>(
  control: Control<any>,
  action: () => Promise<A>,
  handleError?: (e: any) => boolean,
  dontDisable?: boolean,
): Promise<boolean> {
  return validateAndRun(control, action, handleError, dontDisable).then(
    (x) => x[0],
  );
}

export function validateAndRunMessages<A = void>(
  control: Control<any>,
  action: () => Promise<A>,
  codes: Record<number, string> | undefined,
  genericError: string,
  dontDisable?: boolean,
): Promise<boolean> {
  return validateAndRun(
    control,
    action,
    makeStatusCodeHandler(control, codes, genericError),
    dontDisable,
  ).then((x) => x[0]);
}

export function makeStatusCodeHandler(
  control: Control<any>,
  codes: Record<number, string> | undefined,
  genericError: string,
): (e: any) => boolean {
  return (e) => {
    if (isApiResponse(e)) {
      if (e.status == 400) return false;
      control.error = codes?.[e.status] ?? genericError;
      return true;
    }
    return false;
  };
}
