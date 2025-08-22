// src/features/createReviewEvent/CreateButton/CreateButton.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import "./CreateButton.css";

/** JSON 전용 옵션(다른 JSON API에서 사용 가능) */
export const JSON_HDR = {
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
};

/** 세션만 유지(이 요청은 multipart/form-data라서 Content-Type 비움) */
export const SESSION_ONLY = { withCredentials: true };

/* ──────────────────────────────────────────────────────────
   유틸: 로컬시간 → yyyy-MM-ddTHH:mm:ss.SSS (Z 없음)
   ────────────────────────────────────────────────────────── */
const pad2 = (n) => String(n).padStart(2, "0");
const formatLocalIsoSss = (d) => {
  if (!(d instanceof Date) || isNaN(d?.valueOf())) return null;
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  const sss = String(d.getMilliseconds()).padStart(3, "0");
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}.${sss}`;
};

/**
 * 문자열 → Date(local)
 * - 지원 포맷:
 *   1) yyyy-MM-dd HH:mm[:ss]
 *   2) yyyy-MM-ddTHH:mm[:ss]
 *   3) yyyy-MM-ddTHH:mm:ss.SSS
 * - 절대 new Date(s) (브라우저 파서)로 파싱하지 않음 → UTC로 오인 방지
 */
const parseToLocalDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;

  let s = String(v).trim();
  if (!s) return null;

  // 통일
  s = s.replace(/\//g, "-");

  // yyyy-MM-ddTHH:mm:ss.SSS
  let m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/
  );
  if (m) {
    const [, y, mo, d, hh, mm, ss, sss] = m.map(Number);
    return new Date(y, mo - 1, d, hh, mm, ss, sss);
  }

  // yyyy-MM-dd[ T]HH:mm[:ss]
  m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (m) {
    const [, y, mo, d, hh, mm, ss] = m.map(Number);
    return new Date(y, mo - 1, d, hh, mm, ss || 0, 0);
  }

  // 그 외 포맷은 모르는 것으로 처리
  return null;
};

// 원하는 최종 포맷으로 정규화: yyyy-MM-ddTHH:mm:ss.SSS (Z 없음)
const normalizeToLocalIsoSss = (v) => {
  const s = (v ?? "").toString().trim();
  if (!s) return null;

  // 이미 최종 포맷이면 그대로 사용
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(s)) return s;

  // 직접 파싱해서 로컬 Date 생성 후 포맷
  const d = parseToLocalDate(s);
  return d ? formatLocalIsoSss(d) : null;
};

const readHidden = (id) => {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
};

// ✅ 숫자 정규화: 빈값/NaN/음수 → null, 정수로 고정
const toIntOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
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

    // ✅ EventContent → description
    const description = String(
      (data.description ?? readHidden("event-desc")) || ""
    ).trim();

    const storeId = Number(data.storeId || 0);
    if (!title) return alert("제목을 입력하세요.");
    if (!storeId) return alert("매장을 선택하세요.");

    // ✅ RewardContent → rewardContent
    const rewardContent = String(
      (data.rewardContent ?? readHidden("event-reward-content")) || ""
    ).trim();

    // 날짜: collect(우선) → hidden(-at, -기본) 순서로 확보
    const rawStart =
      data.startAt ||
      readHidden("event-start-at") || // DatePick이 넣어주는 yyyy-MM-ddTHH:mm:ss.SSS
      readHidden("event-start");      // 백업(yyyy-MM-dd HH:mm)

    const rawEnd =
      data.endAt ||
      readHidden("event-end-at") ||
      readHidden("event-end");

    // ✅ 최종 포맷으로 정규화(yyyy-MM-ddTHH:mm:ss.SSS, Z 없음)
    const startAt = normalizeToLocalIsoSss(rawStart);
    const endAt = normalizeToLocalIsoSss(rawEnd);

    if (!startAt || !endAt) {
      alert("시작/종료 일시를 선택하세요.");
      return;
    }

    // ✅ 리워드 카운트
    const rewardCountVal =
      toIntOrNull(data.rewardCount) ?? toIntOrNull(readHidden("event-reward-count"));

    try {
      setPending(true);

      // ✅ 서버 DTO
      const requestPayload = {
        title,
        description,
        startAt, // 예: "2025-08-22T20:00:00.000"
        endAt,   // 예: "2025-08-23T18:30:00.000"
        storeId,
        rewardContent,
      };
      if (rewardCountVal !== null) requestPayload.rewardCount = rewardCountVal;

      // ✅ multipart/form-data 생성
      const form = new FormData();
      const requestBlob = new Blob([JSON.stringify(requestPayload)], { type: "application/json" });
      form.append("request", requestBlob, "request.json");

      if (posterFile) {
        form.append("image", posterFile, posterFile.name || "image");
      }

      // ⚠️ Content-Type 수동 설정 금지 → axios가 boundary 포함 자동 설정
      await api.post("/itda/missions", form, SESSION_ONLY);

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
