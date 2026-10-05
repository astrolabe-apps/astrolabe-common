"use client";

import { useNavigationService } from "@astroapps/client";
import Link from "next/link";

export default function SyncRacePage() {
  const nav = useNavigationService();
  return (
    <>
      <h1>Query sync race</h1>
      <p>
        Bug A: each link strips <code>?token</code> on mount, then follows a
        link to a slow route. You should end on the target page.
      </p>
      {/* Client-side links, so the layout's sync is already listening when
          the start page strips the param (as with the (auth) layout) */}
      <Link className="underline" href="/syncrace/start?token=x">
        Bug A, strip with nav.replace
      </Link>
      <Link className="underline" href="/syncrace/start?token=x&mode=history">
        Bug A, strip with history.replaceState
      </Link>
      <p>
        Bug B: click the button, then the link, then type in the field. The URL
        should stay on /syncrace/params.
      </p>
      <button
        className="border w-fit px-2"
        onClick={() => nav.replace("/syncrace")}
      >
        1. nav.replace(&quot;/syncrace&quot;)
      </button>
      <Link className="underline" href="/syncrace/params">
        2. Go to params page
      </Link>
    </>
  );
}
