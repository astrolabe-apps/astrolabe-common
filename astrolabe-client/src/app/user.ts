import { Control, notEmpty, useControl } from "@react-typed-forms/core";
import {
  isApiResponse,
  makeStatusCodeHandler,
  validateAndRunMessages,
  validateAndRunResult,
} from "../util/validation";
import { useNavigationService } from "../service/navigation";
import { createContext, useContext, useEffect } from "react";
import { RouteData } from "./routeData";
import { PageSecurity } from "../service/security";

export interface AuthPageSetup {
  hrefs: {
    login: string;
    signup: string;
    forgotPassword: string;
    resetPassword: string;
    mfa: string;
  };
  errors: {
    emptyEmail?: string;
    emptyUsername: string;
    emptyPassword: string;
    emptyCode: string;
    wrongCode: string;
    credentials: string;
    verify: string;
    generic: string;
    codeLimit: string;
    statusCodes?: Record<number, string>;
  };
  queryParams: {
    verifyCode: string;
    resetCode: string;
    token: string;
    message: string;
  };
}

export const defaultUserAuthPageSetup: AuthPageSetup = {
  hrefs: {
    login: "/login",
    signup: "/signup",
    forgotPassword: "/forgotPassword",
    resetPassword: "/resetPassword",
    mfa: "/mfa",
  },
  errors: {
    emptyUsername: "Please enter your email address",
    emptyPassword: "Please enter your password",
    credentials: "Incorrect username/password",
    verify: "You could not be verified",
    emptyCode: "Please enter your code",
    wrongCode:
      "The verification code you have entered does not match our records. Please try again, or request a new code.",
    generic: "An unknown error occurred",
    codeLimit: "You hit the limit on the number of text messages.",
  },
  queryParams: {
    verifyCode: "verificationCode",
    resetCode: "resetCode",
    token: "token",
    message: "message",
  },
};

export const AuthPageSetupContext = createContext(defaultUserAuthPageSetup);

export function useAuthPageSetup() {
  return useContext(AuthPageSetupContext);
}

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

export interface ForgotPasswordFormData {
  email: string;
}

export const emptyForgotPasswordForm = {
  email: "",
};

export interface ResetPasswordFormData {
  password: string;
  confirm: string;
}

export const emptyResetPasswordForm: ResetPasswordFormData = {
  password: "",
  confirm: "",
};

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

export interface PasswordChangeProps {
  control: Control<ChangePasswordFormData>;
  changePassword: () => Promise<boolean>;
}

export interface ChangeEmailFormData {
  password: string;
  newEmail: string;
}

export const emptyChangeEmailForm: ChangeEmailFormData = {
  password: "",
  newEmail: "",
};

export interface EmailChangeProps {
  control: Control<ChangeEmailFormData>;
  changeEmail: () => Promise<boolean>;
}

export function useChangePasswordPage(
  runChange: (change: ChangePasswordFormData) => Promise<any>,
  errors?: Record<number, string>,
): PasswordChangeProps {
  const control = useControl(emptyChangePasswordForm);

  const {
    queryParams: { resetCode: rcp },
    errors: { statusCodes, generic, codeLimit, wrongCode },
  } = useAuthPageSetup();

  return {
    control,
    changePassword: () =>
      validateAndRunMessages(
        control,
        () => runChange(control.value),
        statusCodes ?? errors,
        generic,
      ),
  };
}

export function useChangeEmailPage(
  runChange: (change: ChangeEmailFormData) => Promise<any>,
  errors?: Record<number, string>,
): EmailChangeProps {
  const control = useControl(emptyChangeEmailForm);

  const {
    errors: { credentials, statusCodes, generic },
  } = useAuthPageSetup();
  const errorHandler = makeStatusCodeHandler(
    control,
    errors ?? statusCodes,
    generic,
  );
  return {
    control,
    changeEmail: () =>
      validateAndRunResult(
        control,
        () => runChange(control.value),
        (e) => {
          if (isApiResponse(e)) {
            if (e.status === 401) {
              control.fields.password.error = credentials;
              return true;
            } else return errorHandler(e);
          } else return false;
        },
      ),
  };
}

export interface LoginProps {
  control: Control<LoginFormData>;
  authenticate: () => Promise<boolean>;
}

export function useLoginPage(
  runAuthenticate: (login: LoginFormData) => Promise<any>,
  errors?: Record<number, string>,
): LoginProps {
  const {
    errors: { emptyUsername, emptyPassword, credentials, statusCodes, generic },
  } = useAuthPageSetup();
  const control = useControl<LoginFormData>(emptyLoginForm, {
    fields: {
      username: { validator: notEmpty(emptyUsername) },
      password: { validator: notEmpty(emptyPassword) },
    },
  });

  return {
    control,
    authenticate: () =>
      validateAndRunMessages(
        control,
        () => runAuthenticate(control.value),
        { 401: credentials, ...(errors ?? statusCodes) },
        generic,
      ),
  };
}

