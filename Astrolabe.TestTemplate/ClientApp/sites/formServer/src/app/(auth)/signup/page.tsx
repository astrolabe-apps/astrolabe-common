"use client";

import {
  useSignupPage,
  SignupFormData,
} from "@astroapps/client-localusers";
import { SignupForm } from "@astrolabe/ui/user/SignupForm";
import { Textfield } from "@astrolabe/ui/Textfield";

interface TestSignupForm extends SignupFormData {
  firstName: string;
  lastName: string;
}

const emptyForm: TestSignupForm = {
  email: "",
  password: "",
  confirm: "",
  firstName: "",
  lastName: "",
};

export default function SignupPage() {
  const runCreateAccount = async (data: TestSignupForm) => {
    const resp = await fetch("/api/user/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw resp;
  };

  const { control, createAccount } = useSignupPage(
    emptyForm,
    runCreateAccount,
  );

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignupForm control={control} createAccount={createAccount}>
        <Textfield control={control.fields.firstName} label="First Name" />
        <Textfield control={control.fields.lastName} label="Last Name" />
      </SignupForm>
    </div>
  );
}