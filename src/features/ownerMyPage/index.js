import { Routes, Route, Navigate } from "react-router-dom";
import OwnerMyPage from "./OwnerMyPage";

export default function MapFeature() {
  return (
    <div data-app="map">
      <Routes>
        <Route index element={<OwnerMyPage />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
