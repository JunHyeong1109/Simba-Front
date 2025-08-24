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
  const [hotStoreIds, setHotStoreIds] = useState(new Set()); // 진행 가능한 미션 매장
  const [mapReady, setMapReady] = useState(false); // ✅ 지도 초기화 완료 신호

  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const containerRef = useRef(null);
  const centerAddrRef = useRef(null);
  const initialized = useRef(false);

  const storeMarkersRef = useRef([]);
  const onMissionSelectRef = useRef(onMissionSelect);
  useEffect(() => {
    onMissionSelectRef.current = onMissionSelect;
  }, [onMissionSelect]);

  // 메인 진입 강조용 포커스 마커 & 타이머 (초기 생성/표시는 하지 않음)
  const focusMarkerRef = useRef(null);
  const focusHideTimerRef = useRef(null);

  // 지도 이벤트 핸들러 참조(정리용)
  const onMapIdleRef = useRef(null);
  const onMapClickRef = useRef(null);
  const onMapDragStartRef = useRef(null);
  const onMapZoomChangedRef = useRef(null);

  const hideFocusMarker = () => {
    if (focusHideTimerRef.current) {
      clearTimeout(focusHideTimerRef.current);
      focusHideTimerRef.current = null;
    }
    if (focusMarkerRef.current) {
      focusMarkerRef.current.setMap(null);
      focusMarkerRef.current = null;
    }
  };

  // 1) 지도 초기화
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      // ✅ 항상 SDK를 먼저 로드
      const kakao = await loadKakaoMaps(KAKAO_APP_KEY);

      const initMapAt = (lat, lng) => {
        const container = containerRef.current;
        if (!container) return;

        const map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(lat, lng),
          level: 3,
        });
        mapRef.current = map;
        geocoderRef.current = new kakao.maps.services.Geocoder();

        // ✅ 지도 준비 완료 플래그
        setMapReady(true);

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

        // 중심 주소 표시
        searchAddrFromCoords(map.getCenter(), displayCenterInfo);
        onMapIdleRef.current = () =>
          searchAddrFromCoords(map.getCenter(), displayCenterInfo);
        kakao.maps.event.addListener(map, "idle", onMapIdleRef.current);

        // 강조 마커를 쉽게 숨기기 위한 사용자 이벤트
        onMapClickRef.current = () => hideFocusMarker();
        onMapDragStartRef.current = () => hideFocusMarker();
        onMapZoomChangedRef.current = () => hideFocusMarker();
        kakao.maps.event.addListener(map, "click", onMapClickRef.current);
        kakao.maps.event.addListener(map, "dragstart", onMapDragStartRef.current);
        kakao.maps.event.addListener(map, "zoom_changed", onMapZoomChangedRef.current);
      };

      // ✅ 위치 성공/실패와 무관하게 반드시 초기화되도록
      getCurrentLocation(
        (lat, lng) => initMapAt(lat, lng),
        () => initMapAt(37.5665, 126.9780) // 실패 시 기본 좌표(서울시청)
      );
    })();

    return () => {
      const kakao = window.kakao;
      if (kakao && mapRef.current) {
        if (onMapIdleRef.current)
          kakao.maps.event.removeListener(
            mapRef.current,
            "idle",
            onMapIdleRef.current
          );
        if (onMapClickRef.current)
          kakao.maps.event.removeListener(
            mapRef.current,
            "click",
            onMapClickRef.current
          );
        if (onMapDragStartRef.current)
          kakao.maps.event.removeListener(
            mapRef.current,
            "dragstart",
            onMapDragStartRef.current
          );
        if (onMapZoomChangedRef.current)
          kakao.maps.event.removeListener(
            mapRef.current,
            "zoom_changed",
            onMapZoomChangedRef.current
          );
      }
      storeMarkersRef.current.forEach((m) => m.setMap(null));
      storeMarkersRef.current = [];
      hideFocusMarker();
      mapRef.current = null;
      geocoderRef.current = null;
      setMapReady(false); // ✅ 언마운트 시 플래그 해제
    };
  }, []);

  // ✅ 지도 준비되면 한번 relayout (탭/모달/레이아웃 변화 대비)
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map || !mapReady) return;
    setTimeout(() => {
      map.relayout();
      map.setCenter(map.getCenter());
    }, 0);
  }, [mapReady]);

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
        if (alive) setStores([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 2-B) 진행 가능한 미션이 있는 매장 목록(Set) 불러오기 → 빨간 마커 표시용
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/itda/missions/joinable");
        const list = Array.isArray(data) ? data : data?.items || [];
        const set = new Set();
        for (const m of list) {
          const sid = m?.store?.id ?? m?.storeId;
          if (sid) set.add(Number(sid));
        }
        if (alive) setHotStoreIds(set);
      } catch {
        if (alive) setHotStoreIds(new Set());
      }
    })();
    return () => {
      alive = false;
    };
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

    // 마커 이미지(빨간 핀)
    const redPinSVG =
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">
          <defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity=".25"/></filter></defs>
          <path d="M12 33c5-8 10-12 10-19A10 10 0 1 0 2 14c0 7 5 11 10 19z" fill="#ef4444" filter="url(#s)"/>
          <circle cx="12" cy="12" r="4.2" fill="white"/>
        </svg>`
      );
    const redImg = new kakao.maps.MarkerImage(
      redPinSVG,
      new kakao.maps.Size(24, 34),
      { offset: new kakao.maps.Point(12, 34) }
    );

    // 클릭 핸들러
    const attachClick = (marker, s) => {
      kakao.maps.event.addListener(marker, "click", () => {
        // 강조 마커 숨기기
        hideFocusMarker();

        const lat = Number(s.latitude);
        const lng = Number(s.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        // 역지오코딩 → 도로명/지번
        geocoder.coord2Address(lng, lat, (res, status) => {
          let road = "",
            jibun = "";
          if (status === kakao.maps.services.Status.OK && res?.[0]) {
            road =
              res.find((r) => r.road_address)?.road_address?.address_name || "";
            jibun = res[0]?.address?.address_name || "";
          }

          // 부모로 알림
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

      // joinable 미션이 있는 매장은 빨간 마커
      const isHot = hotStoreIds.has(Number(s.id));
      const marker = new kakao.maps.Marker({
        position: pos,
        map,
        title: s.storeName || s.name || `매장#${s.id}`,
        zIndex: isHot ? 3 : 2,
        ...(isHot ? { image: redImg } : {}),
      });

      attachClick(marker, s);
      storeMarkersRef.current.push(marker);
    }
  }, [stores, hotStoreIds]);

  // 4-A) /map?storeId=... → 해당 위치로 이동 (강조 마커 없음)
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map || !storeIdToFocus) return;

    (async () => {
      try {
        const { data } = await api.get(`/itda/stores/${storeIdToFocus}`);
        const toNum = (v) =>
          v === null || v === undefined || v === "" ? undefined : Number(v);
        const lat = toNum(data?.latitude);
        const lng = toNum(data?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const pos = new kakao.maps.LatLng(lat, lng);
        map.panTo(pos);

        // ✅ 파란(기본) 강조 마커를 생성/표시하지 않음
        // 혹시 이전에 남아있을 수 있는 강조 마커가 있다면 숨김
        hideFocusMarker();
      } catch (e) {
        console.warn("store focus failed:", e?.response?.data || e);
      }
    })();

    // 타이머 정리만 남김
    return () => {
      if (focusHideTimerRef.current) {
        clearTimeout(focusHideTimerRef.current);
        focusHideTimerRef.current = null;
      }
    };
  }, [storeIdToFocus, mapReady]); // ✅ mapReady 추가로 초기화 후에도 재실행됨

  // 4-B) 리스트/상세에서 좌표 전달 시 → 강조 마커 즉시 숨김 + 지도 이동 (마커 생성 없음)
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map || !focus) return;

    hideFocusMarker();

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
