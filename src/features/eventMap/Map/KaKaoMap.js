/* eslint-env browser */
// src/features/eventMap/map/KaKaoMap.js
import { useEffect, useRef, useState } from "react";
import loadKakaoMaps from "./KakaoLoader";
import getCurrentLocation from "./Location";
import api from "../../../api";
import "./MapStyle.css";

const KAKAO_APP_KEY = "261b88294b81d5800071641ecc633dcb";

// 🔴 미션 마커용 빨간 아이콘 (SVG data URL)
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

// 날짜 YYYY-MM-DD
const fmtDate = (d) => {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
  } catch {}
  return String(d).slice(0, 10);
};

// 공통 인포윈도우 렌더러: 매장 + 주소 + 미션 섹션(없으면 "미션이 없습니다.")
function renderStoreAndMissions({ name, desc, road, jibun, relatedMissions }) {
  const missionHtml = (relatedMissions && relatedMissions.length > 0)
    ? `
      <div class="missionHeader">미션</div>
      <ul class="missionList">
        ${relatedMissions.slice(0, 3).map(ms => `
          <li>
            ${ms.title || "미션"}
            ${ms.startAt || ms.startDate || ms.endAt || ms.endDate
              ? ` <span class="infoMeta">(${fmtDate(ms.startAt || ms.startDate)} ~ ${fmtDate(ms.endAt || ms.endDate)})</span>`
              : ""}
          </li>
        `).join("")}
      </ul>
      ${relatedMissions.length > 3 ? `<div class="infoMeta">외 ${relatedMissions.length - 3}건</div>` : ""}
    `
    : `<div class="missionHeader">미션</div><div class="missionEmpty">미션이 없습니다.</div>`;

  return `
    <div class="infoWindow">
      <b class="infoTitle">${name || "매장"}</b>
      ${desc ? `<div class="infoMeta">${desc}</div>` : ""}
      ${(road || jibun) ? `<hr class="infoDivider" />` : ""}
      ${road ? `<div class="infoAddr"><span class="infoLabel">도로명:</span>${road}</div>` : ""}
      ${jibun ? `<div class="infoAddr"><span class="infoLabel">지번:</span>${jibun}</div>` : ""}
      <hr class="infoDivider" />
      ${missionHtml}
    </div>
  `;
}

