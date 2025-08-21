// src/features/mission/CreateButton.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import "./CreateButton.css";

/** @type {import('axios').AxiosRequestConfig} */
const JSON_HDR = { headers: { "Content-Type": "application/json" }, withCredentials: true };

const pad2 = (n) => String(n).padStart(2, "0");
// yyyy-MM-dd HH:mm (초 제거, 로컬 기준)
const toLocalMinuteSQL = (d) =>
  d instanceof Date && !isNaN(d?.valueOf())
    ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
    : null;

// 문자열 → Date(local) 파싱 (yyyy-MM-dd HH:mm[:ss], yyyy/MM/dd HH:mm[:ss], ISO 일부)
const parseToLocalDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  let s = String(v).trim();
  // 슬래시도 허용
  s = s.replace(/\//g, "-");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [, y, mo, d, hh, mm, ss] = m.map(Number);
    return new Date(y, mo - 1, d, hh, mm, ss || 0, 0);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
};

const toMinuteString = (v) => {
  const d = parseToLocalDate(v);
  return d ? toLocalMinuteSQL(d) : null;
};

const readHidden = (id) => {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
};

export default function CreateButton({ collect, posterFile }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    if (pending) return;

    const data = collect?.() ?? null;
    if (!data || typeof data !== "object") {
      alert("폼 데이터를 수집할 수 없습니다.");
      return;
    }

    const title = String(data.title ?? "").trim();
    const description = String((data.desc ?? data.description ?? readHidden("event-desc")) || "");
    const storeId = Number(data.storeId || 0);
    if (!title) return alert("제목을 입력하세요.");
    if (!storeId) return alert("매장을 선택하세요.");

    // ✅ 날짜 읽기: collect() → 신 hidden(event-*-at) → 구 hidden(event-*)
    const hiddenStart = readHidden("event-start-at") || readHidden("event-start");
    const hiddenEnd   = readHidden("event-end-at")   || readHidden("event-end");

    const startAt =
      toMinuteString(data.startAt) ||
      toMinuteString(hiddenStart);

    const endAt =
      toMinuteString(data.endAt) ||
      toMinuteString(hiddenEnd);

    // 디버그가 필요하면 잠시 활성화
    // console.log({ dataStart: data.startAt, hiddenStart, dataEnd: data.endAt, hiddenEnd, startAt, endAt });

    if (!startAt || !endAt) {
      alert("시작/종료 일시를 선택하세요.");
      return;
    }

    try {
      setPending(true);

      const payload = {
        title,
        description,
        startAt,  // yyyy-MM-dd HH:mm
        endAt,    // yyyy-MM-dd HH:mm
        storeId,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        rewardCount: data.rewardCount ?? null,
      };

      await api.post("/itda/missions", payload, JSON_HDR);

      alert("미션이 등록되었습니다.");
      navigate("/map");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "등록 중 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="re-btn re-btn--primary re-btn--lg re-btn--80vw re-btn--center"
      data-pending={pending ? "true" : "false"}
      aria-busy={pending ? "true" : "false"}
    >
      {pending ? "등록 중..." : "리뷰이벤트 등록"}
    </button>
  );
}
