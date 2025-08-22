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

// 서버/호환용: yyyy-MM-ddTHH:mm:ss.SSS (Z 없음, UTC 변환 없음)
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

  const today = startOfDay(new Date());
  const now = new Date();

  const isValidDate = (d) => d instanceof Date && !isNaN(d?.valueOf());

  const writeHidden = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  };

  const writeBoth = (baseId, date) => {
    writeHidden(`${baseId}-at`, toLocalISOString(date));
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

  // ---- 시간 경계 계산 (둘 다 넘기거나 둘 다 생략) ----
  // 시작 피커: 오늘 날짜를 고르고 있을 때만 현재시간~23:59 제한
  const startHasBounds = isValidDate(startDate) && isSameDay(startDate, today);
  const startMinTimeProp = startHasBounds ? now : undefined;
  const startMaxTimeProp = startHasBounds ? new Date(1970, 0, 1, 23, 59, 59, 999) : undefined;

  // 종료 피커:
  // 1) 종료=시작 같은 날 → 시작시간~23:59
  // 2) 종료가 오늘 → 현재시간~23:59
  // 그 외에는 시간 제한 안 줌(둘 다 미전달)
  const endSameDayAsStart =
    isValidDate(endDate) && isValidDate(startDate) && isSameDay(endDate, startDate);
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
          /* ⬇ 둘 다 전달 또는 둘 다 생략 */
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
          /* ⬇ 둘 다 전달 또는 둘 다 생략 */
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
