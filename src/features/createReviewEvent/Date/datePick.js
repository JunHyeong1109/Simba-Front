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
// yyyy-MM-dd HH:mm (초 제거)
const toLocalMinuteSQL = (d) =>
  d instanceof Date && !isNaN(d?.valueOf())
    ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
    : "";

function DatePick() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const today = startOfDay(new Date());
  const isValidDate = (d) => d instanceof Date && !isNaN(d?.valueOf());
  const writeHidden = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  };
  // 양쪽 id에 동시에 기록
  const writeBoth = (baseId, value) => {
    writeHidden(`${baseId}-at`, value); // event-start-at / event-end-at
    writeHidden(baseId, value);         // event-start    / event-end
  };

  const handleStartChange = (date) => {
    if (!isValidDate(date)) {
      setStartDate(null);
      writeBoth("event-start", "");
      return;
    }
    const nextStart = isBefore(date, today) ? today : date;
    if (endDate && isBefore(endDate, nextStart)) {
      setEndDate(nextStart);
      writeBoth("event-end", toLocalMinuteSQL(nextStart));
    }
    setStartDate(nextStart);
    writeBoth("event-start", toLocalMinuteSQL(nextStart));
  };

  const handleEndChange = (date) => {
    if (!isValidDate(date)) {
      setEndDate(null);
      writeBoth("event-end", "");
      return;
    }
    const baseStart = startDate || today;
    const nextEnd = isBefore(date, baseStart) ? baseStart : date;
    setEndDate(nextEnd);
    writeBoth("event-end", toLocalMinuteSQL(nextEnd));
  };

  const endMin = startDate || today;

  return (
    <div className="global-fix">
      {/* 양쪽 hidden을 모두 배치 (중복 방지: 이 컴포넌트가 한 번만 렌더된다는 전제) */}
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
