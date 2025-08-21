import React, { useEffect, useMemo, useState } from "react";
import "./SelectStyle.css";
import api from "../../../api"; // 경로는 실제 구조에 맞게

function SelectShop({ onSelect }) {
  const [selectedId, setSelectedId] = useState(""); // "" | string
  const [stores, setStores] = useState([]);         // [{id, name, latitude, longitude, ...}]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/itda/me/stores");
        const list = Array.isArray(data) ? data : data?.items || [];

        // ✅ 서버 응답 필드명이 제각각일 수 있으므로 여기서 통일
        const normalized = list.map((raw) => {
          const id =
            raw?.id ??
            raw?.storeId ??
            raw?.store?.id;

          const name =
            raw?.name ??
            raw?.storeName ??
            raw?.store?.name ??
            raw?.shopName ??
            raw?.title ??
            (id != null ? `매장#${id}` : "이름 없음");

          // 위도/경도 보강 (문자열이면 숫자로, 대체 키도 고려)
          const latRaw = raw?.latitude ?? raw?.lat ?? raw?.store?.latitude;
          const lngRaw = raw?.longitude ?? raw?.lng ?? raw?.store?.longitude;
          const latitude =
            typeof latRaw === "string" ? Number(latRaw) : latRaw;
          const longitude =
            typeof lngRaw === "string" ? Number(lngRaw) : lngRaw;

          return {
            ...raw,
            id,
            name,
            latitude,
            longitude,
          };
        });

        if (mounted) setStores(normalized);
      } catch (e) {
        if (mounted) {
          setError("매장 목록을 불러오지 못했습니다.");
          setStores([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedStore = useMemo(
    () => stores.find((s) => String(s.id) === String(selectedId)),
    [stores, selectedId]
  );

  // ✅ 선택 시 hidden input & 콜백 세팅
  useEffect(() => {
    const storeIdInput = document.getElementById("event-store-id");
    const shopInput = document.getElementById("event-shop");
    const latInput = document.getElementById("event-lat");
    const lngInput = document.getElementById("event-lng");
    const addrInput = document.getElementById("event-address");

    if (selectedStore) {
      storeIdInput && (storeIdInput.value = String(selectedStore.id));
      shopInput && (shopInput.value = selectedStore.name ?? "");
      latInput && (latInput.value = selectedStore.latitude ?? "");
      lngInput && (lngInput.value = selectedStore.longitude ?? "");
      addrInput && (addrInput.value = "");

      typeof onSelect === "function" &&
        onSelect({
          id: selectedStore.id,
          name: selectedStore.name,
          latitude: selectedStore.latitude,
          longitude: selectedStore.longitude,
          category: selectedStore.category,
          description: selectedStore.description,
        });
    } else {
      storeIdInput && (storeIdInput.value = "");
      shopInput && (shopInput.value = "");
      latInput && (latInput.value = "");
      lngInput && (lngInput.value = "");
      addrInput && (addrInput.value = "");
    }
  }, [selectedStore, onSelect]);

  const hasStores = stores.length > 0;

  const handleChange = (e) => {
    setSelectedId(e.target.value); // 문자열로 관리
  };

  return (
    <div className="select-shop-wrap">
      {/* CreateReviewEvent.collect() 가 읽는 hidden inputs */}
      <input type="hidden" id="event-store-id" />
      <input type="hidden" id="event-shop" />
      <input type="hidden" id="event-lat" />
      <input type="hidden" id="event-lng" />
      <input type="hidden" id="event-address" />

      <select
        className={`select-input ${selectedId === "" ? "is-placeholder" : ""}`}
        value={selectedId}
        onChange={handleChange}
        disabled={loading}
        title={loading ? "불러오는 중..." : "매장 선택"}
      >
        <option value="" disabled hidden>매장 선택</option>

        {loading && <option value="" disabled>불러오는 중...</option>}

        {!loading && error && (
          <option value="" disabled>매장 목록을 불러오지 못했습니다.</option>
        )}

        {!loading && !error && !hasStores && (
          <option value="" disabled>매장이 없습니다.</option>
        )}

        {!loading && !error && hasStores &&
          stores.map((s) => (
            <option key={String(s.id)} value={String(s.id)}>
              {s.name /* ← 정규화된 이름 */}
            </option>
          ))}
      </select>
    </div>
  );
}

export default SelectShop;
