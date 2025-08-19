import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./App";

const EventMap = lazy(() => import("../features/eventMap"));
const EditShop = lazy(() => import("../features/editShop"));
const CreateReviewEvent = lazy(() => import("../features/createReviewEvent"));
const ManageShop = lazy(() => import("../features/manageShop")); 

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "map/*", element: <EventMap /> },
      { path: "edit/*", element: <EditShop /> },
      { path: "event/*", element: <CreateReviewEvent /> },
      { path: "manage/*", element: <ManageShop /> }, 
    ],
  },
]);
