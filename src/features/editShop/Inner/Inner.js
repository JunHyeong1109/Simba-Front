// src/app/features/editShop/Inner.js
import { useState } from "react";
import "./InnerStyle.css";
import api from "../../../api"; // axios 인스턴스
import AddrPickerModal from "./AddrPickerModal"; // 같은 폴더

function Inner() {
  const [shopName, setShopName] = useState("");
  const [bossName, setBossName] = useState("");
  const [shopNum, setShopNum] = useState("");
  const [addr, setAddr] = useState("");
  const [selectValue, setSelectValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // 주소 모달 관련 상태 (좌표는 선택되면 함께 저장)
  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [latLng, setLatLng] = useState({ lat: null, lng: null });

  const options = [
    { value: 0, label: "카페" },
    { value: 1, label: "식당" },
    { value: 2, label: "기타" },
  ];

  const normalizeBizNo = (raw) => raw.replace(/[^0-9]/g, "");
  const isValidBizNo = (raw) => normalizeBizNo(raw).length === 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!shopName.trim() || !bossName.trim() || !shopNum.trim() || !addr.trim() || selectValue === "") {
      setMessage({ type: "error", text: "모든 항목을 입력해주세요." });
      return;
    }
    if (!isValidBizNo(shopNum)) {
      setMessage({ type: "error", text: "사업자등록번호는 숫자 10자리여야 합니다. (하이픈 제외)" });
      return;
    }

    const payload = {
      name: shopName.trim(),
      category: Number(selectValue),
      ownerName: bossName.trim(),
      businessNumber: normalizeBizNo(shopNum),
      address: addr.trim(),
      // 좌표가 선택되었으면 함께 전송 (백엔드 스펙에 맞춰 키 이름 조정 가능)
      latitude: latLng.lat,
      longitude: latLng.lng,
    };

    try {
      setSubmitting(true);
      const { data } = await api.post("/itda/stores", payload);
      setMessage({ type: "success", text: data?.message || "등록이 완료되었습니다." });

      // 성공 후 초기화
      setShopName("");
      setBossName("");
      setShopNum("");
      setAddr("");
      setSelectValue("");
      setLatLng({ lat: null, lng: null });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "등록 중 오류가 발생했습니다.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
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

        {/* ⬇️ 주소만 모달 방식으로 변경 */}
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
          {latLng.lat && latLng.lng && (
            <small style={{ color: "#666" }}>
              선택 좌표: {latLng.lat.toFixed(6)}, {latLng.lng.toFixed(6)}
            </small>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "등록 중..." : "완료"}
          </button>
        </div>

        {message && (
          <p className={`message ${message.type === "error" ? "error" : "success"}`} style={{ marginTop: 8 }}>
            {message.text}
          </p>
        )}
      </form>

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
