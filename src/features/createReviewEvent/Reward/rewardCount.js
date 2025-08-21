import React, { useState } from 'react';
import './rewardCountStyle.css';

function RewardCount() {
  const [count, setCount] = useState(""); // 초기값: placeholder

  const handleChange = (e) => {
    const v = e.target.value === "" ? "" : Number(e.target.value);
    setCount(v);
  };

  return (
    <div>
      <input
        type="number"
        className={`reward-input ${count === "" ? "is-placeholder" : ""}`}
        placeholder="보상 수량"
        value={count}
        onChange={handleChange}
        min={0}   // 최소값
      />
    </div>
  );
}

export default RewardCount;
