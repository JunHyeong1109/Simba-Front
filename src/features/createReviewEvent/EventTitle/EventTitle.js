import { useEffect, useState } from 'react';
import './EventTitleStyle.css';

function EventTitle() {
  const [title, setTitle] = useState('');

  const handleChange = (e) => {
    setTitle(e.target.value);
  };

  return (
    <div>
      <input
        id = "event-title"
        className={`title-input ${title === "" ? "is-placeholder" : ""}`}
        type="text" value={title}
        placeholder="리뷰 미션 제목을 입력해주세요." onChange={handleChange} />

    </div>
  )
}

export default EventTitle;