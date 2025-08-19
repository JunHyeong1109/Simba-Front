// src/features/eventMap/Map/Map.js
import { useEffect, useRef, useState } from "react";
import loadKakaoMaps from "./KakaoLoader";
import getCurrentLocation from "./Location";
import api from "../../../api"; // ← 경로는 프로젝트 구조에 맞게 조정
import "./MapStyle.css";

const KAKAO_APP_KEY = "261b88294b81d5800071641ecc633dcb";

export default function Map({ onMissionSelect }) {
  // joinable 미션 목록
  const [missions, setMissions] = useState([]);

  // kakao 객체/지도/도구 ref
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const containerRef = useRef(null);
  const centerAddrRef = useRef(null);
  const initialized = useRef(false);

  // 미션 마커/인포윈도우 관리
  const missionMarkersRef = useRef([]);
  const missionInfoWindowRef = useRef(null); // 공용 InfoWindow(1개)

  // 1) 최초 1회: 지도 초기화 (빈 곳 클릭시 상세 주소 X)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let onMapIdle = null;

    (async () => {
      // 현재 위치 → 지도 중심
      getCurrentLocation(async (lat, lng) => {
        const kakao = await loadKakaoMaps(KAKAO_APP_KEY);
        const container = containerRef.current;
        if (!container) return;

        const map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(lat, lng),
          level: 3,
        });
        mapRef.current = map;

        geocoderRef.current = new kakao.maps.services.Geocoder();
        missionInfoWindowRef.current = new kakao.maps.InfoWindow({ zIndex: 2 });

        // 지도 중심 주소 라벨 업데이트
        const searchAddrFromCoords = (coords, callback) => {
          geocoderRef.current?.coord2RegionCode(
            coords.getLng(),
            coords.getLat(),
            callback
          );
        };
        const displayCenterInfo = (result, status) => {
          if (status === kakao.maps.services.Status.OK) {
            const infoEl = centerAddrRef.current;
            if (!infoEl) return;
            for (let i = 0; i < result.length; i++) {
              if (result[i].region_type === "H") {
                infoEl.textContent = result[i].address_name;
                break;
              }
            }
          }
        };

        // 초기에 한 번
        searchAddrFromCoords(map.getCenter(), displayCenterInfo);
        // 이동이 끝날 때마다 갱신
        onMapIdle = function () {
          searchAddrFromCoords(map.getCenter(), displayCenterInfo);
        };
        kakao.maps.event.addListener(map, "idle", onMapIdle);
      });
    })();

    // cleanup
    return () => {
      const kakao = window.kakao;
      if (kakao && mapRef.current && onMapIdle) {
        kakao.maps.event.removeListener(mapRef.current, "idle", onMapIdle);
      }
      // 미션 마커/인포윈도우 정리
      missionMarkersRef.current.forEach((m) => m.setMap(null));
      missionMarkersRef.current = [];
      missionInfoWindowRef.current?.close();
      missionInfoWindowRef.current = null;

      mapRef.current = null;
      geocoderRef.current = null;
    };
  }, []);

  // 2) 마운트 후: joinable 미션 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/itda/missions/joinable");
        const list = Array.isArray(data) ? data : data?.items || [];
        if (!alive) return;
        setMissions(list);
      } catch (e) {
        console.warn("joinable 미션 로드 실패:", e?.response?.data || e);
        if (!alive) return;
        setMissions([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 3) joinable 미션 → 마커로 표시 (마커 클릭 시 상세 주소 역지오코딩하여 함께 표시 + 상위로 선택 알림)
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    if (!kakao || !map || !geocoder) return;

    // 기존 미션 마커 제거
    missionMarkersRef.current.forEach((m) => m.setMap(null));
    missionMarkersRef.current = [];
    missionInfoWindowRef.current?.close();

    const toNum = (v) => {
      if (v === null || v === undefined || v === "") return undefined;
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) ? n : undefined;
    };
    const fmtDate = (d) => {
      if (!d) return "";
      try {
        const dt = new Date(d);
        if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
      } catch {}
      return String(d).slice(0, 10);
    };

    const makeInfoHtml = ({ title, storeName, start, end, desc, road, jibun }) => {
      return `
        <div style="padding:8px 12px;max-width:260px;line-height:1.4">
          <b>${title || "미션"}</b><br/>
          ${storeName ? `${storeName}<br/>` : ""}
          ${(start || end) ? `${fmtDate(start)} ~ ${fmtDate(end)}<br/>` : ""}
          ${desc ? `${desc}<br/>` : ""}
          ${road || jibun ? `<hr style="margin:6px 0;"/>` : ""}
          ${road ? `도로명: ${road}<br/>` : ""}
          ${jibun ? `지번: ${jibun}` : ""}
        </div>
      `;
    };

    const openMissionInfo = (marker, ms, lat, lng) => {
      // 마커 클릭 시에만 상세 주소 역지오코딩
      geocoder.coord2Address(lng, lat, (res, status) => {
        let road = "";
        let jibun = "";
        if (status === kakao.maps.services.Status.OK && res?.[0]) {
          road = res.find((r) => r.road_address)?.road_address?.address_name || "";
          jibun = res[0]?.address?.address_name || "";
        }

        const html = makeInfoHtml({
          title: ms.title,
          storeName: ms?.store?.name || ms?.storeName || "",
          start: ms?.startAt || ms?.startDate || "",
          end: ms?.endAt || ms?.endDate || "",
          desc: ms?.description || ms?.desc || "",
          road,
          jibun,
        });

        missionInfoWindowRef.current?.setContent(html);
        missionInfoWindowRef.current?.open(map, marker);

        // ✅ 상위(부모)로 선택된 미션 알림 → 하단 상세 패널/외부 로직에서 사용
        onMissionSelect?.({
          mission: ms,
          lat,
          lng,
          address: { road, jibun },
        });
      });
    };

    missions.forEach((ms) => {
      // 좌표: mission.store.latitude/longitude → 없으면 mission.latitude/longitude
      const lat =
        (ms?.store && toNum(ms.store.latitude)) ?? toNum(ms.latitude);
      const lng =
        (ms?.store && toNum(ms.store.longitude)) ?? toNum(ms.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const pos = new kakao.maps.LatLng(lat, lng);
      const marker = new kakao.maps.Marker({ position: pos, map, title: ms.title });

      kakao.maps.event.addListener(marker, "click", () =>
        openMissionInfo(marker, ms, lat, lng)
      );

      missionMarkersRef.current.push(marker);
    });
  }, [missions, onMissionSelect]);

  return (
    <div className="map_wrap">
      <div id="map" ref={containerRef} className="map_canvas" />
      <div className="hAddr">
        <span className="title">지도중심기준 행정동 주소정보</span>
        <span id="centerAddr" ref={centerAddrRef} />
      </div>
    </div>
  );
}
