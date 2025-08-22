import { useState } from "react";
import DatePick from "./Date/datePick";
import RewardCount from "./Reward/rewardCount";
import "./CreateReviewEventStyle.css";
import SelectShop from "./SelectShop/Select";
import EventPoaster from "./EventPoaster/EventPoaster";
import EventTitle from "./EventTitle/EventTitle";
import EventContent from "./EventContents/EventContent";
import CreateButton from "./CreateButton/CreateButton";
import RewardContent from "./Reward/rewardContent";

function CreateReviewEvent() {
  const [posterFile, setPosterFile] = useState(null); // ✅ 포스터 파일 상태

  const collect = () => {
    const g = (id) => (document.getElementById(id)?.value ?? "").trim();
    const toISO = (d) => (d ? new Date(d).toISOString().slice(0, 19) : ""); // 'YYYY-MM-DDTHH:mm:ss'
    const toFloatOrNull = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };
    const toIntOrNull = (v) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    };

    const start = g("event-start");
    const end = g("event-end");

    return {
      title: g("event-title"),

      // ✅ EventContent → description
      description: g("event-desc"),

      storeId: Number(g("event-store-id") || 0), // SelectShop가 채워줌
      shopName: g("event-shop"),
      address: g("event-address"),

      // ✅ 문자열 → 숫자 변환 (추천 방식)
      lat: toFloatOrNull(g("event-lat")),
      lng: toFloatOrNull(g("event-lng")),

      startAt: toISO(start),
      endAt: toISO(end),

      // 선택 필드들
      rewardCount: toIntOrNull(g("event-reward-count")),

      // ✅ RewardContent → rewardContent
      rewardContent: g("event-reward-content"),
    };
  };

  return (
    <div>
      <EventTitle /> {/* 내부 input에 id="event-title" */}
      <h1></h1>

      <div className="app-row2">
        <div className="app-row">
          <DatePick />       {/* 시작/종료 input: id="event-start"/"event-end" */}
          <RewardCount />    {/* hidden/input: id="event-reward-count" 로 맞춰주세요 */}
          <RewardContent />  {/* hidden: #event-reward-content + textarea */}
        </div>
      </div>

      <h1></h1>
      <div className="app-row2">
        <div className="app-row">
          <SelectShop />
          {/* SelectShop는 아래 hidden을 채워줘야 합니다:
              id="event-store-id", id="event-shop", id="event-lat", id="event-lng", id="event-address" */}
          <EventPoaster onChange={setPosterFile} />  {/* ✅ 파일 받기 */}
        </div>
      </div>

      <h1></h1>
      <EventContent />  {/* textarea + hidden: #event-desc */}

      <h1></h1>
      <CreateButton collect={collect} posterFile={posterFile} /> {/* ✅ 파일 전달 */}
    </div>
  );
}

export default CreateReviewEvent;
