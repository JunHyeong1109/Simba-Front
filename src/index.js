// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";
if (process.env.REACT_APP_USE_MOCKS === "1") {
  import("./mocks").then((m) => m.default());
} //test
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
