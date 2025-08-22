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
    ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
    : "";

// 서버/호환용: yyyy-MM-ddTHH:mm:ss.SSS  (Z 없음, UTC 변환 없음)
const toLocalISOString = (d) => {
  if (!(d instanceof Date) || isNaN(d?.valueOf())) return "";
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  const sss = String(d.getMilliseconds()).padStart(3, "0");
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}.${sss}`;
};

function DatePick() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // 오늘 00:00 (로컬)
  const today = startOfDay(new Date());
  const now = new Date();

  const isValidDate = (d) => d instanceof Date && !isNaN(d?.valueOf());

  // hidden 값 쓰기
  const writeHidden = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  };

  // 두 가지 포맷 동시 기록
  const writeBoth = (baseId, date) => {
    writeHidden(`${baseId}-at`, toLocalISOString(date));  // event-start-at / event-end-at
    writeHidden(baseId, toLocalMinuteSQL(date));          // event-start    / event-end
  };

  const handleStartChange = (date) => {
    if (!isValidDate(date)) {
      setStartDate(null);
      writeBoth("event-start", null);
      // 시작이 없어지면 종료도 제한 해제
      return;
    }

    // 과거 보정: 과거 날짜면 오늘 00:00으로 교정
    let nextStart = isBefore(date, today) ? today : date;

    // 종료가 시작보다 빠르면 종료 = 시작으로 맞춤
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

  // 종료 최소일 = 시작일이 있으면 그 날/이후, 없으면 오늘
  const endMinDate = startDate || today;

  // 같은 날 선택 시, 최소 시간 제약(오늘을 선택하면 현재 시각 이후만 허용)
  const startMinTime =
    startDate && isSameDay(startDate, today) ? now : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

  const endMinTime =
    endDate && startDate && isSameDay(endDate, startDate)
      ? startDate
      : endDate && isSameDay(endDate, today)
      ? now
      : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

  return (
    <div className="global-fix">
      {/* hidden 값: -at(ISO.SSS) / 기본(보기 문자열) 모두 유지 */}
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
          // 같은 날이면 현재 시각 이후만 선택 가능
          minTime={isValidDate(startDate) && isSameDay(startDate, today) ? startMinTime : undefined}
          maxTime={new Date(0, 0, 0, 23, 59)}
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
          // 같은 날이면 시작시간 이후만 선택 가능
          minTime={
            isValidDate(endDate) && isValidDate(startDate) && isSameDay(endDate, startDate)
              ? startDate
              : isValidDate(endDate) && isSameDay(endDate, today)
              ? endMinTime
              : undefined
          }
          maxTime={new Date(0, 0, 0, 23, 59)}
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
