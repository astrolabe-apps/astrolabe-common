import { Control, notEmpty, useControl } from "@react-typed-forms/core";
import { isApiResponse, validateAndRunResult } from "../util/validation";
import { useNavigationService } from "../service/navigation";
import { createContext, useContext, useEffect } from "react";
import { RouteData } from "./routeData";
import { PageSecurity } from "../service/security";

export interface AuthPageSetup {
  hrefs: {
    login: string;
    signup: string;
    resetPassword: string;
    changePassword: string;
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
    resetPassword: "/resetPassword",
    changePassword: "/changePassword",
    mfa: "/mfa"
  },
  errors: {
    emptyUsername: "Please enter your email address",
    emptyPassword: "Please enter your password",
    credentials: "Incorrect username/password",
    verify: "You could not be verified",
    emptyCode: "Please enter your code",
    wrongCode: "The verification code you have entered does not match our records. Please try again, or request a new code.",
    generic: "An unknown error occurred",
    codeLimit: "You hit the limit on the number of text messages."
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

export interface ResetPasswordFormData {
  email: string;
}

export const emptyResetPasswordForm = {
  email: "",
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
  confirmPrevious: boolean;
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
  runChange: (
    resetCode: string | null,
    change: ChangePasswordFormData,
  ) => Promise<any>,
): PasswordChangeProps {
  const control = useControl(emptyChangePasswordForm);

  const {
    queryParams: { resetCode: rcp },
  } = useAuthPageSetup();
  const searchParams = useNavigationService();
  const resetCode = searchParams.get(rcp);

  return {
    control,
    confirmPrevious: !resetCode,
    changePassword: () =>
      validateAndRunResult(control, () => runChange(resetCode, control.value)),
  };
}

export function useChangeEmailPage(
  runChange: (change: ChangeEmailFormData) => Promise<any>,
): EmailChangeProps {
  const control = useControl(emptyChangeEmailForm);

  const {
    errors: { credentials },
  } = useAuthPageSetup();

  return {
    control,
    changeEmail: () =>
      validateAndRunResult(
        control,
        () => runChange(control.value),
        (e) => {
          if (isApiResponse(e) && e.status === 401) {
            control.fields.password.error = credentials;
            return true;
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
): LoginProps {
  const {
    errors: { emptyUsername, emptyPassword, credentials },
  } = useAuthPageSetup();
  const control = useControl(emptyLoginForm, {
    fields: {
      username: { validator: notEmpty(emptyUsername) },
      password: { validator: notEmpty(emptyPassword) },
    },
  });

  return {
    control,
    authenticate: () =>
      validateAndRunResult(
        control,
        () => runAuthenticate(control.value),
        (e) => {
          if (isApiResponse(e) && e.status === 401) {
            control.error = credentials;
            return true;
          } else return false;
        },
      ),
  };
}

export interface MfaFormData {
  token: string;
  code: string;
}

interface MfaProps
{
  control: Control<MfaFormData>;
  authenticate: () => Promise<boolean>;
  send: () => Promise<boolean>;

}

export function useMfaPage( runAuthenticate: (login: MfaFormData) => Promise<any>, send: (login: MfaFormData) => Promise<any>) : MfaProps
{
  const {
    queryParams, errors: { wrongCode, generic, codeLimit}
  } = useAuthPageSetup();
  const searchParams = useNavigationService();
  const token = searchParams.get(queryParams.token)!;
  
  const control = useControl({token, code: ""}, );

  return {
    control,
    authenticate: () =>
      validateAndRunResult(
        control,
        () => runAuthenticate(control.value),
        (e) => {
          if (isApiResponse(e) && e.status === 401) {
            control.error = wrongCode;
            return true;
          } else return false;
        },
      ),
    send: async () => {
      try {  await send(control.value); return true;}
      catch (e) {
        if (isApiResponse(e) ) {
          if (e.status === 429) {
            control.error = codeLimit;
          } else {
            control.error = generic;
          }
          return true;
        }  else return false;
      }
    }
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

export function useChangeMfaNumberPage( runAuthenticate: (login: ChangeMfaNumberFormData) => Promise<any>, send: (login: ChangeMfaNumberFormData) => Promise<any>, runChange: (login: ChangeMfaNumberFormData) => Promise<any>) : MfaNumberChangeProps
{
  const {
     errors: {credentials, wrongCode, generic, codeLimit}
  } = useAuthPageSetup();

  const control = useControl(emptyChangeMfaNumberForm );

  return {
    control,
    authenticate: () =>
      validateAndRunResult(
        control,
        () => runAuthenticate(control.value),
        (e) => {
          if (isApiResponse(e) && e.status === 401) {
            control.error = credentials; 
            return true;
          } else if(isApiResponse(e) && e.status === 429) {
            control.error = codeLimit;
            return true;
          }
          else return false;
        },
      ),
    send: async () => {
      try {  await send(control.value); return true;}
      catch (e) {
        if (isApiResponse(e) ) {
          if (e.status === 429) {
            control.error = codeLimit;
          } else {
            control.error = generic;
          }
          return true;
        }  else return false;
      }
    },
    runChange: async () => 
      validateAndRunResult(
        control,
        () => runChange(control.value),
        (e) => {
          if (isApiResponse(e) && e.status === 401) {
            control.error = wrongCode;
            return true;
          } else return false;
        },
      ),
    
  };
}



export interface ResetPasswordProps {
  control: Control<ResetPasswordFormData>;
  resetPassword: () => Promise<any>;
}

export function useResetPasswordPage(
  runResetPassword: (email: string) => Promise<any>,
): ResetPasswordProps {
  const {
    errors: { emptyUsername, emptyEmail },
  } = useAuthPageSetup();
  const control = useControl(emptyResetPasswordForm, {
    fields: { email: { validator: notEmpty(emptyEmail ?? emptyUsername) } },
  });

  return {
    control,
    resetPassword: () =>
      validateAndRunResult(control, () =>
        runResetPassword(control.fields.email.value),
      ),
  };
}

export interface SignupProps<A extends SignupFormData> {
  control: Control<A>;
  createAccount: () => Promise<boolean>;
}

export function useSignupPage<A extends SignupFormData = SignupFormData>(
  initialForm: A,
  runCreateAccount: (signupData: A) => Promise<any>,
): SignupProps<A> {
  const control = useControl(initialForm);

  return {
    control,
    createAccount: () =>
      validateAndRunResult(control, () => runCreateAccount(control.value)),
  };
}

export interface VerifyFormData {
  token: string|null;
  code: string;
  otherNumber: boolean;
  number: string|null;
}

const emptyVerifyFormData: VerifyFormData = {
  token: null,
  code: "",
  otherNumber: false,
  number: null,
}

interface VerifyProps
{
  control: Control<VerifyFormData>;
  authenticate: () => Promise<boolean>;
  send: () => Promise<boolean>;
}

export function useVerifyPage(
  runVerify: (code: string) => Promise<any>,
  runAuthenticate: (data: VerifyFormData) => Promise<any>,
  send: (data: VerifyFormData) => Promise<any>
): VerifyProps {
  const {
    errors: { verify, codeLimit, wrongCode, generic },
    queryParams: { verifyCode },
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
      validateAndRunResult(
        control,
        () => runAuthenticate(control.value),
        (e) => {
          if (isApiResponse(e) && e.status === 401) {
            control.error = wrongCode;
            return true;
          } else if(isApiResponse(e) && e.status === 429) {
            control.error = codeLimit;
            return true;
          }
          else return false;
        },
      ),
    send: () =>
      validateAndRunResult(
        control,
        () => send(control.value),
        (e) => {
          if(isApiResponse(e)) {
            if (e.status === 429) {
              control.error = codeLimit;
              return true;
            } else if (e.status === 401) {
              control.error = generic;
              return true;
            }
            return false;
          }
          else return false;
        },
      ),
    // send: async () => {
    //   try {  await send(control.value); return true;}
    //   catch (e) {
    //     if (isApiResponse(e) ) {
    //       if (e.status === 429) {
    //         control.error = codeLimit;
    //       } else {
    //         control.error = generic;
    //       }
    //     }
    //     return false;
    //   }
    // },
  };

  async function doVerify() {
    if (verificationCode) {
      try {
        control.fields.token.value = await runVerify(verificationCode);
       // await runVerify(verificationCode);
      } catch (e) {
        if (isApiResponse(e) && e.status === 401) {
          control.error = verify;
        } else throw e;
      }
    } else {
      control.error = verify;
    }
  }
}

export const defaultUserRoutes = {
  login: { label: "Login", allowGuests: true, forwardAuthenticated: true },
  logout: { label: "Logout", allowGuests: false },
  changePassword: { label: "Change password", allowGuests: true },
  changeEmail: { label: "Change email", allowGuests: false },
  resetPassword: {
    label: "Reset password",
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
