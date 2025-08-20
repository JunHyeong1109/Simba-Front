// src/features/mission/CreateButton.js (파일 위치는 기존대로)
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import "./CreateButton.css"; // ⬅️ 추가

export default function CreateButton({ collect, posterFile }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    if (pending) return;

    const data = collect?.() ?? null;
    if (!data || typeof data !== "object") {
      alert("폼 데이터를 수집할 수 없습니다.");
      return;
    }

    const title = String(data.title ?? "").trim();
    const startAt = String(data.startAt ?? "");
    const endAt = String(data.endAt ?? "");
    const storeId = Number(data.storeId || 0);
    if (!title) return alert("제목을 입력하세요.");
    if (!storeId) return alert("매장을 선택하세요.");

    try {
      setPending(true);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", String(data.desc ?? ""));
      formData.append("startAt", startAt);
      formData.append("endAt", endAt);
      formData.append("storeId", String(storeId));
      if (data.lat) formData.append("lat", String(data.lat));
      if (data.lng) formData.append("lng", String(data.lng));
      if (data.address) formData.append("address", String(data.address));
      if (data.rewardCount) formData.append("rewardCount", String(data.rewardCount));
      if (posterFile instanceof File) formData.append("poster", posterFile);

      await api.post("/itda/missions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("미션이 등록되었습니다.");
      navigate("/map");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "등록 중 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
  type="button"
  onClick={onClick}
  disabled={pending}
  className="re-btn re-btn--primary re-btn--lg re-btn--80vw re-btn--center"
  data-pending={pending ? "true" : "false"}
  aria-busy={pending ? "true" : "false"}
>
  {pending ? "등록 중..." : "리뷰이벤트 등록"}
</button>
  );
}
