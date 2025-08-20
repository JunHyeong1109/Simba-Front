// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import "./LNS.css";

// const Login = () => {
//   const [account, setAccount] = useState("");
//   const [password, setPassword] = useState("");
//   const navigate = useNavigate();

//   const handleLogin = (e) => {
//     e.preventDefault();
//     // 실제 백엔드 호출 대신 바로 이동
//     if (account && password) {
//       alert("로그인 성공! (임시)");
//       navigate("/main");//나중에 실제메인화면과 연결하기
//     } else {
//       alert("아이디와 비밀번호를 입력하세요.");
//     }
//   };

//   return (
//     <div className="container">
//       <div className="logo">로고</div>
//       <form onSubmit={handleLogin} className="login-form">
//         <input
//           type="text"
//           placeholder="account"
//           value={account}
//           onChange={(e) => setAccount(e.target.value)}
//           required
//         />
//         <input
//           type="password"
//           placeholder="password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//         />
//         <div className="links">
//           <button type="submit" className="login-btn">로그인</button>
//           <button
//             type="button"
//             className="link-btn"
//             onClick={() => navigate("/signup")}
//           >
//             회원가입
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default Login;
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LNS.css";

const Login = () => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3000/itda/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("로그인 성공!");
        console.log("서버에서 받은 응답:", data);
        navigate("/main"); // 로그인 성공 시 메인 페이지로 이동
      } else {
        alert(data.message || "로그인 실패");
      }
    } catch (err) {
      console.error(err);
      alert("서버와 연결할 수 없습니다.");
    }
  };

  return (
    <div className="container">
      <div className="logo">로고</div>
      <form onSubmit={handleLogin} className="login-form">
        <input
          type="text"
          placeholder="account"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="links">
          <button type="submit" className="login-btn">로그인</button>
          <button
            type="button"
            className="link-btn"
            onClick={() => navigate("/signup")}
          >
            회원가입
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
