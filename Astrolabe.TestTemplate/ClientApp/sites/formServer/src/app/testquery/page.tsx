"use client";

import {
  StringParam,
  useNavigationService,
  useQueryControl,
  useSyncParam,
} from "@astroapps/client";
import { Finput } from "@react-typed-forms/core";
import { useEffect } from "react";

export default function TestQueryPage() {
  const qc = useQueryControl();
  const test = useSyncParam(qc, "test", StringParam);
  const derp = useSyncParam(qc, "derp", StringParam);
  const router = useNavigationService();

  useEffect(() => {
    setTimeout(() => router.push("/checkAdorn"), 5000);
  }, []);

  return (
    <>
      <Finput control={test} />
      <br />
      <Finput control={derp} />
    </>
  );
}
