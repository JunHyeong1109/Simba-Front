import React, { useState } from "react";
import "./rewardContent.css";

export default function RewardContent({
  disabled = false,
  required = false,
  exampleText = "예시) 아메리카노 1잔",
}) {
  const [content, setContent] = useState("");

  return (
    <label className="rewardC-field">
      {/* ✅ CreateButton/collect 폴백용 hidden (id 고정) */}
      <input type="hidden" id="event-reward-content" value={content} readOnly />

      <div className="rewardC-tooltip" data-tip={exampleText}>
        <textarea
          className="content-input"
          placeholder="리워드 내용을 입력해주세요."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          title={exampleText}
          aria-describedby="rewardC-content-help"
          disabled={disabled}
          required={required}
          rows={6}
        />
      </div>
    </label>
  );
}
