import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import "./OwnerMyPage.css";

const OwnerPage = () => {
  const navigate = useNavigate();

  // AppLayout 등에서 context로 내려준 사용자 정보 사용(없으면 기본값)
  const outletCtx = useOutletContext?.() || {};
  const user = outletCtx?.user || null;

  const displayName =
    user?.username || user?.name || user?.email || "사장님";
  const email = user?.email || "";
  const initial = (user?.name || user?.email || "U")
    .toString()
    .slice(0, 1)
    .toUpperCase();

  return (
    <div className="owner-container">
      {/* ✅ 헤더만 교체: 좌측 타이틀 / 우측 간단 프로필 */}
      <header className="owner-header">
        <div className="logo-text">사장님 마이페이지</div>

        <div className="owner-user">
          <div className="owner-user-meta">
            <span className="owner-user-name">{displayName}</span>
            {email && <span className="owner-user-mail">{email}</span>}
          </div>
          <div className="owner-avatar" aria-hidden>
            {initial}
          </div>
        </div>
      </header>

      {/* ⬇️ 메인 콘텐츠는 기존 그대로 유지 */}
      <main className="owner-main">
        <section className="menu-section">
          <h3>● 매장 관리</h3>
          <button
            className="menu-btn"
            onClick={() => navigate("/manage")}
          >
            매장 등록하기
          </button>
        </section>

        <section className="menu-section">
          <h3>● 리뷰 관리</h3>
          <button
            className="menu-btn"
            onClick={() => navigate("/event")}
          >
            리뷰 이벤트 생성
          </button>
          <button
            className="menu-btn"
            onClick={() => navigate("/review-check")}
          >
            리뷰 확인 및 완료처리
          </button>
        </section>
      </main>
    </div>
  );
};

export default OwnerPage;
