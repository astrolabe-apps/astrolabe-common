import { createRoot } from "react-dom/client";
import React from "react";
import { AllControls } from "./AllControls";
import { RealLife } from "./RealLife";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { DynamicControls } from "./DynamicControls";
import { Validation } from "./Validation";
import { Schemas } from "./Schemas";

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
  <>
    <RouterProvider router={router} />
  </>,
);
