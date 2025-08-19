// src/api.js
import axios from "axios";

/** ===== 공통 BASE URL ===== */
export const BASE_URL =
  process.env.REACT_APP_API_BASE_URL /* 운영 분기용 */ || "/api";

/** ===== axios 인스턴스 ===== */
// 모든 요청에 쿠키 포함
axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  // 기본 JSON. (⚠️ 파일 업로드 시 요청별로 multipart로 덮어쓰기)
  headers: { "Content-Type": "application/json" },
});

export default api;

/** ===== fetch 헬퍼 (credentials: 'include') =====
 * - JSON 바디는 자동 stringify + Content-Type 지정
 * - FormData/Blob은 Content-Type 자동(브라우저에 맡김)
 * - ?params 쿼리도 깔끔히 붙임
 * - 응답 JSON/텍스트 자동 파싱 + 에러 throw
 */
const buildUrl = (path, params) => {
  let url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (params && Object.keys(params).length) {
    const qs = new URLSearchParams(params).toString();
    url += (url.includes("?") ? "&" : "?") + qs;
  }
  return url;
};

export async function apiFetch(path, { method = "GET", params, body, headers, ...rest } = {}) {
  const init = {
    method,
    credentials: "include", // ✅ 쿠키 포함
    headers: { ...(headers || {}) },
    ...rest,
  };

  if (body !== undefined) {
    if (body instanceof FormData || body instanceof Blob) {
      // ❗️FormData/Blob은 Content-Type 지정 금지(브라우저가 boundary 세팅)
      init.body = body;
    } else if (typeof body === "object") {
      init.body = JSON.stringify(body);
      if (!init.headers["Content-Type"]) {
        init.headers["Content-Type"] = "application/json";
      }
    } else {
      init.body = body; // string 등
    }
  }

  const res = await fetch(buildUrl(path, params), init);

  // 응답 파싱(JSON 우선)
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// 편의 메서드
export const get  = (path, params, opt) => apiFetch(path, { method: "GET", params,   ...opt });
export const post = (path, body,   opt) => apiFetch(path, { method: "POST", body,     ...opt });
export const put  = (path, body,   opt) => apiFetch(path, { method: "PUT",  body,     ...opt });
export const patch= (path, body,   opt) => apiFetch(path, { method: "PATCH",body,     ...opt });
export const del  = (path, params, opt) => apiFetch(path, { method: "DELETE",params,  ...opt });
