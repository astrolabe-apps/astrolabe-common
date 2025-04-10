import { Control, useControl } from "@react-typed-forms/core";
import { Textfield } from "../Textfield";
import { Button } from "../Button";
import { ChangePasswordFormData } from "@astroapps/client";
import { CircularProgress } from "../CircularProgress";
import { UserFormContainer } from "./UserFormContainer";

export function ChangePasswordForm({
  className,
  control,
  changePassword,
  confirmPrevious,
}: {
  className?: string;
  confirmPrevious?: boolean;
  control: Control<ChangePasswordFormData>;
  changePassword: () => Promise<boolean>;
}) {
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
            {confirmPrevious && (
              <Textfield
                control={oldPassword}
                label="Old Password"
                type="password"
                autoComplete="current-password"
              />
            )}
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
          </form>
        </>
      )}
    </UserFormContainer>
  );

  async function doChange() {
    passwordChanged.value = await changePassword();
  }
}
