import "./EventContentStyle.css";
import { useState } from "react";

function EventContent() {
  const [content, setContent] = useState("");

  return (
    <div>
      {/* CreateButton에서 읽어갈 서버 전송용 백업 */}
      <input type="hidden" id="event-desc" value={content} readOnly />

      {/* 엔터로 줄바꿈 가능 */}
      <textarea
        className={`content-input ${content === "" ? "is-placeholder" : ""}`}
        placeholder="리뷰 미션 상세 내용을 입력해주세요."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        // 높이는 CSS에서 제어. 사용자 수동 리사이즈 허용
        rows={10}
      />
    </div>
  );
}

export default EventContent;
