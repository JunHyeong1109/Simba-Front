// src/features/eventMap/eventContent/EventContent.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import api, { BASE_URL } from "../../../api";
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
  const [viewerReviewIdx, setViewerReviewIdx] = useState(0);
  const [viewerImageIdx, setViewerImageIdx] = useState(0);

  // ── 리뷰 본문 펼침/접힘 상태 (id 기반)
  const [expandedReviews, setExpandedReviews] = useState(() => new Set());
  const toggleReviewExpand = (id) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  // ───────── helpers: 이미지 URL 절대주소화
  const makeAbsoluteUrl = (u) => {
    if (!u) return "";
    const s = String(u).trim();
    if (!s) return "";
    if (/^(https?:)?\/\//i.test(s) || /^data:image\//i.test(s)) return s;
    const base = (BASE_URL || "").trim();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const prefix = base || origin || "";
    return `${prefix.replace(/\/+$/, "")}/${s.replace(/^\/+/, "")}`;
  };

  // 리뷰 정규화: 이미지들까지 추출 + 절대URL 변환
  const normalizeReview = (r) => {
    const userName =
      r.userName || r.username || r.nickname || r.user?.name || "사용자";
    const ratingRaw = r.rating ?? r.stars ?? 0;
    const rating =
      typeof ratingRaw === "number" ? ratingRaw : Number(ratingRaw) || 0;
    const text = r.text ?? r.content ?? "";
    const id =
      r.id ?? r.reviewId ?? r._id ?? Math.random().toString(36).slice(2);

    let images = [];
    if (Array.isArray(r.images)) images = r.images.filter(Boolean);
    else if (Array.isArray(r.photos)) images = r.photos.filter(Boolean);
    else if (Array.isArray(r.imgUrls)) images = r.imgUrls.filter(Boolean);
    else if (r.imgUrl || r.imageUrl || r.photoUrl) {
      images = [r.imgUrl || r.imageUrl || r.photoUrl].filter(Boolean);
    }

    const abs = Array.from(
      new Set(images.map((u) => makeAbsoluteUrl(u)).filter(Boolean))
    );

    return { id, userName, rating, text, images: abs };
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
        const normalized = rows.map(normalizeReview);
        setReviews(normalized);

        // 텍스트가 짧은 리뷰는 초기에 펼침 버튼을 숨기고 싶다면 여기서 처리 가능
        // (현재는 모두 접힘 상태로 시작)
        setExpandedReviews(new Set()); 
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

  // 뷰어 열기/닫기/이동
  const openViewerFor = (reviewIdx, imageIdx = 0) => {
    const r = reviews[reviewIdx];
    if (!r || !Array.isArray(r.images) || r.images.length === 0) return;
    setViewerReviewIdx(reviewIdx);
    setViewerImageIdx(Math.max(0, Math.min(imageIdx, r.images.length - 1)));
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);

  const currentImages = useMemo(() => {
    const r = reviews[viewerReviewIdx];
    return Array.isArray(r?.images) ? r.images : [];
  }, [reviews, viewerReviewIdx]);

  const prevViewerImage = () => {
    if (!currentImages.length) return;
    setViewerImageIdx((i) => (i - 1 + currentImages.length) % currentImages.length);
  };
  const nextViewerImage = () => {
    if (!currentImages.length) return;
    setViewerImageIdx((i) => (i + 1) % currentImages.length);
  };

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
          <img
            src={makeAbsoluteUrl(poster)}
            alt={`${title} 포스터`}
            className="poster-img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
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
                  {reviews.map((r, ri) => {
                    const isExpanded = expandedReviews.has(r.id);
                    return (
                      <article
                        key={r.id}
                        className={`rv-review-card ${r.images?.length ? "rv-clickable" : ""}`}
                        onClick={() => r.images?.length && openViewerFor(ri, 0)}
                        title={r.images?.length ? "이미지를 크게 보기" : undefined}
                      >
                        <div className="rv-review-top">
                          <strong className="rv-review-name">{r.userName}</strong>
                          <span className="rv-review-stars" aria-label={`별점 ${r.rating}점`}>
                            {"★".repeat(Math.max(0, Math.floor(r.rating || 0)))}
                            {"☆".repeat(Math.max(0, 5 - Math.floor(r.rating || 0)))}
                          </span>
                        </div>

                        {r.text && (
                          <div className={`rv-review-text-wrap ${isExpanded ? "expanded" : "collapsed"}`}>
                            <p
                              id={`rv-text-${r.id}`}
                              className={`rv-review-text ${isExpanded ? "" : "clamp-3"}`}
                            >
                              {r.text}
                            </p>

                            {/* 접힘일 때 시각적 힌트 (페이드) */}
                            {!isExpanded && <div className="rv-fade-tail" aria-hidden />}

                            <button
                              type="button"
                              className="rv-more-btn"
                              onClick={(e) => {
                                e.stopPropagation(); // 카드 onClick과 분리
                                toggleReviewExpand(r.id);
                              }}
                              aria-expanded={isExpanded}
                              aria-controls={`rv-text-${r.id}`}
                              title={isExpanded ? "접기" : "자세히 보기"}
                            >
                              {isExpanded ? "접기" : "자세히 보기"}
                            </button>
                          </div>
                        )}

                        {Array.isArray(r.images) && r.images.length > 0 && (
                          <div className="rv-images-grid">
                            {r.images.map((src, i) => (
                              <img
                                key={i}
                                src={src}
                                alt="리뷰 이미지"
                                className="rv-image"
                                loading="lazy"
                                onClick={(e) => {
                                  e.stopPropagation(); // 카드 onClick과 분리
                                  openViewerFor(ri, i);
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 라이트박스(큰 이미지) */}
          {viewerOpen && currentImages.length > 0 && (
            <div
              className="rv-viewer-backdrop"
              onClick={closeViewer}
            >
              <div className="rv-viewer" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="rv-viewer-close"
                  aria-label="닫기"
                  onClick={closeViewer}
                />
                <button
                  type="button"
                  className="rv-viewer-nav left"
                  aria-label="이전 이미지"
                  onClick={prevViewerImage}
                >
                  ‹
                </button>
                <img
                  src={currentImages[viewerImageIdx]}
                  alt={`리뷰 이미지 ${viewerImageIdx + 1}/${currentImages.length}`}
                  className="rv-viewer-img"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <button
                  type="button"
                  className="rv-viewer-nav right"
                  aria-label="다음 이미지"
                  onClick={nextViewerImage}
                >
                  ›
                </button>
                <div className="rv-viewer-count">
                  {viewerImageIdx + 1} / {currentImages.length}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
