// src/features/manage/ManageShop.js
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

/** 카테고리 값을 코드("0"|"1"|"2")로 강제 변환 */
const catToCode = (v) => {
  if (v === null || v === undefined || v === "") return "";
  const s = String(v).trim().toUpperCase();
  if (s === "CAFE") return "0";
  if (s === "RESTAURANT") return "1";
  if (s === "ETC") return "2";
  if (["0", "1", "2"].includes(s)) return s;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n <= 2 ? String(n) : "";
};

/** ✅ 백엔드 응답을 화면용 공통 스키마로 정규화 (owner 관련 필드는 원본에 유지) */
const normalizeStore = (raw = {}) => {
  const id = raw.id ?? raw.storeId ?? raw.storeID ?? raw._id ?? null;
  const name = raw.name ?? raw.storeName ?? raw.title ?? raw.shopName ?? "-";
  const businessNumber =
    raw.businessNumber ??
    raw.bizNo ??
    raw.businessRegistrationNumber ??
    raw.registrationNumber ??
    raw.brn ??
    raw.business_number ??
    "-";
  const address =
    raw.address ??
    raw.roadAddress ??
    raw.road_address ??
    raw.jibunAddress ??
    raw.addr ??
    raw.fullAddress ??
    "-";
  const category = catToCode(
    raw.category ?? raw.categoryCode ?? raw.type ?? raw.storeType ?? ""
  );
  const latitude = toNum(
    raw.latitude ?? raw.lat ?? raw.y ?? raw.geoLat ?? raw.location?.lat
  );
  const longitude = toNum(
    raw.longitude ?? raw.lng ?? raw.x ?? raw.geoLng ?? raw.location?.lng
  );
  return {
    id: id != null ? String(id) : null, // 문자열로 고정
    name,
    businessNumber,
    address,
    category,
    latitude,
    longitude,
    __raw: raw,
  };
};

/** 사업자번호 포맷팅 */
const fmtBizNo = (bn) => {
  const d = String(bn ?? "").replace(/\D/g, "");
  return d.length === 10
    ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
    : bn || "-";
};

/** ---------- 부가 데이터 수집 유틸들 ---------- */

/** 안전한 키 추출: 평균 평점 */
const pickAvgRating = (obj) => {
  if (!obj || typeof obj !== "object") return null;
  const cands = [
    obj.average,
    obj.avg,
    obj.mean,
    obj.rating,
    obj.value,
    obj.score,
    obj?.summary?.average,
    obj?.summary?.avg,
  ];
  const n = cands.map(toNum).find((v) => v != null);
  return n != null ? n : null;
};

/** 안전한 키 추출: 개수/카운트 */
const pickCount = (obj) => {
  if (!obj || typeof obj !== "object") return null;
  const cands = [obj.count, obj.total, obj.size, obj.reviewCount, obj?.summary?.count];
  const n = cands.map(toNum).find((v) => v != null);
  return n != null ? n : null;
};

/** 매장별 summary/stats/rating 호출 (경로 고정) */
const fetchStoreExtras = async (storeId) => {
  // ✅ 올바른 엔드포인트 규칙:
  //   - /summary?storeId=ID
  //   - /stats?storeId=ID
  //   - /rating?storeId=ID
  // (과거의 /reviews/summary 같은 경로는 사용하지 않음)
  const qs = { params: { storeId } };

  const [sumRes, statsRes, ratingRes] = await Promise.allSettled([
    api.get("/summary", qs),
    api.get("/stats", qs),
    api.get("/rating", qs),
  ]);

  const summary = sumRes.status === "fulfilled" ? sumRes.value?.data : null;
  const stats = statsRes.status === "fulfilled" ? statsRes.value?.data : null;
  const rating = ratingRes.status === "fulfilled" ? ratingRes.value?.data : null;

  // 표시용 파생값
  const avg = pickAvgRating(rating) ?? pickAvgRating(summary);
  const cnt = pickCount(rating) ?? pickCount(summary) ?? pickCount(stats);

  return { summary, stats, rating, _avg: avg, _count: cnt };
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

        // 개인 매장 목록
        const { data } = await api.get("/itda/me/stores"); // withCredentials는 api 인스턴스에서 설정되어 있어야 함
        const list = Array.isArray(data) ? data : data?.items || [];

        // 정규화
        const normalized = list.map(normalizeStore);

        // ✅ id 없는 항목 제외 + id 기준 중복 제거
        const uniq = new Map();
        for (const s of normalized) {
          if (!s.id) continue;
          if (!uniq.has(s.id)) uniq.set(s.id, s);
        }
        const finalList = Array.from(uniq.values());

        if (!alive) return;

        // 우선 기본 목록 렌더링
        setStores(finalList);

        // ---------- 부가 데이터 병렬 수집 ----------
        const extrasList = await Promise.all(
          finalList.map(async (s) => {
            try {
              const extras = await fetchStoreExtras(s.id);
              return { id: s.id, extras };
            } catch {
              return { id: s.id, extras: { summary: null, stats: null, rating: null, _avg: null, _count: null } };
            }
          })
        );

        if (!alive) return;

        // 매칭하여 병합
        const extrasMap = new Map(extrasList.map(({ id, extras }) => [id, extras]));
        setStores((prev) =>
          prev.map((s) => ({
            ...s,
            __extras: extrasMap.get(s.id) || null,
          }))
        );
      } catch (e) {
        if (!alive) return;

        // ✅ 401 이면 로그인으로
        if (e?.response?.status === 401) {
          alert("로그인이 필요합니다.");
          navigate("/login");
          return;
        }

        setErr(e?.response?.data?.message || "매장 목록을 불러오지 못했습니다.");
        setStores([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [navigate]);

  const goCreate = () => {
    navigate("/edit");
  };

  const goEdit = (store) => {
    if (!store?.id) {
      alert("이 매장은 식별자가 없어 편집할 수 없습니다.");
      return;
    }
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
        {stores.map((s) => {
          const avg = s.__extras?._avg;
          const cnt = s.__extras?._count;
          const chip = avg != null ? `${avg.toFixed ? avg.toFixed(1) : avg}★${cnt != null ? ` · ${cnt}` : ""}` : null;

          return (
            <div
              key={s.id}
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
                {chip && (
                  <span
                    className="shop-rating-chip"
                    title="평균 평점 · 리뷰 수"
                    style={{
                      marginLeft: "auto",
                      fontSize: 12,
                      color: "#333",
                      background: "#fff7e6",
                      border: "1px solid #ffe0a3",
                      borderRadius: 999,
                      padding: "2px 8px",
                    }}
                  >
                    {chip}
                  </span>
                )}
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
                  {s.latitude != null && s.longitude != null ? `${s.latitude}, ${s.longitude}` : "-"}
                </span>
              </div>

              {/* 선택적으로 더 보여줄 수 있는 stats 조각 */}
              {s.__extras?.stats && (
                <div className="shop-meta" style={{ display: "flex", gap: 8, fontSize: 13, marginTop: 6, color: "#555" }}>
                  <span className="label" style={{ width: 88, color: "#777", flex: "0 0 88px" }}>
                    통계
                  </span>
                  <span className="value" style={{ color: "#333" }}>
                    {/* 프로젝트별로 키가 다를 수 있어 유연하게 표기 */}
                    {Object.entries(s.__extras.stats)
                      .slice(0, 3) // 너무 길어지지 않게 몇 개만
                      .map(([k, v]) => `${k}: ${typeof v === "number" ? v : String(v)}`)
                      .join(" · ")}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
