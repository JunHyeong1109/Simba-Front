import React, { useEffect, useMemo, useState } from "react";
import "./SelectStyle.css";
import api from "../../../api"; // 경로는 실제 구조에 맞게

function SelectShop({ onSelect }) {
  const [selectedId, setSelectedId] = useState(""); // "" | number
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
        const normalized = list.map((s) => ({
          ...s,
          latitude: typeof s.latitude === "string" ? Number(s.latitude) : s.latitude,
          longitude: typeof s.longitude === "string" ? Number(s.longitude) : s.longitude,
        }));
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

  // ✅ 선택 시 hidden input & 콜백 세팅 (store-id 추가/초기화)
  useEffect(() => {
    const storeIdInput = document.getElementById("event-store-id"); // ✅ 추가
    const shopInput = document.getElementById("event-shop");
    const latInput = document.getElementById("event-lat");
    const lngInput = document.getElementById("event-lng");
    const addrInput = document.getElementById("event-address"); // 주소는 현재 없음

    if (selectedStore) {
      storeIdInput && (storeIdInput.value = String(selectedStore.id));       // ✅ 추가
      shopInput && (shopInput.value = selectedStore.name ?? "");
      latInput && (latInput.value = selectedStore.latitude ?? "");
      lngInput && (lngInput.value = selectedStore.longitude ?? "");
      addrInput && (addrInput.value = ""); // 주소 없음 → 공백

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
      // 선택 해제/초기 상태
      storeIdInput && (storeIdInput.value = "");                             // ✅ 추가
      shopInput && (shopInput.value = "");
      latInput && (latInput.value = "");
      lngInput && (lngInput.value = "");
      addrInput && (addrInput.value = "");
    }
  }, [selectedStore, onSelect]);

  const hasStores = stores.length > 0;

  const handleChange = (e) => {
    setSelectedId(e.target.value); // 문자열로 유지(숫자 변환은 서버로 보낼 때 처리해도 OK)
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
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
      </select>
    </div>
  );
}

export default SelectShop;