export interface MfaFormData {
  token: string;
  code: string;
  updateNumber: boolean;
  number: string | null;
}

interface MfaProps {
  control: Control<MfaFormData>;
  authenticate: () => Promise<boolean>;
  send: () => Promise<boolean>;
}

export function useMfaPage(
  runAuthenticate: (login: MfaFormData) => Promise<any>,
  send: (login: MfaFormData) => Promise<any>,
  errors?: Record<number, string>,
): MfaProps {
  const {
    queryParams,
    errors: { wrongCode, generic, codeLimit, statusCodes },
  } = useAuthPageSetup();
  const searchParams = useNavigationService();
  const token = searchParams.get(queryParams.token)!;

  const control = useControl({
    token,
    code: "",
    updateNumber: false,
    number: null,
  });

  return {
    control,
    authenticate: () =>
      validateAndRunMessages(
        control,
        () => runAuthenticate(control.value),
        { 401: wrongCode, ...(errors ?? statusCodes) },
        generic,
      ),
    send: () =>
      validateAndRunMessages(
        control,
        () => send(control.value),
        { 429: codeLimit, ...(errors ?? statusCodes) },
        generic,
      ),
  };
}

export interface ChangeMfaNumberFormData {
  password: string;
  newNumber: string;
  code: string;
}

export const emptyChangeMfaNumberForm: ChangeMfaNumberFormData = {
  password: "",
  newNumber: "",
  code: "",
};

export interface MfaNumberChangeProps {
  control: Control<ChangeMfaNumberFormData>;
  runChange: () => Promise<boolean>;
  send: () => Promise<boolean>;
  authenticate: () => Promise<boolean>;
}

export function useChangeMfaNumberPage(
  runAuthenticate: (login: ChangeMfaNumberFormData) => Promise<any>,
  send: (login: ChangeMfaNumberFormData) => Promise<any>,
  runChange: (login: ChangeMfaNumberFormData) => Promise<any>,
  errors?: Record<number, string>,
): MfaNumberChangeProps {
  const {
    errors: { credentials, wrongCode, generic, codeLimit, statusCodes },
  } = useAuthPageSetup();

  const control = useControl(emptyChangeMfaNumberForm);
  const handler = makeStatusCodeHandler(
    control,
    { 401: credentials, 429: codeLimit, ...(errors ?? statusCodes) },
    generic,
  );

  return {
    control,
    authenticate: () =>
      validateAndRunResult(
        control,
        () => runAuthenticate(control.value),
        handler,
      ),
    send: async () => {
      try {
        await send(control.value);
        return true;
      } catch (e) {
        return handler(e);
      }
    },
    runChange: async () =>
      validateAndRunMessages(
        control,
        () => runChange(control.value),
        { 401: wrongCode, ...(errors ?? statusCodes) },
        generic,
      ),
  };
}

export interface ForgotPasswordProps {
  control: Control<ForgotPasswordFormData>;
  requestResetPassword: () => Promise<boolean>;
}

export function useForgotPasswordPage(
  runRequestResetPassword: (email: string) => Promise<any>,
  errors?: Record<number, string>,
): ForgotPasswordProps {
  const {
    errors: { emptyUsername, emptyEmail, generic, statusCodes },
  } = useAuthPageSetup();
  const control = useControl<ForgotPasswordFormData>(emptyForgotPasswordForm, {
    fields: { email: { validator: notEmpty(emptyEmail ?? emptyUsername) } },
  });

  return {
    control,
    requestResetPassword: () =>
      validateAndRunMessages(
        control,
        () => runRequestResetPassword(control.fields.email.value),
        errors ?? statusCodes,
        generic,
      ),
  };
}

export interface ResetPasswordProps {
  control: Control<ResetPasswordFormData>;
  resetPassword: () => Promise<boolean>;
  send?: () => Promise<boolean>;
  mfaControl?: Control<MfaFormData>;
  mfaAuthenticate?: () => Promise<boolean>;
}

