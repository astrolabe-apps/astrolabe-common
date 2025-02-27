export * from "./controlImpl";
export * from "./hooks";
export * from "./Fcheckbox";
export * from "./Fselect";
export * from "./Finput";
export * from "./components";
export * from "./util";
export * from "@astroapps/controls";

const version = "4.2.4";

const existingVersion = (globalThis as any)["_react_typed_forms"];
if (existingVersion) {
  console.warn(
    `${version} of @react-typed-forms/core loaded (existing ${existingVersion})`,
  );
}
(globalThis as any)["_react_typed_forms"] = version;
if (typeof window !== "undefined")
  console.info("@react-typed-forms/core " + version + " loaded");
