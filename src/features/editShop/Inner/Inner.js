import { useState } from "react";
import './InnerStyle.css';

function Inner() {
  const [shopName, setShopName] = useState('');
  const [bossName, setBossName] = useState('');
  const [shopNum, setShopNum] = useState('');
  const [addr, setAddr] = useState('');
  const [selectValue, setSelectValue] = useState("");

  const options = [
    { value: 0, label: "카페" },
    { value: 1, label: "식당" },
    { value: 2, label: "기타" },
  ];
  const handleChangeShopName = (e) => {
    setShopName(e.target.value);
  };
  const handleChangeBossName = (e) => {
    setBossName(e.target.value);
  };
  const handleChangeShopNum = (e) => {
    setShopNum(e.target.value);
  }
  const handleChangeAddr = (e) => {
    setAddr(e.target.value);
  }
  const handleChangeSelectValue = (e) => {
    setSelectValue(e.target.value);
  }

  return (
    <div className="row">
      <div>
        <h2>상호명</h2>
        <input className={`input ${shopName === "" ? "is-placeholder" : ""}`}
          type="text" value={shopName}
          placeholder="상호명을 입력해주세요." onChange={handleChangeShopName} />
      </div>
      <div>
        <h2>업종</h2>
        <select className={`input ${selectValue === "" ? "is-placeholder" : ""}`}
          value={selectValue}
          onChange={handleChangeSelectValue}
        >
          <option value="" disabled hidden>업종</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <h2>대표명</h2>
        <input className={`input ${bossName === "" ? "is-placeholder" : ""}`}
          type="text" value={bossName}
          placeholder="대표명을 입력해주세요." onChange={handleChangeBossName} />
      </div>
      <div>
        <h2>사업자등록번호</h2>
        <input className={`input ${shopNum === "" ? "is-placeholder" : ""}`}
          type="text" value={shopNum}
          placeholder="사업자등록번호를 입력해주세요." onChange={handleChangeShopNum} />
      </div>
      <div>
        <h2>주소</h2>
        <input className={`input ${addr === "" ? "is-placeholder" : ""}`}
          type="text" value={addr}
          placeholder="주소를 입력해주세요." onChange={handleChangeAddr} />
      </div>
      <div>
          <h2>사업자등록증</h2>
      </div>
    </div>
  )
}

export default Inner;