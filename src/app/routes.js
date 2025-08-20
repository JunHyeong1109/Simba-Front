// src/app/router.js
import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./App";

// 페이지(기능) 단위 Lazy 로드
const Login = lazy(() => import("../features/logIn"));
const MainPage = lazy(() => import("../features/mainPage"));
const EventMap = lazy(() => import("../features/eventMap"));
const EditShop = lazy(() => import("../features/editShop"));
const CreateReviewEvent = lazy(() => import("../features/createReviewEvent"));
const ManageShop = lazy(() => import("../features/manageShop"));
const Register = lazy(() => import("../features/register"));
const UserMyPage = lazy(() => import("../features/userMyPage"));
const OwnerMyPage = lazy(() => import("../features/ownerMyPage"));
const Review = lazy(() => import("../features/review"));
const ReviewApproval = lazy(() => import("../features/reviewApproval"));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      // 메인: 루트(index)
      { index: true, element: <MainPage /> },

      // 리뷰 (쿼리스트링로 missionId 사용) - 내부에서 추가 중첩이 있으면 /* 유지
      { path: "review", element: <Review /> },

      // 마이페이지 (리뷰어 / 사장님)
      { path: "mypage1/*", element: <UserMyPage /> },
      { path: "mypage2/*", element: <OwnerMyPage /> },

      // 회원/로그인
      { path: "register/*", element: <Register /> },
      { path: "login/*", element: <Login /> },

      // 지도/이벤트/매장 관리
      { path: "map/*", element: <EventMap /> },
      { path: "event/*", element: <CreateReviewEvent /> },
      { path: "manage/*", element: <ManageShop /> },

      // 매장 편집: /edit/:id 로 직접 접근 (예: /edit/10)
      { path: "edit/:id", element: <EditShop /> },

      //  새 매장 등록을 /edit 로도 열고 싶다면:
      { path: "edit", element: <EditShop /> },

      // 보상 여부
      { path: "review-check/*", element: <ReviewApproval /> },
    ],
  },
  // 필요 시 레이아웃 밖 라우트 추가 가능
]);
