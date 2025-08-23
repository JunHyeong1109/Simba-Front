// src/features/eventMap/EventMap.js
import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import KaKaoMap from "./map/KaKaoMap";
import EventList from "./eventList/EventList";   // ✅ 리스트 복원
import EventContent from "./eventContent/EventContent";
import "./EventMap.css";

export default function EventMap() {
  const [selected, setSelected] = useState(null); // { mission|null, lat, lng, address?, store? }

  // /map?storeId=123 → 해당 매장 위치로 지도 포커스
  const [params] = useSearchParams();
  const storeIdParam = params.get("storeId");
  const storeIdToFocus = storeIdParam ? Number(storeIdParam) : null;

  // 지도 마커 클릭 → 상세 패널/리스트 연동
  const handleMissionSelect = useCallback((payload) => {
    // payload: { mission|null, lat, lng, address?, store? }
    setSelected(payload);
  }, []);

  // 좌측 리스트에 넘길 매장 id (선택된 매장 기준)
  const selectedStoreId =
    selected?.store?.id ??
    selected?.storeId ??
    selected?.mission?.storeId ??
    selected?.mission?.store?.id ??
    null;

  return (
    <div className="event-page-80">
      <div className="map-list-layout">{/* ✅ 두 칼럼 레이아웃로 복귀 */}
        {/* 왼쪽: 미션 리스트 */}
        <div className="list-col">
          <EventList
            // 선택된 매장이 있으면 그 매장의 미션만 보여줌
            storeId={selectedStoreId || undefined}
            // 기본 동작은 joinable (EventList 내부 로직 유지)
            onSelect={({ mission, lat, lng }) =>
              setSelected({
                mission,
                lat,
                lng,
                store: mission?.store, // 상세 패널 연동용
              })
            }
          />
        </div>

        {/* 오른쪽: 지도 */}
        <div className="map-col">
          <KaKaoMap
            storeIdToFocus={storeIdToFocus}
            focus={selected}                 // 리스트/마커 선택 시 좌표 이동
            onMissionSelect={handleMissionSelect} // 마커 클릭 → 좌측/하단 갱신
          />
        </div>
      </div>

      {/* 하단: 상세 패널 */}
      <EventContent selected={selected} />
    </div>
  );
}
