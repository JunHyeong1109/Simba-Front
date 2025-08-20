// src/features/eventMap/EventMap.js
import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import KaKaoMap from "./map/KaKaoMap";
import EventList from "./eventList/EventList";
import EventContent from "./eventContent/EventContent";
import "./EventMap.css";

export default function EventMap() {
  const [selected, setSelected] = useState(null); // { mission, lat, lng, address? }

  // /map?storeId=123 → 해당 매장 위치로 지도 포커스
  const [params] = useSearchParams();
  const storeIdParam = params.get("storeId");
  const storeIdToFocus = storeIdParam ? Number(storeIdParam) : null;

  // 마커 클릭 시 하단 상세 갱신 (레퍼런스 고정)
  const handleMissionSelect = useCallback((payload) => {
    setSelected(payload);
  }, []);

  return (
    <div className="event-page-80">
      <div className="map-list-layout">
        {/* 왼쪽: 미션 리스트 (미션만 표시) */}
        <div className="list-col">
          <EventList
            onSelect={({ mission, lat, lng }) =>
              setSelected({ mission, lat, lng })
            }
          />
        </div>

        {/* 오른쪽: 지도 */}
        <div className="map-col">
          <KaKaoMap
            // 메인에서 매장 클릭 시 포커스
            storeIdToFocus={storeIdToFocus}
            // 리스트에서 미션 클릭 시 포커스(좌표 기반)
            focus={selected}
            // 마커 클릭 시 하단 상세 반영
            onMissionSelect={handleMissionSelect}
          />
        </div>
      </div>

      {/* 하단 상세 패널 */}
      <EventContent selected={selected} />
    </div>
  );
}
