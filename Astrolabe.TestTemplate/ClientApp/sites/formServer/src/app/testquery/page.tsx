"use client";

import { StringParam, useQueryControl, useSyncParam } from "@astroapps/client";
import { Finput, useControlEffect } from "@react-typed-forms/core";
import { useRouter } from "next/navigation";

export default function TestQueryPage() {
  const qc = useQueryControl();
  const test = useSyncParam(qc, "test", StringParam);
  const router = useRouter();

  useControlEffect(
    () => [test.value, qc.fields.isReady.value] as const,
    ([t, isReady]) => {
      if (isReady) {
        if (!t) {
          console.log("Redirecting to /checkAdorn with test:", t);
          router.push("/checkAdorn");
        } else {
          console.log("Got a param:", t);
          //redirectToBlah();
        }
      }
    },
    true,
  );

  return <Finput control={test} />;
  async function redirectToBlah() {
    console.log("Redirecting to /eval with test:", test.value);
    router.push("/eval");
    return;
  }
}
