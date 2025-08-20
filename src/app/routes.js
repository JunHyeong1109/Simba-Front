import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./App";

const Login = lazy(() => import("../features/logIn"));
const MainPage = lazy(() => import("../features/mainPage"));
const EventMap = lazy(() => import("../features/eventMap"));
const EditShop = lazy(() => import("../features/editShop"));
const CreateReviewEvent = lazy(() => import("../features/createReviewEvent"));
const ManageShop = lazy(() => import("../features/manageShop"));
const Register = lazy(() => import("../features/register"));
const UserMyPage = lazy(() => import("../features/userMyPage"));
const OwnerMyPage = lazy(() => import("../features/ownerMyPage"));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <MainPage /> },
      { path: "mypage1/*", element: <UserMyPage /> },
      { path: "mypage2/*", element: <OwnerMyPage /> },
      { path: "register/*", element: <Register /> },
      { path: "login/*", element: <Login /> },
      { path: "map/*", element: <EventMap /> },
      { path: "edit/*", element: <EditShop /> },
      { path: "event/*", element: <CreateReviewEvent /> },
      { path: "manage/*", element: <ManageShop /> },
    ],
  },
]);
