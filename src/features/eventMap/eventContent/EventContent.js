// src/features/eventMap/eventContent/EventContent.js
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import api from "../../../api";
import "./EventContent.css";

export default function EventContent({ selected, loginRoute = "/login" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const outletCtx = useOutletContext();
  const authUser = outletCtx?.user || null;

  // ── 모달 & 리뷰 상태 (가게 전체 리뷰 전용)
  const [modalOpen, setModalOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsErr, setReviewsErr] = useState("");

  // ── 이미지 뷰어(라이트박스)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState("");

  // ── 파생값 (selected 없어도 안전)
  const mission = selected?.mission || selected || {};
  const store = mission?.store || selected?.store || {};

  const poster =
    mission.imgUrl ||
    mission.posterUrl ||
    mission.poster ||
    mission.imageUrl ||
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
    const reviewPath = `/review?missionId=${encodeURIComponent(missionId)}`;
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

  // 리뷰 정규화: 이미지들까지 추출
  const normalizeReview = (r) => {
    const userName =
      r.userName || r.username || r.nickname || r.user?.name || "사용자";
    const ratingRaw = r.rating ?? r.stars ?? 0;
    const rating =
      typeof ratingRaw === "number" ? ratingRaw : Number(ratingRaw) || 0;
    const text = r.text ?? r.content ?? "";
    const id =
      r.id ?? r.reviewId ?? r._id ?? Math.random().toString(36).slice(2);

    // 다양한 키에서 이미지 배열 생성
    let images = [];
    if (Array.isArray(r.images)) images = r.images.filter(Boolean);
    else if (Array.isArray(r.photos)) images = r.photos.filter(Boolean);
    else if (Array.isArray(r.imgUrls)) images = r.imgUrls.filter(Boolean);
    else if (r.imgUrl || r.imageUrl || r.photoUrl) {
      images = [r.imgUrl || r.imageUrl || r.photoUrl].filter(Boolean);
    }

    return { id, userName, rating, text, images };
  };

  // 🔎 모달 오픈 시, 가게 전체 리뷰 로드 (/itda/reviews?storeId=...)
  useEffect(() => {
    if (!modalOpen || !storeId) return;
    let alive = true;
    (async () => {
      setReviewsLoading(true);
      setReviewsErr("");
      try {
        const { data } = await api.get("/itda/reviews", { params: { storeId } });
        const rows = Array.isArray(data)
          ? data
          : data?.items || data?.content || [];
        if (!alive) return;
        setReviews(rows.map(normalizeReview));
      } catch (e) {
        if (!alive) return;
        setReviews([]);
        setReviewsErr(
          e?.response?.data?.message || "리뷰를 불러오지 못했습니다."
        );
      } finally {
        if (alive) setReviewsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [modalOpen, storeId]);

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
          <span className="value">
            {hasMission ? rewardContent || "-" : "-"}
          </span>
        </div>

        <div className="row">
          <span className="label">보상 수량</span>
          <span className="value">{hasMission ? reward ?? "-" : "-"}</span>
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
            title={
              missionId
                ? "이 미션에 대한 리뷰 작성"
                : "미션 ID가 없어 이동할 수 없습니다"
            }
          >
            리뷰 작성
          </button>
        </div>
      </div>

      {/* 리뷰 모달 (가게 전체 리뷰) */}
      {modalOpen && (
        <div
          className="rv-modal-backdrop"
          onClick={() => setModalOpen(false)}
        >
          <div className="rv-modal" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="rv-modal-head">
              <strong>매장 리뷰 보기</strong>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="event-btn ghost"
              >
                닫기
              </button>
            </div>

            {/* 본문 */}
            <div className="rv-modal-body">
              {reviewsLoading && reviews.length === 0 ? (
                <div style={{ color: "#666" }}>리뷰 불러오는 중…</div>
              ) : reviewsErr ? (
                <div style={{ color: "#c00" }}>{reviewsErr}</div>
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

                      {Array.isArray(r.images) && r.images.length > 0 && (
                        <div className="rv-images-grid">
                          {r.images.map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt="리뷰 이미지"
                              className="rv-image"
                              loading="lazy"
                              onClick={() => {
                                setViewerSrc(src);
                                setViewerOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 라이트박스(큰 이미지) */}
          {viewerOpen && (
            <div
              className="rv-viewer-backdrop"
              onClick={() => setViewerOpen(false)}
            >
              <div className="rv-viewer" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="rv-viewer-close"
                  aria-label="닫기"
                  onClick={() => setViewerOpen(false)}
                />
                {viewerSrc && (
                  <img
                    src={viewerSrc}
                    alt="리뷰 큰 이미지"
                    className="rv-viewer-img"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
