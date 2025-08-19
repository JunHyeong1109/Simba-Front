// src/app/App.jsx (위치에 맞게)
import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import TopBar from "../features/topBar/TopBar"; // ← 경로 주의
import api from "../api";
import "./AppShell.css";

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // 앱 시작 시 내 프로필 불러오기 (쿠키 기반 세션 가정)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/itda/username"); 
        setUser(data);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  // 로그아웃
  const handleLogout = async () => {
    try {
      await api.post("/itda/auth/logout");
    } finally {
      setUser(null);
      navigate("/main"); // 메인으로
    }
  };

  return (
    <div className="app-shell">
      {/* ✅ 로그인 상태/로그아웃 핸들러를 TopBar에 전달 */}
      <TopBar user={user} onLogout={handleLogout} />
      <main className="app-main">
        <Outlet context={{ user, setUser }} /> 
        {/* 필요 시 하위 라우트에서 setUser를 쓰도록 내림 */}
      </main>
    </div>
  );
}
