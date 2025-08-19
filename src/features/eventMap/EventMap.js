// src/features/eventMap/EventMap.js
import { useState } from "react";
import Map from "./Map/Map";
import EventList from "./eventList/EventList";
import EventContent from "./eventContent/EventContent";
import "./EventMap.css";

export default function EventMap() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="event-page-80">
      <div className="map-list-layout">
        {/* ✅ 왼쪽: 리스트 */}
        <div className="list-col">
          <EventList
            onSelect={({ mission, lat, lng }) =>
              setSelected({ mission, lat, lng })
            }
          />
        </div>

        {/* ✅ 오른쪽: 지도 */}
        <div className="map-col">
          <Map
            // 마커 클릭 시 선택 미션 정보 올려받아 하단에 표시
            onMissionSelect={(payload) => setSelected(payload)}
          />
        </div>
      </div>

      {/* ✅ 하단: 상세 컨테이너 (선택 전엔 플레이스홀더) */}
      <EventContent selected={selected} />
    </div>
  );
}
