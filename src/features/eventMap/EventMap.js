// src/features/eventMap/EventMap.js
import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import KaKaoMap from "./map/KaKaoMap";
import EventList from "./eventList/EventList";
import EventContent from "./eventContent/EventContent";
import "./EventMap.css";

export default function EventMap() {
  // { mission|null, lat, lng, address?, store? }
  const [selected, setSelected] = useState(null);

  const [params] = useSearchParams();
  const storeIdParam = params.get("storeId");
  const storeIdToFocus = storeIdParam ? Number(storeIdParam) : null;

  // 지도/리스트에서 “선택”이 발생하면 공통으로 여기로 모음
  const handleMissionSelect = useCallback((payload) => {
    setSelected(payload);
  }, []);

  // 현재 선택된 매장 id 추출 (지도에서 넘겨준 payload에 들어있음)
  const currentStoreId =
    selected?.store?.id ??
    selected?.store?.storeId ??
    selected?.mission?.store?.id ??
    selected?.mission?.storeId ??
    null;

  return (
    // ✅ 스코프 클래스 부여: 맵 관련 CSS가 여기 안에서만 적용됨
    <div className="itda-eventmap event-page-80">
      <div className="map-list-layout">
        {/* 왼쪽: 선택 매장 정보 & 진행 중 미션 목록 */}
        <div className="list-col">
          <EventList
            storeId={currentStoreId}
            address={selected?.address}
            // ✅ 리스트에서 미션을 고르면 상세/지도 동기화
            onPickMission={handleMissionSelect}
          />
        </div>

        {/* 오른쪽: 지도 */}
        <div className="map-col">
          <KaKaoMap
            storeIdToFocus={storeIdToFocus}
            focus={selected} // 리스트/지도 선택 → 지도 중심 이동
            onMissionSelect={handleMissionSelect} // 지도에서 선택 → 하단 상세/리스트 동기화
          />
        </div>
      </div>

      {/* 하단 상세 패널 */}
      <EventContent selected={selected} />
    </div>
  );
}
