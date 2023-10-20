import { Control, useControl } from "@react-typed-forms/core";
import { Textfield } from "../Textfield";
import clsx from "clsx";
import { Button } from "../Button";

export interface SignupFormData {
  email: string;
  password: string;
  confirm: string;
}

export const emptySignupForm: SignupFormData = {
  password: "",
  confirm: "",
  email: "",
};

export function SignupForm({
  className,
  loginHref = "/login",
  control,
  createAccount,
}: {
  className?: string;
  loginHref?: string;
  control: Control<SignupFormData>;
  createAccount: () => Promise<boolean>;
}) {
  const { password, confirm, email } = control.fields;
  const accountCreated = useControl(false);
  return (
    <div
      className={clsx(
        className,
        "w-full bg-white rounded-lg shadow dark:border md:mt-0 xl:p-0 dark:bg-gray-800 dark:border-gray-700",
      )}
    >
      <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
        {accountCreated.value ? (
          <>
            <h2>Check email to continue</h2>
            <p className="font-light text-gray-500 dark:text-gray-400">
              You will receive an email with a confirmation link.
            </p>
          </>
        ) : (
          <>
            <h2>Create an account</h2>
            <div className="space-y-4 md:space-y-6">
              <Textfield control={email} label="Email" />
              <Textfield control={password} label="Password" type="password" />
              <Textfield
                control={confirm}
                label="Confirm Password"
                type="password"
              />
              <Button className="w-full" onClick={doCreate}>
                Create an account
              </Button>
              <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                Already have an account?{" "}
                <a
                  href={loginHref}
                  className="font-medium text-primary-600 hover:underline dark:text-primary-500"
                >
                  Login here
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  async function doCreate() {
    accountCreated.value = await createAccount();
  }
}
