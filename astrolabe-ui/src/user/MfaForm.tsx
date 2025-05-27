import {
  Control,
  Fcheckbox,
  useComputed,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import { MfaFormData, useAuthPageSetup } from "@astroapps/client";
import { UserFormContainer } from "./UserFormContainer";
import { Button } from "../Button";
import { Textfield } from "../Textfield";
import React from "react";

type MfaFormProps = {
  className?: string;
  control: Control<MfaFormData>;
  authenticate: () => Promise<boolean>;
  send: () => Promise<boolean>;
};

export function MfaForm({
  className,
  control,
  authenticate,
  send,
}: MfaFormProps) {
  const {
    fields: { code, token, updateNumber, number },
    error,
  } = control;
  const {
    errors: { codeLimit },
  } = useAuthPageSetup();

  const mfaNumber = useComputed(() => {
    const tokenPayload = JSON.parse(atob(token.value.split(".")[1]));
    if (tokenPayload.mn) {
      return tokenPayload.mn as string;
    }
    return null;
  });

  const contactNumber = useComputed(() => {
    const tokenPayload = JSON.parse(atob(token.value.split(".")[1]));
    if (tokenPayload.cn) {
      return tokenPayload.cn as string;
    }
    return null;
  });

  useControlEffect(
    () => updateNumber.value,
    (v) => {
      if (!v && contactNumber.value) {
        number.value = contactNumber.value;
      } else {
        number.value = null;
      }
    },
    true,
  );

  const codeSent = useControl(false);

  useControlEffect(
    () => code.value,
    () => {
      if (control.error != codeLimit) control.error = null;
    },
  );

  return (
    <UserFormContainer className={className}>
      <h2>Login</h2>
      <form
        className="my-2 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        {codeSent.value ? (
          <div className="flex flex-col gap-3">
            <div>
              <p>
                We sent a code to XXXX XXX{" "}
                {mfaNumber.value?.slice(-3) ?? number.value?.slice(-3)}
              </p>
              <Textfield control={code} label="Code" />
              {error && <p className="text-danger">{error}</p>}
            </div>
            <Button
              onClick={authenticate}
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
                onClick={sendCode}
                disabled={control.error === codeLimit}
              >
                Resend the code
              </button>
            </p>
          </div>
        ) : (
          <>
            <p>
              We have the following mobile number XXXX XXX{" "}
              {mfaNumber.value?.slice(-3) ?? contactNumber.value?.slice(-3)}
            </p>
            {contactNumber.value && (
              <div>
                <div className="flex flex-row gap-2 items-center">
                  <Fcheckbox id="updateNumber" control={updateNumber} />
                  <label htmlFor="updateNumber">
                    Send to a different number
                  </label>
                </div>
              </div>
            )}
            {updateNumber.value && (
              <>
                <Textfield
                  control={number}
                  label={"Mobile Number"}
                  readOnly={codeSent.value}
                />
              </>
            )}
            {error && <p className="text-danger">{error}</p>}
            <Button onClick={sendCode}>Send Verification Code</Button>
          </>
        )}
      </form>
    </UserFormContainer>
  );

  async function sendCode() {
    if (await send()) codeSent.value = true;
    // await send();
    // code.touched = false;
    // if (!codeSent.value)
    //   codeSent.value = true;
  }
}
