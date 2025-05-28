import { Control } from "@react-typed-forms/core";
import { MfaFormData, VerifyFormData } from "@astroapps/client";
import { UserFormContainer } from "./UserFormContainer";
import React from "react";
import { CircularProgress } from "../CircularProgress";
import SmsMfa from "./SmsMfa";

type VerifyFormProps = {
  className?: string;
  control: Control<VerifyFormData>;
  mfaControl: Control<MfaFormData>;
  authenticate: () => Promise<boolean>;
  send: () => Promise<boolean>;
};

export function VerifyForm({
  className,
  control,
  mfaControl,
  authenticate,
  send,
}: VerifyFormProps) {
  const {
    fields: { requiresMfa },
    error,
  } = control;

  return (
    <UserFormContainer className={className}>
      <h2>Verifying</h2>
      {error == null ? (
        <>
          {requiresMfa.value ? (
            <SmsMfa
              control={mfaControl}
              sendCode={send}
              verifyCode={authenticate}
            />
          ) : (
            <CircularProgress />
          )}
        </>
      ) : (
        <p className="text-danger">{error}</p>
      )}
    </UserFormContainer>
  );
}
