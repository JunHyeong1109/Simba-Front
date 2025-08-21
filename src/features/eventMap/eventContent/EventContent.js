import React, { useState } from "react";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import api from "../../../api";
import "./EventContent.css";

export default function EventContent({ selected, loginRoute = "/login" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const outletCtx = useOutletContext?.();
  const authUser = outletCtx?.user || null;

  const [checking, setChecking] = useState(false);

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

  // 가능한 키들에서 missionId 추출
  const missionId =
    mission.id ??
    mission.missionId ??
    selected.id ??
    selected.missionId ??
    null;

  const fmtDate = (d) => {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
    } catch {}
    return String(d).slice(0, 10);
  };

  const goToReview = async () => {
    if (!missionId || checking) {
      if (!missionId) alert("미션 ID가 없어 리뷰 페이지로 이동할 수 없습니다.");
      return;
    }

    const reviewPath = `/itda/review?missionId=${encodeURIComponent(missionId)}`;

    // 1) 클라이언트가 이미 '로그인 아님'이라고 아는 경우 즉시 로그인으로
    if (!authUser) {
      navigate(`${loginRoute}?next=${encodeURIComponent(reviewPath)}`);
      return;
    }

    // 2) (선택) 서버 세션 확인 – 실패하면 로그인으로 보냄
    try {
      setChecking(true);
      await api.get("/itda/me"); // 200이면 세션 유효
      navigate(reviewPath, {
        state: {
          missionId,
          title,
          storeName,
          storeAddr,
          from: location.pathname + location.search,
        },
      });
    } catch {
      navigate(`${loginRoute}?next=${encodeURIComponent(reviewPath)}`);
    } finally {
      setChecking(false);
    }
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
          <span className="label">매장명</span>
          <span className="value">{storeName}</span>
        </div>

        <div className="row">
          <span className="label">주소</span>
          <span className="value">{storeAddr}</span>
        </div>

        {desc && (
          <div className="desc">
            <div className="label">설명</div>
            <div className="value">{desc}</div>
          </div>
        )}

        <div className="actions">
          <button
            type="button"
            className="event-btn primary"
            onClick={goToReview}
            disabled={!missionId || checking}
            aria-disabled={!missionId || checking}
            title={
              missionId
                ? checking
                  ? "확인 중…"
                  : "이 미션에 대한 리뷰 작성"
                : "미션 ID가 없어 이동할 수 없습니다"
            }
          >
            {checking ? "확인 중…" : "리뷰 작성"}
          </button>
        </div>
      </div>
    </div>
  );
}
