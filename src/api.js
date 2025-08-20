// src/api.js
import axios from "axios";

/** ===== BASE URL 결정 =====
 * - 로컬(localhost/127.0.0.1): http://localhost:8080
 * - 배포(그 외): 같은 도메인 사용("") → 예: https://itda.com/itda/...
 * - .env가 있으면 REACT_APP_API_BASE_URL가 최우선
 */
const IS_LOCAL =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

const DEFAULT_BASE = IS_LOCAL ? "http://localhost:8080" : ""; // ← 여기 핵심
export const BASE_URL = (process.env.REACT_APP_API_BASE_URL ?? DEFAULT_BASE);

/** ===== axios 인스턴스 ===== */
axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// plain object면 JSON으로 보냄 (FormData/Blob은 그대로)
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
const joinUrl = (base, path) => {
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
};

export const buildUrl = (path, params) => {
  const url = joinUrl(BASE_URL, path);
  if (params && Object.keys(params).length) {
    const qs = new URLSearchParams(params).toString();
    return `${url}${url.includes("?") ? "&" : "?"}${qs}`;
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
