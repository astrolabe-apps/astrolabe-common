import {
  DateComparison,
  DateValidator,
  JsonataValidator,
  LengthValidator,
  SchemaValidator,
  ValidatorType,
} from "./schemaValidator";
import { ControlDefinition, isDataControl } from "./controlDefinition";
import { SchemaDataNode } from "./schemaDataNode";
import {
  CleanupScope,
  Control,
  ControlChange,
  createCleanupScope,
  createEffect,
  trackControlChange,
} from "@astroapps/controls";
import { ValidationMessageType } from "./schemaField";
import { SchemaInterface } from "./schemaInterface";
import { jsonataEval } from "./evalExpression";
import { ExpressionType } from "./entityExpression";
import { createScopedComputed } from "./util";
import { FormContextOptions } from "./formStateNode";

export interface ValidationEvalContext {
  addSync(validate: (value: unknown) => string | undefined | null): void;
  addCleanup(cleanup: () => void): void;
  validationEnabled: Control<boolean>;
  parentData: SchemaDataNode;
  data: SchemaDataNode;
  schemaInterface: SchemaInterface;
  formContext: FormContextOptions;
  runAsync(af: () => void): void;
}

export type ValidatorEval<T extends SchemaValidator> = (
  validation: T,
  context: ValidationEvalContext,
) => void;

export const jsonataValidator: ValidatorEval<JsonataValidator> = (
  validation,
  context,
) => {
  const error = createScopedComputed(context, () => undefined);
  jsonataEval(
    { type: ExpressionType.Jsonata, expression: validation.expression },
    {
      scope: error,
      dataNode: context.parentData,
      returnResult: (v) => {
        trackControlChange(context.data.control, ControlChange.Validate);
        // console.log("Setting jsonata error", v);
        context.data.control.setError("jsonata", v?.toString());
      },
      schemaInterface: context.schemaInterface,
      variables: context.formContext.variables,
      runAsync: context.runAsync,
    },
  );
};

export const lengthValidator: ValidatorEval<LengthValidator> = (
  lv,
  context,
) => {
  const { schemaInterface } = context;
  context.addSync(() => {
    const field = context.data.schema.field;
    const control = context.data.control;
    const len = schemaInterface.controlLength(field, control);
    if (lv.min != null && len < lv.min) {
      if (field?.collection) {
        control.setValue((v) =>
          Array.isArray(v)
            ? v.concat(Array.from({ length: lv.min! - v.length }))
            : Array.from({ length: lv.min! }),
        );
      } else {
        return schemaInterface.validationMessageText(
          field,
          ValidationMessageType.MinLength,
          len,
          lv.min,
        );
      }
    } else if (lv.max != null && len > lv.max) {
      return schemaInterface.validationMessageText(
        field,
        ValidationMessageType.MaxLength,
        len,
        lv.max,
      );
    }
    return undefined;
  });
};

export const dateValidator: ValidatorEval<DateValidator> = (dv, context) => {
  const { schemaInterface } = context;
  const field = context.data.schema.field;
  let comparisonDate: number;
  if (dv.fixedDate) {
    comparisonDate = schemaInterface.parseToMillis(field, dv.fixedDate);
  } else {
    const nowDate = new Date();
    comparisonDate = Date.UTC(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      nowDate.getDate(),
    );
    if (dv.daysFromCurrent) {
      comparisonDate += dv.daysFromCurrent * 86400000;
    }
  }

  context.addSync((v) => {
    if (v) {
      const selDate = schemaInterface.parseToMillis(field, v as string);
      const notAfter = dv.comparison === DateComparison.NotAfter;
      if (notAfter ? selDate > comparisonDate : selDate < comparisonDate) {
        return schemaInterface.validationMessageText(
          field,
          notAfter
            ? ValidationMessageType.NotAfterDate
            : ValidationMessageType.NotBeforeDate,
          selDate,
          comparisonDate,
        );
      }
    }
    return null;
  });
};

export const defaultValidators: Record<string, ValidatorEval<any>> = {
  [ValidatorType.Jsonata]: jsonataValidator,
  [ValidatorType.Length]: lengthValidator,
  [ValidatorType.Date]: dateValidator,
};

export function createValidators(
  def: ControlDefinition,
  context: ValidationEvalContext,
): void {
  if (isDataControl(def)) {
    const { schemaInterface } = context;
    if (def.required) {
      context.addSync((v) => {
        const field = context.data.schema.field;
        return schemaInterface.isEmptyValue(field, v)
          ? schemaInterface.validationMessageText(
              field,
              ValidationMessageType.NotEmpty,
              false,
              true,
            )
          : null;
      });
    }
    def.validators?.forEach((x) => defaultValidators[x.type]?.(x, context));
  }
}

export function setupValidation(
  scope: CleanupScope,
  controlImpl: FormContextOptions,
  definition: ControlDefinition,
  dataNode: Control<SchemaDataNode | undefined>,
  schemaInterface: SchemaInterface,
  parent: SchemaDataNode,
  hidden: Control<boolean>,
  runAsync: (af: () => void) => void,
) {
  const validationEnabled = createScopedComputed(scope, () => !hidden.value);
  const validatorsScope = createCleanupScope();
  createEffect(
    () => {
      validatorsScope.cleanup();
      const dn = dataNode.value;
      if (dn) {
        let syncValidations: ((v: unknown) => string | undefined | null)[] = [];
        createValidators(definition, {
          data: dn,
          parentData: parent,
          validationEnabled,
          schemaInterface,
          addSync(validate: (v: unknown) => string | undefined | null) {
            syncValidations.push(validate);
          },
          addCleanup(cleanup: () => void) {
            validatorsScope.addCleanup(cleanup);
          },
          formContext: controlImpl,
          runAsync,
        });

        createEffect(
          () => {
            if (!validationEnabled.value) return undefined;
            trackControlChange(dn.control, ControlChange.Validate);
            const value = dn.control.value;
            let error = null;
            for (const syncValidation of syncValidations) {
              error = syncValidation(value);
              if (error) break;
            }
            return error;
          },
          (e) => {
            dn.control.setError("default", e);
          },
          validatorsScope,
        );
      }
    },
    (c) => {},
    scope,
  );
}
