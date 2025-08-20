// src/app/features/editShop/Inner.js
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import "./InnerStyle.css";
import api from "../../../api";
import AddrPickerModal from "./AddrPickerModal";

function Inner() {
  // 🔎 id를 여러 경로에서 방어적으로 추출
  const params = useParams();
  const location = useLocation();

  const paramId = params?.id; // /edit/:id
  const queryId = new URLSearchParams(location.search).get("id"); // /edit?id=10
  const stateId = location.state?.id; // navigate(..., { state: { id: 10 }})
  const pathTail = location.pathname.split("/").filter(Boolean).pop(); // 마지막 세그먼트
  const tailId = /^\d+$/.test(pathTail) ? pathTail : null;

  const rawId = paramId || queryId || stateId || tailId || null;
  const id = rawId != null ? String(rawId) : null;
  const isEdit = !!id;

  const [shopName, setShopName] = useState("");
  const [bossName, setBossName] = useState("");
  const [shopNum, setShopNum] = useState("");
  const [addr, setAddr] = useState("");
  const [selectValue, setSelectValue] = useState("");
  const [latLng, setLatLng] = useState({ lat: null, lng: null });

  const [addrModalOpen, setAddrModalOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [loadError, setLoadError] = useState("");

  const options = [
    { value: 0, label: "카페" },
    { value: 1, label: "식당" },
    { value: 2, label: "기타" },
  ];

  const normalizeBizNo = (raw) => (raw || "").replace(/[^0-9]/g, "");
  const isValidBizNo = (raw) => normalizeBizNo(raw).length === 10;

  // ✅ 수정 모드: 기존 매장 로드
  useEffect(() => {
    let alive = true;

    // id가 없으면 API 호출하지 않고 안내만
    if (!isEdit) {
      setLoadingExisting(false);
      setLoadError("");
      return () => { alive = false; };
    }

    (async () => {
      try {
        setLoadingExisting(true);
        setLoadError("");

        const { data } = await api.get(`/itda/stores/${id}`);
        if (!alive) return;

        setShopName(data?.name || "");
        setBossName(data?.ownerName || data?.bossName || "");
        setShopNum(data?.businessNumber || "");
        setAddr(data?.address || "");
        setSelectValue(
          data?.category !== undefined && data?.category !== null
            ? String(data.category)
            : ""
        );

        const lat = data?.latitude ?? data?.lat ?? null;
        const lng = data?.longitude ?? data?.lng ?? null;
        setLatLng({
          lat: typeof lat === "number" ? lat : (lat ? Number(lat) : null),
          lng: typeof lng === "number" ? lng : (lng ? Number(lng) : null),
        });
      } catch (e) {
        const status = e?.response?.status;
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "가게 정보를 불러오지 못했습니다.";
        setLoadError(
          `[${status ?? "ERR"}] ${msg} (요청: /itda/stores/${id})`
        );
        // 디버깅 도움
        // eslint-disable-next-line no-console
        console.warn("load store failed:", e);
      } finally {
        if (alive) setLoadingExisting(false);
      }
    })();

  
    return () => { alive = false; };
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!shopName.trim() || !bossName.trim() || !shopNum.trim() || !addr.trim() || selectValue === "") {
      setMessage({ type: "error", text: "모든 항목을 입력해주세요." });
      return;
    }
    if (!isValidBizNo(shopNum)) {
      setMessage({
        type: "error",
        text: "사업자등록번호는 숫자 10자리여야 합니다. (하이픈 제외)",
      });
      return;
    }

    const payload = {
      name: shopName.trim(),
      category: Number(selectValue),
      ownerName: bossName.trim(),
      businessNumber: normalizeBizNo(shopNum),
      address: addr.trim(),
      latitude: latLng.lat,
      longitude: latLng.lng,
    };

    try {
      setSubmitting(true);
      const resp = isEdit
        ? await api.put(`/itda/stores/${id}`, payload)
        : await api.post("/itda/stores", payload);

      const okMsg =
        resp?.data?.message || (isEdit ? "수정이 완료되었습니다." : "등록이 완료되었습니다.");
      setMessage({ type: "success", text: okMsg });

      if (!isEdit) {
        setShopName("");
        setBossName("");
        setShopNum("");
        setAddr("");
        setSelectValue("");
        setLatLng({ lat: null, lng: null });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (isEdit ? "수정 중 오류가 발생했습니다." : "등록 중 오류가 발생했습니다.");
      setMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

 

  // 🖼 화면
  return (
    <>

      {isEdit && loadingExisting ? (
        <div className="loader">가게 정보를 불러오는 중…</div>
      ) : isEdit && loadError ? (
        <div className="error">{loadError}</div>
      ) : (
        <form className="row" onSubmit={handleSubmit}>
          <div>
            <h2>상호명</h2>
            <input
              className={`input ${shopName === "" ? "is-placeholder" : ""}`}
              type="text"
              value={shopName}
              placeholder="상호명을 입력해주세요."
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>

          <div>
            <h2>업종</h2>
            <select
              className={`input ${selectValue === "" ? "is-placeholder" : ""}`}
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
            >
              <option value="" disabled hidden>업종</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <h2>대표명</h2>
            <input
              className={`input ${bossName === "" ? "is-placeholder" : ""}`}
              type="text"
              value={bossName}
              placeholder="대표명을 입력해주세요."
              onChange={(e) => setBossName(e.target.value)}
            />
          </div>

          <div>
            <h2>사업자등록번호</h2>
            <input
              className={`input ${shopNum === "" ? "is-placeholder" : ""}`}
              type="text"
              value={shopNum}
              placeholder="사업자등록번호를 입력해주세요. (예: 123-45-67890)"
              onChange={(e) => setShopNum(e.target.value)}
            />
          </div>

          {/* 주소 + 좌표 */}
          <div>
            <h2>주소</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className={`input ${addr === "" ? "is-placeholder" : ""}`}
                type="text"
                value={addr}
                placeholder="주소를 선택해주세요."
                readOnly
                onClick={() => setAddrModalOpen(true)}
              />
              <button type="button" className="btn" onClick={() => setAddrModalOpen(true)}>
                주소 선택
              </button>
            </div>
            {latLng.lat != null && latLng.lng != null && (
              <small style={{ color: "#666" }}>
                선택 좌표: {Number(latLng.lat).toFixed(6)}, {Number(latLng.lng).toFixed(6)}
              </small>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? (isEdit ? "수정 중..." : "등록 중...") : (isEdit ? "수정 완료" : "완료")}
            </button>
          </div>

          {message && (
            <p className={`message ${message.type === "error" ? "error" : "success"}`} style={{ marginTop: 8 }}>
              {message.text}
            </p>
          )}
        </form>
      )}

      {/* 주소 픽커 모달 */}
      <AddrPickerModal
        open={addrModalOpen}
        defaultAddress={addr}
        onClose={() => setAddrModalOpen(false)}
        onConfirm={({ address, latitude, longitude }) => {
          setAddr(address || "");
          setLatLng({ lat: latitude, lng: longitude });
          setAddrModalOpen(false);
        }}
      />
    </>
  );
}

export default Inner;
