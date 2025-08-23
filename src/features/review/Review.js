// src/pages/ReviewPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api";
import "./Review.css";

export default function ReviewPage() {
  // ───────────────── 파라미터(필수: missionId)
  const [params] = useSearchParams();
  const missionId = params.get("missionId");

  // ───────────────── 사용자
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const roleUp = (user?.role || "").toString().toUpperCase();
  const isReviewer = roleUp === "REVIEWER" || roleUp === "USER";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/itda/me", { withCredentials: true });
        if (alive) setUser(data || null);
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoadingUser(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ───────────────── 서버 리뷰 목록
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsErr, setReviewsErr] = useState("");

  const normalizeReview = (r) => {
    const name =
      r.userName || r.username || r.nickname || r.user?.name || "사용자";
    const rawRating = r.rating ?? r.stars ?? 0;
    const rating = typeof rawRating === "number" ? rawRating : Number(rawRating) || 0;
    const text = r.text ?? r.content ?? "";
    const ts = r.createdAt || r.updatedAt || r.created_at || r.ts || Date.now();
    const images =
      r.images ||
      r.imageUrls ||
      (r.imageUrl ? [r.imageUrl] : []) ||
      [];
    return {
      id: r.id ?? r.reviewId ?? r._id ?? Math.random().toString(36).slice(2),
      ts: new Date(ts).valueOf() || Date.now(),
      name,
      text,
      rating,
      date: formatKSTDate(new Date(ts)),
      images: Array.isArray(images) ? images : [],
    };
  };

  const fetchReviews = useCallback(async () => {
    if (!missionId) {
      setReviews([]);
      return;
    }
    setLoadingReviews(true);
    setReviewsErr("");
    let rows = [];
    const tryCalls = [
      async () =>
        api
          .get(`/itda/missions/${missionId}/reviews`, { withCredentials: true })
          .then(({ data }) => (Array.isArray(data) ? data : data?.items || data?.content || [])),
      async () =>
        api
          .get(`/itda/reviews`, { params: { missionId }, withCredentials: true })
          .then(({ data }) => (Array.isArray(data) ? data : data?.items || data?.content || [])),
    ];
    for (const call of tryCalls) {
      try {
        rows = await call();
        break;
      } catch (e) {
        // try next
      }
    }
    try {
      setReviews(rows.map(normalizeReview));
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }, [missionId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ───────────────── 작성 상태
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);

  // 🔹 선택 이미지(최대 10장)
  //    각 항목: { id: string, file: File, previewUrl: string }
  const [images, setImages] = useState([]);

  // ───────────────── 갤러리 모달 (하단 시트)
  // mode: 'preview' | 'delete'
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryMode, setGalleryMode] = useState("preview");
  const [galleryIndex, setGalleryIndex] = useState(0);

  // ───────────────── 유틸
  const formatKSTDate = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value || "";
    const m = parts.find((p) => p.type === "month")?.value || "";
    const d = parts.find((p) => p.type === "day")?.value || "";
    return `${y}.${m}.${d}`;
  };

  const handleStarClick = (v) => setRating(v);

  // 파일 추가 (여러 장)
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remain = Math.max(0, 10 - images.length);
    const slice = files.slice(0, remain);

    if (slice.length < files.length) {
      alert("이미지는 최대 10장까지 업로드할 수 있습니다.");
    }

    const next = slice.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...next]);
    e.target.value = ""; // 같은 파일 다시 선택 가능하도록 초기화
  };

  // 이미지 전체 URL 정리 (언마운트 시)
  useEffect(() => {
    return () => {
      images.forEach((img) => img.previewUrl && URL.revokeObjectURL(img.previewUrl));
    };
  }, [images]);

  // 갤러리 열기
  const openGallery = (mode = "preview") => {
    if (images.length === 0) return;
    setGalleryMode(mode);
    setGalleryIndex(0);
    setGalleryOpen(true);
  };

  // 갤러리 닫기 (오직 X 버튼으로만 닫음)
  const closeGallery = () => setGalleryOpen(false);

  // 갤러리 탐색
  const prevImage = () => {
    if (images.length === 0) return;
    setGalleryIndex((i) => (i - 1 + images.length) % images.length);
  };
  const nextImage = () => {
    if (images.length === 0) return;
    setGalleryIndex((i) => (i + 1) % images.length);
  };

  // 현재 보이는 이미지 삭제
  const deleteCurrentImage = () => {
    if (images.length === 0) return;
    const idx = galleryIndex;
    const tgt = images[idx];
    if (tgt?.previewUrl) URL.revokeObjectURL(tgt.previewUrl);

    const newArr = images.filter((_, i) => i !== idx);
    setImages(newArr);

    if (newArr.length === 0) {
      setGalleryOpen(false);
      return;
    }
    setGalleryIndex((i) => (idx >= newArr.length ? newArr.length - 1 : idx));
  };

  // 리뷰 등록 (서버 전송)
  const handleAddReview = async () => {
    if (!missionId) {
      alert("잘못된 접근입니다. (missionId 없음)");
      return;
    }
    if (!isReviewer) return;
    if (!text.trim() || rating === 0) return;

    try {
      const form = new FormData();
      form.append("text", text.trim());
      form.append("rating", String(rating));
      // 이미지 여러 장: 같은 필드명으로 반복 append
      images.forEach((img) => {
        if (img.file) form.append("images", img.file, img.file.name);
      });

      await api.post(`/itda/missions/${encodeURIComponent(missionId)}/reviews`, form, {
        withCredentials: true, // 세션 쿠키 필요 시
        // Content-Type은 axios가 자동으로 multipart/form-data + boundary 지정
      });

      // 성공 → 리스트 재조회 & 입력 초기화
      await fetchReviews();
      setText("");
      setRating(0);
      images.forEach((img) => img.previewUrl && URL.revokeObjectURL(img.previewUrl));
      setImages([]);
      alert("리뷰가 등록되었습니다.");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "리뷰 등록 중 오류가 발생했습니다.";
      alert(msg);
    }
  };

  // 정렬 파생값
  const [sortBy, setSortBy] = useState("latest"); // latest | rating
  const sortedReviews = useMemo(() => {
    const list = [...reviews];
    if (sortBy === "rating") {
      list.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (b.ts || 0) - (a.ts || 0);
      });
    } else {
      list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    }
    return list;
  }, [reviews, sortBy]);

  const filesCountLabel = images.length ? `${images.length}개 선택됨` : "선택된 이미지 없음";

  return (
    <div className="review-page">
      {/* 상단 툴바 */}
      <div className="review-toolbar">
        <h2 className="review-title">전체 리뷰</h2>

        <div className="review-sort">
          <label htmlFor="sort" className="sr-only">정렬</label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="review-sort-select"
          >
            <option value="latest">최신순</option>
            <option value="rating">별점순</option>
          </select>
        </div>
      </div>

      {/* 리뷰 목록 */}
      <div className="review-list">
        {loadingReviews ? (
          <p className="review-empty">불러오는 중…</p>
        ) : reviewsErr ? (
          <p className="review-empty">{reviewsErr}</p>
        ) : sortedReviews.length === 0 ? (
          <p className="review-empty">아직 리뷰가 없습니다.</p>
        ) : (
          sortedReviews.map((review) => (
            <div key={review.id} className="review-item">
              <div className="review-avatar" aria-hidden>👤</div>
              <div className="review-content">
                <div className="review-top">
                  <span className="review-name">{review.name}</span>
                  <span className="review-date">{review.date}</span>
                </div>
                <div className="review-stars readonly" aria-label={`별점 ${review.rating}점`}>
                  {"★".repeat(Math.max(0, review.rating))}
                  {"☆".repeat(Math.max(0, 5 - review.rating))}
                </div>
                <div className="review-text">{review.text}</div>

                {Array.isArray(review.images) && review.images.length > 0 && (
                  <div className="review-images-grid">
                    {review.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt="리뷰 이미지"
                        className="review-image"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 입력 영역 */}
      <div className={`review-input-container ${!isReviewer || !missionId ? "disabled" : ""}`}>
        {loadingUser ? (
          <div className="review-guard">사용자 정보를 불러오는 중…</div>
        ) : !missionId ? (
          <div className="review-guard">잘못된 접근입니다. (missionId가 없습니다)</div>
        ) : !isReviewer ? (
          <div className="review-guard">리뷰어만 리뷰를 작성할 수 있습니다.</div>
        ) : null}

        {/* 별점 선택 */}
        <div className="star-rating" role="radiogroup" aria-label="별점 선택">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={value <= rating ? "star filled" : "star"}
              onClick={() => handleStarClick(value)}
              aria-pressed={value <= rating}
              aria-label={`${value}점`}
            >
              ★
            </button>
          ))}
        </div>

        {/* 텍스트 입력 → textarea로 변경(엔터로 줄바꿈, 마우스 리사이즈 불가) */}
        <textarea
          placeholder="리뷰를 작성해주세요"
          className="review-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!isReviewer || !missionId}
          rows={5}
        />

        {/* 파일 업로드 + 미리보기/삭제 */}
        <div className="review-file-row">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="review-file"
            disabled={!isReviewer || !missionId || images.length >= 10}
            title="최대 10장까지 선택 가능"
          />
          <button
            type="button"
            className="preview-btn"
            onClick={() => openGallery("preview")}
            disabled={!isReviewer || images.length === 0}
          >
            미리보기
          </button>
          <button
            type="button"
            className="preview-btn danger"
            onClick={() => openGallery("delete")}
            disabled={!isReviewer || images.length === 0}
          >
            삭제
          </button>
          <span className="file-name" aria-live="polite">{filesCountLabel}</span>
        </div>

        <button onClick={handleAddReview} className="review-button" disabled={!isReviewer || !missionId}>
          등록
        </button>
      </div>

      {/* 하단 갤러리 모달 (X로만 닫힘) — 사이즈 축소 */}
      {galleryOpen && images.length > 0 && (
        <div className="gallery-overlay" aria-modal="true" role="dialog">
          <div className="gallery-sheet small" role="document">
            <div className="gallery-header">
              <span className="gallery-title">
                {galleryMode === "delete" ? "이미지 삭제" : "이미지 미리보기"}
              </span>
              <button
                type="button"
                className="gallery-close"
                aria-label="닫기"
                onClick={closeGallery}
              />
            </div>

            <div className="gallery-body">
              <button
                type="button"
                className="gallery-nav left"
                onClick={prevImage}
                aria-label="이전 이미지"
              >
                ‹
              </button>

              <img
                src={images[galleryIndex]?.previewUrl}
                alt={`선택 이미지 ${galleryIndex + 1}/${images.length}`}
                className="gallery-image small"
              />

              <button
                type="button"
                className="gallery-nav right"
                onClick={nextImage}
                aria-label="다음 이미지"
              >
                ›
              </button>
            </div>

            <div className="gallery-footer">
              <div className="gallery-count">
                {galleryIndex + 1} / {images.length}
              </div>

              {galleryMode === "delete" && (
                <button
                  type="button"
                  className="delete-btn"
                  onClick={deleteCurrentImage}
                >
                  삭제하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
