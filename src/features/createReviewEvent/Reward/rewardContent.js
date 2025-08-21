import React from "react";
import "./rewardContent.css";

export default function RewardContent({
  value,
  onChange,
  disabled = false,
  required = false,
  name = "reward_content",
  exampleText = "예시) 아메리카노 1잔",
}) {
  return (
    <label className="rewardC-field">
      {/* 툴팁 래퍼: 호버 시 예시 문구 보여줌 */}
      <div className="rewardC-tooltip" data-tip={exampleText}>
        <input
          className="rewardC-input"
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder="보상 내용을 입력해주세요"
          title={exampleText}               // 브라우저 기본 툴팁(접근성 + 폴백)
          aria-describedby="rewardC-content-help"
          disabled={disabled}
          required={required}
        />
      </div>
    </label>
  );
}
