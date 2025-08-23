/* eslint-env browser */
/* src/features/eventMap/map/KaKaoMap.js */
import { useEffect, useRef, useState } from "react";
import loadKakaoMaps from "./KakaoLoader";
import getCurrentLocation from "./Location";
import api from "../../../api";
import "./MapStyle.css";

const KAKAO_APP_KEY = "261b88294b81d5800071641ecc633dcb";

export default function KaKaoMap({ onMissionSelect, storeIdToFocus, focus }) {
  const [stores, setStores] = useState([]);

  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const containerRef = useRef(null);
  const centerAddrRef = useRef(null);
  const initialized = useRef(false);

  const storeMarkersRef = useRef([]);
  const onMissionSelectRef = useRef(onMissionSelect);
  useEffect(() => { onMissionSelectRef.current = onMissionSelect; }, [onMissionSelect]);

  // 포커스 마커 (메인페이지 → 지도 진입 시 강조)
  const focusMarkerRef = useRef(null);

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
      storeMarkersRef.current.forEach((m) => m.setMap(null));
      storeMarkersRef.current = [];
      if (focusMarkerRef.current) {
        focusMarkerRef.current.setMap(null);
        focusMarkerRef.current = null;
      }
      mapRef.current = null;
      geocoderRef.current = null;
    };
  }, []);

  // 2) 모든 매장 불러오기
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/itda/stores");
        const list = Array.isArray(data) ? data : data?.items || [];
        if (!alive) return;

        // 숫자 보정 + 중복 제거(id 기준)
        const toNum = (v) =>
          v === null || v === undefined || v === "" ? undefined : Number(v);
        const uniq = new Map();
        for (const s of list) {
          const id = s.id ?? s.storeId;
          if (!id) continue;
          if (!uniq.has(id)) {
            uniq.set(id, {
              ...s,
              id,
              latitude: toNum(s?.latitude),
              longitude: toNum(s?.longitude),
            });
          }
        }
        setStores(Array.from(uniq.values()));
      } catch {
        if (!alive) setStores([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 3) 매장 마커 렌더링 (매장당 1개)
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    if (!kakao || !map || !geocoder) return;

    // 기존 마커 제거
    storeMarkersRef.current.forEach((m) => m.setMap(null));
    storeMarkersRef.current = [];

    // 클릭 핸들러
    const attachClick = (marker, s) => {
      kakao.maps.event.addListener(marker, "click", () => {
        const lat = Number(s.latitude);
        const lng = Number(s.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        // 역지오코딩으로 도로명/지번 주소 확보
        geocoder.coord2Address(lng, lat, (res, status) => {
          let road = "", jibun = "";
          if (status === kakao.maps.services.Status.OK && res?.[0]) {
            road = res.find((r) => r.road_address)?.road_address?.address_name || "";
            jibun = res[0]?.address?.address_name || "";
          }

          // ✅ 부모에 알림: mission 없이 store만 전달
          onMissionSelectRef.current?.({
            mission: null,
            store: s,
            lat,
            lng,
            address: { road, jibun },
          });
        });
      });
    };

    // 마커 생성
    for (const s of stores) {
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const pos = new kakao.maps.LatLng(lat, lng);
      const marker = new kakao.maps.Marker({
        position: pos,
        map,
        // ✅ 매장 타이틀: storeName 키 우선
        title: s.storeName || s.name || `매장#${s.id}`,
        zIndex: 2,
      });

      attachClick(marker, s);
      storeMarkersRef.current.push(marker);
    }
  }, [stores]);

  // 4-A) /map?storeId=... → 해당 위치로 이동 (자동 말풍선 오픈 제거)
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map || !storeIdToFocus) return;

    (async () => {
      try {
        const { data } = await api.get(`/itda/stores/${storeIdToFocus}`);
        const toNum = (v) => (v === null || v === undefined || v === "" ? undefined : Number(v));
        const lat = toNum(data?.latitude);
        const lng = toNum(data?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const pos = new kakao.maps.LatLng(lat, lng);
        map.panTo(pos);

        // 포커스 마커만 표시 (말풍선은 열지 않음)
        if (!focusMarkerRef.current) {
          focusMarkerRef.current = new kakao.maps.Marker({ zIndex: 4 });
        }
        focusMarkerRef.current.setPosition(pos);
        focusMarkerRef.current.setMap(map);

        // 혹시 열려 있을 수 있는 창들 닫기(고정 방지)
        // (현재는 인포윈도우를 사용하지 않지만, 남아있을 가능성 방지차원)
        if (map?.closeOverlay) try { map.closeOverlay(); } catch {}
      } catch (e) {
        console.warn("store focus failed:", e?.response?.data || e);
      }
    })();
  }, [storeIdToFocus]);

  // 4-B) 리스트/상세에서 좌표 전달 시 지도 이동
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
