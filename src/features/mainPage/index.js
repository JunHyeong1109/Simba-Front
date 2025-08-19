// src/features/manageShop/index.js
import { Routes, Route, Navigate } from "react-router-dom";
import MainPage from "./MainPage";

export default function ManageShopFeature() {
  return (
    <div data-app="manage-shop">
      <Routes>
        <Route index element={<MainPage />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
