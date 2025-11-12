"use client";

import { useSecurityService } from "@astroapps/client";
import { useEffect } from "react";

export default function LogoutPage() {
  const { logout } = useSecurityService();
  useEffect(() => {
    logout();
  }, []);

  return <></>;
}
