"use client";

import { useEffect } from "react";
import { useSecurityService } from "@astroapps/client";

export default function LoginPage() {
  const { login } = useSecurityService();
  useEffect(() => {
    login();
  }, []);
  return <></>;
}
