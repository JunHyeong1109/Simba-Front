// features/map/index.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import ReviewApproval from "./ReviewApproval";

export default function MapFeature() {
  return (
    <div data-app="map">
      <Routes>
        <Route index element={<ReviewApproval />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
