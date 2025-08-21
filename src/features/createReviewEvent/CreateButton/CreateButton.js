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

// 보조 유틸
const pad2 = (n) => String(n).padStart(2, "0");
// yyyy-MM-dd HH:mm (로컬, 초 제거)
const toLocalMinuteSQL = (d) =>
  d instanceof Date && !isNaN(d?.valueOf())
    ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
    : null;

// 문자열 → Date(local) (yyyy-MM-dd HH:mm[:ss], yyyy/MM/dd HH:mm[:ss], ISO 일부 허용)
const parseToLocalDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  let s = String(v).trim();
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
    const description = String((data.desc ?? data.description ?? readHidden("event-desc")) || "");
    const storeId = Number(data.storeId || 0);
    if (!title) return alert("제목을 입력하세요.");
    if (!storeId) return alert("매장을 선택하세요.");

    // 날짜: collect → hidden(-at → 구 id) 순서로 확보
    const hiddenStart = readHidden("event-start-at") || readHidden("event-start");
    const hiddenEnd   = readHidden("event-end-at")   || readHidden("event-end");
    const startAt = toMinuteString(data.startAt) || toMinuteString(hiddenStart);
    const endAt   = toMinuteString(data.endAt)   || toMinuteString(hiddenEnd);
    if (!startAt || !endAt) {
      alert("시작/종료 일시를 선택하세요.");
      return;
    }

    // ✅ 리워드 카운트: collect 우선, 없으면 hidden에서 백업
    const rewardCountVal =
      toIntOrNull(data.rewardCount) ?? toIntOrNull(readHidden("event-reward-count"));

    try {
      setPending(true);

      // ✅ 서버 DTO로 받을 JSON(= @RequestPart("request"))
      const requestPayload = {
        title,
        description,
        startAt,  // 'yyyy-MM-dd HH:mm'
        endAt,    // 'yyyy-MM-dd HH:mm'
        storeId,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
      };
      if (rewardCountVal !== null) requestPayload.rewardCount = rewardCountVal;

      // ✅ multipart/form-data 생성
      const form = new FormData();

      // request 파트를 application/json Blob으로 추가 (필수 핵심)
      const requestBlob = new Blob([JSON.stringify(requestPayload)], { type: "application/json" });
      form.append("request", requestBlob, "request.json");

      // image 파트(선택): 파일이 있으면 추가 (백엔드에서 required면 검증 추가)
      if (posterFile) {
        form.append("image", posterFile, posterFile.name || "image");
      } else {
        // 백엔드에서 image가 필수면 아래 주석 해제
        // return alert("포스터 이미지를 선택하세요.");
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
