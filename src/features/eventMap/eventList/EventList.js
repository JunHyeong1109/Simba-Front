// src/features/eventMap/eventList/EventList.js
import React, { useEffect, useState } from "react";
import api from "../../../api";
import "./EventList.css";

function EventList({ storeId, address, onPickMission }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [store, setStore] = useState(null);
  const [summary, setSummary] = useState("");

  const [avgRating, setAvgRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(null);

  const [ongoing, setOngoing] = useState([]);
  const [missionsErr, setMissionsErr] = useState("");

  // ---- utils
  const toNum = (v) => {
    if (v === null || v === undefined || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
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

  // 리뷰 메타(평균/개수)
  const fetchReviewMeta = async (sid) => {
    const tryCalls = [
      async () => (await api.get(`/itda/reviews/summary`, { params: { storeId: sid } })).data,
      async () => (await api.get(`/itda/stores/${sid}/stats`)).data,
      async () => (await api.get(`/itda/stores/${sid}/rating`)).data,
    ];
    for (const call of tryCalls) {
      try {
        const res = await call();
        const avg = res?.avgRating ?? res?.averageRating ?? res?.avg ?? res?.rating ?? null;
        const count =
          res?.totalReviews ?? res?.reviewsCount ?? res?.count ?? res?.total ?? res?.reviewCount ?? null;
        if (typeof avg === "number" || typeof count === "number") {
          return {
            avg: typeof avg === "number" ? avg : null,
            count: typeof count === "number" ? count : null,
          };
        }
      } catch {}
    }
    // fallback 계산
    try {
      const { data } = await api.get("/itda/reviews", {
        params: { storeId: sid, status: "APPROVED" },
      });
      const rows = Array.isArray(data) ? data : data?.items || data?.content || [];
      if (!rows.length) return { avg: null, count: 0 };
      const sum = rows.reduce((acc, r) => {
        const raw = r.rating ?? r.stars ?? 0;
        const num = typeof raw === "number" ? raw : Number(raw) || 0;
        return acc + num;
      }, 0);
      const avg = Math.round((sum / rows.length) * 10) / 10;
      return { avg, count: rows.length };
    } catch {
      return { avg: null, count: null };
    }
  };

  // ---- data fetch
  useEffect(() => {
    let alive = true;

    const reset = () => {
      setStore(null);
      setSummary("");
      setAvgRating(null);
      setReviewCount(null);
      setOngoing([]);
      setErr("");
      setMissionsErr("");
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

        // 3) 리뷰 메타
        try {
          const meta = await fetchReviewMeta(sid);
          if (alive) {
            setAvgRating(typeof meta.avg === "number" ? Math.round(meta.avg * 10) / 10 : null);
            setReviewCount(typeof meta.count === "number" ? meta.count : null);
          }
        } catch {
          if (alive) {
            setAvgRating(null);
            setReviewCount(null);
          }
        }

        // 4) 진행중 미션
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
              _raw: m, // ✅ 원본 보관(클릭 시 상세로 전달)
            }));
          if (alive) setOngoing(flat);
        } catch (e) {
          if (alive) {
            setOngoing([]);
            setMissionsErr(e?.response?.data?.message || "미션 정보를 불러오지 못했습니다.");
          }
        }
      } catch (e) {
        if (alive) {
          setErr(e?.response?.data?.message || "매장 정보를 불러오지 못했습니다.");
          setStore(null);
          setSummary("");
          setAvgRating(null);
          setReviewCount(null);
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

  // ✅ 리스트 미션 클릭 → 상위로 선택 전달
  const handlePick = (m) => {
    if (!onPickMission || !m?._raw) return;
    const lat =
      toNum(store?.latitude) ??
      toNum(store?.lat) ??
      toNum(m?._raw?.store?.latitude) ??
      toNum(m?._raw?.latitude);
    const lng =
      toNum(store?.longitude) ??
      toNum(store?.lng) ??
      toNum(m?._raw?.store?.longitude) ??
      toNum(m?._raw?.longitude);

    onPickMission({
      mission: m._raw,
      lat,
      lng,
      address, // 현재 패널에 보이는 주소 그대로 전달
      store,   // 현재 매장 정보 전달
    });
  };

  return (
    <div className="event-list" role="region" aria-label="매장 정보">
      {!storeId && <div className="event-list-empty">마커를 눌러 매장을 선택하세요.</div>}
      {storeId && loading && <div className="event-list-empty">불러오는 중...</div>}
      {storeId && !loading && err && <div className="event-list-error">{err}</div>}

      {storeId && !loading && !err && (
        <div className="store-panel">
          {/* 매장 기본 정보 */}
          <div className="store-head">
            <div className="store-name">{storeName}</div>
            <div className="store-addr">{storeAddress}</div>

            <div
              className="store-stars"
              aria-label={avgRating != null ? `평균 별점 ${avgRating}점` : "평균 별점 없음"}
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

            {/* ✅ 변경: 개수 대신 고정 텍스트 */}
            <div className="store-review-quick">리뷰 요약</div>

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

            {missionsErr && <div className="event-list-error">{missionsErr}</div>}

            {!missionsErr && ongoing.length === 0 && (
              <div className="event-list-empty store-missions-empty">
                현재 진행 중인 미션이 없습니다.
              </div>
            )}

            {!missionsErr && ongoing.length > 0 && (
              <ul className="store-mission-list">
                {ongoing.map((m) => (
                  <li
                    key={m.id}
                    className="store-mission-item"
                    onClick={() => handlePick(m)}
                    onKeyDown={(e) => e.key === "Enter" && handlePick(m)}
                    role="button"
                    tabIndex={0}
                    title={m.title}
                    aria-label={`${m.title} 선택`}
                  >
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
