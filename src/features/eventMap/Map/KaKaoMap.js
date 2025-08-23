/* eslint-env browser */
import { useEffect, useRef, useState } from "react";
import loadKakaoMaps from "./KakaoLoader";
import getCurrentLocation from "./Location";
import api from "../../../api";
import "./MapStyle.css";

const KAKAO_APP_KEY = "261b88294b81d5800071641ecc633dcb";

/* 날짜 헬퍼 */
const toDate = (v) => (v ? new Date(v) : null);
const isOngoing = (m, now = new Date()) => {
  const s = toDate(m.startAt || m.startDate);
  const e = toDate(m.endAt || m.endDate);
  const started = !s || s <= now;
  const notEnded = !e || now <= e;
  return started && notEnded;
};

/* 매장 정보만 담는 인포윈도우 템플릿 */
function renderStoreInfo({ storeName, desc, road, jibun }) {
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
  const [missions, setMissions] = useState([]); // 진행 가능한 미션(필요 시 조정)
  const [stores, setStores] = useState([]);

  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const containerRef = useRef(null);
  const centerAddrRef = useRef(null);
  const initialized = useRef(false);

  const storeMarkersRef = useRef([]);
  const storeInfoWindowRef = useRef(null);
  const openedStoreMarkerRef = useRef(null);

  const focusMarkerRef = useRef(null);
  const focusInfoWindowRef = useRef(null);

  const onMissionSelectRef = useRef(onMissionSelect);
  useEffect(() => { onMissionSelectRef.current = onMissionSelect; }, [onMissionSelect]);

  /* 1) 지도 초기화 */
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
          geocoderRef.current?.coord2RegionCode(coords.getLng(), coords.getLat(), cb);
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

  /* 2-A) 미션 로드 */
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

  /* 2-B) 매장 로드 */
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

  /* 3) 매장 마커(매장당 1개) + 클릭 시 즉시 상세 패널 갱신 */
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    if (!kakao || !map || !geocoder) return;

    // 초기화
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

    // 중복 방지
    const seenStoreIds = new Set();

    stores.forEach((s) => {
      const id = s.id ?? s.storeId;
      if (id == null) return;
      if (seenStoreIds.has(String(id))) return;
      seenStoreIds.add(String(id));

      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const pos = new kakao.maps.LatLng(lat, lng);
      const marker = new kakao.maps.Marker({
        position: pos,
        map,
        title: s.storeName || s.name,
        zIndex: 2,
      });

      kakao.maps.event.addListener(marker, "click", () => {
        // 진행 중 미션 고르기(있으면 첫 번째)
        const related = missionsByStoreId.get(id) || [];
        const ongoing = related.filter((m) => isOngoing(m));
        const selectedMission = ongoing[0] || null;

        // ✅ 1) 주소 역지오코딩 전에 먼저 상세 패널 갱신 (즉시 UI 반응)
        onMissionSelectRef.current?.({
          mission: selectedMission,
          lat,
          lng,
          address: { road: "", jibun: "" },
          store: {
            id,
            storeName: s.storeName || s.name,           // 요청사항: storeName 키
            address: s.address || "",
            latitude: s.latitude,
            longitude: s.longitude,
          },
        });

        // 인포윈도우 토글
        if (openedStoreMarkerRef.current === marker) {
          storeInfoWindowRef.current?.close();
          openedStoreMarkerRef.current = null;
          return;
        }

        // 2) 역지오코딩 후 인포윈도우/상세 패널 갱신
        geocoder.coord2Address(lng, lat, (res, status) => {
          let road = "", jibun = "";
          if (status === kakao.maps.services.Status.OK && res?.[0]) {
            road = res.find((r) => r.road_address)?.road_address?.address_name || "";
            jibun = res[0]?.address?.address_name || "";
          }

          const html = renderStoreInfo({
            storeName: s.storeName || s.name,
            desc: s.description || "",
            road, jibun,
          });
          storeInfoWindowRef.current?.setContent(html);
          storeInfoWindowRef.current?.open(map, marker);
          openedStoreMarkerRef.current = marker;

          // 상세 패널의 주소도 최신화
          onMissionSelectRef.current?.({
            mission: selectedMission,
            lat,
            lng,
            address: { road, jibun },
            store: {
              id,
              storeName: s.storeName || s.name,
              address: road || jibun || s.address || "",
              latitude: s.latitude,
              longitude: s.longitude,
            },
          });
        });
      });

      storeMarkersRef.current.push(marker);
    });
  }, [stores, missions]);

  /* 4-A) ?storeId= 포커스 */
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

        if (!focusMarkerRef.current) {
          focusMarkerRef.current = new kakao.maps.Marker({ zIndex: 4 });
        }
        focusMarkerRef.current.setPosition(pos);
        focusMarkerRef.current.setMap(map);

        // 진행중 미션 선택
        const related = missions.filter((m) => {
          const sid = m?.store?.id ?? m?.storeId;
          return String(sid) === String(storeIdToFocus);
        });
        const ongoing = related.filter((m) => isOngoing(m));
        const selectedMission = ongoing[0] || null;

        // 먼저 상세 패널 반영
        onMissionSelectRef.current?.({
          mission: selectedMission,
          lat,
          lng,
          address: { road: "", jibun: "" },
          store: {
            id: data?.id ?? data?.storeId ?? storeIdToFocus,
            storeName: data?.storeName || data?.name || "매장",
            address: data?.address || "",
            latitude: data?.latitude,
            longitude: data?.longitude,
          },
        });

        // 역지오코딩 + 인포윈도우
        geocoder.coord2Address(lng, lat, (res, status) => {
          let road = "", jibun = "";
          if (status === kakao.maps.services.Status.OK && res?.[0]) {
            road = res.find((r) => r.road_address)?.road_address?.address_name || "";
            jibun = res[0]?.address?.address_name || "";
          }

          const html = renderStoreInfo({
            storeName: data?.storeName || data?.name || "매장",
            desc: data?.description || "",
            road, jibun,
          });
          if (!focusInfoWindowRef.current) {
            focusInfoWindowRef.current = new kakao.maps.InfoWindow({ zIndex: 4 });
          }
          focusInfoWindowRef.current.setContent(html);
          focusInfoWindowRef.current.open(map, focusMarkerRef.current);

          // 상세 패널 주소 최신화
          onMissionSelectRef.current?.({
            mission: selectedMission,
            lat,
            lng,
            address: { road, jibun },
            store: {
              id: data?.id ?? data?.storeId ?? storeIdToFocus,
              storeName: data?.storeName || data?.name || "매장",
              address: road || jibun || data?.address || "",
              latitude: data?.latitude,
              longitude: data?.longitude,
            },
          });
        });
      } catch (e) {
        console.warn("store focus failed:", e?.response?.data || e);
      }
    })();
  }, [storeIdToFocus, missions]);

  /* 4-B) 좌표 포커스만 */
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
