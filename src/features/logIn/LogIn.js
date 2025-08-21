import React, { useState } from "react";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import api from "../../api"; // 경로 확인 필요
import "./LogIn.css";

export default function Login() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useOutletContext() ?? {}; // AppLayout: <Outlet context={{ user, setUser }} />

  const next = new URLSearchParams(location.search).get("next") || "/";

  const handleLogin = async (e) => {
    e.preventDefault();
    if (pending) return;
    setError("");

    try {
      setPending(true);

      // 서버 필드명이 account/email 이면 username 키만 바꿔주세요.
      await api.post("/itda/auth/login", {
        username: account,
        password,
      });

      // 로그인 직후 me 조회해서 상단/컨텍스트 갱신
      const me = await api.get("/itda/me");
      setUser?.(me.data);

      navigate(next, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || "로그인에 실패했습니다.";
      setError(msg);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="auth auth-login">
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
              onClick={() => navigate("/register?next=" + encodeURIComponent(next))}
              disabled={pending}
            >
              회원가입
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
