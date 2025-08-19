import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import "./MainPage.css";

const MAP_ROUTE = "/map";
const MANAGE_ROUTE = "/manage";

// 미리보기/요약 개수 제한 (과도한 병렬요청 방지)
const PREVIEW_LIMIT = 8;
const SUMMARY_LIMIT = 12;

export default function MainPage() {
  const navigate = useNavigate();

  // 1) joinable 미션 → 매장별 미리보기
  const [msLoading, setMsLoading] = useState(true);
  const [msError, setMsError] = useState("");
  const [missionStores, setMissionStores] = useState([]); // [{storeId,name,address,count,poster,lat,lng}]

  // 2) 모든 매장 한 줄 요약
  const [sumLoading, setSumLoading] = useState(true);
  const [sumError, setSumError] = useState("");
  const [summaries, setSummaries] = useState([]); // [{id,name,summary}]

  // ── 미션이 올라온 매장 미리보기 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setMsLoading(true);
        setMsError("");

        const { data } = await api.get("/itda/missions/joinable");
        const list = Array.isArray(data) ? data : data?.items || [];

        // 매장별 그룹핑
        const byStore = new Map();
        for (const m of list) {
          const s = m.store || {};
          const sid = s.id ?? m.storeId;
          if (!sid) continue;

          const poster =
            m.posterUrl || m.poster || m.imageUrl || m.thumbnailUrl || "";

          if (!byStore.has(sid)) {
            byStore.set(sid, {
              storeId: sid,
              name: s.name || m.storeName || "매장",
              address: s.address || m.address || "",
              poster, // 첫 미션 포스터를 대표로
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

  // ── 모든 매장 한 줄 요약 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setSumLoading(true);
        setSumError("");

        // 모든 매장 목록 (백엔드가 전체를 반환한다고 가정)
        const { data } = await api.get("/itda/stores");
        const stores = Array.isArray(data) ? data : data?.items || [];
        const pick = stores.slice(0, SUMMARY_LIMIT); // 상위 일부만 조회

        if (pick.length === 0) {
          if (!alive) return;
          setSummaries([]);
          return;
        }

        // 각 매장 요약 병렬 조회
        const results = await Promise.allSettled(
          pick.map(async (s) => {
            const { data: sum } = await api.get(`/itda/stores/${s.id}/summary`);
            const text = typeof sum === "string" ? sum : (sum?.summary ?? "");
            return { id: s.id, name: s.name, summary: text };
          })
        );

        const ok = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);

        if (!alive) return;
        setSummaries(ok);
      } catch (e) {
        if (!alive) return;
        setSumError(e?.response?.data?.message || "매장 요약을 불러오지 못했습니다.");
        setSummaries([]);
      } finally {
        if (alive) setSumLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const hasMissionStores = missionStores.length > 0;
  const hasSummaries = summaries.length > 0;
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
          onClick={() => navigate(MANAGE_ROUTE)}
          aria-label="내 매장 관리로 이동"
        >
          <div className="card-emoji" aria-hidden>🏪</div>
          <div className="card-title">매장 관리</div>
          <div className="card-desc">등록한 매장을 확인하고 편집해요.</div>
        </button>
      </div>

      {/* 하단: 위아래 섹션 */}
      <div className="main-sections vertical">
        {/* 섹션 A: 미션이 올라온 매장 미리보기 */}
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
                  onClick={() => navigate(`${MAP_ROUTE}?storeId=${s.storeId}`)}
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

        {/* 섹션 B: 모든 매장의 한 줄 요약 (관리 버튼 제거) */}
        <section className="home-section">
          <div className="section-header">
            <h3 className="section-title">매장의 한 줄 평가!</h3>
          </div>

          {sumLoading && <div className="section-empty">불러오는 중...</div>}
          {!sumLoading && sumError && <div className="section-error">{sumError}</div>}
          {!sumLoading && !sumError && !hasSummaries && (
            <div className="section-empty">요약이 없습니다.</div>
          )}

          {!sumLoading && !sumError && hasSummaries && (
            <ul className="summary-list">
              {summaries.map((s) => (
                <li
                  key={s.id}
                  className="summary-item"
                  title={s.name}
                  onClick={() => navigate(`${MAP_ROUTE}?storeId=${s.id}`)}
                >
                  <div className="summary-name">{s.name}</div>
                  <div className="summary-text">
                    {s.summary || "요약이 제공되지 않았습니다."}
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
