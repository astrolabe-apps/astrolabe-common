"use client";

import { useSecurityService } from "@astroapps/client";
import { useControlEffect } from "@react-typed-forms/core";

export default function LoginPage() {
  const { login, currentUser } = useSecurityService();
  useControlEffect(
    () => currentUser.value,
    (v) => {
      if (!v.busy && !v.loggedIn) login();
    },
    true,
  );
  return <></>;
}