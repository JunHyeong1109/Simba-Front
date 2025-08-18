// src/features/createReviewEvent/CreateButton/CreateButton.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReviewStore } from "../../../shared/reviewStore";

export default function CreateButton({ collect }) {
  const addEvent = useReviewStore((s) => s.addEvent);
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const onClick = () => {
    if (pending) return;

    const data = collect?.() ?? null;
    if (!data || typeof data !== "object") {
      alert("폼 데이터를 수집할 수 없습니다.");
      return;
    }

    // 문자열 정규화
    const title = String(data.title ?? "").trim();
    const desc = String(data.desc ?? "");
    const shopName = String(data.shopName ?? "");
    const address = String(data.address ?? "").trim();
    const startDate = String(data.startDate ?? "");
    const endDate = String(data.endDate ?? "");

    // 좌표는 숫자로 안전 변환 (빈값/NaN 제외)
    const latRaw = data.lat ?? "";
    const lngRaw = data.lng ?? "";
    const latNum =
      latRaw === "" || latRaw === null || latRaw === undefined
        ? undefined
        : Number(latRaw);
    const lngNum =
      lngRaw === "" || lngRaw === null || lngRaw === undefined
        ? undefined
        : Number(lngRaw);
    const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);

    if (!title) {
      alert("제목을 입력하세요.");
      return;
    }
    if (!hasCoords && !address) {
      alert("좌표(lat/lng) 또는 주소를 입력하세요.");
      return;
    }

    setPending(true);
    addEvent({
      title,
      desc,
      shopName,
      address,
      lat: hasCoords ? latNum : undefined,
      lng: hasCoords ? lngNum : undefined,
      startDate,
      endDate,
    });
    setPending(false);
    navigate("/"); // 등록 후 지도
  };

  return (
    <button type="button" onClick={onClick} disabled={pending}>
      {pending ? "등록 중..." : "리뷰이벤트 등록"}
    </button>
  );
}
