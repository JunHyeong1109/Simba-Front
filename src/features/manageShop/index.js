import { Routes, Route, Navigate } from "react-router-dom";
import ManageShop from "./ManageShop";

export default function ManageShopFeature() {
  return (
    <div data-app="manage-shop">
      <Routes>
        <Route index element={<ManageShop />} />
        {/* 필요 시 하위 경로 추가 가능
            <Route path="analytics" element={<ManageAnalytics />} />
        */}
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
