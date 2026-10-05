"use client";

import {
  StringParam,
  useNavigationService,
  useQueryControl,
  useSyncParam,
} from "@astroapps/client";
import { Finput } from "@react-typed-forms/core";

export default function SyncRaceParamsPage() {
  const { pathname } = useNavigationService();
  const state = useSyncParam(useQueryControl(), "state", StringParam);
  return (
    <>
      <h1>Params page ({pathname})</h1>
      <label>
        state: <Finput className="border" control={state} />
      </label>
    </>
  );
}
