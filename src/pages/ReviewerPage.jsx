import { useState } from "react";
import "./ReviewerPage.css"; // CSS 파일 연결

export default function ReviewPage() {
  // 로그인된 사용자 (실제로는 로그인 로직에서 받아와야 함)
  const [user] = useState({ id: 1, nickname: "홍길동" });

  const [reviews, setReviews] = useState([]);
  const [text, setText] = useState("");

  const handleAddReview = () => {
    if (!text.trim()) return;

    const today = new Date();

    // 한국 시간으로 변환 (UTC +9)
    const kstOffset = 9 * 60; // 분 단위
    const kstTime = new Date(today.getTime() + kstOffset * 60 * 1000);

    // 날짜 형식: YYYY.MM.DD
    const formattedDate = kstTime.toISOString().slice(0, 10).replace(/-/g, ".");

    const newReview = {
      id: Date.now(),
      name: user.nickname,
      text,
      date: formattedDate,
    };

    setReviews([newReview, ...reviews]); // 최신순
    setText("");
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
                <div className="review-text">{review.text}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 입력창 */}
      <div className="review-input-container">
        <input
          type="text"
          placeholder="리뷰를 작성해주세요"
          className="review-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddReview()}
        />
        <button onClick={handleAddReview} className="review-button">↑</button>
      </div>
    </div>
  );
}
