// src/features/createReviewEvent/index.jsx (혹은 CreateReviewEvent.jsx)
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
    const g = (id) => document.getElementById(id)?.value || "";
    const toISO = (d) => (d ? new Date(d).toISOString().slice(0, 19) : ""); // 'YYYY-MM-DDTHH:mm:ss'

    const start = g("event-start");
    const end = g("event-end");

    return {
      title: g("event-title"),
      desc: g("event-desc"),
      storeId: Number(g("event-store-id") || 0), // SelectShop가 채워줌
      shopName: g("event-shop"),
      address: g("event-address"),
      lat: g("event-lat"),
      lng: g("event-lng"),
      startAt: toISO(start),
      endAt: toISO(end),
      // 필요 시 보상 개수나 기타 값도 여기에 수집하세요 (예: rewardCount: g("event-reward"))
    };
  };

  return (
    <div>
      <EventTitle /> {/* 내부 input에 id="event-title" */}
      <h1></h1>

      <div className="app-row2">
        <div className="app-row">
          <DatePick />      {/* 시작/종료 input: id="event-start"/"event-end" */}
          <RewardCount />   {/* 필요 시 id="event-reward" 등 부여 */}
          <RewardContent/>
        </div>
      </div>
      <h1></h1>
      <div className="app-row2">
        <div className="app-row">
          <SelectShop />    {/* hidden: event-store-id, event-shop, event-lat, event-lng, event-address */}
          <EventPoaster onChange={setPosterFile} />  {/* ✅ 파일 받기 */}
        </div>
      </div>

      <h1></h1>
      <EventContent />  {/* textarea id="event-desc" */}

      <h1></h1>
      <CreateButton collect={collect} posterFile={posterFile} /> {/* ✅ 파일 전달 */}
    </div>
  );
}

export default CreateReviewEvent;
