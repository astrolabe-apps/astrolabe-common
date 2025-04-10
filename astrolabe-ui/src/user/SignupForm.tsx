import { Control, useControl } from "@react-typed-forms/core";
import { Textfield } from "../Textfield";
import { Button } from "../Button";
import { SignupFormData, useAuthPageSetup } from "@astroapps/client";
import { CircularProgress } from "../CircularProgress";
import { ReactNode } from "react";
import { UserFormContainer } from "./UserFormContainer";

export function SignupForm({
  className,
  control,
  createAccount,
  children,
}: {
  className?: string;
  control: Control<SignupFormData>;
  createAccount: () => Promise<boolean>;
  children?: ReactNode;
}) {
  const {
    fields: { password, confirm, email },
    disabled,
  } = control;
  const {
    hrefs: { login },
  } = useAuthPageSetup();
  const accountCreated = useControl(false);
  return (
    <UserFormContainer className={className}>
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
          <form
            className="space-y-4 md:space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              doCreate();
            }}
          >
            <Textfield control={email} label="Email" autoComplete="username" />
            <Textfield
              control={password}
              label="Password"
              type="password"
              autoComplete="new-password"
            />
            <Textfield
              control={confirm}
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
            />
            {children}
            {disabled && <CircularProgress />}
            <Button className="w-full" type="submit" disabled={disabled}>
              Create an account
            </Button>
            <p className="text-sm font-light text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <a
                href={login}
                className="font-medium text-primary-600 hover:underline dark:text-primary-500"
              >
                Login here
              </a>
            </p>
          </form>
        </>
      )}
    </UserFormContainer>
  );

  async function doCreate() {
    accountCreated.value = await createAccount();
  }
}
