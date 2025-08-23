import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import KaKaoMap from "./map/KaKaoMap";
import EventList from "./eventList/EventList";
import EventContent from "./eventContent/EventContent";
import "./EventMap.css";

export default function EventMap() {
  // selected는 마커 클릭 시 내려오는 payload를 그대로 담아둠
  // 예: { storeId, lat, lng, address: { road?, jibun? } }  또는  { mission, lat, lng, address? }
  const [selected, setSelected] = useState(null);

  // /map?storeId=123 → 해당 매장 위치로 지도 포커스
  const [params] = useSearchParams();
  const storeIdParam = params.get("storeId");
  const storeIdToFocus = storeIdParam ? Number(storeIdParam) : null;

  // 마커 클릭 시 하단 상세/왼쪽 패널 갱신
  const handleMarkerSelect = useCallback((payload) => {
    setSelected(payload);
  }, []);

  // 왼쪽 패널용으로 storeId/address 뽑아내기 (미션 payload인 경우도 대비)
  const storeIdForPanel =
    selected?.storeId ??
    selected?.mission?.store?.id ??
    selected?.mission?.storeId ??
    null;

  const addressForPanel = selected?.address || null;

  return (
    <div className="event-page-80">
      <div className="map-list-layout">
        {/* 왼쪽: 선택된 매장 정보 패널 */}
        <div className="list-col">
          <EventList
            storeId={storeIdForPanel}
            address={addressForPanel}
          />
        </div>

        {/* 오른쪽: 지도 */}
        <div className="map-col">
          <KaKaoMap
            // URL로 전달된 매장으로 지도 포커스
            storeIdToFocus={storeIdToFocus}
            // 마커 클릭 시 선택 상태 갱신
            onMissionSelect={handleMarkerSelect}
            // (선택) 리스트 선택으로 포커스 이동을 쓰지 않으므로 남겨도 무해
            focus={selected}
          />
        </div>
      </div>

      {/* 하단: 미션 상세 (선택된 미션이 없으면 안내 문구가 보이도록 EventContent가 처리) */}
      <EventContent selected={selected} />
    </div>
  );
}
