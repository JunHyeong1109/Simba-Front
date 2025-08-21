// src/app/features/editShop/Inner.js
import { useEffect, useState } from "react";
import { useLocation, useParams, useOutletContext, useNavigate } from "react-router-dom";
import "./InnerStyle.css";
import api from "../../../api";
import AddrPickerModal from "./AddrPickerModal";

const MANAGE_SHOP_PATH = "/manage";

// 🔧 이름/숫자 유틸
const pickName = (o = {}) =>
  o?.name ?? o?.storeName ?? o?.title ?? o?.shopName ?? "";

const toNumOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
};

function Inner() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const paramId = params?.id;
  const queryId = new URLSearchParams(location.search).get("id");
  const stateId = location.state?.id;
  const pathTail = location.pathname.split("/").filter(Boolean).pop();
  const tailId = /^\d+$/.test(pathTail) ? pathTail : null;

  const rawId = paramId || queryId || stateId || tailId || null;
  const id = rawId != null ? String(rawId) : null;
  const isEdit = !!id;

  const { user } = useOutletContext() || {};
  const loginDisplayName =
    user?.name || user?.nickname || user?.username || user?.displayName || "";

  const [shopName, setShopName] = useState("");
  const [shopNum, setShopNum] = useState("");
  const [addr, setAddr] = useState("");
  const [selectValue, setSelectValue] = useState("");
  const [latLng, setLatLng] = useState({ lat: null, lng: null });

  const [ownerNameDisplay, setOwnerNameDisplay] = useState(loginDisplayName);

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

  // ✅ state로 온 값으로 먼저 프리필 (API 전에도 화면에 바로 보이도록)
  const preFillFromState = () => {
    const s = location.state || {};
    if (!s || typeof s !== "object") return;

    setShopName((prev) => prev || pickName(s));
    setShopNum((prev) => prev || (s.businessNumber ?? ""));
    setAddr((prev) => prev || (s.address ?? ""));
    setSelectValue((prev) =>
      prev !== "" ? prev : (s.category !== undefined && s.category !== null ? String(s.category) : "")
    );

    const lat = toNumOrNull(s.latitude ?? s.lat ?? s.y);
    const lng = toNumOrNull(s.longitude ?? s.lng ?? s.x);
    setLatLng((prev) => ({
      lat: prev.lat ?? lat,
      lng: prev.lng ?? lng,
    }));
  };

  // 로그인 표시명 보정
  useEffect(() => {
    if (!isEdit) setOwnerNameDisplay((prev) => prev || loginDisplayName);
  }, [isEdit, loginDisplayName]);

  // ✅ 마운트 시 state 기반 프리필
  useEffect(() => {
    if (isEdit) {
      preFillFromState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // ✅ 수정 모드: 서버에서 기존 매장 로드 (이름 키 폭넓게 처리)
  useEffect(() => {
    let alive = true;

    if (!isEdit) {
      setLoadingExisting(false);
      setLoadError("");
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        setLoadingExisting(true);
        setLoadError("");

        const { data } = await api.get(`/itda/stores/${id}`);
        if (!alive) return;

        // 이름 키 다변화
        setShopName(pickName(data));
        setShopNum(data?.businessNumber || "");
        setAddr(data?.address || "");
        setSelectValue(
          data?.category !== undefined && data?.category !== null
            ? String(data.category)
            : ""
        );

        const lat = toNumOrNull(data?.latitude ?? data?.lat);
        const lng = toNumOrNull(data?.longitude ?? data?.lng);
        setLatLng({ lat, lng });

        const fromStore = data?.ownerName || data?.bossName || "";
        setOwnerNameDisplay(fromStore || loginDisplayName || "");
      } catch (e) {
        const status = e?.response?.status;
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "가게 정보를 불러오지 못했습니다.";
        setLoadError(
          `[${status ?? "ERR"}] ${msg} (요청: /itda/stores/${id})`
        );

        // ❗ 실패 시에도 state 값으로는 최소한 채워지도록
        preFillFromState();
        // eslint-disable-next-line no-console
        console.warn("load store failed:", e);
      } finally {
        if (alive) setLoadingExisting(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit, loginDisplayName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!shopName.trim() || !shopNum.trim() || !addr.trim() || selectValue === "") {
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
        resp?.data?.message ||
        (isEdit ? "수정이 완료되었습니다." : "등록이 완료되었습니다.");
      setMessage({ type: "success", text: okMsg });

      navigate(MANAGE_SHOP_PATH, { replace: true });
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
            <h2>사업자등록번호</h2>
            <input
              className={`input ${shopNum === "" ? "is-placeholder" : ""}`}
              type="text"
              value={shopNum}
              placeholder="사업자등록번호를 입력해주세요. (예: 123-45-67890)"
              onChange={(e) => setShopNum(e.target.value)}
            />
          </div>

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
            <p
              className={`message ${message.type === "error" ? "error" : "success"}`}
              style={{ marginTop: 8 }}
            >
              {message.text}
            </p>
          )}
        </form>
      )}

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
