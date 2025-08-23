// src/pages/ReviewPage.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api";
import "./Review.css";

export default function ReviewPage() {
  const [params] = useSearchParams();
  const missionId = params.get("missionId");

  // ───────── util
  const safeId = (id) => String(id ?? "").trim();
  const makeMissionReviewUrl = (id) =>
    `/itda/missions/${encodeURIComponent(safeId(id))}/reviews`;

  // ───────── user
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

  // ───────── list (server)
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsErr, setReviewsErr] = useState("");

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

  // 백엔드 ReviewResponse → 화면 모델
  const normalizeReview = (r) => {
    const ratingNum = Math.max(
      0,
      Math.min(5, Math.floor(typeof r.rating === "number" ? r.rating : Number(r.rating) || 0))
    );
    const ts = r.createdAt || r.updatedAt || r.created_at || r.ts || Date.now();
    const imgOne = r.imgUrl ? [r.imgUrl] : [];
    const name =
      r.userName || r.username || r.nickname || (r.userId ? `사용자 #${r.userId}` : "사용자");

    return {
      id: r.id ?? r.reviewId ?? r._id ?? Math.random().toString(36).slice(2),
      ts: new Date(ts).valueOf() || Date.now(),
      name,
      text: r.content ?? "",     // ← content 사용
      rating: ratingNum,         // ← rating 정수(0~5)
      date: formatKSTDate(new Date(ts)),
      images: imgOne,            // ← 단일 imgUrl을 배열로 표시
    };
  };

  const fetchReviews = useCallback(async () => {
    const sid = safeId(missionId);
    if (!sid) {
      setReviews([]);
      setReviewsErr("잘못된 접근입니다. (missionId가 없습니다)");
      return;
    }
    setLoadingReviews(true);
    setReviewsErr("");
    try {
      let rows = [];
      const attempts = [
        async () =>
          api
            .get(makeMissionReviewUrl(sid), { withCredentials: true })
            .then(({ data }) => (Array.isArray(data) ? data : data?.items || data?.content || [])),
        async () =>
          api
            .get("/itda/reviews", { params: { missionId: sid }, withCredentials: true })
            .then(({ data }) => (Array.isArray(data) ? data : data?.items || data?.content || [])),
      ];
      for (const tryCall of attempts) {
        try {
          rows = await tryCall();
          break;
        } catch {
          /* try next */
        }
      }
      setReviews((rows || []).map(normalizeReview));
    } catch (e) {
      setReviews([]);
      setReviewsErr(e?.response?.data?.message || e?.message || "리뷰를 불러오지 못했습니다.");
    } finally {
      setLoadingReviews(false);
    }
  }, [missionId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // ───────── compose
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [images, setImages] = useState([]); // 로컬 프리뷰는 여러 장 유지(서버는 1장만 저장)
  const fileInputRef = useRef(null);

  // preview modal
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryMode, setGalleryMode] = useState("preview");
  const [galleryIndex, setGalleryIndex] = useState(0);

  const handleStarClick = (v) => setRating(v);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remain = Math.max(0, 10 - images.length);
    const slice = files.slice(0, remain);
    if (slice.length < files.length) alert("이미지는 최대 10장까지 업로드할 수 있습니다.");
    const next = slice.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...next]);
    e.target.value = "";
  };

  useEffect(() => () => {
    images.forEach((img) => img.previewUrl && URL.revokeObjectURL(img.previewUrl));
  }, [images]);

  const openGallery = (mode = "preview") => {
    if (!images.length) return;
    setGalleryMode(mode);
    setGalleryIndex(0);
    setGalleryOpen(true);
  };
  const closeGallery = () => setGalleryOpen(false);
  const prevImage = () => images.length && setGalleryIndex((i) => (i - 1 + images.length) % images.length);
  const nextImage = () => images.length && setGalleryIndex((i) => (i + 1) % images.length);
  const deleteCurrentImage = () => {
    if (!images.length) return;
    const idx = galleryIndex;
    const tgt = images[idx];
    if (tgt?.previewUrl) URL.revokeObjectURL(tgt.previewUrl);
    const arr = images.filter((_, i) => i !== idx);
    setImages(arr);
    if (!arr.length) setGalleryOpen(false);
    else setGalleryIndex(idx >= arr.length ? arr.length - 1 : idx);
  };

  // ───────── submit (백엔드 키 기준: content, rating, (단일) 이미지 → imgUrl)
  const handleAddReview = async () => {
    const sid = safeId(missionId);
    if (!sid) return alert("잘못된 접근입니다. (missionId 없음)");
    if (!isReviewer) return;
    if (!text.trim() || rating === 0) return;

    const url = makeMissionReviewUrl(sid);
    const firstFile = images[0]?.file || null;

    // 전송 시나리오:
    //  A) 파일 있음 → multipart + 파일 필드명 폴백(image → file → img)
    //  B) 파일 없음 → JSON { content, rating }
    const sendFD = (field) => {
      const fd = new FormData();
      fd.append("content", text.trim());
      fd.append("rating", String(rating));
      if (firstFile) fd.append(field, firstFile, firstFile.name);
      return api.post(url, fd, { withCredentials: true });
    };
    const sendJSON = () =>
      api.post(url, { content: text.trim(), rating }, { withCredentials: true });

    try {
      if (firstFile) {
        try {
          await sendFD("image");
        } catch (e1) {
          if (e1?.response?.status !== 400) throw e1;
          try {
            await sendFD("file");
          } catch (e2) {
            if (e2?.response?.status !== 400) throw e2;
            await sendFD("img");
          }
        }
      } else {
        await sendJSON();
      }

      await fetchReviews();
      setText("");
      setRating(0);
      images.forEach((img) => img.previewUrl && URL.revokeObjectURL(img.previewUrl));
      setImages([]);
      alert("리뷰가 등록되었습니다.");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "리뷰 등록 중 오류가 발생했습니다.";
      alert(msg);
    }
  };

  // ───────── sort
  const [sortBy, setSortBy] = useState("latest");
  const sortedReviews = useMemo(() => {
    const list = [...reviews];
    if (sortBy === "rating") {
      list.sort((a, b) => (b.rating !== a.rating ? b.rating - a.rating : (b.ts || 0) - (a.ts || 0)));
    } else {
      list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    }
    return list;
  }, [reviews, sortBy]);

  const filesCountLabel = images.length
    ? `${images.length}개 선택됨 (서버 저장은 1장)`
    : "선택된 이미지 없음";
  const fileDisabled = !isReviewer || !missionId || images.length >= 10;

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

      {/* 리뷰 리스트 */}
      <div className="review-list">
        {loadingReviews ? (
          <p className="review-empty">불러오는 중…</p>
        ) : reviewsErr ? (
          <p className="review-empty">{reviewsErr}</p>
        ) : sortedReviews.length === 0 ? (
          <p className="review-empty">아직 리뷰가 없습니다.</p>
        ) : (
          sortedReviews.map((r) => (
            <div key={r.id} className="review-item">
              <div className="review-avatar" aria-hidden>👤</div>
              <div className="review-content">
                <div className="review-top">
                  <span className="review-name">{r.name}</span>
                  <span className="review-date">{r.date}</span>
                </div>
                <div className="review-stars readonly" aria-label={`별점 ${r.rating}점`}>
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </div>
                <div className="review-text">{r.text}</div>

                {r.images.length > 0 && (
                  <div className="review-images-grid">
                    {r.images.map((src, i) => (
                      <img key={i} src={src} alt="리뷰 이미지" className="review-image" loading="lazy" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 작성 영역 */}
      <div className={`review-input-container ${!isReviewer || !missionId ? "disabled" : ""}`}>
        {loadingUser ? (
          <div className="review-guard">사용자 정보를 불러오는 중…</div>
        ) : !missionId ? (
          <div className="review-guard">잘못된 접근입니다. (missionId가 없습니다)</div>
        ) : !isReviewer ? (
          <div className="review-guard">리뷰어만 리뷰를 작성할 수 있습니다.</div>
        ) : null}

        {/* 별점 */}
        <div className="star-rating" role="radiogroup" aria-label="별점 선택">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              className={v <= rating ? "star filled" : "star"}
              onClick={() => setRating(v)}
              aria-pressed={v <= rating}
              aria-label={`${v}점`}
            >
              ★
            </button>
          ))}
        </div>

        {/* 내용 */}
        <textarea
          placeholder="리뷰를 작성해주세요."
          className="review-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!isReviewer || !missionId}
          rows={10}
        />

        {/* 파일 업로드(서버는 1장만 저장) */}
        <div className="review-file-row">
          <input
            ref={fileInputRef}
            id="review-file"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="review-file-input"
            disabled={fileDisabled}
            title="최대 10장까지 선택 가능 (서버 저장은 1장)"
          />

          <button
            type="button"
            className="review-file-btn"
            onClick={() => !fileDisabled && fileInputRef.current?.click()}
            disabled={fileDisabled}
          >
            <span className="btn-icon" aria-hidden>🖼️</span>
            이미지 선택
          </button>

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

      {/* 하단 갤러리 모달(축소) */}
      {galleryOpen && images.length > 0 && (
        <div className="gallery-overlay" aria-modal="true" role="dialog">
          <div className="gallery-sheet small" role="document">
            <div className="gallery-header">
              <span className="gallery-title">
                {galleryMode === "delete" ? "이미지 삭제" : "이미지 미리보기"}
              </span>
              <button type="button" className="gallery-close" aria-label="닫기" onClick={closeGallery} />
            </div>

            <div className="gallery-body">
              <button type="button" className="gallery-nav left" onClick={prevImage} aria-label="이전 이미지">‹</button>
              <img
                src={images[galleryIndex]?.previewUrl}
                alt={`선택 이미지 ${galleryIndex + 1}/${images.length}`}
                className="gallery-image small"
              />
              <button type="button" className="gallery-nav right" onClick={nextImage} aria-label="다음 이미지">›</button>
            </div>

            <div className="gallery-footer">
              <div className="gallery-count">{galleryIndex + 1} / {images.length}</div>
              {galleryMode === "delete" && (
                <button type="button" className="delete-btn" onClick={deleteCurrentImage}>삭제하기</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
