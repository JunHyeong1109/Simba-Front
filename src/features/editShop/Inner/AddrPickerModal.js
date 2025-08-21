import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./AddrPickerModalStyle.css";

export default function AddrPickerModal({
  open,
  defaultAddress = "",
  onClose,
  onConfirm,
}) {
  const overlayRef = useRef(null);
  const mapElRef = useRef(null);
  const postcodeLayerRef = useRef(null);

  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);

  const [addr, setAddr] = useState(defaultAddress);
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [roadAddr, setRoadAddr] = useState("");
  const [jibunAddr, setJibunAddr] = useState("");
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState("");

  const FALLBACK = { lat: 37.5665, lng: 126.9780 }; // 서울시청

  const getCurrentPosition = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(FALLBACK);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(FALLBACK),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });

  const initMap = async () => {
    if (!window.kakao?.maps) {
      setError("Kakao Maps SDK가 로드되지 않았습니다. index.html을 확인하세요.");
      return;
    }
    if (!window.kakao.maps.services) {
      setError("Kakao Maps services 라이브러리가 필요합니다. SDK URL에 libraries=services를 포함하세요.");
      return;
    }
    setError(null);

    const initial = await getCurrentPosition();

    const kakao = window.kakao;
    const center = new kakao.maps.LatLng(initial.lat, initial.lng);
    const map = new kakao.maps.Map(mapElRef.current, { center, level: 3 });
    mapRef.current = map;

    const marker = new kakao.maps.Marker({ position: center, draggable: true });
    marker.setMap(map);
    markerRef.current = marker;

    geocoderRef.current = new kakao.maps.services.Geocoder();

    setCoords(initial);
    reverseGeocode(initial);

    setTimeout(() => {
      map.relayout();
      map.setCenter(marker.getPosition());
    }, 0);

    kakao.maps.event.addListener(marker, "dragend", () => {
      const pos = marker.getPosition();
      const latLng = { lat: pos.getLat(), lng: pos.getLng() };
      setCoords(latLng);
      reverseGeocode(latLng);
      map.setCenter(pos);
    });
  };

  useEffect(() => {
    if (!open) return;
    setSearchText("");
    initMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 바디 스크롤 잠금 + ESC 닫기
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const y = window.scrollY;
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      window.scrollTo(0, y);
    };
  }, [open, onClose]);

  const reverseGeocode = ({ lat, lng }) => {
    const geocoder = geocoderRef.current;
    if (!geocoder) return;
    geocoder.coord2Address(lng, lat, (res, status) => {
      if (status !== window.kakao.maps.services.Status.OK || !res?.[0]) return;
      const road = res.find((r) => r.road_address)?.road_address?.address_name || "";
      const jibun = res[0]?.address?.address_name || "";
      setRoadAddr(road);
      setJibunAddr(jibun);
      setAddr(road || jibun || "");
    });
  };

  const searchAddress = (q) => {
    if (!q?.trim()) return;
    const geocoder = geocoderRef.current;
    if (!geocoder) return;

    geocoder.addressSearch(q.trim(), (res, status) => {
      if (status !== window.kakao.maps.services.Status.OK || !res?.[0]) return;
      const { y, x, road_address, address } = res[0];
      const latLng = { lat: parseFloat(y), lng: parseFloat(x) };
      setCoords(latLng);
      setRoadAddr(road_address?.address_name || "");
      setJibunAddr(address?.address_name || "");

      const kakaoLatLng = new window.kakao.maps.LatLng(latLng.lat, latLng.lng);
      markerRef.current.setPosition(kakaoLatLng);
      mapRef.current.setCenter(kakaoLatLng);
    });
  };

  const openPostcodeEmbed = () => {
    if (!window.daum?.Postcode) {
      setError("다음 우편번호 SDK가 로드되지 않았습니다. index.html을 확인하세요.");
      return;
    }
    postcodeLayerRef.current.style.display = "block";

    const layer = document.getElementById("addr-postcode-embed");
    layer.innerHTML = "";

    const postcode = new window.daum.Postcode({
      oncomplete: (data) => {
        const selected = data.roadAddress || data.jibunAddress || "";
        setAddr(selected);
        setSearchText(selected);
        searchAddress(selected);
        closePostcodeEmbed();
      },
      width: "100%",
      height: "100%",
    });

    postcode.embed(layer, { autoClose: false });
  };

  const closePostcodeEmbed = () => {
    if (postcodeLayerRef.current) {
      postcodeLayerRef.current.style.display = "none";
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="addr-modal-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
    >
      <div
        className="addr-modal-container"
        role="dialog"
        aria-modal="true"
        aria-label="주소 선택"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="addr-modal-header">
          <strong>주소 선택</strong>
        </div>

        <div className="addr-modal-body">
          {error && <div className="addr-error">{error}</div>}

          <div className="addr-search-row">
            <input
              type="text"
              className="addr-input"
              placeholder="주소를 입력하세요 (예: 서울특별시 중구 세종대로 110)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") searchAddress(searchText);
              }}
            />
            <button type="button" className="addr-btn" onClick={() => searchAddress(searchText)}>
              주소검색
            </button>
            <button type="button" className="addr-btn" onClick={openPostcodeEmbed}>
              우편번호
            </button>
          </div>

          <div ref={mapElRef} className="addr-map" />

          <div ref={postcodeLayerRef} className="addr-postcode-layer" style={{ display: "none" }}>
            <div className="addr-postcode-header">
              <span>우편번호 검색</span>
              <button type="button" className="addr-btn small" onClick={closePostcodeEmbed}>
                닫기
              </button>
            </div>
            <div id="addr-postcode-embed" className="addr-postcode-embed" />
          </div>

          <div className="addr-info-row">
            <div>
              <div className="addr-info-title">도로명</div>
              <div>{roadAddr || "-"}</div>
            </div>
            <div>
              <div className="addr-info-title">지번</div>
              <div>{jibunAddr || "-"}</div>
            </div>
            <div>
              <div className="addr-info-title">좌표</div>
              <div>
                {coords.lat != null && coords.lng != null ? (
                  <>
                    {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                  </>
                ) : (
                  "-"
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="addr-modal-footer">
          <button type="button" className="addr-btn" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="addr-btn confirm"
            onClick={() =>
              onConfirm?.({
                address: addr,
                roadAddress: roadAddr,
                jibunAddress: jibunAddr,
                latitude: coords.lat,
                longitude: coords.lng,
              })
            }
            disabled={!addr || coords.lat == null || coords.lng == null}
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
