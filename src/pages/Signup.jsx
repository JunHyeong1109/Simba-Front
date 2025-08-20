// export default Signup;
// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import "./LNS.css";

// const Signup = () => {
//   const [account, setAccount] = useState("");
//   const [password, setPassword] = useState("");
//   const navigate = useNavigate();

//   const handleSignup = (e) => {
//     e.preventDefault();
//     // 실제 백엔드 호출 대신 바로 이동
//     if (account && password) {
//       alert("회원가입 성공! (임시)");
//       navigate("/");
//     } else {
//       alert("아이디와 비밀번호를 입력하세요.");
//     }
//   };

//   return (
//     <div className="container">
//       <div className="logo">로고</div>
//       <h2>서비스 이름에 오신 것을 환영합니다!</h2>
//       <form onSubmit={handleSignup} className="signup-form">
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
//         <button type="submit" className="signup-btn">회원가입</button>
//       </form>
//     </div>
//   );
// };

// export default Signup;
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LNS.css";

const Signup = () => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3000/itda/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("회원가입 성공!");
        navigate("/");
      } else {
        alert(data.message || "회원가입 실패");
      }
    } catch (err) {
      console.error(err);
      alert("서버와 연결할 수 없습니다.");
    }
  };

  return (
    <div className="container">
      <div className="logo">로고</div>
      <h2>서비스 이름에 오신 것을 환영합니다!</h2>
      <form onSubmit={handleSignup} className="signup-form">
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
        <button type="submit" className="signup-btn">회원가입</button>
      </form>
    </div>
  );
};

export default Signup;
