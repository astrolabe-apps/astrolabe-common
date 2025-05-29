import { Control } from "@react-typed-forms/core";
import { MfaFormData } from "@astroapps/client-localusers";
import { UserFormContainer } from "./UserFormContainer";
import React from "react";
import SmsMfa from "./SmsMfa";

type MfaFormProps = {
  className?: string;
  control: Control<MfaFormData>;
  authenticate: () => Promise<boolean>;
  send: () => Promise<boolean>;
};

export function MfaForm({
  className,
  control,
  authenticate,
  send,
}: MfaFormProps) {
  return (
    <UserFormContainer className={className}>
      <h2>Login</h2>
      <form
        className="my-2 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <SmsMfa control={control} sendCode={send} verifyCode={authenticate} />
      </form>
    </UserFormContainer>
  );
}
