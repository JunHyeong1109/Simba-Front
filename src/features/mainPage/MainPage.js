// src/features/main/MainPage.js
import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../../api";
import "./MainPage.css";

const MAP_ROUTE = "/map";
const MANAGE_ROUTE = "/manage";
const PREVIEW_LIMIT = 8;

export default function MainPage() {
  const navigate = useNavigate();
  const outletCtx = useOutletContext();
  const user = outletCtx?.user ?? null;

  const canManageStores = (u) => {
    if (!u) return false;
    const single = (u.role ? String(u.role) : "").toUpperCase();
    if (single) return single === "OWNER" || single === "ADMIN";
    const arr = Array.isArray(u.roles) ? u.roles.map((r) => String(r).toUpperCase()) : [];
    return arr.includes("OWNER") || arr.includes("ADMIN");
  };

  const handleManageClick = () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    if (!canManageStores(user)) {
      alert("권한이 없습니다. (리뷰어는 접근할 수 없습니다.)");
      return;
    }
    navigate(MANAGE_ROUTE);
  };

  // 1) joinable 미션 → 매장별 미리보기
  const [msLoading, setMsLoading] = useState(true);
  const [msError, setMsError] = useState("");
  const [missionStores, setMissionStores] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setMsLoading(true);
        setMsError("");

        const { data } = await api.get("/itda/missions/joinable");
        const list = Array.isArray(data) ? data : data?.items || [];

        const byStore = new Map();
        for (const m of list) {
          const s = m.store || {};
          const sid = s.id ?? m.storeId;
          if (!sid) continue;

          const poster =
            m.imgUrl ||
            m.posterUrl ||
            m.poster ||
            m.imageUrl ||
            m.thumbnailUrl ||
            m.iamegUrl || 
            "";

          if (!byStore.has(sid)) {
            byStore.set(sid, {
              storeId: sid,
              name: s.name || m.storeName || "매장",
              address: s.address || m.address || "",
              poster,
              count: 1,
            });
          } else {
            byStore.get(sid).count += 1;
          }
        }

        const items = Array.from(byStore.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, PREVIEW_LIMIT);

        if (!alive) return;
        setMissionStores(items);
      } catch (e) {
        if (!alive) return;
        setMsError(e?.response?.data?.message || "미션/매장 미리보기를 불러오지 못했습니다.");
        setMissionStores([]);
      } finally {
        if (alive) setMsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const hasMissionStores = missionStores.length > 0;
  const fmtCount = (n) => (n > 99 ? "99+" : String(n || 0));

  return (
    <div className="main-wrap">
      <h2 className="main-title">무엇을 하시겠어요?</h2>

      {/* 상단: 두 개의 주요 액션 버튼 */}
      <div className="main-grid">
        <button
          type="button"
          className="main-card"
          onClick={() => navigate(MAP_ROUTE)}
          aria-label="미션 이벤트 지도 보기"
        >
          <div className="card-emoji" aria-hidden>🗺️</div>
          <div className="card-title">Itda 이벤트 찾아보기!</div>
          <div className="card-desc">진행 가능한 미션을 지도에서 확인해요.</div>
        </button>

        <button
          type="button"
          className="main-card"
          onClick={handleManageClick}
          aria-label="내 매장 관리로 이동"
        >
          <div className="card-emoji" aria-hidden>🏪</div>
          <div className="card-title">매장 관리</div>
          <div className="card-desc">등록한 매장을 확인하고 편집해요.</div>
        </button>
      </div>

      {/* 하단: 미션이 올라온 매장 미리보기 */}
      <div className="main-sections vertical">
        <section className="home-section">
          <div className="section-header">
            <h3 className="section-title">미션이 올라온 매장</h3>
            <button type="button" className="link-btn" onClick={() => navigate(MAP_ROUTE)}>
              전체 보기 →
            </button>
          </div>

          {msLoading && <div className="section-empty">불러오는 중...</div>}
          {!msLoading && msError && <div className="section-error">{msError}</div>}
          {!msLoading && !msError && !hasMissionStores && (
            <div className="section-empty">현재 진행 가능한 미션이 없습니다.</div>
          )}

          {!msLoading && !msError && hasMissionStores && (
            <ul className="store-preview-grid">
              {missionStores.map((s) => (
                <li
                  key={s.storeId}
                  className="store-card"
                  title={s.name}
                  onClick={() => navigate(`${MAP_ROUTE}?storeId=${encodeURIComponent(s.storeId)}`)}
                >
                  <div className="store-thumb">
                    {s.poster ? (
                      <img src={s.poster} alt="포스터" />
                    ) : (
                      <div className="store-thumb-placeholder">포스터 없음</div>
                    )}
                    <span className="badge-count" aria-label={`진행중 미션 ${s.count}개`}>
                      {fmtCount(s.count)}
                    </span>
                  </div>
                  <div className="store-body">
                    <div className="store-name">{s.name}</div>
                    {s.address && <div className="store-addr">{s.address}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
