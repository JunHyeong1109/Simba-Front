// src/features/createReviewEvent/Date/datePick.jsx
import React, { useState } from "react";
import DatePicker, { registerLocale, setDefaultLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from "date-fns/locale";
import { startOfDay, isBefore, isSameDay } from "date-fns";
import "./datePickerStyle.css";

registerLocale("ko", ko);
setDefaultLocale("ko");

const pad2 = (n) => String(n).padStart(2, "0");

// 보기용: yyyy-MM-dd HH:mm
const toLocalMinuteSQL = (d) =>
  d instanceof Date && !isNaN(d?.valueOf())
    ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
        d.getHours()
      )}:${pad2(d.getMinutes())}`
    : "";

// 서버 전송용: yyyy-MM-dd'T'HH:mm:ss.SSS (LocalDateTime 호환)
const toLocalDateTimeString = (d) => {
  if (!(d instanceof Date) || isNaN(d?.valueOf())) return "";
  return (
    d.getFullYear() +
    "-" +
    pad2(d.getMonth() + 1) +
    "-" +
    pad2(d.getDate()) +
    "T" +
    pad2(d.getHours()) +
    ":" +
    pad2(d.getMinutes()) +
    ":" +
    pad2(d.getSeconds()) +
    ".000"
  );
};

function DatePick() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const today = startOfDay(new Date());
  const now = new Date();

  const isValidDate = (d) => d instanceof Date && !isNaN(d?.valueOf());

  const writeHidden = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  };

  const writeBoth = (baseId, date) => {
    // 서버 전송용(LocalDateTime) / 보기용 둘 다 기록
    writeHidden(`${baseId}-at`, toLocalDateTimeString(date));
    writeHidden(baseId, toLocalMinuteSQL(date));
  };

  const handleStartChange = (date) => {
    if (!isValidDate(date)) {
      setStartDate(null);
      writeBoth("event-start", null);
      return;
    }

    const nextStart = isBefore(date, today) ? today : date;

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

  const endMinDate = startDate || today;

  // ---- 시간 경계 계산 ----
  const startHasBounds = isValidDate(startDate) && isSameDay(startDate, today);
  const startMinTimeProp = startHasBounds ? now : undefined;
  const startMaxTimeProp = startHasBounds
    ? new Date(1970, 0, 1, 23, 59, 59, 999)
    : undefined;

  const endSameDayAsStart =
    isValidDate(endDate) &&
    isValidDate(startDate) &&
    isSameDay(endDate, startDate);
  const endIsToday = isValidDate(endDate) && isSameDay(endDate, today);

  let endMinTimeProp, endMaxTimeProp;
  if (endSameDayAsStart) {
    endMinTimeProp = startDate;
    endMaxTimeProp = new Date(1970, 0, 1, 23, 59, 59, 999);
  } else if (endIsToday) {
    endMinTimeProp = now;
    endMaxTimeProp = new Date(1970, 0, 1, 23, 59, 59, 999);
  } else {
    endMinTimeProp = undefined;
    endMaxTimeProp = undefined;
  }

  return (
    <div className="global-fix">
      {/* hidden 값: -at(서버 전송용 LocalDateTime 문자열) / 기본(보기 문자열) */}
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
          minTime={startMinTimeProp}
          maxTime={startMaxTimeProp}
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
          minDate={endMinDate}
          minTime={endMinTimeProp}
          maxTime={endMaxTimeProp}
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
