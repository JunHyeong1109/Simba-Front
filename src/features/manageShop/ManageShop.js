import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import "./ManageShop.css";

/** 숫자화 유틸 */
const toNum = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
};

/** 카테고리 라벨 */
const catLabel = (c) => {
  const map = {
    CAFE: "카페",
    RESTAURANT: "식당",
    ETC: "기타",
    0: "카페",
    1: "식당",
    2: "기타",
    "0": "카페",
    "1": "식당",
    "2": "기타",
  };
  return map[c] || c || "-";
};

/** ✅ 백엔드 응답을 화면용 공통 스키마로 정규화 */
const normalizeStore = (raw = {}) => {
  // id
  const id =
    raw.id ?? raw.storeId ?? raw.storeID ?? raw._id ?? null;

  // name
  const name =
    raw.name ?? raw.storeName ?? raw.title ?? raw.shopName ?? "-";

  // ownerName
  const ownerName =
    raw.ownerName ?? raw.bossName ?? raw.owner ?? raw.contactName ?? raw.owner_full_name ?? "-";

  // businessNumber
  const businessNumber =
    raw.businessNumber ??
    raw.bizNo ??
    raw.businessRegistrationNumber ??
    raw.registrationNumber ??
    raw.brn ??
    raw.business_number ??
    "-";

  // address (도로명/지번/합쳐진 주소 중 하나)
  const address =
    raw.address ??
    raw.roadAddress ??
    raw.road_address ??
    raw.jibunAddress ??
    raw.addr ??
    raw.fullAddress ??
    "-";

  // category
  const category =
    raw.category ?? raw.categoryCode ?? raw.type ?? raw.storeType ?? null;

  // latitude / longitude
  const latitude = toNum(
    raw.latitude ?? raw.lat ?? raw.y ?? raw.geoLat ?? raw.location?.lat
  );
  const longitude = toNum(
    raw.longitude ?? raw.lng ?? raw.x ?? raw.geoLng ?? raw.location?.lng
  );

  return {
    id,
    name,
    ownerName,
    businessNumber,
    address,
    category,
    latitude,
    longitude,
    // 원본이 필요하면 raw도 유지 가능
    __raw: raw,
  };
};

/** 사업자번호 포맷팅 */
const fmtBizNo = (bn) => {
  const d = String(bn ?? "").replace(/\D/g, "");
  return d.length === 10
    ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
    : (bn || "-");
};

export default function ManageShop() {
  const navigate = useNavigate();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const { data } = await api.get("/itda/stores");
        const list = Array.isArray(data) ? data : data?.items || [];

        // ✅ 각 항목을 정규화
        const normalized = list.map((item) => normalizeStore(item));

        if (!alive) return;
        setStores(normalized);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || "매장 목록을 불러오지 못했습니다.");
        setStores([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  const goCreate = () => {
    navigate("/edit");
  };

  const goEdit = (store) => {
    // ✅ 정규화된 데이터 통째로 넘김 → Inner.js에서 state 활용 가능
    navigate(`/edit/${store.id}`, { state: store });
  };

  return (
    <div className="manage-shop-wrap" style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <div
        className="manage-shop-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}
      >
        <h2 style={{ margin: 0 }}>내 매장 관리</h2>
        <button className="btn" onClick={goCreate} style={{ padding: "8px 12px", borderRadius: 8 }}>
          매장 추가
        </button>
      </div>

      {loading && (
        <div className="placeholder" style={{ padding: 12, background: "#f8f9fa", borderRadius: 8 }}>
          불러오는 중...
        </div>
      )}

      {!loading && err && (
        <div
          className="placeholder error"
          style={{ padding: 12, background: "#fff4f4", border: "1px solid #ffd5d5", borderRadius: 8, color: "#c00" }}
        >
          {err}
        </div>
      )}

      {!loading && !err && stores.length === 0 && (
        <div
          className="placeholder"
          style={{ padding: 12, background: "#f8f9fa", border: "1px solid #eee", borderRadius: 8 }}
        >
          등록된 매장이 없습니다.
          <button className="btn" onClick={goCreate} style={{ marginLeft: 8, padding: "6px 10px", borderRadius: 8 }}>
            지금 추가하기
          </button>
        </div>
      )}

      <div
        className="manage-shop-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        {stores.map((s) => (
          <div
            key={s.id ?? Math.random()}
            className="shop-card"
            role="button"
            tabIndex={0}
            onClick={() => goEdit(s)}
            onKeyDown={(e) => e.key === "Enter" && goEdit(s)}
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              cursor: "pointer",
              transition: "box-shadow .2s, transform .05s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            <div className="shop-card-title" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span className="shop-name" style={{ fontWeight: 700, fontSize: 16 }}>
                {s.name || "-"}
              </span>
              {s.category != null && (
                <span
                  className="shop-category"
                  style={{
                    fontSize: 12,
                    color: "#555",
                    background: "#f1f3f5",
                    borderRadius: 999,
                    padding: "2px 8px",
                  }}
                >
                  {catLabel(s.category)}
                </span>
              )}
            </div>

            <div className="shop-meta" style={{ display: "flex", gap: 8, fontSize: 14, margin: "4px 0" }}>
              <span className="label" style={{ width: 88, color: "#777", flex: "0 0 88px" }}>
                대표명
              </span>
              <span className="value" style={{ color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.ownerName || "-"}
              </span>
            </div>

            <div className="shop-meta" style={{ display: "flex", gap: 8, fontSize: 14, margin: "4px 0" }}>
              <span className="label" style={{ width: 88, color: "#777", flex: "0 0 88px" }}>
                사업자번호
              </span>
              <span className="value" style={{ color: "#333" }}>
                {fmtBizNo(s.businessNumber)}
              </span>
            </div>

            <div className="shop-meta" style={{ display: "flex", gap: 8, fontSize: 14, margin: "4px 0" }}>
              <span className="label" style={{ width: 88, color: "#777", flex: "0 0 88px" }}>
                주소
              </span>
              <span
                className="value"
                style={{ color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={s.address || ""}
              >
                {s.address || "-"}
              </span>
            </div>

            <div className="shop-meta" style={{ display: "flex", gap: 8, fontSize: 14, margin: "4px 0" }}>
              <span className="label" style={{ width: 88, color: "#777", flex: "0 0 88px" }}>
                좌표
              </span>
              <span className="value" style={{ color: "#333" }}>
                {s.latitude != null && s.longitude != null
                  ? `${s.latitude}, ${s.longitude}`
                  : "-"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
