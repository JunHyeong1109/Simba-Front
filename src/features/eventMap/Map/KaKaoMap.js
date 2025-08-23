/* eslint-env browser */
// src/features/eventMap/map/KaKaoMap.js
import { useEffect, useRef, useState } from "react";
import loadKakaoMaps from "./KakaoLoader";
import getCurrentLocation from "./Location";
import api from "../../../api";
import "./MapStyle.css";

const KAKAO_APP_KEY = "261b88294b81d5800071641ecc633dcb";

// 🔴 미션 보유 매장용 빨간 아이콘 (SVG data URL)
function makeRedMarkerImage(kakao) {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='32' height='46' viewBox='0 0 32 46'>
      <path fill='#d93025' d='M16 0c8.284 0 15 6.716 15 15 0 11-15 31-15 31S1 26 1 15C1 6.716 7.716 0 16 0z'/>
      <circle cx='16' cy='15' r='6' fill='white'/>
    </svg>`;
  const url = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  const size = new kakao.maps.Size(32, 46);
  const offset = new kakao.maps.Point(16, 46);
  return new kakao.maps.MarkerImage(url, size, { offset });
}

// ✅ 인포윈도우: 매장 정보만 (미션 섹션 제거)
function renderStoreOnly({ storeName, desc, road, jibun }) {
  return `
    <div class="infoWindow">
      <b class="infoTitle">${storeName || "매장"}</b>
      ${desc ? `<div class="infoMeta">${desc}</div>` : ""}
      ${(road || jibun) ? `<hr class="infoDivider" />` : ""}
      ${road ? `<div class="infoAddr"><span class="infoLabel">도로명:</span>${road}</div>` : ""}
      ${jibun ? `<div class="infoAddr"><span class="infoLabel">지번:</span>${jibun}</div>` : ""}
    </div>
  `;
}

export default function KaKaoMap({ onMissionSelect, storeIdToFocus, focus }) {
  // 진행 가능한 미션 (색상 구분용으로만 사용)
  const [missions, setMissions] = useState([]);
  const [stores, setStores] = useState([]);

  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const containerRef = useRef(null);
  const centerAddrRef = useRef(null);
  const initialized = useRef(false);

  // 매장 마커/윈도우
  const storeMarkersRef = useRef([]);
  const storeInfoWindowRef = useRef(null);
  const openedStoreMarkerRef = useRef(null);

  // URL 포커스용
  const focusMarkerRef = useRef(null);
  const focusInfoWindowRef = useRef(null);

  // 1) 지도 초기화
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let onMapIdle = null;

    (async () => {
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
        storeInfoWindowRef.current = new kakao.maps.InfoWindow({ zIndex: 2 });

        const searchAddrFromCoords = (coords, cb) => {
          geocoderRef.current?.coord2RegionCode(
            coords.getLng(),
            coords.getLat(),
            cb
          );
        };
        const displayCenterInfo = (result, status) => {
          if (status === kakao.maps.services.Status.OK) {
            const el = centerAddrRef.current;
            if (!el) return;
            for (let i = 0; i < result.length; i++) {
              if (result[i].region_type === "H") {
                el.textContent = result[i].address_name;
                break;
              }
            }
          }
        };

        searchAddrFromCoords(map.getCenter(), displayCenterInfo);
        onMapIdle = () => searchAddrFromCoords(map.getCenter(), displayCenterInfo);
        kakao.maps.event.addListener(map, "idle", onMapIdle);
      });
    })();

    return () => {
      const kakao = window.kakao;
      if (kakao && mapRef.current && onMapIdle) {
        kakao.maps.event.removeListener(mapRef.current, "idle", onMapIdle);
      }

      // 매장 마커 정리
      storeMarkersRef.current.forEach((m) => m.setMap(null));
      storeMarkersRef.current = [];
      storeInfoWindowRef.current?.close();
      openedStoreMarkerRef.current = null;

      // 포커스 마커 정리
      focusInfoWindowRef.current?.close();
      if (focusMarkerRef.current) {
        focusMarkerRef.current.setMap(null);
        focusMarkerRef.current = null;
      }

      mapRef.current = null;
      geocoderRef.current = null;
    };
  }, []);

  // 2-A) joinable 미션 (매장에 미션 유무 판단용)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/itda/missions/joinable");
        const list = Array.isArray(data) ? data : data?.items || [];
        if (!alive) return;
        setMissions(list);
      } catch {
        if (!alive) return;
        setMissions([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 2-B) 모든 매장
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/itda/stores");
        const list = Array.isArray(data) ? data : data?.items || [];
        const normalized = list.map((s) => ({
          ...s,
          latitude: s?.latitude != null ? Number(s.latitude) : undefined,
          longitude: s?.longitude != null ? Number(s.longitude) : undefined,
        }));
        if (!alive) return;
        setStores(normalized);
      } catch {
        if (!alive) return;
        setStores([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 3) 매장 마커 (매장당 1개, 미션 보유 시 빨간 아이콘)
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    if (!kakao || !map || !geocoder) return;

    // 정리
    storeMarkersRef.current.forEach((m) => m.setMap(null));
    storeMarkersRef.current = [];
    storeInfoWindowRef.current?.close();
    openedStoreMarkerRef.current = null;

    // 매장-미션 매핑
    const missionsByStoreId = new Map();
    missions.forEach((ms) => {
      const sid = ms?.store?.id ?? ms?.storeId;
      if (sid == null) return;
      if (!missionsByStoreId.has(sid)) missionsByStoreId.set(sid, []);
      missionsByStoreId.get(sid).push(ms);
    });

    stores.forEach((s) => {
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const sid = s.id ?? s.storeId;
      const hasMissions = (missionsByStoreId.get(sid) || []).length > 0;

      const pos = new kakao.maps.LatLng(lat, lng);
      const markerOptions = {
        position: pos,
        map,
        // ✅ 타이틀도 storeName 우선
        title: s.storeName || s.name || `매장#${sid}`,
        zIndex: 2,
      };
      if (hasMissions) {
        markerOptions.image = makeRedMarkerImage(kakao); // 미션 있으면 빨간 마커
      }
      const marker = new kakao.maps.Marker(markerOptions);

      kakao.maps.event.addListener(marker, "click", () => {
        // 토글
        if (openedStoreMarkerRef.current === marker) {
          storeInfoWindowRef.current?.close();
          openedStoreMarkerRef.current = null;
          return;
        }

        geocoder.coord2Address(lng, lat, (res, status) => {
          let road = "", jibun = "";
          if (status === kakao.maps.services.Status.OK && res?.[0]) {
            road = res.find((r) => r.road_address)?.road_address?.address_name || "";
            jibun = res[0]?.address?.address_name || "";
          }

          const html = renderStoreOnly({
            storeName: s.storeName || s.name || "매장",
            desc: s.description || "",
            road, jibun,
          });

          storeInfoWindowRef.current?.setContent(html);
          storeInfoWindowRef.current?.open(map, marker);
          openedStoreMarkerRef.current = marker;
        });
      });

      storeMarkersRef.current.push(marker);
    });
  }, [stores, missions]);

  // 4-A) /map?storeId=... → 해당 위치로 이동 + 매장 정보만 표시
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    if (!kakao || !map || !geocoder || !storeIdToFocus) return;

    (async () => {
      try {
        const { data } = await api.get(`/itda/stores/${storeIdToFocus}`);
        const toNum = (v) => (v === null || v === undefined || v === "" ? undefined : Number(v));
        const lat = toNum(data?.latitude);
        const lng = toNum(data?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const pos = new kakao.maps.LatLng(lat, lng);
        map.panTo(pos);

        // 포커스 마커
        if (!focusMarkerRef.current) {
          focusMarkerRef.current = new kakao.maps.Marker({ zIndex: 4 });
        }
        focusMarkerRef.current.setPosition(pos);
        focusMarkerRef.current.setMap(map);

        // 상세 주소
        geocoder.coord2Address(lng, lat, (res, status) => {
          let road = "", jibun = "";
          if (status === kakao.maps.services.Status.OK && res?.[0]) {
            road = res.find((r) => r.road_address)?.road_address?.address_name || "";
            jibun = res[0]?.address?.address_name || "";
          }

          const html = renderStoreOnly({
            storeName: data?.storeName || data?.name || "매장",
            desc: data?.description || "",
            road, jibun,
          });

          if (!focusInfoWindowRef.current) {
            focusInfoWindowRef.current = new kakao.maps.InfoWindow({ zIndex: 4 });
          }
          focusInfoWindowRef.current.setContent(html);
          focusInfoWindowRef.current.open(map, focusMarkerRef.current);
        });
      } catch (e) {
        console.warn("store focus failed:", e?.response?.data || e);
      }
    })();
  }, [storeIdToFocus]);

  // 4-B) 리스트 선택 시: 좌표로만 이동
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map || !focus) return;

    const lat = Number(focus.lat);
    const lng = Number(focus.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const pos = new kakao.maps.LatLng(lat, lng);
    map.panTo(pos);
  }, [focus]);

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
