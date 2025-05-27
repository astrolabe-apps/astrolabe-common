import { Control, useControl } from "@react-typed-forms/core";
import { Textfield } from "../Textfield";
import { Button } from "../Button";
import { ChangePasswordFormData } from "@astroapps/client";
import { CircularProgress } from "../CircularProgress";
import { UserFormContainer } from "./UserFormContainer";

type ChangePasswordFormProps = {
  className?: string;
  control: Control<ChangePasswordFormData>;
  changePassword: () => Promise<boolean>;
};

export function ChangePasswordForm({
  className,
  control,
  changePassword,
}: ChangePasswordFormProps) {
  const {
    fields: { password, confirm, oldPassword },
    disabled,
  } = control;

  const passwordChanged = useControl(false);

  return (
    <UserFormContainer className={className}>
      {passwordChanged.value ? (
        <>
          <h2>You password has been changed</h2>
          <p className="font-light text-gray-500 dark:text-gray-400">
            You may now continue.
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
            {changePasswordForm()}
          </form>
        </>
      )}
    </UserFormContainer>
  );

  function changePasswordForm() {
    return (
      <>
        <Textfield
          control={oldPassword}
          label="Old Password"
          type="password"
          autoComplete="current-password"
        />
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
    passwordChanged.value = await changePassword();
  }
}
