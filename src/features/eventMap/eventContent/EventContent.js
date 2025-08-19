// src/features/eventMap/eventContent/EventContent.js
import React from "react";
import "./EventContent.css";

export default function EventContent({ selected }) {
  if (!selected) {
    return (
      <div className="event-detail empty">
        <span className="placeholder">미션의 상세 내용</span>
      </div>
    );
  }

  const mission = selected.mission || selected;
  const store = mission.store || {};

  const poster =
    mission.posterUrl ||
    mission.poster ||
    mission.imageUrl ||
    mission.thumbnailUrl ||
    "";

  const title = mission.title || "미션";
  const desc = mission.description || mission.desc || "";
  const start = mission.startAt || mission.startDate || "";
  const end = mission.endAt || mission.endDate || "";

  const reward =
    mission.rewardCount ??
    mission.reward ??
    mission.quantity ??
    mission.rewardQty ??
    null;

  const storeName = store.name || mission.storeName || "-";
  const storeAddr =
    selected.address?.road ||
    store.address ||
    mission.address ||
    selected.address?.jibun ||
    "-";

  const lat = selected.lat ?? store.latitude ?? mission.latitude ?? null;
  const lng = selected.lng ?? store.longitude ?? mission.longitude ?? null;

  const fmtDate = (d) => {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
    } catch {}
    return String(d).slice(0, 10);
  };

  return (
    <div className="event-detail">
      <div className="poster-col">
        {poster ? (
          <img src={poster} alt={`${title} 포스터`} className="poster-img" />
        ) : (
          <div className="poster-placeholder">포스터 없음</div>
        )}
      </div>

      <div className="info-col">
        <div className="title">{title}</div>

        <div className="row">
          <span className="label">기간</span>
          <span className="value">
            {fmtDate(start)} ~ {fmtDate(end)}
          </span>
        </div>

        <div className="row">
          <span className="label">보상 수량</span>
          <span className="value">{reward ?? "-"}</span>
        </div>

        <div className="row">
          <span className="label">매장</span>
          <span className="value">{storeName}</span>
        </div>

        <div className="row">
          <span className="label">주소</span>
          <span className="value">{storeAddr}</span>
        </div>

        <div className="row">
          <span className="label">좌표</span>
          <span className="value">
            {lat != null && lng != null ? `${lat}, ${lng}` : "-"}
          </span>
        </div>

        {desc && (
          <div className="desc">
            <div className="label">설명</div>
            <div className="value">{desc}</div>
          </div>
        )}
      </div>
    </div>
  );
}
