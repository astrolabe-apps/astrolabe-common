import { Textfield } from "../Textfield";
import { Control, Fcheckbox, useControlEffect } from "@react-typed-forms/core";
import { Button } from "../Button";
import clsx from "clsx";
import { LoginFormData, useAuthPageSetup } from "@astroapps/client-localusers";
import { CircularProgress } from "../CircularProgress";
import { UserFormContainer } from "./UserFormContainer";
import { useNavigationService } from "@astroapps/client";

type LoginFormProps = {
  className?: string;
  control: Control<LoginFormData>;
  authenticate: () => Promise<boolean>;
};

export function LoginForm({
  className,
  control,
  authenticate,
}: LoginFormProps) {
  const { Link } = useNavigationService();
  const {
    hrefs: { signup, forgotPassword },
  } = useAuthPageSetup();

  const {
    fields: { password, username, rememberMe },
    disabled,
  } = control;
  const { error } = control;
  useControlEffect(
    () => [username.value, password.value],
    () => (control.error = null),
  );
  const linkStyle =
    "font-medium text-primary-600 hover:underline dark:text-primary-500";
  return (
    <UserFormContainer className={className}>
      <h2>Login</h2>
      <form
        className="my-2 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          authenticate();
        }}
      >
        <div className="flex">
          <div>Do you have an account yet?</div>
          <Link className={clsx("ml-1", linkStyle)} href={signup}>
            Signup
          </Link>
        </div>
        <Textfield
          control={username}
          label="Username"
          autoComplete="username"
        />
        <Textfield
          control={password}
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        <div className="flex justify-between text-sm">
          <div>
            <Fcheckbox id="rememberMe" control={rememberMe} />{" "}
            <label htmlFor="rememberMe">Remember me</label>
          </div>
          <div>
            <Link href={forgotPassword} className={linkStyle}>
              Forgot your password?
            </Link>
          </div>
        </div>
        {error && <p className="text-danger">{error}</p>}
        {disabled && <CircularProgress />}
        <Button className="w-full" type="submit" disabled={disabled}>
          Login
        </Button>
      </form>
    </UserFormContainer>
  );
}
