// src/features/mypage/MyPage.js
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../api";
import "./UserMyPage.css";

export default function MyPage() {
  const outletCtx = useOutletContext();
  const [user, setUser] = useState(outletCtx?.user || null);

  const [reviews, setReviews] = useState([]);
  const [rewards, setRewards] = useState([]);

  const [loadingUser, setLoadingUser] = useState(!outletCtx?.user);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingRewards, setLoadingRewards] = useState(false);

  // user가 Outlet에서 아직 없으면 /itda/me로 가져와서 채움
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (outletCtx?.user) {
          if (alive) {
            setUser(outletCtx.user);
            setLoadingUser(false);
          }
          return;
        }
        setLoadingUser(true);
        const { data } = await api.get("/itda/me");
        if (alive) setUser(data || null);
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoadingUser(false);
      }
    })();
    return () => { alive = false; };
  }, [outletCtx?.user]);

  // 리뷰 로드
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        setLoadingReviews(true);
        const { data } = await api.get("/itda/reviews", {
          params: { userId: user.id },
        });
        if (alive) setReviews(Array.isArray(data) ? data : data?.items || []);
      } catch {
        if (alive) setReviews([]);
      } finally {
        if (alive) setLoadingReviews(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  // 보상 로드
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        setLoadingRewards(true);
        const { data } = await api.get("/itda/rewards", {
          params: { userId: user.id },
        });
        if (alive) setRewards(Array.isArray(data) ? data : data?.items || []);
      } catch {
        if (alive) setRewards([]);
      } finally {
        if (alive) setLoadingRewards(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const displayName = user?.username || user?.name || user?.email || "사용자";

  return (
    <div className="mypage-root">
      {/* 상단 바 */}
      <header className="mypage-header">
        <h1 className="mypage-title">마이페이지<span className="mypage-subtitle"> (리뷰어)</span></h1>

        <div className="mypage-user">
          <div className="mypage-user-meta">
            <span className="mypage-user-name">
              {loadingUser ? "로딩 중..." : displayName}
            </span>
            {user?.email && <span className="mypage-user-mail">{user.email}</span>}
          </div>
          <div className="mypage-avatar" aria-hidden>👤</div>
        </div>
      </header>

      {/* 메인 레이아웃 */}
      <main className="mypage-main">
        {/* 리뷰 컨테이너 */}
        <section className="mypage-section" aria-label="리뷰 목록">
          <div className="mypage-section-head">
            <h2 className="mypage-section-title">리뷰 목록</h2>
          </div>

          <div className="mypage-list">
            {loadingReviews ? (
              <>
                <div className="mypage-card mypage-skeleton" />
                <div className="mypage-card mypage-skeleton" />
              </>
            ) : reviews.length === 0 ? (
              <div className="mypage-empty">아직 작성한 리뷰가 없습니다.</div>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="mypage-card">
                  {/* 가게 정보 */}
                  <div className="mypage-store">
                    <div className="mypage-store-thumb" aria-hidden>📷</div>
                    <div className="mypage-store-info">
                      <div className="mypage-store-name">{review.storeName}</div>
                      {review.address && (
                        <div className="mypage-store-addr" title={review.address}>
                          {review.address}
                        </div>
                      )}
                      {review.category && (
                        <div className="mypage-store-cat">{review.category}</div>
                      )}
                    </div>
                  </div>

                  {/* 리뷰 내용 */}
                  <div className="mypage-review">
                    <div className="mypage-avatar sm" aria-hidden>👤</div>
                    <div className="mypage-review-body">
                      <div className="mypage-review-meta">
                        <span className="mypage-review-author">{displayName}</span>
                        {review.date && (
                          <time className="mypage-review-date">{review.date}</time>
                        )}
                      </div>
                      {review.text && (
                        <p className="mypage-review-text">{review.text}</p>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* 보상 컨테이너 */}
        <section className="mypage-section" aria-label="보상 목록">
          <div className="mypage-section-head">
            <h2 className="mypage-section-title">보상 목록</h2>
          </div>

          <div className="mypage-list">
            {loadingRewards ? (
              <>
                <div className="mypage-card mypage-skeleton" />
                <div className="mypage-card mypage-skeleton" />
              </>
            ) : rewards.length === 0 ? (
              <div className="mypage-empty">받은 보상이 없습니다.</div>
            ) : (
              rewards.map((reward) => (
                <article key={reward.id} className="mypage-card mypage-reward">
                  <div className="mypage-chip success">
                    {reward.typeLabel || "홍보 포스터"}
                  </div>

                  <div className="mypage-reward-body">
                    <div className="mypage-reward-title">
                      [{reward.storeName}] {reward.title}
                    </div>
                    <div className="mypage-reward-period">
                      사용기간: {reward.startDate} ~ {reward.endDate}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
