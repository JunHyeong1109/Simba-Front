import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import "./CreateButton.css";

export const JSON_HDR = {
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
};

export const SESSION_ONLY = { withCredentials: true };

/* ───────────── 유틸 ───────────── */
const pad2 = (n) => String(n).padStart(2, "0");

// 문자열 → Date(local)
const parseToLocalDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace(/\//g, "-");

  // yyyy-MM-ddTHH:mm:ss.SSS
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);
  if (m) {
    const [, y, mo, d, hh, mm, ss, sss] = m.map(Number);
    return new Date(y, mo - 1, d, hh, mm, ss, sss);
  }

  // yyyy-MM-dd[ T]HH:mm[:ss]
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [, y, mo, d, hh, mm, ss] = m.map(Number);
    return new Date(y, mo - 1, d, hh, mm, ss || 0, 0);
  }
  return null;
};

/**
 * ✅ UTC ISO 문자열로 변환하되 'Z' 제거
 * 예: 2025-08-24T05:26:00.000Z → "2025-08-24T05:26:00.000"
 */
const formatUtcIsoNoZ = (d) => {
  if (!(d instanceof Date) || isNaN(d?.valueOf())) return null;
  return d.toISOString().replace("Z", "");
};

const readHidden = (id) => {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
};

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
    const description = String((data.description ?? readHidden("event-desc")) || "").trim();
    const storeId = Number(data.storeId || 0);
    if (!title) return alert("제목을 입력하세요.");
    if (!storeId) return alert("매장을 선택하세요.");

    const rewardContent = String(
      (data.rewardContent ?? readHidden("event-reward-content")) || ""
    ).trim();

    // 날짜 확보 (DatePick hidden 값 우선)
    const rawStart =
      data.startAt || readHidden("event-start-at") || readHidden("event-start");
    const rawEnd =
      data.endAt || readHidden("event-end-at") || readHidden("event-end");

    // ✅ UTC ISO (Z 제거, .SSS 유지)로 변환
    const startAt = formatUtcIsoNoZ(parseToLocalDate(rawStart));
    const endAt = formatUtcIsoNoZ(parseToLocalDate(rawEnd));
    if (!startAt || !endAt) {
      alert("시작/종료 일시를 선택하세요.");
      return;
    }

    const rewardCountVal =
      toIntOrNull(data.rewardCount) ?? toIntOrNull(readHidden("event-reward-count"));

    try {
      setPending(true);

      // JSON payload
      const requestPayload = { title, description, startAt, endAt, storeId, rewardContent };
      if (rewardCountVal !== null) requestPayload.rewardCount = rewardCountVal;

      // multipart/form-data: request(JSON) + image(file)
      const form = new FormData();
      const requestBlob = new Blob([JSON.stringify(requestPayload)], {
        type: "application/json",
      });
      form.append("request", requestBlob, "request.json");

      if (posterFile) {
        form.append("image", posterFile, posterFile.name || "image");
      }

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
