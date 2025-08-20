// src/app/App.jsx
import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import TopBar from "../features/topBar/TopBar";
import api from "../api";
import "./AppShell.css";

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // 앱 시작 시 내 프로필 불러오기 (role 포함)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/itda/me"); // role 포함 권장
        if (alive) setUser(data || null);
      } catch {
        if (alive) setUser(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 로그아웃
  const handleLogout = async () => {
    try {
      await api.post("/itda/auth/logout");
    } finally {
      setUser(null);
      navigate("/", { replace: true }); // 루트(index=메인)로
    }
  };

  // 역할 별 마이페이지 라우트
  const myPageRoute =
    (user?.role || "").toString().toUpperCase() === "OWNER"
      ? "/mypage2"
      : "/mypage1";

  return (
    <div className="app-shell">
      <TopBar
        user={user}
        onLogout={handleLogout}
        homeRoute="/"
        loginRoute="/login"
        myPageRoute={myPageRoute}
      />
      <main className="app-main">
        {/* 하위 라우트에서 user/setUser 사용 가능 */}
        <Outlet context={{ user, setUser }} />
      </main>
    </div>
  );
}
