export default function getKakaoAppKey() {
  const vite = typeof import.meta !== "undefined" ? import.meta.env?.VITE_KAKAO_APP_KEY : undefined;
  const cra  = typeof process !== "undefined" ? process.env?.REACT_APP_KAKAO_APP_KEY : undefined;
  const rt   = typeof window !== "undefined" ? window.__APP_CONFIG__?.KAKAO_APP_KEY : undefined;
  const key = (vite || cra || rt || "").trim();
  return key || null;
}