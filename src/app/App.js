// src/app/App.js
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div>
      {/* 헤더를 두고 싶으면 여기 간단한 타이틀만 */}
      {/* <header style={{ padding: 12, borderBottom: "1px solid #eee" }}>My App</header> */}
      <Outlet />
    </div>
  );
}
