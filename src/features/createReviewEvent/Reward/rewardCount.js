import React, { useState } from "react";
import "./rewardCountStyle.css";

function RewardCount() {
  // 문자열로 관리하면 placeholder(빈 값) 처리와 컨트롤드 input 유지가 쉬워요
  const [count, setCount] = useState("");

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      setCount(""); // placeholder 상태 유지
      return;
    }
    // 숫자 정규화: 음수/소수/NaN 방지, 정수로 고정
    const n = Math.max(0, Math.floor(Number(raw)));
    setCount(String(n));
  };

  return (
    <div>
      {/* ✅ 서버 전송용 백업(버튼에서 읽음) */}
      <input
        type="hidden"
        id="event-reward-count"
        value={count}
        readOnly
      />

      <input
        type="number"
        className={`reward-input ${count === "" ? "is-placeholder" : ""}`}
        placeholder="보상 수량"
        value={count}
        onChange={handleChange}
        min={0}
        step={1}
        inputMode="numeric"
        pattern="[0-9]*"
      />
    </div>
  );
}

export default RewardCount;
