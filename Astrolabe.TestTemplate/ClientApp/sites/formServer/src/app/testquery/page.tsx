"use client";

import { StringParam, useQueryControl, useSyncParam } from "@astroapps/client";
import { Finput } from "@react-typed-forms/core";

export default function TestQueryPage() {
  const qc = useQueryControl();
  const test = useSyncParam(qc, "test", StringParam);

  return <Finput control={test} />;
}
