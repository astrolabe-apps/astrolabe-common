import { Textfield } from "../Textfield";
import { Control, Fcheckbox, useControl } from "@react-typed-forms/core";
import { Button } from "../Button";
import clsx from "clsx";

export interface LoginFormData {
  username: string;
  password: string;
  rememberMe: boolean;
}

export const emptyLoginForm: LoginFormData = {
  password: "",
  username: "",
  rememberMe: false,
};

export function LoginForm({
  className,
  control,
  signupHref = "/signup",
  resetPasswordHref = "/resetPassword",
  authenticate,
}: {
  className?: string;
  signupHref?: string;
  resetPasswordHref?: string;
  control: Control<LoginFormData>;
  authenticate: () => void;
}) {
  const { password, username, rememberMe } = control.fields;
  return (
    <div
      className={clsx(
        className,
        "w-full bg-white rounded-lg shadow dark:border md:mt-0 xl:p-0 dark:bg-gray-800 dark:border-gray-700",
      )}
    >
      <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
        <h2>Login</h2>
        <div className="my-2 space-y-4">
          <div className="flex">
            <div>Do you have an account yet?</div>
            <a
              className="ml-1 font-medium text-primary-600 hover:underline dark:text-primary-500"
              href={signupHref}
            >
              Signup
            </a>
          </div>
          <Textfield control={username} label="Username" />
          <Textfield control={password} label="Password" type="password" />
          <div className="flex justify-between text-sm">
            <div>
              <Fcheckbox control={rememberMe} /> <label>Remember me</label>
            </div>
            <div>
              <a
                href={resetPasswordHref}
                className="font-medium text-primary-600 hover:underline dark:text-primary-500"
              >
                Forgot your password?
              </a>
            </div>
          </div>
          <Button className="w-full" onClick={authenticate}>
            Login
          </Button>
        </div>
      </div>
    </div>
  );
}
