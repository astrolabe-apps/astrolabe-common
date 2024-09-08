import { createRoot } from "react-dom/client";
import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RenderForm } from "./RenderForm";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RenderForm />,
  },
]);

const root = createRoot(document.getElementById("app")!);

root.render(
  <>
    <RouterProvider router={router} />
  </>,
);
