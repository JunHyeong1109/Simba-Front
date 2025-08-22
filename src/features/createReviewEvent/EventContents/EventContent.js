import React, { useState } from "react";
import "./EventContentStyle.css";

export default function EventContent() {
  const [desc, setDesc] = useState("");

  return (
    <div>
      {/* ✅ CreateButton/collect 폴백용 hidden (id 고정) */}
      <input type="hidden" id="event-desc" value={desc} readOnly />

      <textarea
        className={`content-input ${desc === "" ? "is-placeholder" : ""}`}
        placeholder="이벤트 설명을 입력해주세요."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={10}
      />
    </div>
  );
}
