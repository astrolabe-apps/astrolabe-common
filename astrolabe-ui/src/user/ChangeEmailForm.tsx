import { Control, useControl } from "@react-typed-forms/core";
import { Textfield } from "../Textfield";
import { Button } from "../Button";
import { ChangeEmailFormData } from "@astroapps/client";
import { CircularProgress } from "../CircularProgress";
import { UserFormContainer } from "./UserFormContainer";

type ChangeEmailFormProps = {
  className?: string;
  control: Control<ChangeEmailFormData>;
  changeEmail: () => Promise<boolean>;
};

export function ChangeEmailForm({
  className,
  control,
  changeEmail,
}: ChangeEmailFormProps) {
  const {
    fields: { password, newEmail },
    disabled,
  } = control;
  const verifyEmail = useControl(false);
  return (
    <UserFormContainer className={className}>
      {verifyEmail.value ? (
        <>
          <h2>Check email to continue</h2>
          <p className="font-light text-gray-500 dark:text-gray-400">
            You will receive an email with a verification link.
          </p>
        </>
      ) : (
        <>
          <h2>Change your email</h2>
          <form
            className="space-y-4 md:space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              doChange();
            }}
          >
            <Textfield
              control={password}
              label="Confirm Password"
              type="password"
              autoComplete="current-password"
            />
            <Textfield
              control={newEmail}
              label="New Email Address"
              autoComplete="email"
            />
            {disabled && <CircularProgress />}
            <Button className="w-full" type="submit" disabled={disabled}>
              Change email
            </Button>
          </form>
        </>
      )}
    </UserFormContainer>
  );

  async function doChange() {
    verifyEmail.value = await changeEmail();
  }
}
