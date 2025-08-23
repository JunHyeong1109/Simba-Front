import React, { useEffect, useState } from "react";
import api from "../../../api";
import "./EventList.css";

/**
 * 역할: 선택된 매장의 정보 패널
 *
 * Props
 * - storeId: 선택된 매장 id
 * - address?: { road?: string, jibun?: string } (지도 역지오코딩 결과)
 */
function EventList({ storeId, address }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [store, setStore] = useState(null);
  const [summary, setSummary] = useState("");
  const [avgRating, setAvgRating] = useState(null);

  const [ongoing, setOngoing] = useState([]);
  const [missionsErr, setMissionsErr] = useState("");

  // ---- utils
  const toDate = (v) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") {
      const ms = v > 1e12 ? v : v * 1000;
      const d = new Date(ms);
      return isNaN(d) ? null : d;
    }
    const d = new Date(String(v));
    return isNaN(d) ? null : d;
  };

  const fmtDate = (d) => {
    const DT = toDate(d);
    return DT ? DT.toISOString().slice(0, 10) : "-";
  };

  const isOngoing = (m, now = new Date()) => {
    const s = toDate(m.startAt || m.startDate);
    const e = toDate(m.endAt || m.endDate);
    if (s && s > now) return false;
    if (e && e < now) return false;
    return true;
  };

  const stars = (n) => {
    const v = Math.max(0, Math.min(5, Math.floor(Number(n) || 0)));
    return "★".repeat(v) + "☆".repeat(5 - v);
  };

  // ---- data fetch
  useEffect(() => {
    let alive = true;

    const reset = () => {
      setStore(null);
      setSummary("");
      setAvgRating(null);
      setOngoing([]);
      setErr("");
      setMissionsErr("");
    };

    const fetchAvgRating = async (sid) => {
      const tryCalls = [
        async () => (await api.get(`/itda/stores/${sid}/rating`)).data,
        async () => (await api.get(`/itda/stores/${sid}/stats`)).data,
        async () =>
          (await api.get(`/itda/reviews/summary`, { params: { storeId: sid } }))
            .data,
      ];
      for (const call of tryCalls) {
        try {
          const res = await call();
          const avg =
            res?.avgRating ??
            res?.averageRating ??
            res?.avg ??
            res?.rating ??
            null;
          if (typeof avg === "number") return avg;
        } catch {
          /* next */
        }
      }
      // fallback: 리뷰로 계산
      try {
        const { data } = await api.get("/itda/reviews", {
          params: { storeId: sid, status: "APPROVED" },
        });
        const rows = Array.isArray(data) ? data : data?.items || data?.content || [];
        if (!rows.length) return null;
        const sum = rows.reduce((acc, r) => {
          const raw = r.rating ?? r.stars ?? 0;
          const num = typeof raw === "number" ? raw : Number(raw) || 0;
          return acc + num;
        }, 0);
        return Math.round((sum / rows.length) * 10) / 10;
      } catch {
        return null;
      }
    };

    const fetchAll = async (sid) => {
      setLoading(true);
      setErr("");
      try {
        // 1) store detail
        const { data: storeData } = await api.get(`/itda/stores/${sid}`);
        if (!alive) return;
        setStore(storeData || null);

        // 2) summary
        try {
          const { data: sum } = await api.get(`/itda/stores/${sid}/summary`);
          const text = typeof sum === "string" ? sum : sum?.summary || "";
          if (alive) setSummary(text);
        } catch {
          if (alive) setSummary("");
        }

        // 3) avg rating
        try {
          const avg = await fetchAvgRating(sid);
          if (alive)
            setAvgRating(typeof avg === "number" ? Math.round(avg * 10) / 10 : null);
        } catch {
          if (alive) setAvgRating(null);
        }

        // 4) ongoing missions
        try {
          const { data: msData } = await api.get(`/itda/missions`, {
            params: { storeId: sid },
          });
          const list = Array.isArray(msData) ? msData : msData?.items || [];
          const now = new Date();
          const flat = list
            .filter((m) => isOngoing(m, now))
            .map((m) => ({
              id: m.id ?? m.missionId,
              title: m.title || "미션",
              start: m.startAt || m.startDate || null,
              end: m.endAt || m.endDate || null,
            }));
          if (alive) setOngoing(flat);
        } catch (e) {
          if (alive) {
            setOngoing([]);
            setMissionsErr(
              e?.response?.data?.message || "미션 정보를 불러오지 못했습니다."
            );
          }
        }
      } catch (e) {
        if (alive) {
          setErr(e?.response?.data?.message || "매장 정보를 불러오지 못했습니다.");
          setStore(null);
          setSummary("");
          setAvgRating(null);
          setOngoing([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    if (!storeId) {
      reset();
      return;
    }
    fetchAll(storeId);

    return () => {
      alive = false;
    };
  }, [storeId]);

  const storeName = store?.storeName || store?.name || "-";
  const storeAddress =
    address?.road ||
    store?.roadAddress ||
    store?.address ||
    store?.jibunAddress ||
    address?.jibun ||
    "-";

  return (
    <div className="event-list" role="region" aria-label="매장 정보">
      {!storeId && (
        <div className="event-list-empty">마커를 눌러 매장을 선택하세요.</div>
      )}

      {storeId && loading && (
        <div className="event-list-empty">불러오는 중...</div>
      )}

      {storeId && !loading && err && (
        <div className="event-list-error">{err}</div>
      )}

      {storeId && !loading && !err && (
        <div className="store-panel">
          {/* 매장 기본 정보 */}
          <div className="store-head">
            <div className="store-name">{storeName}</div>
            <div className="store-addr">{storeAddress}</div>
            <div
              className="store-stars"
              aria-label={
                avgRating != null ? `평균 별점 ${avgRating}점` : "평균 별점 없음"
              }
            >
              {avgRating != null ? (
                <>
                  <strong className="store-stars-num">{avgRating}</strong>
                  <span className="store-stars-badge">{stars(avgRating)}</span>
                </>
              ) : (
                "평균 별점 정보 없음"
              )}
            </div>
            {summary && (
              <div className="store-summary" title={summary}>
                {summary}
              </div>
            )}
          </div>

          {/* 구분선 */}
          <div className="store-divider" />

          {/* 진행 중 미션 */}
          <div className="store-missions">
            <div className="store-missions-title">진행 중인 미션</div>

            {missionsErr && (
              <div className="event-list-error">{missionsErr}</div>
            )}

            {!missionsErr && ongoing.length === 0 && (
              <div className="event-list-empty store-missions-empty">
                현재 진행 중인 미션이 없습니다.
              </div>
            )}

            {!missionsErr && ongoing.length > 0 && (
              <ul className="store-mission-list">
                {ongoing.map((m) => (
                  <li key={m.id} className="store-mission-item">
                    <div className="store-mission-title">{m.title}</div>
                    <div className="store-mission-dates">
                      {fmtDate(m.start)} ~ {fmtDate(m.end)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EventList;
