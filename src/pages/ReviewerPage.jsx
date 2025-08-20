import { useState } from "react";
import "./ReviewerPage.css"; // CSS 파일 연결

export default function ReviewPage() {
  // 로그인된 사용자 (실제로는 로그인 로직에서 받아와야 함)
  const [user] = useState({ id: 1, nickname: "홍길동" });

  const [reviews, setReviews] = useState([]);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0); // 별점 저장
  const [image, setImage] = useState(null); // 이미지 저장

  // 별점 클릭
  const handleStarClick = (value) => {
    setRating(value);
  };

  // 이미지 업로드
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImage({ file, previewUrl });
    }
  };

  // 리뷰 등록
  const handleAddReview = () => {
    if (!text.trim() || rating === 0) return; // 내용과 별점 필수

    const today = new Date();
    const kstOffset = 9 * 60;
    const kstTime = new Date(today.getTime() + kstOffset * 60 * 1000);
    const formattedDate = kstTime.toISOString().slice(0, 10).replace(/-/g, ".");

    const newReview = {
      id: Date.now(),
      name: user.nickname,
      text,
      rating,
      date: formattedDate,
      image: image?.previewUrl || null,
    };

    setReviews([newReview, ...reviews]); // 최신순
    setText("");
    setRating(0);
    setImage(null);
  };

  return (
    <div className="review-page">
      <header className="review-header">
        <div className="logo">📢 보다 쉽고 빠른 매장 찾기!!</div>
        <div className="user">리뷰어 👤</div>
      </header>

      <h2 className="review-title">
        전체 리뷰 <span className="sort">최신순 ▼</span>
      </h2>

      <div className="review-list">
        {reviews.length === 0 ? (
          <p className="review-empty">아직 리뷰가 없습니다.</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="review-item">
              <div className="review-avatar">👤</div>
              <div className="review-content">
                <div className="review-top">
                  <span className="review-name">{review.name}</span>
                  <span className="review-date">{review.date}</span>
                </div>
                <div className="review-stars">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </div>
                <div className="review-text">{review.text}</div>
                {review.image && (
                  <img
                    src={review.image}
                    alt="리뷰 이미지"
                    className="review-image"
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 입력창 */}
      <div className="review-input-container">
        {/* 별점 선택 */}
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <span
              key={value}
              className={value <= rating ? "star filled" : "star"}
              onClick={() => handleStarClick(value)}
            >
              ★
            </span>
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
        />

        {/* 이미지 업로드 */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="review-file"
        />
        {image && (
          <img src={image.previewUrl} alt="미리보기" className="image-preview" />
        )}

        <button onClick={handleAddReview} className="review-button">
          등록
        </button>
      </div>
    </div>
  );
}
