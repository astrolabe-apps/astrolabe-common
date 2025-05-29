import { Control, useControl } from "@react-typed-forms/core";
import { Textfield } from "../Textfield";
import { Button } from "../Button";
import {
  MfaFormData,
  ResetPasswordFormData,
  useAuthPageSetup,
} from "@astroapps/client-localusers";
import { CircularProgress } from "../CircularProgress";
import { UserFormContainer } from "./UserFormContainer";
import React from "react";
import SmsMfa from "./SmsMfa";
import { useNavigationService } from "@astroapps/client";

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
  const codeValid = useControl(false);

  const {
    hrefs: { login },
  } = useAuthPageSetup();

  const requiresMfa =
    mfaControl != undefined &&
    mfaControl.value.token.includes(".") && // Hacks
    send != undefined &&
    mfaAuthenticate != undefined;

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
              requiresMfa && !codeValid.value ? (
                <SmsMfa
                  control={mfaControl}
                  sendCode={send}
                  verifyCode={async () => {
                    codeValid.value = await mfaAuthenticate();
                  }}
                />
              ) : (
                changePasswordForm()
              )
            }
            {error && <p className="text-danger">{error}</p>}
          </form>
        </>
      )}
    </UserFormContainer>
  );

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
