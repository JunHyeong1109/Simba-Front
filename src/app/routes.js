import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./App";
const EventMap = lazy(() => import("../features/eventMap"));
const EditShop = lazy(() => import("../features/editShop"));
const CreateReviewEvent = lazy(() => import("../features/createReviewEvent"));

export const router = createBrowserRouter([{
  path: "/",
  element: <AppLayout />,
  children: [
    { index: true, element: <EventMap /> },
    { path: "edit/*", element: <EditShop /> },
    { path: "event/*", element: <CreateReviewEvent /> },
  ],
}]);
