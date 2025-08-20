// src/features/topbar/TopBar.js (경로는 프로젝트 구조에 맞게)
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TopBar.css";

export default function TopBar({
  user = null,
  onLogout,
  homeRoute = "/",
  loginRoute = "/login",
  myPageRoute = "/mypage", // 알 수 없는 역할/미설정 시 폴백
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    const onClick = (e) => {
      if (open && menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  const initial = (user?.name || user?.email || "U").slice(0, 1).toUpperCase();

  // 역할 기반 마이페이지 경로 결정
  const resolveMyPageRoute = (u, fallback = myPageRoute) => {
    const role = (u?.role || "").toString().toUpperCase();
    if (role === "REVIEWER") return "/mypage1";
    if (role === "OWNER") return "/mypage2";
    return fallback;
  };

  const goMyPage = () => {
    const target = resolveMyPageRoute(user);
    setOpen(false);
    navigate(target);
  };

  return (
    <header className="topbar" role="banner">
      <div className="topbar-inner">
        {/* 좌측: 로고/브랜드 */}
        <button
          className="brand"
          onClick={() => navigate(homeRoute)}
          aria-label="메인으로 이동"
        >
          <img src="/logo192.png" alt="" className="brand-logo" />
          <span className="brand-text">Itda</span>
        </button>

        {/* 우측: 로그인 or 프로필 */}
        <div className="topbar-right">
          {!user && (
            <button
              type="button"
              className="btn primary"
              onClick={() => navigate(loginRoute)}
            >
              로그인
            </button>
          )}

          {user && (
            <div className="profile" ref={menuRef}>
              <button
                className="profile-btn"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                title={user.name || user.email || "프로필"}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="avatar" />
                ) : (
                  <div className="avatar initials">{initial}</div>
                )}
              </button>

              {open && (
                <div className="menu" role="menu">
                  <button
                    className="menu-item"
                    role="menuitem"
                    onClick={goMyPage}
                  >
                    마이페이지
                  </button>
                  <button
                    className="menu-item"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      onLogout?.(); // 전달되면 호출
                    }}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
