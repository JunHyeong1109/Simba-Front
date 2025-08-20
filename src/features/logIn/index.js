// features/map/index.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import LogIn from "./LogIn";

export default function MapFeature() {
  return (
    <div data-app="map">
      <Routes>
        <Route index element={<LogIn />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
