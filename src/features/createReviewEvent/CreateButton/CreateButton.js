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

// yyyy-MM-ddTHH:mm:ss.SSS+09:00 (로컬 오프셋 포함)
const formatLocalIsoWithOffset = (d) => {
  if (!(d instanceof Date) || isNaN(d?.valueOf())) return null;
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  const sss = String(d.getMilliseconds()).padStart(3, "0");
  const offsetMin = -d.getTimezoneOffset(); // KST: +540
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const oh = pad2(Math.floor(abs / 60));
  const om = pad2(abs % 60);
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}.${sss}${sign}${oh}:${om}`;
};

const normalizeToLocalIsoWithOffset = (v) => {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/.test(s)) return s;
  const d = parseToLocalDate(s);
  return d ? formatLocalIsoWithOffset(d) : null;
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

    // 로컬 오프셋 포함 ISO로 정규화 → 서버 -9h 이슈 방지
    const startAt = normalizeToLocalIsoWithOffset(rawStart);
    const endAt = normalizeToLocalIsoWithOffset(rawEnd);
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
