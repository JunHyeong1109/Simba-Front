// src/app/features/editShop/Inner.js
import { useEffect, useState } from "react";
import { useLocation, useParams, useOutletContext, useNavigate } from "react-router-dom";
import "./InnerStyle.css";
import api from "../../../api";
import AddrPickerModal from "./AddrPickerModal";

const MANAGE_SHOP_PATH = "/manage"; // ✅ 필요 시 프로젝트 경로에 맞게 수정

function Inner() {
  // 🔎 id를 여러 경로에서 방어적으로 추출
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const paramId = params?.id; // /edit/:id
  const queryId = new URLSearchParams(location.search).get("id"); // /edit?id=10
  const stateId = location.state?.id; // navigate(..., { state: { id: 10 }})
  const pathTail = location.pathname.split("/").filter(Boolean).pop(); // 마지막 세그먼트
  const tailId = /^\d+$/.test(pathTail) ? pathTail : null;

  const rawId = paramId || queryId || stateId || tailId || null;
  const id = rawId != null ? String(rawId) : null;
  const isEdit = !!id;

  // 🔐 로그인 유저 (AppLayout에서 제공되는 컨텍스트 사용)
  const { user } = useOutletContext() || {};
  const loginDisplayName =
    user?.name || user?.nickname || user?.username || user?.displayName || "";

  const [shopName, setShopName] = useState("");
  const [shopNum, setShopNum] = useState("");
  const [addr, setAddr] = useState("");
  const [selectValue, setSelectValue] = useState("");
  const [latLng, setLatLng] = useState({ lat: null, lng: null });

  // 화면 표시에만 쓰는 대표명(서버에는 전송 안 함)
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

  // 로그인 이름이 바뀌면 표시값 보정(등록 모드 기준)
  useEffect(() => {
    if (!isEdit) setOwnerNameDisplay((prev) => prev || loginDisplayName);
  }, [isEdit, loginDisplayName]);

  // ✅ 수정 모드: 기존 매장 로드 (표시는 기존값 우선, 없으면 로그인 이름)
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

        setShopName(data?.name || "");
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

        // 화면 표시에만 사용 (PUT/POST 전송 안 함)
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
        // eslint-disable-next-line no-console
        console.warn("load store failed:", e);
      } finally {
        if (alive) setLoadingExisting(false);
      }
    })();

    return () => {
      alive = false;
    };
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

    // 서버에 대표명은 전송하지 않음 (로그인 사용자 기준으로 백엔드가 채움)
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

      // ✅ 성공 시 목록(ManageShop)으로 이동
      navigate(MANAGE_SHOP_PATH, { replace: true });

      // (필요 시, 이동 없이 폼 초기화만 원한다면 아래를 사용하고 navigate는 제거)
      // if (!isEdit) {
      //   setShopName("");
      //   setShopNum("");
      //   setAddr("");
      //   setSelectValue("");
      //   setLatLng({ lat: null, lng: null });
      // }
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
              <option value="" disabled hidden>
                업종
              </option>
              {[
                { value: 0, label: "카페" },
                { value: 1, label: "식당" },
                { value: 2, label: "기타" },
              ].map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
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
              <button
                type="button"
                className="btn"
                onClick={() => setAddrModalOpen(true)}
              >
                주소 선택
              </button>
            </div>
            {latLng.lat != null && latLng.lng != null && (
              <small style={{ color: "#666" }}>
                선택 좌표: {Number(latLng.lat).toFixed(6)},{" "}
                {Number(latLng.lng).toFixed(6)}
              </small>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting
                ? isEdit
                  ? "수정 중..."
                  : "등록 중..."
                : isEdit
                ? "수정 완료"
                : "완료"}
            </button>
          </div>

          {message && (
            <p
              className={`message ${
                message.type === "error" ? "error" : "success"
              }`}
              style={{ marginTop: 8 }}
            >
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
