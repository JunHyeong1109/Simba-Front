import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TopBar.css";

export default function TopBar({
  user = null,
  onLogout,
  homeRoute = "/main",
  loginRoute = "/login",
  myPageRoute = "/mypage",
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
                    onClick={() => {
                      setOpen(false);
                      navigate(myPageRoute);
                    }}
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
