import {
  Control,
  Fcheckbox,
  useComputed,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import { useAuthPageSetup, VerifyFormData } from "@astroapps/client";
import { UserFormContainer } from "./UserFormContainer";
import { Textfield } from "../Textfield";
import { Button } from "../Button";
import React from "react";

export function VerifyForm({
  className,
  control,
  authenticate,
  send,
}: {
  className?: string;
  control: Control<VerifyFormData>;
  authenticate: () => Promise<boolean>;
  send: () => Promise<boolean>;
}) {
  const {
    fields: { code, token, number, updateNumber },
    error,
  } = control;
  const {
    errors: { codeLimit, verify },
  } = useAuthPageSetup();

  const contactNumber = useComputed(() => {
    if (token.value) {
      const tokenPayload = JSON.parse(atob(token.value.split(".")[1]));
      if (tokenPayload.cn) return tokenPayload.cn as string;
    }
    return null;
  });

  const codeSent = useControl(false);

  useControlEffect(
    () => code.value,
    () => {
      if (control.error != codeLimit) control.error = null;
    },
  );

  useControlEffect(
    () => contactNumber.value,
    (v) => {
      if (!v) updateNumber.value = true;
    },
  );

  useControlEffect(
    () => updateNumber.value,
    (v) => {
      if (!v) {
        number.value = null;
        number.error = null;
      }
    },
  );

  return (
    <UserFormContainer className={className}>
      <h2>Verifying</h2>

      {error != verify ? (
        <>
          {token.value && (
            <>
              {!codeSent.value ? (
                <div>
                  <div className="flex flex-col gap-2">
                    {contactNumber.value && (
                      <>
                        <p>{`Send code to XXXX XXX ${contactNumber.value.slice(
                          -3,
                        )}`}</p>
                        <div className="flex flex-row gap-2 items-center">
                          <Fcheckbox control={updateNumber}></Fcheckbox>
                          <label>Send to a different number</label>
                        </div>
                      </>
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
                    <Button
                      onClick={async () => {
                        if (await send()) codeSent.value = true;
                      }}
                    >
                      Send Code
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p>
                    We sent a code to XXXX XXX{" "}
                    {number.value?.slice(-3) ?? contactNumber.value?.slice(-3)}
                  </p>
                  <Textfield control={code} label={"Code"} />
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
                      onClick={send}
                      disabled={control.error === codeLimit}
                    >
                      Resend the code
                    </button>
                  </p>
                </>
              )}
              {error && <p className="text-danger">{error}</p>}
            </>
          )}
        </>
      ) : (
        <p className="text-danger">{error}</p>
      )}
    </UserFormContainer>
  );

  async function sendCode() {
    await send();
    code.touched = false;
    if (!codeSent.value) codeSent.value = true;
  }
}
