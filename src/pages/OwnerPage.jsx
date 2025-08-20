import React from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerPage.css";

const OwnerPage = () => {
  const navigate = useNavigate();

  return (
    <div className="owner-container">
      {/* 헤더 */}
      <header className="owner-header">
        <div className="logo-text">보다 쉽고 빠른 매장 찾기!</div>
        <div className="owner-info">
          <span className="owner-text">사장님</span>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="owner-main">
        <section className="menu-section">
          <h3>● 매장 관리</h3>
          <button className="menu-btn" onClick={() => navigate("/store-register")}>
            매장 등록하기
          </button>
        </section>

        <section className="menu-section">
          <h3>● 리뷰 관리</h3>
          <button className="menu-btn" onClick={() => navigate("/review-event")}>
            리뷰 이벤트 생성
          </button>
          <button className="menu-btn" onClick={() => navigate("/review-check")}>
            리뷰 확인 및 완료처리
          </button>
        </section>
      </main>
    </div>
  );
};

export default OwnerPage;
