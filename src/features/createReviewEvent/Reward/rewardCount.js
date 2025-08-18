import React, { useState } from 'react';
import './rewardCountStyle.css';

function RewardCount() {
  const [selectedValue, setSelectedValue] = useState(""); // 초기값: placeholder

  const options = [
    { value: 0, label: '0' },
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5' },
    { value: 6, label: '6' },
    { value: 7, label: '7' },
    { value: 8, label: '8' },
    { value: 9, label: '9' },
    { value: 10, label: '10' },
  ];

  const handleChange = (e) => {
    const v = e.target.value === "" ? "" : Number(e.target.value);
    setSelectedValue(v);
    if (v !== "") console.log(v);
  };

  return (
    <div>
      <select
        className={`reward-input ${selectedValue === "" ? "is-placeholder" : ""}`}
        value={selectedValue}
        onChange={handleChange}
      >
        <option value="" disabled hidden>보상 수량</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export default RewardCount;
