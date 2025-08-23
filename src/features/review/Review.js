// src/pages/ReviewPage.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api";
import "./Review.css";

export default function ReviewPage() {
  const [params] = useSearchParams();
  const missionId = params.get("missionId");
  const navigate = useNavigate();

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

  // ───────── compose
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [images, setImages] = useState([]); // 로컬 프리뷰(최대 10장), 서버는 1장만 저장
  const fileInputRef = useRef(null);

  // preview modal
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryMode, setGalleryMode] = useState("preview");
  const [galleryIndex, setGalleryIndex] = useState(0);

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

  // ───────── submit (multipart/form-data + request(JSON) + image)
  const handleAddReview = async () => {
    if (!missionId) return alert("잘못된 접근입니다. (missionId 없음)");
    if (!isReviewer) return;

    const content = text.trim();
    if (content.length < 10) {
      alert("최소 10글자 이상 작성해야 합니다.");
      return;
    }
    if (rating === 0) {
      alert("별점을 선택해주세요.");
      return;
    }

    const url = `/itda/missions/${encodeURIComponent(missionId)}/reviews`;
    const firstFile = images[0]?.file || null;

    try {
      const formData = new FormData();

      // request JSON 본문 (@RequestPart("request"))
      const requestData = { content, rating: Number(rating) };
      const jsonBlob = new Blob([JSON.stringify(requestData)], { type: "application/json" });
      formData.append("request", jsonBlob, "request.json");

      // 선택 이미지(있으면) – 서버는 1장만 저장
      if (firstFile) formData.append("image", firstFile, firstFile.name);

      await api.post(url, formData, { withCredentials: true });

      alert("리뷰가 등록되었습니다.");
      navigate("/"); // 메인 페이지로 이동
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "리뷰 등록 중 오류가 발생했습니다.";
      alert(msg);
    }
  };

  const fileDisabled = !isReviewer || !missionId || images.length >= 10;
  const filesCountLabel = images.length
    ? `${images.length}개 선택됨 (서버 저장은 1장)`
    : "선택된 이미지 없음";

  return (
    <div className="review-page">
      {/* 상단 제목만 유지 */}
      <div className="review-toolbar">
        <h2 className="review-title">리뷰 작성</h2>
      </div>

      {/* 작성 영역만 표시 */}
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
          placeholder="리뷰를 작성해주세요. (최소 10글자)"
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

      {/* 하단 갤러리 모달 (미리보기/삭제) */}
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
