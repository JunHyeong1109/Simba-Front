import React, { useState } from "react";
import DatePicker, { registerLocale, setDefaultLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from "date-fns/locale";
import { startOfDay, isAfter, isBefore } from "date-fns"; 
import "./datePickerStyle.css";

registerLocale("ko", ko);
setDefaultLocale("ko");

function DatePick() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const today = startOfDay(new Date()); // 오늘 00:00 기준

  const handleStartChange = (date) => {
    if (!date) {
      setStartDate(null);
      return;
    }

    // 시작일은 오늘 이전으로 못 내려가도록 보정
    const nextStart = isBefore(date, today) ? today : date;

    // 종료일이 시작일보다 빠르면 시작일로 끌어올림 (상한 제한 없음)
    if (endDate && isBefore(endDate, nextStart)) {
      setEndDate(nextStart);
    }

    setStartDate(nextStart);
  };

  const handleEndChange = (date) => {
    if (!date) {
      setEndDate(null);
      return;
    }

    const baseStart = startDate ? startDate : today; // 시작일 없으면 '오늘' 기준

    // 종료일은 시작일(없으면 오늘)보다 빠를 수 없음 (상한 제한 없음)
    if (isBefore(date, baseStart)) {
      setEndDate(baseStart);
    } else {
      setEndDate(date);
    }
  };

  // 종료 달력에서 사용할 min (시작일 없으면 오늘)
  const endMin = startDate || today;

  return (
    <div className="global-fix">
      <div className="date-row">
        <DatePicker
          className="date-input"
          placeholderText="Select Start Date"
          locale="ko"
          showTimeSelect
          dateFormat="yyyy/MM/dd h:mm aa"
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
          dateFormat="yyyy/MM/dd h:mm aa"
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
