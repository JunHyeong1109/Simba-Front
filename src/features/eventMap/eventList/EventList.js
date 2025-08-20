// src/features/eventMap/eventList/EventList.js
import React, { useEffect, useState } from "react";
import api from "../../../api"; // 프로젝트 구조에 맞게 경로 확인
import "./EventList.css";

function EventList({
  status = "joinable", // "joinable" | "SCHEDULED" | "ONGOING" | "ENDED"
  storeId,             // 특정 매장만 보고 싶을 때
  onSelect,            // 카드 클릭 시 onSelect({ mission, lat, lng })
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 날짜 헬퍼 & 상태 판별
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
    // 시작일이 미래가 아니고, 종료일이 지났지 않으면 진행중으로 간주
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

        // 1) 서버 요청 URL 구성
        let url = "";
        if (statusParam === "joinable") {
          url = "/itda/missions/joinable";
        } else if (storeId && statusParam) {
          url = `/itda/missions?storeId=${storeId}&status=${encodeURIComponent(
            statusUpper
          )}`;
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

        // 2) 좌표 숫자화
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
              latitude: toNum(s.latitude),
              longitude: toNum(s.longitude),
            },
          };
        });

        // 3) 클라이언트 측 필터 (서버 신뢰 + 보강)
        const now = new Date();
        let out = normalized;

        if (statusParam === "joinable" || statusUpper === "ONGOING") {
          out = normalized.filter((m) => isOngoing(m, now));
        } else if (statusUpper === "SCHEDULED") {
          out = normalized.filter((m) => isScheduled(m, now));
        } else if (statusUpper === "ENDED") {
          out = normalized.filter((m) => isExpired(m, now));
        } else if (storeId && !statusParam) {
          // 메인/매장 전용: status 미지정이면 만료 숨김
          out = normalized.filter((m) => isOngoing(m, now));
        }

        setItems(out);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || "미션 목록을 불러오지 못했습니다.");
        setItems([]);
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
            const storeName = m?.store?.name || m?.storeName || "";
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
