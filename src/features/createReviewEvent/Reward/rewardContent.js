import React, { useState } from "react";
import "./rewardContent.css";

export default function RewardContent({
  disabled = false,
  required = false,
  exampleText = "예시) 아메리카노 1잔",
}) {
  const [content, setContent] = useState("");

  return (
    <label>
      {/* hidden 값: CreateButton/collect에서 읽음 */}
      <input type="hidden" id="event-reward-content" value={content} readOnly />

      <input
        type="text"
        className="reward-content-input"
        placeholder="보상 내용을 입력해주세요."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        title={exampleText}
        disabled={disabled}
        required={required}
      />
    </label>
  );
}
