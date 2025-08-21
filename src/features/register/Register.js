import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  // URL 파라미터 반영: ?role=OWNER, ?next=/path
  const params = new URLSearchParams(location.search);
  const next = params.get("next") || "/";
  const initialRole = params.get("role");
  const [role, setRole] = useState(
    initialRole === "OWNER" ? "OWNER" : "REVIEWER"
  );

  const [username, setUsername] = useState(""); // 계정 아이디
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // 간단한 클라 검증(서버 검증은 별도)
  const validate = () => {
    const u = username.trim();
    const p = password.trim();
    const e = email.trim();

    if (u.length < 4 || u.length > 15) {
      return "아이디는 4자 이상 15자 이하여야 합니다.";
    }
    if (p.length < 8 || p.length > 20) {
      return "비밀번호는 8자 이상 20자 이하여야 합니다.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return "올바른 이메일 형식을 입력하세요.";
    }
    if (role !== "OWNER" && role !== "REVIEWER") {
      return "역할을 선택하세요.";
    }
    return "";
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (pending) return;

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setError("");
    try {
      setPending(true);

      await api.post("/itda/auth/register", {
        username: username.trim(),
        password: password.trim(),
        email: email.trim(),
        role, // "OWNER" | "REVIEWER"
      });

      alert("회원가입 성공!");
      navigate("/login?next=" + encodeURIComponent(next), { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "회원가입에 실패했습니다.";
      setError(msg);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="auth auth-register">
      <div className="container">
        <div className="logo" role="img" aria-label="Itda">Itda</div>
        <h2 className="title">Itda에 오신 것을 환영합니다!</h2>

        <form onSubmit={handleRegister} className="register-form" noValidate>
          {/* 역할 선택 */}
          <fieldset className="role-group" disabled={pending}>
            <legend className="role-legend">역할 선택</legend>

            <div className="role-seg">
              <label
                className={"seg" + (role === "OWNER" ? " active" : "")}
                htmlFor="role-owner"
              >
                <input
                  id="role-owner"
                  className="sr-only"
                  type="radio"
                  name="role"
                  value="OWNER"
                  checked={role === "OWNER"}
                  onChange={() => setRole("OWNER")}
                />
                <span className="seg-title">사장님</span>
                <span className="seg-desc">가게 관리 / 미션 등록</span>
              </label>

              <label
                className={"seg" + (role === "REVIEWER" ? " active" : "")}
                htmlFor="role-reviewer"
              >
                <input
                  id="role-reviewer"
                  className="sr-only"
                  type="radio"
                  name="role"
                  value="REVIEWER"
                  checked={role === "REVIEWER"}
                  onChange={() => setRole("REVIEWER")}
                />
                <span className="seg-title">리뷰어</span>
                <span className="seg-desc">미션 참여 / 리뷰 작성</span>
              </label>
            </div>
          </fieldset>

          <input
            type="text"
            placeholder="아이디 (4~15자)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="비밀번호 (8~20자)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="signup-btn" disabled={pending}>
            {pending ? "가입 중..." : "회원가입"}
          </button>

          <button
            type="button"
            className="link-btn"
            onClick={() => navigate("/login?next=" + encodeURIComponent(next))}
            disabled={pending}
          >
            이미 계정이 있으신가요? 로그인
          </button>
        </form>
      </div>
    </div>
  );
}
