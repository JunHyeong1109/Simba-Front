// features/map/index.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import EventMap from "./EventMap";

export default function MapFeature() {
  return (
    <div data-app="map">
      <Routes>
        <Route index element={<EventMap />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
