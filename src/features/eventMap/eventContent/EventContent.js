import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import api from "../../../api";
import "./EventContent.css";

export default function EventContent({ selected, loginRoute = "/login" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const outletCtx = useOutletContext();
  const authUser = outletCtx?.user || null;

  // 모달/리뷰 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [missions, setMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsErr, setMissionsErr] = useState("");
  const [selectedMissionId, setSelectedMissionId] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsErr, setReviewsErr] = useState("");

  // 파생값 (selected 없어도 안전)
  const mission = selected?.mission || selected || {};
  const store = mission?.store || selected?.store || {};

  const poster =
    mission.imgUrl ||
    mission.posterUrl ||
    mission.poster ||
    mission.iamegUrl ||
    mission.thumbnailUrl ||
    "";

  const title = mission.title || "미션";
  const desc = mission.description || mission.desc || "";
  const start = mission.startAt || mission.startDate || "";
  const end = mission.endAt || mission.endDate || "";
  const rewardContent = mission.rewardContent || mission.rewardName || "";

  const reward =
    mission.rewardRemainingCount ??
    mission.rewardCount ??
    mission.reward ??
    mission.quantity ??
    mission.rewardQty ??
    null;

  const storeName = store.storeName || store.name || mission.storeName || "-";
  const storeAddr =
    selected?.address?.road ||
    store.address ||
    mission.address ||
    selected?.address?.jibun ||
    "-";

  const missionId =
    mission.id ??
    mission.missionId ??
    mission.missionID ??
    selected?.id ??
    selected?.missionId ??
    selected?.missionID ??
    null;

  const storeId =
    store.id ??
    store.storeId ??
    mission.storeId ??
    mission.store?.id ??
    selected?.storeId ??
    null;

  const fmtDate = (d) => {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
    } catch {}
    return String(d).slice(0, 10);
  };

  const goToReview = () => {
    if (!missionId) {
      alert("미션 ID가 없어 리뷰 페이지로 이동할 수 없습니다.");
      return;
    }
    const reviewPath = `/itda/review?missionId=${encodeURIComponent(missionId)}`;
    if (!authUser) {
      navigate(`${loginRoute}?next=${encodeURIComponent(reviewPath)}`);
      return;
    }
    navigate(reviewPath, {
      state: {
        missionId,
        title,
        storeName,
        storeAddr,
        from: location.pathname + location.search,
      },
    });
  };

  const openModal = () => {
    if (!storeId) {
      alert("매장 ID를 확인할 수 없습니다.");
      return;
    }
    setModalOpen(true);
  };

  const normalizeMission = (m) => {
    const mid = m.id ?? m.missionId ?? m.missionID ?? null;
    const mTitle = m.title || "미션";
    const mStart = m.startAt || m.startDate || null;
    const mEnd = m.endAt || m.endDate || null;
    return {
      id: mid,
      title: mTitle,
      label: `${mTitle}${mStart || mEnd ? ` (${fmtDate(mStart)} ~ ${fmtDate(mEnd)})` : ""}`,
      start: mStart,
      end: mEnd,
    };
  };

  useEffect(() => {
    if (!modalOpen || !storeId) return;
    let alive = true;
    (async () => {
      setMissionsLoading(true);
      setMissionsErr("");
      setMissions([]);
      setSelectedMissionId(null);
      try {
        let list = [];
        try {
          const { data } = await api.get("/itda/missions", { params: { storeId } });
          list = Array.isArray(data) ? data : data?.items || [];
        } catch {
          try {
            const { data } = await api.get(`/itda/stores/${storeId}/missions`);
            list = Array.isArray(data) ? data : data?.items || [];
          } catch {
            const { data } = await api.get("/itda/missions/joinable");
            const all = Array.isArray(data) ? data : data?.items || [];
            list = all.filter((m) => {
              const sid = m.storeId ?? m.store?.id ?? m.store?.storeId;
              return String(sid) === String(storeId);
            });
          }
        }
        const normalized = list.map(normalizeMission);
        if (!alive) return;
        setMissions(normalized);
        const foundSame = normalized.find((m) => String(m.id) === String(missionId));
        setSelectedMissionId(foundSame?.id ?? normalized[0]?.id ?? null);
      } catch (e) {
        if (!alive) return;
        setMissions([]);
        setMissionsErr(e?.response?.data?.message || "미션 목록을 불러오지 못했습니다.");
      } finally {
        if (alive) setMissionsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [modalOpen, storeId, missionId]);

  const normalizeReview = (r) => {
    const userName =
      r.userName || r.username || r.nickname || r.user?.name || "사용자";
    const ratingRaw = r.rating ?? r.stars ?? 0;
    const rating = typeof ratingRaw === "number" ? ratingRaw : Number(ratingRaw) || 0;
    const text = r.text ?? r.content ?? "";
    const id = r.id ?? r.reviewId ?? r._id ?? Math.random().toString(36).slice(2);
    return { id, userName, rating, text };
  };

  const fetchReviews = useCallback(async () => {
    if (!selectedMissionId) {
      setReviews([]);
      return;
    }
    setReviewsLoading(true);
    setReviewsErr("");
    const tryCalls = [
      async () =>
        api
          .get("/itda/reviews", {
            params: { missionId: selectedMissionId, status: "APPROVED" },
          })
          .then(({ data }) => (Array.isArray(data) ? data : data?.items || data?.content || [])),
      async () =>
        api
          .get(`/itda/missions/${selectedMissionId}/reviews`, {
            params: { status: "APPROVED" },
          })
          .then(({ data }) => (Array.isArray(data) ? data : data?.items || data?.content || [])),
    ];
    let rows = [];
    for (const call of tryCalls) {
      try {
        rows = await call();
        if (rows && rows.length >= 0) break;
      } catch {}
    }
    setReviews(rows.map(normalizeReview));
    setReviewsLoading(false);
  }, [selectedMissionId]);

  useEffect(() => {
    if (!modalOpen) return;
    fetchReviews();
  }, [modalOpen, selectedMissionId, fetchReviews]);

  const hasMission = !!missionId;

  // 선택 전: 안내
  if (!selected) {
    return (
      <div className="event-detail empty">
        <span className="placeholder">매장을 선택해주세요.</span>
      </div>
    );
  }

  return (
    <div className="event-detail">
      {/* 우상단: 매장 리뷰 보기 */}
      <div className="event-floating-actions">
        <button
          type="button"
          className="event-btn ghost"
          onClick={openModal}
          disabled={!storeId}
          title={storeId ? "이 매장의 리뷰 보기" : "매장 정보가 없습니다"}
        >
          매장 리뷰 보기
        </button>
      </div>

      {/* 좌측 포스터 */}
      <div className="poster-col">
        {poster ? (
          <img src={poster} alt={`${title} 포스터`} className="poster-img" />
        ) : (
          <div className="poster-placeholder">포스터 없음</div>
        )}
      </div>

      {/* 우측 정보 */}
      <div className="info-col">
        <div className="title">{hasMission ? title : storeName}</div>

        <div className="row">
          <span className="label">기간</span>
          <span className="value">
            {hasMission ? (
              <>
                {fmtDate(start)} ~ {fmtDate(end)}
              </>
            ) : (
              <>-</>
            )}
          </span>
        </div>

        <div className="row">
          <span className="label">보상 내용</span>
          <span className="value">{hasMission ? (rewardContent || "-") : "-"}</span>
        </div>

        <div className="row">
          <span className="label">보상 수량</span>
          <span className="value">{hasMission ? (reward ?? "-") : "-"}</span>
        </div>

        <div className="row">
          <span className="label">매장명</span>
          <span className="value">{storeName}</span>
        </div>

        <div className="row">
          <span className="label">주소</span>
          <span className="value">{storeAddr}</span>
        </div>

        {hasMission ? (
          desc && (
            <div className="desc">
              <div className="label">설명</div>
              <div className="value">{desc}</div>
            </div>
          )
        ) : (
          <div className="desc">
            <div className="label">안내</div>
            <div className="value">현재 가능한 미션이 없습니다.</div>
          </div>
        )}

        <div className="actions">
          <button
            type="button"
            className="event-btn primary"
            onClick={goToReview}
            disabled={!missionId}
            title={missionId ? "이 미션에 대한 리뷰 작성" : "미션 ID가 없어 이동할 수 없습니다"}
          >
            리뷰 작성
          </button>
        </div>
      </div>

      {/* 리뷰 모달 */}
      {modalOpen && (
        <div
          className="rv-modal-backdrop"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="rv-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="rv-modal-head">
              <strong>매장 리뷰 보기</strong>
              <button type="button" onClick={() => setModalOpen(false)} className="event-btn ghost">
                닫기
              </button>
            </div>

            {/* 셀렉터 (sticky) */}
            <div className="rv-modal-controls">
              <div style={{ fontWeight: 600 }}>{storeName}</div>
              <div style={{ marginLeft: "auto" }}>
                {missionsLoading ? (
                  <span style={{ color: "#666" }}>미션 목록 불러오는 중…</span>
                ) : missionsErr ? (
                  <span style={{ color: "#c00" }}>{missionsErr}</span>
                ) : missions.length === 0 ? (
                  <span style={{ color: "#666" }}>등록된 미션이 없습니다.</span>
                ) : (
                  <select
                    className="event-input"
                    value={selectedMissionId || ""}
                    onChange={(e) => setSelectedMissionId(e.target.value || null)}
                  >
                    {missions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 본문 (스크롤, 5개 정도 보이는 높이) */}
            <div className="rv-modal-body">
              {reviewsLoading && reviews.length === 0 ? (
                <div style={{ color: "#666" }}>리뷰 불러오는 중…</div>
              ) : reviewsErr ? (
                <div style={{ color: "#c00" }}>{reviewsErr}</div>
              ) : !selectedMissionId ? (
                <div style={{ color: "#666" }}>미션을 선택하세요.</div>
              ) : reviews.length === 0 ? (
                <div style={{ color: "#666" }}>표시할 리뷰가 없습니다.</div>
              ) : (
                <div className="rv-review-list">
                  {reviews.map((r) => (
                    <article key={r.id} className="rv-review-card">
                      <div className="rv-review-top">
                        <strong>{r.userName}</strong>
                        <span aria-label={`별점 ${r.rating}점`}>
                          {"★".repeat(Math.max(0, Math.floor(r.rating || 0)))}
                          {"☆".repeat(Math.max(0, 5 - Math.floor(r.rating || 0)))}
                        </span>
                      </div>
                      {r.text && <p className="rv-review-text">{r.text}</p>}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
