import { Control, useControl } from "@react-typed-forms/core";
import { Textfield } from "../Textfield";
import { Button } from "../Button";
import {
  ForgotPasswordFormData,
  useAuthPageSetup,
  useNavigationService,
} from "@astroapps/client";
import { CircularProgress } from "../CircularProgress";
import { UserFormContainer } from "./UserFormContainer";

type ForgotPasswordFormProps = {
  className?: string;
  control: Control<ForgotPasswordFormData>;
  requestResetPassword: () => Promise<boolean>;
};

export function ForgotPasswordForm({
  className,
  control,
  requestResetPassword,
}: ForgotPasswordFormProps) {
  const { Link } = useNavigationService();
  const {
    fields: { email },
    disabled,
  } = control;
  const {
    hrefs: { login },
  } = useAuthPageSetup();
  const resetRequested = useControl(false);

  return (
    <UserFormContainer className={className}>
      {resetRequested.value ? (
        <>
          <h2>Check email to continue</h2>
          <p className="font-light text-gray-500 dark:text-gray-400">
            You will receive an email with further instructions on how to reset
            your password
          </p>
        </>
      ) : (
        <>
          <h2>Forgot your password?</h2>
          <p className="font-light text-gray-500 dark:text-gray-400">
            Don't fret! Just type in your email and we will send you a link to
            reset your password!
          </p>
          <form
            className="space-y-4 md:space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              doRequestReset();
            }}
          >
            <Textfield control={email} label="Email" autoComplete="username" />
            {disabled && <CircularProgress />}
            <Button className="w-full" type="submit" disabled={disabled}>
              Reset Password
            </Button>
          </form>
        </>
      )}
      <p className="text-center">
        <Link
          href={login}
          className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500"
        >
          Back to Login
        </Link>
      </p>
    </UserFormContainer>
  );

  async function doRequestReset() {
    control.disabled = true;
    const wasReset = await requestResetPassword();
    resetRequested.value = wasReset;
    if (!wasReset) control.disabled = false;
  }
}
