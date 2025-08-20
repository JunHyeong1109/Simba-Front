// src/api.js
import axios from "axios";

/** ===== 공통 BASE URL ===== */
export const BASE_URL =
  (process.env.REACT_APP_API_BASE_URL ?? "") || "/api";

/** ===== axios 인스턴스 ===== */
axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// (선택) 요청 인터셉터: plain object면 JSON 헤더 자동 지정
api.interceptors.request.use((config) => {
  const isPlainObject =
    config.data &&
    typeof config.data === "object" &&
    !(config.data instanceof FormData) &&
    !(config.data instanceof Blob);

  if (isPlainObject) {
    config.headers = { ...(config.headers || {}), "Content-Type": "application/json" };
  }
  return config;
});

export default api;

/** ===== fetch 헬퍼 (credentials: 'include') ===== */
export const buildUrl = (path, params) => {
  let base = BASE_URL;
  let url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  if (params && Object.keys(params).length) {
    const qs = new URLSearchParams(params).toString();
    url += (url.includes("?") ? "&" : "?") + qs;
  }
  return url;
};

export async function apiFetch(
  path,
  { method = "GET", params, body, headers, ...rest } = {}
) {
  const init = {
    method,
    credentials: "include",
    headers: { ...(headers || {}) },
    ...rest,
  };

  if (body !== undefined) {
    if (body instanceof FormData || body instanceof Blob) {
      init.body = body; // Content-Type 자동
    } else if (typeof body === "object") {
      init.body = JSON.stringify(body);
      if (!init.headers["Content-Type"]) {
        init.headers["Content-Type"] = "application/json";
      }
    } else {
      init.body = body;
    }
  }

  const res = await fetch(buildUrl(path, params), init);

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const get   = (p, params, opt) => apiFetch(p, { method: "GET", params, ...opt });
export const post  = (p, body,   opt) => apiFetch(p, { method: "POST", body,   ...opt });
export const put   = (p, body,   opt) => apiFetch(p, { method: "PUT",  body,   ...opt });
export const patch = (p, body,   opt) => apiFetch(p, { method: "PATCH",body,   ...opt });
export const del   = (p, params, opt) => apiFetch(p, { method: "DELETE", params, ...opt });
