// src/features/eventMap/eventList/EventList.js
import React, { useEffect, useState } from "react";
import api from "../../../api";
import "./EventList.css";

function EventList({
  status = "joinable",
  storeId,
  onSelect,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ⬇ 추가: 매장 요약 캐시 (storeId -> summary)
  const [summariesByStoreId, setSummariesByStoreId] = useState({});

  const toDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d) ? null : d;
  };
  const isExpired = (m, now = new Date()) => {
    const end = toDate(m.endAt || m.endDate);
    return !!(end && end < now);
  };
  const isScheduled = (m, now = new Date()) => {
    const start = toDate(m.startAt || m.startDate);
    return !!(start && start > now);
  };
  const isOngoing = (m, now = new Date()) => {
    return !isScheduled(m, now) && !isExpired(m, now);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const statusParam = (status ?? "").toString();
        const statusUpper = statusParam.toUpperCase();

        let url = "";
        if (statusParam === "joinable") {
          url = "/itda/missions/joinable";
        } else if (storeId && statusParam) {
          url = `/itda/missions?storeId=${storeId}&status=${encodeURIComponent(statusUpper)}`;
        } else if (storeId) {
          url = `/itda/missions?storeId=${storeId}`;
        } else if (statusParam) {
          url = `/itda/missions?status=${encodeURIComponent(statusUpper)}`;
        } else {
          url = "/itda/missions/joinable";
        }

        const { data } = await api.get(url);
        const list = Array.isArray(data) ? data : data?.items || [];
        if (!alive) return;

        const normalized = list.map((m) => {
          const s = m.store || {};
          const toNum = (v) =>
            v === null || v === undefined || v === ""
              ? undefined
              : Number.isFinite(v)
              ? v
              : Number(v);
          return {
            ...m,
            _store: {
              ...s,
              id: s.id ?? m.storeId,         // ⬅ id를 명시적으로 보정
              latitude: toNum(s.latitude),
              longitude: toNum(s.longitude),
            },
          };
        });

        const now = new Date();
        let out = normalized;

        if (statusParam === "joinable" || statusUpper === "ONGOING") {
          out = normalized.filter((m) => isOngoing(m, now));
        } else if (statusUpper === "SCHEDULED") {
          out = normalized.filter((m) => isScheduled(m, now));
        } else if (statusUpper === "ENDED") {
          out = normalized.filter((m) => isExpired(m, now));
        } else if (storeId && !statusParam) {
          out = normalized.filter((m) => isOngoing(m, now));
        }

        if (!alive) return;
        setItems(out);

        // ⬇ 고유 매장 id 수집 후 summary 병렬 로드
        const ids = Array.from(
          new Set(
            out
              .map((m) => m._store?.id ?? m.storeId)
              .filter((id) => id !== undefined && id !== null)
          )
        );

        if (ids.length > 0) {
          const results = await Promise.allSettled(
            ids.map(async (id) => {
              const { data: sum } = await api.get(`/itda/stores/${id}/summary`);
              const text = typeof sum === "string" ? sum : (sum?.summary ?? "");
              return { id, summary: text };
            })
          );
          if (!alive) return;

          const map = {};
          for (const r of results) {
            if (r.status === "fulfilled" && r.value) {
              map[r.value.id] = r.value.summary;
            }
          }
          setSummariesByStoreId(map);
        } else {
          setSummariesByStoreId({});
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || "미션 목록을 불러오지 못했습니다.");
        setItems([]);
        setSummariesByStoreId({});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [status, storeId]);

  const hasItems = items.length > 0;

  const fmtDate = (d) => {
    if (!d) return "";
    try {
      const dt = new Date(d);
      if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
    } catch {}
    return String(d).slice(0, 10);
  };

  const getPoster = (m) =>
    m.posterUrl || m.poster || m.imageUrl || m.thumbnailUrl || "";

  const handleClick = (m) => {
    const lat = m?._store?.latitude ?? m?.latitude;
    const lng = m?._store?.longitude ?? m?.longitude;
    onSelect?.({ mission: m, lat, lng });
  };

  return (
    <div className="event-list" role="region" aria-label="진행 가능 미션 목록">
      {loading && <div className="event-list-empty">불러오는 중...</div>}
      {!loading && err && <div className="event-list-error">{err}</div>}
      {!loading && !err && !hasItems && (
        <div className="event-list-empty">등록된 미션이 없습니다.</div>
      )}

      {!loading && !err && hasItems && (
        <ul className="event-list-grid">
          {items.map((m) => {
            const poster = getPoster(m);
            const store = m?.store || {};
            const storeName = store.name || m?.storeName || "";
            const storeIdForSum = m?._store?.id ?? m.storeId;
            const summary = summariesByStoreId[storeIdForSum] || "";
            const start = m?.startAt || m?.startDate;
            const end = m?.endAt || m?.endDate;

            return (
              <li
                key={m.id}
                className="event-card"
                onClick={() => handleClick(m)}
                onKeyDown={(e) => e.key === "Enter" && handleClick(m)}
                role="button"
                tabIndex={0}
                aria-label={`${m.title || "미션"} 선택`}
                title={m.title || "미션"}
              >
                <div className="event-card-thumb">
                  {poster && <img src={poster} alt="미션 포스터" />}
                </div>
                <div className="event-card-body">
                  <div className="event-card-title">{m.title || "미션"}</div>

                  {storeName && (
                    <div className="event-card-store">{storeName}</div>
                  )}

                  {/* ⬇ 매장 summary 추가 */}
                  {summary && (
                    <div className="event-card-summary" title={summary}>
                      {summary}
                    </div>
                  )}

                  {(start || end) && (
                    <div className="event-card-dates">
                      {fmtDate(start)} ~ {fmtDate(end)}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default EventList;
