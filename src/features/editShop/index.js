// src/features/editShop/index.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import EditShop from "./EditShop";
import Inner from "./Inner/Inner";

export default function EditShopFeature() {
  return (
    <div data-app="editshop">
      <Routes>
        {/* /edit -> EditShop 컴포넌트 */}
        <Route index element={<EditShop />} />
        
        {/* /edit/inner -> Inner 컴포넌트 */}
        <Route path="inner" element={<Inner />} />

        {/* 그 외 모든 경로 -> /edit 리다이렉트 */}
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
