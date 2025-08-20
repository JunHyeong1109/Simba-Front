// features/map/index.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Review from "./Review";

export default function MapFeature() {
  return (
    <div data-app="map">
      <Routes>
        <Route index element={<Review />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