export default function KaKaoMap({ onMissionSelect, storeIdToFocus, focus }) {
  const [missions, setMissions] = useState([]); // 진행 가능한 미션
  const [stores, setStores] = useState([]);     // 모든 매장

  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const containerRef = useRef(null);
  const centerAddrRef = useRef(null);
  const initialized = useRef(false);

  // 미션 마커/윈도우
  const missionMarkersRef = useRef([]);
  const missionMarkerIndexRef = useRef(new Map());
  const missionInfoWindowRef = useRef(null);
  const openedMarkerRef = useRef(null); // 미션 토글 추적

  // 매장 마커/윈도우
  const storeMarkersRef = useRef([]);
  const storeInfoWindowRef = useRef(null);
  const openedStoreMarkerRef = useRef(null); // 매장 토글 추적

  // URL 포커스용(미션 없어도 표시)
  const focusMarkerRef = useRef(null);
  const focusInfoWindowRef = useRef(null);

  const onMissionSelectRef = useRef(onMissionSelect);
  useEffect(() => { onMissionSelectRef.current = onMissionSelect; }, [onMissionSelect]);

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
        missionInfoWindowRef.current = new kakao.maps.InfoWindow({ zIndex: 3 });
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
      missionMarkersRef.current.forEach((m) => m.setMap(null));
      missionMarkersRef.current = [];
      missionMarkerIndexRef.current.clear();
      missionInfoWindowRef.current?.close();
      openedMarkerRef.current = null;

      storeMarkersRef.current.forEach((m) => m.setMap(null));
      storeMarkersRef.current = [];
      storeInfoWindowRef.current?.close();
      openedStoreMarkerRef.current = null;

      focusInfoWindowRef.current?.close();
      if (focusMarkerRef.current) {
        focusMarkerRef.current.setMap(null);
        focusMarkerRef.current = null;
      }

      mapRef.current = null;
      geocoderRef.current = null;
    };
  }, []);

  // 2-A) joinable 미션
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

  // 3-A) 미션 마커 (공통 템플릿 + 클릭 토글)
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    if (!kakao || !map || !geocoder) return;

    missionMarkersRef.current.forEach((m) => m.setMap(null));
    missionMarkersRef.current = [];
    missionMarkerIndexRef.current.clear();
    missionInfoWindowRef.current?.close();
    openedMarkerRef.current = null;

    const toNum = (v) => {
      if (v === null || v === undefined || v === "") return undefined;
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) ? n : undefined;
    };

    missions.forEach((ms) => {
      const lat = toNum(ms?.store?.latitude) ?? toNum(ms.latitude);
      const lng = toNum(ms?.store?.longitude) ?? toNum(ms.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const pos = new kakao.maps.LatLng(lat, lng);
      const marker = new kakao.maps.Marker({
        position: pos,
        map,
        title: ms.title,
        zIndex: 3,
        image: makeRedMarkerImage(kakao),
      });

      if (ms?.id != null) missionMarkerIndexRef.current.set(ms.id, marker);

      kakao.maps.event.addListener(marker, "click", () => {
        // 토글: 같은 마커 재클릭 시 닫기
        if (openedMarkerRef.current === marker) {
          missionInfoWindowRef.current?.close();
          openedMarkerRef.current = null;
          return;
        }

        geocoder.coord2Address(lng, lat, (res, status) => {
          let road = "", jibun = "";
          if (status === kakao.maps.services.Status.OK && res?.[0]) {
            road = res.find((r) => r.road_address)?.road_address?.address_name || "";
            jibun = res[0]?.address?.address_name || "";
          }

          // 공통 템플릿: "해당 매장" + "미션 1개(이 마커의 미션)"
          const storeName = ms?.store?.name || ms?.storeName || "매장";
          const html = renderStoreAndMissions({
            name: storeName,
            desc: ms?.description || ms?.desc || "",
            road, jibun,
            relatedMissions: [ms],
          });

          missionInfoWindowRef.current?.setContent(html);
          missionInfoWindowRef.current?.open(map, marker);
          openedMarkerRef.current = marker;

          onMissionSelectRef.current?.({
            mission: ms, lat, lng, address: { road, jibun }
          });
        });
      });

      missionMarkersRef.current.push(marker);
    });
  }, [missions]);

  // 3-B) 매장 마커 (공통 템플릿 + 클릭 토글 + 미션 없으면 안내)
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    if (!kakao || !map || !geocoder) return;

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

      const pos = new kakao.maps.LatLng(lat, lng);
      const marker = new kakao.maps.Marker({
        position: pos,
        map,
        title: s.name,
        zIndex: 2,
      });

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

          const related = missionsByStoreId.get(s.id ?? s.storeId) || [];
          const html = renderStoreAndMissions({
            name: s.name || "매장",
            desc: s.description || "",
            road, jibun,
            relatedMissions: related,
          });

          storeInfoWindowRef.current?.setContent(html);
          storeInfoWindowRef.current?.open(map, marker);
          openedStoreMarkerRef.current = marker;
        });
      });

      storeMarkersRef.current.push(marker);
    });
  }, [stores, missions]);

  // 4-A) /map?storeId=... → 해당 위치로 이동 + 공통 템플릿 (미션 없으면 안내)
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

        // 상세 주소 + 관련 미션
        geocoder.coord2Address(lng, lat, (res, status) => {
          let road = "", jibun = "";
          if (status === kakao.maps.services.Status.OK && res?.[0]) {
            road = res.find((r) => r.road_address)?.road_address?.address_name || "";
            jibun = res[0]?.address?.address_name || "";
          }

          // 현재 보유한 missions에서 해당 매장 관련 미션 찾기
          const related = missions.filter(ms => {
            const sid = ms?.store?.id ?? ms?.storeId;
            return String(sid) === String(storeIdToFocus);
          });

          const html = renderStoreAndMissions({
            name: data?.name || "매장",
            desc: data?.description || "",
            road, jibun,
            relatedMissions: related,
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
  }, [storeIdToFocus, missions]);

  // 4-B) 리스트 선택 시: 좌표로만 이동(인포윈도우 자동 오픈 없음)
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
