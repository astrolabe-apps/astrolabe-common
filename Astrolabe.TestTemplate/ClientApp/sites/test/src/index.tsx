import { createRoot } from "react-dom/client";
import React, {createContext} from "react";
import { AllControls } from "./AllControls";
import { RealLife } from "./RealLife";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { DynamicControls } from "./DynamicControls";
import { Validation } from "./Validation";
import { Schemas } from "./SchemasPage";
import {ControlRenderer} from "@react-typed-forms/schemas";
import {NextGenRender} from "./formTree/NextGenRender";

export const RenderFormContext = createContext(ControlRenderer);

const router = createBrowserRouter([
  {
    path: "/",
    element: <RealLife />,
  },
  { path: "/all", element: <AllControls /> },
  { path: "/dynamic", element: <DynamicControls /> },
  { path: "/validation", element: <Validation /> },
  { path: "/schemas", element: <Schemas /> },
]);

const root = createRoot(document.getElementById("app")!);

root.render(
  <RenderFormContext.Provider value={NextGenRender}>
    <RouterProvider router={router} />
  </RenderFormContext.Provider>,
);
