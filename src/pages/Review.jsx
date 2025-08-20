// src/pages/Review.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // 페이지 이동
import "./Review.css";

const Review = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const userId = 1; // ✅ 로그인된 사용자 ID (임시)

  // 사용자 리뷰 목록 불러오기
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/itda/reviews?userId=${userId}`);
        if (!response.ok) throw new Error("리뷰 목록을 불러오는데 실패했습니다.");
        const data = await response.json();

        // ⚠️ API 응답 구조에 맞게 수정 필요
        setReviews(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [userId]);

  if (loading) return <div className="loading">로딩 중...</div>;

  // 모든 보상 합치기
  const allRewards = reviews.flatMap((rev) => rev.rewards || []);

  return (
    <div className="review-page">
      {/* 헤더 (프로필 아이콘) */}
      <div className="review-header">
        <div
          className="account-icon"
          onClick={() => navigate("/mypage")}
          title="마이페이지"
        >
          👤
        </div>
      </div>

      <div className="content">
        {/* 왼쪽 리뷰 목록 */}
        <div className="review-section">
          <h2 className="section-title">리뷰 목록</h2>
          {reviews.length === 0 ? (
            <div className="empty">작성한 리뷰가 없습니다.</div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="review-card">
                <div className="store-name">{rev.storeName}</div>
                <div className="store-address">{rev.address}</div>
                <div className="review-info">
                  <span className="review-date">{rev.date}</span>
                </div>
                <div className="review-text">{rev.reviewText}</div>
              </div>
            ))
          )}
        </div>

        {/* 오른쪽 보상 목록 */}
        <div className="reward-section">
          <h2 className="section-title">보상 목록</h2>
          {allRewards.length === 0 ? (
            <div className="empty">받은 보상이 없습니다.</div>
          ) : (
            allRewards.map((reward) => (
              <div key={reward.id} className="reward-card">
                <div className="reward-title">{reward.title}</div>
                <div className="reward-valid">사용기간 {reward.valid}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Review;
