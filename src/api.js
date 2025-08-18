// src/api.js
import axios from "axios";

// 모든 요청에 쿠키 포함
axios.defaults.withCredentials = true;

// /api 를 기본 prefix로 사용 (CRA 프록시가 /api를 8080으로 넘김)
const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // 인스턴스 차원에서도 명시
  headers: { "Content-Type": "application/json" },
});

export default api;
