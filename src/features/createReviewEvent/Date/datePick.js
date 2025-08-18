import React, { useState } from "react";
import DatePicker, { registerLocale, setDefaultLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; 
import { ko } from "date-fns/locale";
import "./datePickerStyle.css";

registerLocale("ko", ko);
setDefaultLocale("ko");

function DatePick() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

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
          onChange={(date) => setStartDate(date)}
          withPortal
          popperPlacement="bottom-start"
          aria-label="시작 날짜"
        />
        ~
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
          minDate={startDate}
          onChange={(date) => setEndDate(date)}
          withPortal
          popperPlacement="bottom-start"
          aria-label="종료 날짜"
        />
      </div>
    </div>
  );
}

export default DatePick;
