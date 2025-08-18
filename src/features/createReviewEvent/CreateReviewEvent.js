import DatePick from "./Date/datePick";
import RewardCount from "./Reward/rewardCount";
import "./CreateReviewEventStyle.css";
import SelectShop from "./SelectShop/Select";
import EventPoaster from "./EventPoaster/EventPoaster";
import EventTitle from "./EventTitle/EventTitle";
import EventContent from "./EventContents/EventContent";
import CreateButton from "./CreateButton/CreateButton";

function CreateReviewEvent() {
  const collect = () => {
    const g = (id) => document.getElementById(id)?.value || "";
    const toISO = (d) => (d ? new Date(d).toISOString().slice(0, 19) : ""); // 'YYYY-MM-DDTHH:mm:ss'

    const start = g("event-start");
    const end = g("event-end");

    return {
      title: g("event-title"),
      desc: g("event-desc"),
      storeId: Number(g("event-store-id") || 0),  // ✅ SelectShop가 채워주는 값
      shopName: g("event-shop"),
      address: g("event-address"),                // 현재는 공백(백엔드에 주소 없음)
      lat: g("event-lat"),
      lng: g("event-lng"),
      startAt: toISO(start),                      // ✅ ISO-8601로 변환
      endAt: toISO(end),
    };
  };

  return (
    <div>
      <EventTitle /> {/* 내부 input에 id="event-title" */}
      <h1></h1>
      <div className="app-row2">
        <div className="app-row">
          <DatePick />     {/* 시작/종료 input: id="event-start"/"event-end" */}
          <RewardCount />  {/* 필요 시 id 부여 */}
          <SelectShop />   {/* hidden: event-store-id, event-shop, event-lat, event-lng, event-address */}
          <EventPoaster/>
        </div>
      </div>
      <h1></h1>
      <EventContent />   {/* textarea id="event-desc" */}
      <h1></h1>
      <CreateButton collect={collect} />
    </div>
  );
}
export default CreateReviewEvent;
