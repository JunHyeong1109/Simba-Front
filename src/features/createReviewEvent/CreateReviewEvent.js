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
    return {
      title: g("event-title"),
      desc: g("event-desc"),
      shopName: g("event-shop"),
      address: g("event-address"),
      lat: g("event-lat"),
      lng: g("event-lng"),
      startDate: g("event-start"),
      endDate: g("event-end"),
    };
  };

  return (
    <div>
      <EventTitle />      {/* 내부 input에 id="event-title" 달기 */}
      <h1></h1>
      <div className="app-row2">
        <div className="app-row">
          <DatePick />     {/* 시작/종료 input에 id="event-start"/"event-end" */}
          <RewardCount />  {/* 필요하다면 desc나 수량 입력에 id 부여 */}
          <SelectShop />   {/* 가게/주소/좌표 input에 id 부여 */}
        </div>
      </div>
      <h1></h1>
      <EventContent />     {/* textarea에 id="event-desc" */}
      <CreateButton collect={collect} />
    </div>
  );
}
export default CreateReviewEvent;
