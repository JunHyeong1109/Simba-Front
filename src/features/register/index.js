// features/map/index.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Register from "./Register";

export default function MapFeature() {
  return (
    <div data-app="map">
      <Routes>
        <Route index element={<Register />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
