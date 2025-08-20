import React, { useState } from "react";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import api from "../../api";         // ← 경로 확인 (예: src/features/auth 기준)
import "./LogIn.css";

export default function Login() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useOutletContext() ?? {};   // AppLayout의 <Outlet context={{ user, setUser }} />

  const next = new URLSearchParams(location.search).get("next") || "/";

  const handleLogin = async (e) => {
    e.preventDefault();
    if (pending) return;
    setError("");

    try {
      setPending(true);

      // 백엔드가 username/password를 받는다고 가정 (email 사용 시 필드명만 바꿔주면 됨)
      await api.post("/auth/login", {
        username: account,      // ← 서버가 'username' 대신 'account'를 받으면 키를 맞춰주세요.
        password,
      });

      // 로그인 성공 후 현재 사용자 조회 → TopBar 즉시 반영
      const me = await api.get("/itda/me");
      setUser?.(me.data);

      navigate(next, { replace: true }); // 기본은 "/"로 이동, ?next= 지원
    } catch (err) {
      const msg = err?.response?.data?.message || "로그인에 실패했습니다.";
      setError(msg);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className ="auth">
      <div className="container">
        <div className="logo" role="img" aria-label="Itda">Itda</div>

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="text"
            placeholder="아이디(또는 이메일)"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            autoComplete="username"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <div className="form-error">{error}</div>}

          <div className="links">
            <button type="submit" className="login-btn" disabled={pending}>
              {pending ? "로그인 중..." : "로그인"}
            </button>
            <button
              type="button"
              className="link-btn"
              onClick={() => navigate("/register")}
            >
              회원가입
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}