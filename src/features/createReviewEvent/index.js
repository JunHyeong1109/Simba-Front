// src/features/createReviewEvent/index.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CreateReviewEvent from "./CreateReviewEvent";      // 기존 CreateReviewEvent의 App.js

export default function CreateReviewEventFeature() {
  return (
    <div data-app="createreviewevent">
      <Routes>
        <Route index element={<CreateReviewEvent />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
