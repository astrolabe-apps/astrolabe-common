import { createRoot } from "react-dom/client";
import React from "react";
import { AllControls } from "./AllControls";
import { RealLife } from "./RealLife";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { DynamicControls } from "./DynamicControls";
import { Validation } from "./Validation";
import { Schemas } from "./SchemasPage";
import { RenderFormContext } from "./formTree";
import { NextGenRender } from "./formTree/NextGenRender";
import { SimpleControls } from "./Simple";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RealLife />,
  },
  { path: "/all", element: <AllControls /> },
  { path: "/dynamic", element: <DynamicControls /> },
  { path: "/validation", element: <Validation /> },
  { path: "/schemas", element: <Schemas /> },
  { path: "/simple", element: <SimpleControls /> },
]);

const root = createRoot(document.getElementById("app")!);

root.render(
  //<RenderFormContext.Provider value={NextGenRender}>
  <RouterProvider router={router} />,
  //</RenderFormContext.Provider>,
);
