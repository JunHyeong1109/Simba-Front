import { useEffect, useMemo, useState } from "react";
import api from "../../api"; // 경로는 프로젝트에 맞게 조정
import "./Review.css";

export default function ReviewPage() {
  // 로그인 유저 불러오기 (/itda/me 기준)
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // 작성 가능 여부: REVIEWER만 가능
  const isReviewer = (user?.role || "").toString().toUpperCase() === "REVIEWER";

  // 리뷰 상태
  const [reviews, setReviews] = useState([]);

  // 입력 상태
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [image, setImage] = useState(null); // { file, previewUrl }

  // 정렬 상태: latest | rating
  const [sortBy, setSortBy] = useState("latest");

  // 미리보기 모달
  const [previewOpen, setPreviewOpen] = useState(false);

  // 유저 정보 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/itda/me");
        if (alive) setUser(data || null);
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoadingUser(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 별점 클릭
  const handleStarClick = (value) => setRating(value);

  // 이미지 업로드 & preview URL 생성
  useEffect(() => {
    // 정리: 이전 URL revoke
    return () => {
      if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    };
  }, [image?.previewUrl]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImage(null);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImage({ file, previewUrl });
  };

  // KST 날짜 포맷: YYYY.MM.DD
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

  // 리뷰 등록 (로컬 상태만; 실제 서버 등록은 API 맞춰 연결)
  const handleAddReview = () => {
    if (!isReviewer) return; // 가드
    if (!text.trim() || rating === 0) return;

    const now = Date.now();
    const newReview = {
      id: now,           // key
      ts: now,           // 정렬 기준 timestamp
      name: user?.nickname || user?.username || user?.name || "사용자",
      text: text.trim(),
      rating,
      date: formatKSTDate(new Date(now)),
      image: image?.previewUrl || null, // 저장은 서버 업로드 후 URL로 교체 권장
    };

    setReviews((prev) => [newReview, ...prev]);
    setText("");
    setRating(0);
    setImage(null);
  };

  // 정렬된 리뷰 목록(파생값)
  const sortedReviews = useMemo(() => {
    const list = [...reviews];
    if (sortBy === "rating") {
      list.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (b.ts || 0) - (a.ts || 0); // 별점 같으면 최신 우선
      });
    } else {
      // latest
      list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    }
    return list;
  }, [reviews, sortBy]);

  return (
    <div className="review-page">
      {/* 상단 툴바: 제목 + 정렬 */}
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
        {sortedReviews.length === 0 ? (
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
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </div>
                <div className="review-text">{review.text}</div>
                {review.image && (
                  <img
                    src={review.image}
                    alt="리뷰 이미지"
                    className="review-image"
                    loading="lazy"
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 작성 영역: REVIEWER만 활성화 */}
      <div className={`review-input-container ${!isReviewer ? "disabled" : ""}`}>
        {loadingUser ? (
          <div className="review-guard">사용자 정보를 불러오는 중…</div>
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

        {/* 텍스트 입력 */}
        <input
          type="text"
          placeholder="리뷰를 작성해주세요"
          className="review-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddReview()}
          disabled={!isReviewer}
        />

        {/* 이미지 업로드 + 미리보기 */}
        <div className="review-file-row">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="review-file"
            disabled={!isReviewer}
          />
          <button
            type="button"
            className="preview-btn"
            onClick={() => setPreviewOpen(true)}
            disabled={!isReviewer || !image}
          >
            미리보기
          </button>
          {image?.file && (
            <span className="file-name" title={image.file.name}>
              {image.file.name}
            </span>
          )}
        </div>

        <button onClick={handleAddReview} className="review-button" disabled={!isReviewer}>
          등록
        </button>
      </div>

      {/* 미리보기 모달 */}
      {previewOpen && image?.previewUrl && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setPreviewOpen(false)}
          tabIndex={-1}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={image.previewUrl} alt="업로드 이미지 미리보기" />
            <button
              type="button"
              className="modal-close"
              onClick={() => setPreviewOpen(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
