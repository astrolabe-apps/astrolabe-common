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
  useNavigationService,
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
  const { Link } = useNavigationService();
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
    hrefs: { login },
  } = useAuthPageSetup();

  useControlEffect(
    () => mfaControl?.fields.code.value,
    () => {
      if (control.error != codeLimit) control.error = null;
    },
  );

  const contactNumber = useComputed(() => {
    if (!mfaControl?.value.token.includes(".")) return null;
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
          <h2>Your password has been changed.</h2>
          <p className="font-light text-gray-500 dark:text-gray-400">
            You may now login with your new password
          </p>
          <p className="text-center">
            <Link
              href={login}
              className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500"
            >
              Back to Login
            </Link>
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
            {
              // Requires MFA
              contactNumber.value && (!codeSent.value || !codeValid.value)
                ? mfaForm()
                : changePasswordForm()
            }
            {error && <p className="text-danger">{error}</p>}
          </form>
        </>
      )}
    </UserFormContainer>
  );

  function mfaForm() {
    return (
      <>
        {!codeSent.value ? (
          <>
            <p>
              We have the following mobile number XXXX XXX{" "}
              {contactNumber.value?.slice(-3)}
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
              <p>We sent a code to XXXX XXX {contactNumber.value?.slice(-3)}</p>
              <Textfield control={mfaControl!.fields.code} label="Code" />
            </div>
            <Button
              type="button"
              onClick={async () => (codeValid.value = await mfaAuthenticate!())}
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
    );
  }

  function changePasswordForm() {
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
