import { Control, useControl } from "@react-typed-forms/core";
import { Textfield } from "../Textfield";
import clsx from "clsx";
import { Button } from "../Button";

export interface ChangePasswordFormData {
  oldPassword: string;
  password: string;
  confirm: string;
}

export const emptyChangePasswordForm: ChangePasswordFormData = {
  password: "",
  confirm: "",
  oldPassword: "",
};

export function ChangePasswordForm({
  className,
  control,
  changePassword,
  confirmPrevious,
}: {
  className?: string;
  loginHref?: string;
  confirmPrevious?: boolean;
  control: Control<ChangePasswordFormData>;
  changePassword: () => Promise<boolean>;
}) {
  const { password, confirm, oldPassword } = control.fields;
  const passwordChanged = useControl(false);
  return (
    <div
      className={clsx(
        className,
        "w-full bg-white rounded-lg shadow dark:border md:mt-0 xl:p-0 dark:bg-gray-800 dark:border-gray-700",
      )}
    >
      <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
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
            <div className="space-y-4 md:space-y-6">
              {confirmPrevious && (
                <Textfield
                  control={oldPassword}
                  label="Old Password"
                  type="password"
                />
              )}
              <Textfield
                control={password}
                label="New Password"
                type="password"
              />
              <Textfield
                control={confirm}
                label="Confirm Password"
                type="password"
              />
              <Button className="w-full" onClick={doChange}>
                Change password
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  async function doChange() {
    passwordChanged.value = await changePassword();
  }
}
