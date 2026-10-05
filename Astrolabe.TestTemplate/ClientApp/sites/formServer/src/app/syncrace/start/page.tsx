"use client";

import { useNavigationService } from "@astroapps/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function SyncRaceStartPage() {
  const nav = useNavigationService();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams.get("token")) return;
    // Strip the one-time param, leaving an empty query
    if (searchParams.get("mode") === "history") {
      window.history.replaceState(null, "", "/syncrace/start");
    } else {
      nav.replace("/syncrace/start");
    }
    // A quick link click, well inside the 200ms sync debounce
    setTimeout(() => router.push("/syncrace/target"), 50);
  }, []);

  return (
    <h1>Start page. If you can read this after a second, the bug happened.</h1>
  );
}
