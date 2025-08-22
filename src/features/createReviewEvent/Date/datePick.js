// src/features/createReviewEvent/Date/datePick.jsx
import React, { useState } from "react";
import DatePicker, { registerLocale, setDefaultLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from "date-fns/locale";
import { startOfDay, isBefore } from "date-fns";
import "./datePickerStyle.css";

registerLocale("ko", ko);
setDefaultLocale("ko");

const pad2 = (n) => String(n).padStart(2, "0");
// 로컬 표기용: yyyy-MM-dd HH:mm (초 제거)
const toLocalMinuteSQL = (d) =>
  d instanceof Date && !isNaN(d?.valueOf())
    ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
    : "";

// 서버 전송/호환용: ISO-8601(Z 포함)
const toISOorEmpty = (d) =>
  d instanceof Date && !isNaN(d?.valueOf()) ? new Date(d).toISOString() : "";

function DatePick() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const today = startOfDay(new Date());
  const isValidDate = (d) => d instanceof Date && !isNaN(d?.valueOf());

  // hidden 값 쓰기
  const writeHidden = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  };

  // ✅ 양쪽 id에 동시에 기록하되 형식을 분리:
  // - *-at  : ISO-8601 (CreateButton이 우선 사용하도록)
  // - 기본 id: 로컬 문자열(백업/표시/호환)
  const writeBoth = (baseId, date) => {
    writeHidden(`${baseId}-at`, toISOorEmpty(date));     // event-start-at / event-end-at (ISO)
    writeHidden(baseId, toLocalMinuteSQL(date));         // event-start    / event-end    (로컬)
  };

  const handleStartChange = (date) => {
    if (!isValidDate(date)) {
      setStartDate(null);
      writeBoth("event-start", null);
      return;
    }

    // 과거 선택 방지(시작일은 오늘 00:00 보다 이르면 today로)
    const nextStart = isBefore(date, today) ? today : date;

    // 종료일이 시작일보다 이르면 시작일로 보정
    if (endDate && isBefore(endDate, nextStart)) {
      setEndDate(nextStart);
      writeBoth("event-end", nextStart);
    }

    setStartDate(nextStart);
    writeBoth("event-start", nextStart);
  };

  const handleEndChange = (date) => {
    if (!isValidDate(date)) {
      setEndDate(null);
      writeBoth("event-end", null);
      return;
    }

    const baseStart = startDate || today;
    const nextEnd = isBefore(date, baseStart) ? baseStart : date;

    setEndDate(nextEnd);
    writeBoth("event-end", nextEnd);
  };

  const endMin = startDate || today;

  return (
    <div className="global-fix">
      {/* hidden 값: -at(ISO) / 기본(로컬) 모두 유지 */}
      <input type="hidden" id="event-start-at" />
      <input type="hidden" id="event-end-at" />
      <input type="hidden" id="event-start" />
      <input type="hidden" id="event-end" />

      <div className="date-row">
        <DatePicker
          className="date-input"
          placeholderText="Select Start Date"
          locale="ko"
          showTimeSelect
          timeIntervals={1}
          dateFormat="yyyy/MM/dd HH:mm"
          selected={startDate}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          minDate={today}
          onChange={handleStartChange}
          withPortal
          popperPlacement="bottom-start"
          aria-label="시작 날짜"
        />
        &nbsp;~&nbsp;
        <DatePicker
          className="date-input"
          placeholderText="Select End Date"
          locale="ko"
          showTimeSelect
          timeIntervals={1}
          dateFormat="yyyy/MM/dd HH:mm"
          selected={endDate}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={endMin}
          onChange={handleEndChange}
          withPortal
          popperPlacement="bottom-start"
          aria-label="종료 날짜"
        />
      </div>
    </div>
  );
}

export default DatePick;
