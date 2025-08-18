// src/features/createReviewEvent/CreateButton/CreateButton.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api"; // ✅ axios 인스턴스

export default function CreateButton({ collect }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const toISO = (d) => (d ? new Date(d).toISOString().slice(0, 19) : "");

  const onClick = async () => {
    if (pending) return;

    const data = collect?.() ?? null;
    if (!data || typeof data !== "object") {
      alert("폼 데이터를 수집할 수 없습니다.");
      return;
    }

    // collect가 startAt/endAt 또는 startDate/endDate 중 무엇을 주든 처리
    const title = String(data.title ?? "").trim();
    const description = String(data.desc ?? "").trim();
    const storeId = Number(data.storeId ?? document.getElementById("event-store-id")?.value ?? 0);

    const rawStart = data.startAt || data.startDate || "";
    const rawEnd = data.endAt || data.endDate || "";

    const startAt = toISO(rawStart);
    const endAt = toISO(rawEnd);

    if (!title) return alert("제목을 입력하세요.");
    if (!storeId) return alert("매장을 선택하세요.");
    if (!endAt) return alert("종료일을 선택하세요.");
    if (startAt && new Date(startAt) > new Date(endAt)) {
      return alert("시작일이 종료일보다 늦을 수 없습니다.");
    }

    const payload = {
      title,
      description,
      storeId,
      ...(startAt ? { startAt } : {}),
      endAt,
    };

    try {
      setPending(true);
      await api.post("/itda/missions", payload); // ✅ 백엔드로 전송
      alert("미션이 생성되었습니다.");
      navigate("/"); // 필요 시 미션 목록/상세로 이동 경로 변경
    } catch (e) {
      const msg = e?.response?.data?.message || "미션 생성에 실패했습니다.";
      alert(msg);
    } finally {
      setPending(false);
    }
  };

  return (
    <button type="button" onClick={onClick} disabled={pending}>
      {pending ? "등록 중..." : "리뷰이벤트 등록"}
    </button>
  );
}