export function useResetPasswordPage(
  runChange: (resetCode: string, change: ResetPasswordFormData) => Promise<any>,
  send?: (login: MfaFormData) => Promise<any>,
  runAuthenticate?: (login: MfaFormData) => Promise<string>,
  errors?: Record<number, string>,
): ResetPasswordProps {
  const control = useControl(emptyResetPasswordForm);

  const {
    queryParams: { resetCode: rcp },
    errors: { statusCodes, generic, codeLimit, wrongCode },
  } = useAuthPageSetup();

  const searchParams = useNavigationService();
  const resetCode = searchParams.get(rcp);

  const mfaControl = useControl<MfaFormData | null>(
    resetCode != null
      ? {
          token: resetCode,
          code: "",
          updateNumber: false,
          number: null,
        }
      : null,
  );

  const authTokenControl = useControl<string>(resetCode ?? "");

  return {
    control,
    send: () =>
      validateAndRunMessages(
        control,
        async () => {
          await send!(mfaControl.value!);
        },
        { 429: codeLimit, ...(errors ?? statusCodes) },
        generic,
      ),
    resetPassword: () =>
      validateAndRunMessages(
        control,
        () => runChange(authTokenControl.value, control.value),
        statusCodes ?? errors,
        generic,
      ),
    mfaControl: resetCode ? (mfaControl as Control<MfaFormData>) : undefined,
    mfaAuthenticate: resetCode
      ? () =>
          validateAndRunMessages(
            control,
            async () => {
              authTokenControl.value = await runAuthenticate!(
                mfaControl.value!,
              );
            },
            { 401: wrongCode, ...(errors ?? statusCodes) },
            generic,
          )
      : undefined,
  };
}

export interface SignupProps<A extends SignupFormData> {
  control: Control<A>;
  createAccount: () => Promise<boolean>;
}

export function useSignupPage<A extends SignupFormData = SignupFormData>(
  initialForm: A,
  runCreateAccount: (signupData: A) => Promise<any>,
  errors?: Record<number, string>,
): SignupProps<A> {
  const {
    errors: { generic, statusCodes },
  } = useAuthPageSetup();
  const control = useControl(initialForm);

  return {
    control,
    createAccount: () =>
      validateAndRunMessages(
        control,
        () => runCreateAccount(control.value),
        errors ?? statusCodes,
        generic,
      ),
  };
}

export interface VerifyFormData {
  token: string | null;
  requiresMfa: boolean;
  code: string;
  updateNumber: boolean;
  number: string | null;
}

const emptyVerifyFormData: VerifyFormData = {
  token: null,
  requiresMfa: false,
  code: "",
  updateNumber: false,
  number: null,
};

interface VerifyProps {
  control: Control<VerifyFormData>;
  authenticate: () => Promise<boolean>;
  send: () => Promise<boolean>;
}

export function useVerifyPage(
  runVerify: (
    verificationCode: string,
  ) => Promise<Partial<VerifyFormData> | undefined>,
  runAuthenticate: (data: VerifyFormData) => Promise<any>,
  send: (data: VerifyFormData) => Promise<any>,
  errors?: Record<number, string>,
): VerifyProps {
  const {
    errors: { verify, codeLimit, wrongCode, generic, statusCodes },
    queryParams: { verifyCode, token },
  } = useAuthPageSetup();

  const searchParams = useNavigationService();
  const verificationCode = searchParams.get(verifyCode);

  const control = useControl(emptyVerifyFormData);

  useEffect(() => {
    doVerify();
  }, [verificationCode]);

  return {
    control: control,
    authenticate: () =>
      validateAndRunMessages(
        control,
        () => runAuthenticate(control.value),
        { 401: wrongCode, 429: codeLimit, ...(errors ?? statusCodes) },
        generic,
      ),
    send: () =>
      validateAndRunMessages(
        control,
        () => send(control.value),
        { 429: codeLimit, ...(errors ?? statusCodes) },
        generic,
      ),
  };

  async function doVerify() {
    if (verificationCode) {
      try {
        const verifyResponse = await runVerify(verificationCode);
        control.setValue((c) => ({ ...c, ...verifyResponse }));
      } catch (e) {
        makeStatusCodeHandler(
          control,
          { 401: verify, ...(errors ?? statusCodes) },
          generic,
        )(e);
      }
    } else {
      control.error = verify;
    }
  }
}

export const defaultUserRoutes = {
  login: { label: "Login", allowGuests: true, forwardAuthenticated: true },
  logout: { label: "Logout", allowGuests: false },
  changePassword: { label: "Change password", allowGuests: false },
  changeEmail: { label: "Change email", allowGuests: false },
  resetPassword: {
    label: "Reset password",
    allowGuests: true,
  },
  forgotPassword: {
    label: "Forgot password",
    allowGuests: true,
    forwardAuthenticated: true,
  },
  mfa: {
    label: "Login",
    allowGuests: true,
    forwardAuthenticated: true,
  },
  signup: {
    label: "Create account",
    allowGuests: true,
    forwardAuthenticated: true,
  },
  verify: {
    label: "Verify email",
    allowGuests: true,
    forwardAuthenticated: true,
  },
} satisfies Record<string, RouteData<PageSecurity>>;
