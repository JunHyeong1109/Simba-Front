import './EventContentStyle.css';
import { useState } from 'react';

function EventContent() {
  const [content, setContent] = useState('');

  const handleChange = (e) => {
    setContent(e.target.value);
  };

  return (
    <div>
      <input
        className={`content-input ${content === "" ? "is-placeholder" : ""}`}
        type="text" value={content}
        placeholder="리뷰 미션 상세 내용을 입력해주세요." onChange={handleChange} />

    </div>
  )
}

export default EventContent;