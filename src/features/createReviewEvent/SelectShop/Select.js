import React, { useState } from 'react';
import './SelectStyle.css';

function SelectShop() {
  const [selectedValue, setSelectedValue] = useState(""); // 초기값: placeholder

  const options = [
    { value: 0, label: "1번 매장" },
    { value: 1, label: "2번 매장" },
    { value: 2, label: "3번 매장" },
  ];

  const handleChange = (e) => {
    const v = e.target.value === "" ? "" : Number(e.target.value);
    setSelectedValue(v);
    if (v !== "") console.log(v);
  };

  return (
    <div>
      <select
        className={`select-input ${selectedValue === "" ? "is-placeholder" : ""}`}
        value={selectedValue}
        onChange={handleChange}
      >
        <option value="" disabled hidden>매장 선택</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export default SelectShop;
