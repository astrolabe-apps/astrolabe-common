import {
  Control,
  useComputed,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import { Textfield } from "../Textfield";
import { Button } from "../Button";
import {
  MfaFormData,
  ResetPasswordFormData,
  useAuthPageSetup,
} from "@astroapps/client";
import { CircularProgress } from "../CircularProgress";
import { UserFormContainer } from "./UserFormContainer";
import React from "react";

type ResetPasswordFormProps = {
  className?: string;
  control: Control<ResetPasswordFormData>;
  resetPassword: () => Promise<boolean>;
  send?: () => Promise<boolean>;
  mfaControl?: Control<MfaFormData>;
  mfaAuthenticate?: () => Promise<boolean>;
};

export function ResetPasswordForm({
  className,
  control,
  resetPassword,
  send,
  mfaControl,
  mfaAuthenticate,
}: ResetPasswordFormProps) {
  const {
    fields: { password, confirm },
    disabled,
    error,
  } = control;

  const passwordReset = useControl(false);

  const codeSent = useControl(false);
  const codeValid = useControl(false);
  const {
    errors: { codeLimit },
  } = useAuthPageSetup();

  useControlEffect(
    () => mfaControl?.fields.code.value,
    () => {
      if (control.error != codeLimit) control.error = null;
    },
  );

  const mfaNumber = useComputed(() => {
    const tokenPayload = mfaControl?.value
      ? JSON.parse(atob(mfaControl.value.token.split(".")[1]))
      : null;
    if (tokenPayload?.mn) {
      return tokenPayload.mn as string;
    }
    return null;
  });

  const contactNumber = useComputed(() => {
    const tokenPayload = mfaControl?.value
      ? JSON.parse(atob(mfaControl.value.token.split(".")[1]))
      : null;
    if (tokenPayload?.cn) {
      return tokenPayload.cn as string;
    }
    return null;
  });

  useControlEffect(
    () => contactNumber.value,
    (v) => {
      if (v) {
        mfaControl!.fields.number.value = v;
      }
    },
    true,
  );

  return (
    <UserFormContainer className={className}>
      {passwordReset.value ? (
        <>
          <h2>You password has been changed.</h2>
          <p className="font-light text-gray-500 dark:text-gray-400">
            You may now login with your new password
          </p>
        </>
      ) : (
        <>
          <h2>Change your password</h2>
          <form
            className="space-y-4 md:space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              doChange();
            }}
          >
            {!codeSent.value || !codeValid.value ? (
              <>
                {!codeSent.value ? (
                  <>
                    <p>
                      We have the following mobile number XXXX XXX{" "}
                      {mfaNumber.value?.slice(-3) ??
                        contactNumber.value?.slice(-3)}
                    </p>
                    <Button
                      type="button"
                      onClick={async () => {
                        if (send && (await send())) codeSent.value = true;
                      }}
                    >
                      Send Verification Code
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div>
                      <p>
                        We sent a code to XXXX XXX{" "}
                        {mfaNumber.value?.slice(-3) ??
                          contactNumber.value?.slice(-3)}
                      </p>
                      <Textfield
                        control={mfaControl!.fields.code}
                        label="Code"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={async () =>
                        (codeValid.value = await mfaAuthenticate!())
                      }
                      disabled={
                        !mfaControl!.fields.code.value ||
                        mfaControl!.fields.code.value.length != 6 ||
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
                        type="button"
                      >
                        Resend the code
                      </button>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <ChangePassword />
            )}
            {error && <p className="text-danger">{error}</p>}
          </form>
        </>
      )}
    </UserFormContainer>
  );

  function ChangePassword() {
    return (
      <>
        <Textfield
          control={password}
          label="New Password"
          type="password"
          autoComplete="new-password"
        />
        <Textfield
          control={confirm}
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
        />
        {disabled && <CircularProgress />}
        <Button className="w-full" type="submit" disabled={disabled}>
          Change password
        </Button>
      </>
    );
  }

  async function doChange() {
    passwordReset.value = await resetPassword();
  }
}
