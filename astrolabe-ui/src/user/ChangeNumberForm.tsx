import {
  Control,
  useComputed,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import { ChangeMfaNumberFormData, useAuthPageSetup } from "@astroapps/client";
import { UserFormContainer } from "./UserFormContainer";
import { Textfield } from "../Textfield";
import { Button } from "../Button";
import React from "react";

export function ChangeNumberForm({
  className,
  control,
  authenticate,
  send,
  runChange,
}: {
  className?: string;
  control: Control<ChangeMfaNumberFormData>;
  authenticate: () => Promise<boolean>;
  send: () => Promise<boolean>;
  runChange: () => Promise<boolean>;
}) {
  const {
    fields: { password, newNumber, code },
    error,
  } = control;
  const {
    errors: { codeLimit, credentials },
  } = useAuthPageSetup();

  const codeSent = useControl(false);
  const numberChanged = useControl(false);

  useControlEffect(
    () => [newNumber.value, password.value, code.value],
    () => {
      if (control.error != codeLimit) control.error = null;
    },
  );

  return (
    <UserFormContainer className={className}>
      <h2>Change your number</h2>
      <form
        className="my-2 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        {error && <p className="text-danger">{error}</p>}

        {!codeSent.value && (
          <>
            <Textfield
              control={password}
              label="Password"
              type="password"
              autoComplete="new-password"
              readOnly={codeSent.value}
            />
            <Textfield
              control={newNumber}
              label={"Mobile Number"}
              readOnly={codeSent.value}
            />
            <Button
              onClick={async () => {
                codeSent.value = await authenticate();
              }}
            >
              Change Number
            </Button>
          </>
        )}

        {codeSent.value && !numberChanged.value && (
          <>
            <p>We sent a code to XXXX XXX {newNumber.value.slice(-3)}</p>
            <Textfield control={code} label={"Code"} />
            <Button
              onClick={verifyCode}
              disabled={
                !code.value ||
                code.value.length != 6 ||
                control.error === codeLimit
              }
            >
              Verify code
            </Button>
            <p>
              Haven't got an SMS from us?{" "}
              <button
                className="underline"
                onClick={send}
                disabled={control.error === codeLimit}
              >
                Resend the code
              </button>
            </p>
          </>
        )}
        {numberChanged.value && (
          <p>Your number has been successfully changed</p>
        )}
      </form>
    </UserFormContainer>
  );

  async function verifyCode() {
    numberChanged.value = await runChange();
  }
}
