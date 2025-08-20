import { Routes, Route, Navigate } from "react-router-dom";
import UserMyPage from "./UserMyPage";

export default function MapFeature() {
  return (
    <div data-app="map">
      <Routes>
        <Route index element={<UserMyPage />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
